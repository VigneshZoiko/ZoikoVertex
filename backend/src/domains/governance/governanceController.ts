
import { randomUUID } from 'crypto';
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { createApprovalItem } from '../../services/approval.service';
import { logger } from '../../shared/logger';
import { internalEventBus } from '../../shared/internalEventBus';
import { AuthRequest } from '../../shared/authMiddleware';
import { alertSecOpsAuditFailure } from '../../shared/alertSecOps';

import { evaluateIntent } from '../decisions/decisionEngine';
import { ApprovalEngine } from '../decisions/approvalEngine';
import { logAuditEvent } from './evidenceController';
import { recordPublishIntentRun, syncAgentRunFromIntent } from '../../services/operationsRunRecorder.service';
import { linkPublishToWorkflow } from '../../services/workflowPublishLink.service';
import { moderate } from '../../modules/safety/moderationService';
import { PostGovernanceService } from '../../modules/prompts/PostGovernanceService';

const SubmitIntentSchema = z.object({
  content: z.object({
    universal: z.string().default(''),
    platforms: z.record(z.string(), z.string()).optional(),
  }).refine(
    (c) => c.universal.trim().length > 0 || Object.values(c.platforms || {}).some(v => v.trim().length > 0),
    { message: 'At least one caption (universal or platform-specific) is required' }
  ),
  mediaUrls: z.array(z.string()).optional(),
  mediaUrl: z.string().optional(),
  targetAccountIds: z.array(z.string().uuid()).min(1, 'At least one target account required'),
  campaign_id: z.string().uuid().nullable().optional(),
  boost_budget_override: z.number().positive().nullable().optional(),
  scheduled_for: z.string().datetime().nullable().optional(),
  business_unit_id: z.string().uuid().nullable().optional(),
});

export const submitIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { content, mediaUrls, mediaUrl, targetAccountIds, campaign_id, boost_budget_override, scheduled_for, business_unit_id } = SubmitIntentSchema.parse(req.body);
    const platformPostTypes: Record<string, string | string[]> = req.body.platformPostTypes || {};
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User context missing' });
    }

    const urlsToSave = mediaUrls || (mediaUrl ? [mediaUrl] : []);

    const CAROUSEL_LIMITS: Record<string, number> = {
      instagram: 10, threads: 10, facebook: 10,
      linkedin: 9, twitter: 4, pinterest: 5, youtube: 1,
    };

    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!workspaceId && !isSuperAdmin) {
      return res.status(403).json({ error: 'User is not associated with a workspace' });
    }

    const targetWorkspaceId = workspaceId || '00000000-0000-0000-0000-000000000000';

    const { data: accounts, error: accError } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform')
      .in('id', targetAccountIds);

    if (accError) throw accError;

    // story/idea formats suppress captions — platform doesn't display them
    const NO_CAPTION_FORMATS = new Set(['story', 'idea', 'idea-pin', 'idea_pin']);

    // Auto-assignment load balancing
    const { data: reviewers } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', targetWorkspaceId)
      .eq('role', 'REVIEWER');

    const reviewerIds = (reviewers || []).map(r => r.user_id);
    const loadMap: Record<string, number> = {};
    reviewerIds.forEach(id => { loadMap[id] = 0; });

    if (reviewerIds.length > 0) {
      const { data: countsData } = await supabaseAdmin
        .from('publish_intents')
        .select('reviewer_id')
        .eq('workspace_id', targetWorkspaceId)
        .eq('status', 'PENDING_REVIEW')
        .in('reviewer_id', reviewerIds);

      if (countsData) {
        countsData.forEach((row: any) => {
          if (row.reviewer_id && loadMap[row.reviewer_id] !== undefined) {
            loadMap[row.reviewer_id]++;
          }
        });
      }
    }

    const intentsToCreate = accounts.flatMap((acc) => {
      // Case-insensitive lookup: DB stores platform as lowercase, frontend keys may vary
      const platformKey = Object.keys(content.platforms || {}).find(
        k => k.toLowerCase() === acc.platform.toLowerCase()
      );
      const finalCaption = (platformKey && content.platforms![platformKey]?.trim())
        ? content.platforms![platformKey]
        : content.universal;

      const rawFormats = platformPostTypes[acc.platform];
      const formats: (string | null)[] = Array.isArray(rawFormats)
        ? (rawFormats.length > 0 ? rawFormats : [null])
        : rawFormats
          ? [rawFormats]
          : [null];

      return formats.map(postType => {
        let assignedReviewerId: string | null = null;
        if (reviewerIds.length > 0) {
          let minReviewerId = reviewerIds[0];
          let minLoad = loadMap[minReviewerId];
          for (const rId of reviewerIds) {
            if (loadMap[rId] < minLoad) {
              minLoad = loadMap[rId];
              minReviewerId = rId;
            }
          }
          assignedReviewerId = minReviewerId;
          loadMap[minReviewerId]++; // Increment workload load-balancing locally for batch items
        }

        return {
          workspace_id: targetWorkspaceId,
          creator_id: userId,
          target_account_ids: [acc.id],
          content: (postType && NO_CAPTION_FORMATS.has(postType.toLowerCase())) ? '' : finalCaption,
          media_urls: urlsToSave,
          media_url: urlsToSave[0] || null,
          status: 'PENDING_REVIEW',
          platform: acc.platform,
          reviewer_id: assignedReviewerId,
          ...(campaign_id ? { campaign_id } : {}),
          ...(boost_budget_override != null ? { boost_budget_override } : {}),
          ...(scheduled_for ? { scheduled_for } : {}),
          business_unit_id: business_unit_id || null,
        };
      });
    });

    // ── Safety-gated routing ──────────────────────────────────────────────
    // Run the agent's safety check on each post and decide where it goes:
    //   • 100% clean (zero detections) AND owning agent autonomy is L4–L6
    //       → APPROVED, then auto-published below (no human review).
    //   • anything else — even a 99% "safe" post, or any flag
    //       → PENDING_REVIEW, so it lands in the Review Queue
    //         (green when safe, red when flagged, via risk_level).
    // Fail-safe: if the safety check errors, the post goes to review, never
    // auto-publish.
    const { data: wsAgents } = await supabaseAdmin
      .from('agents')
      .select('id, name, type, status, platforms, linked_channels')
      .eq('workspace_id', targetWorkspaceId)
      .limit(50);
    const agentList = wsAgents || [];
    const pickAgentForPlatform = (platform?: string): any => {
      if (agentList.length === 0) return null;
      const p = (platform || '').toLowerCase();
      const isActive = (a: any) => ['ACTIVE', 'APPROVED', 'DEPLOYED'].includes(String(a.status || '').toUpperCase());
      const matches = (a: any) => p && ([...(a.platforms || []), ...(a.linked_channels || [])] as string[]).some((c) => String(c).toLowerCase() === p);
      const isContent = (a: any) => String(a.type || '').toLowerCase().includes('content');
      return [...agentList].sort((a, b) => {
        const score = (x: any) => (isActive(x) ? 4 : 0) + (matches(x) ? 2 : 0) + (isContent(x) ? 1 : 0);
        return score(b) - score(a);
      })[0] || null;
    };
    // ── Run the FULL 6-agent validation chain on every post, synchronously,
    //    BEFORE routing. The post visits all six agents (Policy, Approval Rules,
    //    Platform, Image, General Content, Evidence/KB) and we route from their
    //    aggregated verdict. `moderate()` is kept as an extra safety backstop so
    //    auto-publish still requires a 100%-clean safety read.
    //    Deduped by caption+platform+media so identical posts cost one pass.
    const govCache = new Map<
      string,
      { decision: 'APPROVE' | 'REVIEW' | 'BLOCK'; riskScore: number; riskLevel: string; reason: string; safeRisk: number }
    >();

    const runGovernance = async (row: any) => {
      const mediaKey = (row.media_urls || []).join(',');
      const key = `${row.platform}::${row.content || ''}::${mediaKey}`;
      const cached = govCache.get(key);
      if (cached) return cached;

      // Extra safety backstop (local dict + Groq). Fail-safe to high on error.
      let safeRisk = 0;
      try {
        if ((row.content || '').trim()) {
          const m = await moderate({ content: row.content, workspaceId: targetWorkspaceId });
          safeRisk = m.overallRisk || 0;
        }
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[Governance] safety backstop failed — failing safe');
        safeRisk = 1;
      }

      let out: { decision: 'APPROVE' | 'REVIEW' | 'BLOCK'; riskScore: number; riskLevel: string; reason: string; safeRisk: number };
      try {
        const gov = await PostGovernanceService.classify(
          row.content || '',
          row.platform,
          targetWorkspaceId,
          { imageUrls: row.media_urls || [] },
        );
        out = {
          decision: gov.decision,
          riskScore: Math.max(gov.risk.score || 0, Math.round(safeRisk * 100)),
          riskLevel: String(gov.risk.level || 'Low').toUpperCase(),
          reason: gov.reason,
          safeRisk,
        };
      } catch (err) {
        // Fail safe: if the chain errors, route to human review — never auto-publish.
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[Governance] 6-agent chain failed — routing to review (fail-safe)');
        out = { decision: 'REVIEW', riskScore: Math.max(55, Math.round(safeRisk * 100)), riskLevel: 'MEDIUM', reason: 'Validation chain unavailable — manual review required.', safeRisk };
      }

      govCache.set(key, out);
      return out;
    };

    for (const row of intentsToCreate as any[]) {
      const agent = pickAgentForPlatform(row.platform);
      row.agent_id = agent?.id || null;

      const gov = await runGovernance(row);
      row.risk_level = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(gov.riskLevel) ? gov.riskLevel : 'LOW';
      row.risk_score = gov.riskScore;

      // Route from the aggregated 6-agent verdict (no per-agent autonomy level —
      // the L1–L6 gate was removed). A post auto-publishes ONLY when it is 100%
      // safe: every agent + prompt check passed (decision APPROVE) AND the safety
      // backstop found zero risk. Anything else goes to the Approval Console.
      //   • any agent BLOCK                      → GOVERNANCE_BLOCKED (never reaches console)
      //   • all checks pass + 100% safe          → APPROVED (auto-publish, attributed to the agent)
      //   • everything else (incl. any REVIEW)   → PENDING_REVIEW (Approval Console)
      if (gov.decision === 'BLOCK') {
        row.status = 'GOVERNANCE_BLOCKED';
        row.feedback = gov.reason;
      } else if (gov.decision === 'APPROVE' && gov.safeRisk === 0) {
        row.status = 'APPROVED';
      } else {
        row.status = 'PENDING_REVIEW';
        if (gov.decision === 'REVIEW') row.feedback = gov.reason;
      }

      // Smart carousel validation: warn if submitted count exceeds platform limit
      const carouselLimit = CAROUSEL_LIMITS[row.platform];
      if (carouselLimit !== undefined && urlsToSave.length > carouselLimit) {
        const warning = `Carousel limit: ${row.platform} supports max ${carouselLimit} item${carouselLimit === 1 ? '' : 's'} — you submitted ${urlsToSave.length}, only the first ${carouselLimit} will be posted.`;
        row.feedback = row.feedback ? `${row.feedback}\n\n${warning}` : warning;
      }
    }

    // Insert resiliently. risk_level / risk_score / agent_id are written for the
    // Review Queue's risk display, but those columns may not exist yet in every
    // environment (pending migration). Rather than 500 the entire publish on a
    // missing display column, strip whatever column PostgREST reports as unknown
    // and retry. The routing decision (status) and the workflow wiring below
    // rely only on base columns, so stripping these never breaks publishing.
    // Fallback status to use when the live intent_status enum is missing a value
    // we tried to write (until the matching migration is applied). A blocked post
    // still surfaces as BLOCKED in the Workflows view (that badge comes from the
    // linked workflow instance's verdict, not this status), so a terminal
    // REJECTED keeps it out of the human review console while never 500-ing the
    // publish. See migrations/intent_status_governance_blocked.sql.
    const ENUM_STATUS_FALLBACK: Record<string, string> = {
      GOVERNANCE_BLOCKED: 'REJECTED',
    };
    let data: any[] | null = null;
    let error: any = null;
    let rowsToInsert = intentsToCreate as any[];
    const strippedColumns: string[] = [];
    const remappedStatuses: string[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const res2 = await supabaseAdmin.from('publish_intents').insert(rowsToInsert).select();
      if (!res2.error) { data = res2.data; error = null; break; }
      error = res2.error;
      const msg = res2.error.message || '';
      const missing = /Could not find the '([^']+)' column/.exec(msg);
      if (missing) {
        const col = missing[1];
        strippedColumns.push(col);
        rowsToInsert = rowsToInsert.map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [col]: _omit, ...rest } = r;
          return rest;
        });
        logger.warn({ col }, '[Governance] publish_intents missing column — retrying insert without it');
        continue;
      }
      // Invalid enum value (e.g. 'GOVERNANCE_BLOCKED' not yet added to
      // intent_status). Remap the offending status to a valid fallback and retry
      // rather than 500-ing the whole publish.
      const badEnum = /invalid input value for enum \w+: "([^"]+)"/.exec(msg);
      if (badEnum) {
        const badVal = badEnum[1];
        const fallback = ENUM_STATUS_FALLBACK[badVal] || 'PENDING_REVIEW';
        remappedStatuses.push(`${badVal}→${fallback}`);
        rowsToInsert = rowsToInsert.map((r) =>
          r.status === badVal ? { ...r, status: fallback } : r,
        );
        logger.warn({ badVal, fallback }, '[Governance] intent_status enum missing value — remapping and retrying (apply intent_status_governance_blocked.sql)');
        continue;
      }
      break; // a different error — don't loop
    }

    if (error || !data) {
      logger.error({ error, sample: intentsToCreate[0] }, '[Governance] publish_intents insert failed');
      return res.status(500).json({
        success: false,
        error: error?.message || 'Insert failed',
        detail: (error as any)?.details || (error as any)?.hint || null,
      });
    }
    if (remappedStatuses.length > 0) {
      logger.warn({ remappedStatuses }, '[Governance] published with remapped intent_status — apply intent_status_governance_blocked.sql for the real status');
    }
    if (strippedColumns.length > 0) {
      logger.warn({ strippedColumns }, '[Governance] published with missing columns stripped — apply migration to enable risk display');
    }

    // Mirror each post into Agent Operations for policy checks (non-blocking).
    try {
      const creatorName = req.user?.full_name || req.user?.email?.split('@')[0] || null;
      await Promise.all(data.map((intent: any) => recordPublishIntentRun({ ...intent, creator_name: creatorName })));
    } catch (err) {
      logger.warn({ err }, '[Governance] operations mirror failed (non-blocking)');
    }

    // Bridge: create approval_items for PENDING_REVIEW posts so they surface in the Approval Console.
    // Non-blocking — publish always succeeds regardless of this bridge.
    const pendingPosts = (data || []).filter((r: any) => r.status === 'PENDING_REVIEW');
    await Promise.all(pendingPosts.map(async (intent: any) => {
      try {
        await createApprovalItem({
          tenant_id: targetWorkspaceId,
          workspace_id: targetWorkspaceId,
          item_type: 'PUBLISHING_ACTION',
          source_module: 'publish',
          source_entity_id: intent.id,
          title: (intent.content || '').slice(0, 80).trim() || `${intent.platform || 'Social'} post`,
          submitted_by: userId,
          risk_level: intent.risk_level || 'LOW',
        });
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err), intentId: intent.id }, '[Governance] approval_item bridge failed for intent');
      }
    }));

    // Auto-publish the 100%-clean, high-autonomy posts (status pre-set to
    // APPROVED above). Reuse the SAME governed path the manual approval flow
    // uses: the Decision Engine still gets the final say, and on clearance we
    // emit the same execution event. Best-effort per row — a failure here
    // leaves the post APPROVED for a human to push, never silently published.
    let autoPublished = 0;
    const autoRows = (data || []).filter((r: any) => r.status === 'APPROVED');
    for (const row of autoRows) {
      try {
        const decision = await evaluateIntent(row.id, '', targetWorkspaceId);
        if (!decision.governance_cleared) {
          await supabaseAdmin
            .from('publish_intents')
            .update({ status: 'GOVERNANCE_BLOCKED', decision_id: decision.decision_id, feedback: `Blocked by Decision Engine: ${decision.decision_class}` })
            .eq('id', row.id);
          await syncAgentRunFromIntent(row.id, 'GOVERNANCE_BLOCKED', `Blocked by Decision Engine: ${decision.decision_class}`);
          continue;
        }
        await supabaseAdmin
          .from('publish_intents')
          .update({ decision_id: decision.decision_id })
          .eq('id', row.id);
        await syncAgentRunFromIntent(row.id, 'APPROVED');
        internalEventBus.emit('execution.requested', { intentId: row.id, orgId: targetWorkspaceId });
        autoPublished++;
        logger.info({ intentId: row.id }, '[Governance] auto-published (100% clean + L4+ autonomous agent)');
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err), intentId: row.id }, '[Governance] auto-publish failed; left APPROVED for manual push');
      }
    }

    // Additively link each published post to a governed Publishing Workflow
    // instance (visible on the Workflows page). Best-effort — never blocks.
    logger.info({ count: data.length, workspace: targetWorkspaceId }, '[publish-link] submitIntent → linking posts to workflow');
    Promise.all(
      data.map((intent: any) =>
        linkPublishToWorkflow({
          workspaceId: targetWorkspaceId,
          startedBy: userId,
          platform: intent.platform,
          content: intent.caption ?? intent.content ?? '',
          postId: intent.id,
          scheduled: false,
          // Pass attached media so the workflow/card verdict also scans images.
          imageUrls: intent.media_urls ?? (intent.media_url ? [intent.media_url] : []),
        }),
      ),
    )
      .then((ids) => logger.info({ instanceIds: ids }, '[publish-link] submitIntent link result'))
      .catch((err) => logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[Governance] workflow link failed (non-blocking)'));

    try {
      await logAuditEvent({
        workspaceId: targetWorkspaceId,
        actorId: userId,
        actorType: 'USER',
        action: `Submitted ${data.length} intent(s) for review`,
        objectType: 'PUBLISH_INTENT',
        module: 'Governance',
        metadata: { count: data.length },
      });
    } catch (err) {
      logger.error({ err, secops_alert: true, source: 'governanceController' }, 'Direct publish audit event write failed');
      alertSecOpsAuditFailure({ alert_type: 'audit_write_failure', severity: 'critical', message: 'Direct publish audit event write failed', source: 'governanceController', details: { error: String(err) } });
    }

    res.status(200).json({
      success: true,
      count: data.length,
      autoPublished,
      inReview: data.length - autoPublished,
    });
  } catch (error) {
    next(error);
  }
};

export const transitionStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { intentId, newStatus, feedback } = req.body;
    const userId = req.user?.id;

    if (!intentId || !newStatus || !userId) {
      res.status(400).json({ error: 'Missing required governance fields' });
      return;
    }

    const isSuperAdmin = req.user?.is_superadmin;
    const userRole = req.user?.role || (isSuperAdmin ? 'ADMIN' : 'CREATOR');

    if (userRole === 'CREATOR' && newStatus !== 'CANCELLED' && !isSuperAdmin) {
      return res.status(403).json({ error: 'Creators can only cancel their own intents' });
    }

    const targetWorkspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    await logAuditEvent({
      workspaceId: targetWorkspaceId,
      actorId: userId,
      actorType: 'USER',
      action: `Transitioning ${intentId} to ${newStatus} by ${userRole}`,
      objectType: 'PUBLISH_INTENT',
      objectId: intentId,
      module: 'Governance',
      metadata: { newStatus, feedback },
    });

    if (newStatus === 'APPROVED') {
      const { data: intent, error: fetchErr } = await supabaseAdmin
        .from('publish_intents')
        .select('*')
        .eq('id', intentId)
        .single();

      if (fetchErr || !intent) throw new Error('Intent context missing');

      // Separation of Duties: Creators cannot approve their own content
      if (intent.creator_id === userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'Separation of Duties: Creators cannot approve their own content.' });
      }

      const currentPath = intent.approval_level ? intent.approval_level.split(' -> ') : ['MANAGER'];
      const currentStatus = intent.status;
      const currentRequiredRole = currentStatus.startsWith('PENDING_') ? currentStatus.replace('PENDING_', '') : currentPath[0];

      if (!ApprovalEngine.canUserApprove(userRole, currentRequiredRole, isSuperAdmin)) {
        return res.status(403).json({ error: `You do not have the required role (${currentRequiredRole}) to approve this step.` });
      }

      // Log Emergency Override if bypassed
      if (isSuperAdmin && !ApprovalEngine.canUserApprove(userRole, currentRequiredRole, false)) {
        await logAuditEvent({
          workspaceId: targetWorkspaceId,
          actorId: userId,
          actorType: 'USER',
          action: 'EMERGENCY_OVERRIDE_ACTIVATED',
          objectType: 'PUBLISH_INTENT',
          objectId: intentId,
          module: 'Governance',
          riskLevel: intent.risk_level,
          metadata: { bypassedRole: currentRequiredRole, reason: feedback || 'No reason provided' },
        });
      }

      const currentIndex = currentPath.indexOf(currentRequiredRole);
      const nextRole = currentPath[currentIndex + 1];

      let statusToSet = 'APPROVED';
      if (nextRole && !isSuperAdmin) {
        statusToSet = `PENDING_${nextRole}`;
      }

      if (statusToSet === 'APPROVED') {
        const decisionResult = await evaluateIntent(intentId, '', intent.workspace_id);

        logger.info({ intentId, decisionResult }, '[Governance] Decision Engine evaluated intent');

        if (!decisionResult.governance_cleared) {
          await supabaseAdmin
            .from('publish_intents')
            .update({ status: 'GOVERNANCE_BLOCKED', decision_id: decisionResult.decision_id, feedback: `Blocked by Decision Engine: ${decisionResult.decision_class}` })
            .eq('id', intentId);

          return res.status(403).json({
            error: 'Governance blocked',
            decision_class: decisionResult.decision_class,
            decision_id: decisionResult.decision_id,
          });
        }

        // Global Context Scan (Pre-Publishing Check)
        // Ensure content is contextually safe for target market before final authorization
        const contextSafe = true; // Placeholder for await runGlobalContextScan(intent.content, intent.platform);
        if (!contextSafe) {
          return res.status(403).json({ error: 'Global Context Block: Emerging market risk detected. Approval paused.' });
        }

        const { data, error } = await supabaseAdmin
          .from('publish_intents')
          .update({ status: statusToSet, feedback: feedback || null, decision_id: decisionResult.decision_id })
          .eq('id', intentId)
          .select()
          .single();

        if (error) throw error;

        logger.info(`[Governance] Governance cleared for ${intentId}. Emitting execution.requested...`);
        internalEventBus.emit('execution.requested', { intentId, orgId: intent.workspace_id });
        return res.status(200).json({ success: true, data });
      } else {
        const { data, error } = await supabaseAdmin
          .from('publish_intents')
          .update({ status: statusToSet, feedback: feedback || `Approved by ${userRole}. Moving to ${nextRole} review.` })
          .eq('id', intentId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ success: true, data });
      }
    }

    if (newStatus === 'REJECTED' || newStatus === 'GOVERNANCE_BLOCKED') {
      const { data: intentToReject } = await supabaseAdmin
        .from('publish_intents')
        .select('agent_id')
        .eq('id', intentId)
        .single();
        
      if (intentToReject?.agent_id) {
        internalEventBus.emit('agent.trust.penalized', {
          agentId: intentToReject.agent_id,
          reason: `Content rejected or blocked during governance review.`,
          penalty: -5
        });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .update({ status: newStatus, feedback: feedback || null })
      .eq('id', intentId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Spoliation Check: Block deletion if under an active Legal Hold
    const { data: hold } = await supabaseAdmin
      .from('legal_holds')
      .select('id')
      .eq('object_id', id)
      .eq('object_type', 'PUBLISH_INTENT')
      .maybeSingle();

    if (hold) {
      return res.status(403).json({ 
        success: false, 
        error: 'Spoliation Block: This content is frozen under an active Legal Hold and cannot be deleted.' 
      });
    }

    let query = supabaseAdmin.from('publish_intents').delete().eq('id', id);

    if (req.user?.role !== 'ADMIN' && !req.user?.is_superadmin) {
      query = query.eq('creator_id', userId);
    }

    const { error } = await query;

    if (error) throw error;

    const targetWorkspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    await logAuditEvent({
      workspaceId: targetWorkspaceId,
      actorId: userId,
      actorType: 'USER',
      action: `Deleted publish intent ${id}`,
      objectType: 'PUBLISH_INTENT',
      objectId: String(id),
      module: 'Governance',
    });

    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const listIntents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getQueue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuperAdmin = req.user?.is_superadmin;
    const role = req.user?.role || (isSuperAdmin ? 'ADMIN' : null);
    const workspaceId = req.user?.workspace_id;

    if (!role && !isSuperAdmin) {
      return res.status(200).json({ success: true, data: [] });
    }

    // The Approval Console renders Pending / Approved / Rejected-Returned tabs and
    // matching stat cards, so the queue must include recently-decided intents too
    // — not just pending ones. Without the decided states the Approved/Rejected
    // indicators stay at 0 even straight after a decision. Bounded by a recent
    // window (see RECENT_QUEUE_LIMIT) so the payload stays small.
    const CONSOLE_DECIDED = new Set([
      'APPROVED', 'RELEASED', 'REJECTED', 'GOVERNANCE_BLOCKED', 'RETURNED',
    ]);
    const isConsoleVisible = (s: unknown): boolean =>
      typeof s === 'string' && (s.startsWith('PENDING_') || CONSOLE_DECIDED.has(s));
    const RECENT_QUEUE_LIMIT = 300;

    let query = supabaseAdmin.from('publish_intents').select('*');

    if (isSuperAdmin) {
      // Fetch all intents unfiltered, then filter in JS.
      // The status column is a PostgreSQL enum whose exact values are managed
      // in Supabase — using enum literals in the query risks "invalid input value"
      // errors whenever new status names are introduced. JS filtering is safer.
      const { data: allData, error: allErr } = await supabaseAdmin
        .from('publish_intents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(RECENT_QUEUE_LIMIT);

      if (allErr) {
        if ((allErr as any).code === '42P01') return res.status(200).json({ success: true, data: [] });
        throw allErr;
      }

      const visible = (allData || []).filter((r: any) => isConsoleVisible(r.status));
      return res.status(200).json({ success: true, data: visible });
    } else if (role === 'CREATOR') {
      // Creators see their own posts that need their attention or were decided
      // against them — returned for revision, rejected, or governance-blocked —
      // so a rejection notification's "View Details" can open the post here.
      query = query.eq('creator_id', userId).in('status', ['RETURNED', 'REJECTED', 'GOVERNANCE_BLOCKED']);
    } else {
      // Fetch pending intents scoped to this workspace, filter in JS to avoid
      // invalid enum errors from Postgres enum literals.
      if (!workspaceId) return res.status(200).json({ success: true, data: [] });
      const { data: allData, error: allErr } = await supabaseAdmin
        .from('publish_intents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(RECENT_QUEUE_LIMIT);

      if (allErr) {
        if ((allErr as any).code === '42P01') return res.status(200).json({ success: true, data: [] });
        throw allErr;
      }

      const visible = (allData || []).filter((r: any) => isConsoleVisible(r.status));
      return res.status(200).json({ success: true, data: visible });
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      if ((error as any).code === '42P01') {
        return res.status(200).json({ success: true, data: [] });
      }
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Review-queue action on an agent-routed post (publish_intents). Gives the
// Agent Review Queue the same Approve / Reject / Return actions the rest of the
// queue has, mapped onto the governed publish lifecycle:
//   • approve → Decision Engine clears it → emits execution.requested (publish);
//               if governance blocks, status becomes GOVERNANCE_BLOCKED.
//   • reject  → REJECTED  (with reason as feedback)
//   • return  → RETURNED  (back to the creator with the note)
// ─────────────────────────────────────────────────────────────────────────────
// Keep the linked Publishing Workflow run in sync with a review decision on the
// post. The instance is linked via trigger_source JSON ("post_id": intentId);
// without this the run stayed on its creation-time status (e.g. "Waiting").
async function syncWorkflowInstanceStatus(intentId: string, status: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('workflow_instances')
      .select('id, trigger_source')
      .ilike('trigger_source', `%${intentId}%`);
    const ids = (data || [])
      .filter((r: any) => {
        try {
          return JSON.parse(r.trigger_source)?.post_id === intentId;
        } catch {
          return false;
        }
      })
      .map((r: any) => r.id);
    if (ids.length > 0) {
      await supabaseAdmin.from('workflow_instances').update({ status }).in('id', ids);
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err), intentId }, '[review-action] workflow instance status sync failed (non-blocking)');
  }
}

// Best-effort: stamp who made the review decision + their comment, so the
// Workflows run detail (Approvals tab) can attribute the decision. These
// columns (reviewer_id / reviewer_feedback / reviewed_at) come from a later
// migration that may not be applied on every environment — so this is kept
// separate from the status update above and must never break the decision.
// Persist a review status + comment. `decision_id` comes from a later migration
// that may not be applied everywhere, so it's attempted but never required —
// status + feedback (the comment) always persist, which is what the run detail
// reads back. Without this split, a missing decision_id failed the whole write.
async function setIntentStatus(intentId: string, status: string, feedback: string | null, decisionId?: string) {
  if (decisionId) {
    const { error } = await supabaseAdmin
      .from('publish_intents')
      .update({ status, feedback, decision_id: decisionId })
      .eq('id', intentId);
    if (!error) return;
  }
  await supabaseAdmin
    .from('publish_intents')
    .update({ status, feedback })
    .eq('id', intentId);
}

async function recordReviewer(intentId: string, reviewerId: string, reason?: string) {
  try {
    // Try the richer columns first; on environments where reviewer_feedback /
    // reviewed_at aren't migrated yet this errors, so fall back to reviewer_id
    // alone (which is always present). The comment itself lives in `feedback`,
    // written by the status update, so attribution is never lost.
    const { error } = await supabaseAdmin
      .from('publish_intents')
      .update({ reviewer_id: reviewerId, reviewer_feedback: reason || null, reviewed_at: new Date().toISOString() })
      .eq('id', intentId);
    if (!error) return;
    const { error: fbErr } = await supabaseAdmin
      .from('publish_intents')
      .update({ reviewer_id: reviewerId })
      .eq('id', intentId);
    if (fbErr) {
      logger.warn({ err: fbErr.message, intentId }, '[review-action] reviewer attribution skipped');
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err), intentId }, '[review-action] reviewer attribution failed');
  }
}

// Persist a notification to the post's creator. Best-effort: a notification
// failure must never block the review decision. `type: 'POST_REJECTED'` is the
// signal the bell/notification panel uses to render the red rejection card
// (red heading + white reason).
async function notifyCreatorRejected(
  creatorId: string | null | undefined,
  reason: string | null | undefined,
  intentId: string,
): Promise<void> {
  if (!creatorId) return;
  try {
    await supabaseAdmin.from('notifications').insert({
      id: randomUUID(),
      user_id: creatorId,
      title: 'Your post has been rejected',
      body: reason && reason.trim()
        ? reason.trim()
        : 'A reviewer rejected this post. No reason was provided.',
      type: 'POST_REJECTED',
      // Deep-link straight to the Approval Console with this post focused; the
      // console selects it and opens the Rejected / Returned container.
      link: `/governance/reviews?item=${intentId}`,
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), intentId },
      '[review-action] creator rejection notification skipped',
    );
  }
}

export const reviewActionIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const intentId = String(req.params.id);
    const { action, reason } = req.body as { action?: string; reason?: string };
    if (!action || !['approve', 'reject', 'return'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be approve, reject, or return' });
    }

    const { data: intent, error: fetchErr } = await supabaseAdmin
      .from('publish_intents')
      .select('*')
      .eq('id', intentId)
      .single();
    if (fetchErr || !intent) return res.status(404).json({ success: false, error: 'Post not found' });

    const workspaceId = intent.workspace_id || req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';

    const auditAction =
      action === 'approve' ? 'Approved agent post' : action === 'reject' ? 'Rejected agent post' : 'Returned agent post to creator';
    await logAuditEvent({
      workspaceId, actorId: userId, actorType: 'USER', action: auditAction,
      objectType: 'PUBLISH_INTENT', objectId: intentId, module: 'Review Queue',
      metadata: { action, reason: reason || null },
    }).catch(() => undefined);

    if (action === 'approve') {
      // Re-run the governed decision for the audit record, but the human
      // reviewer's approval is the governing decision in the Approval Console —
      // this console IS the escalation target. So only a HARD reject (high-risk
      // ≥80 or a regulatory policy violation, i.e. decision.status === 'REJECTED')
      // overrides the reviewer. An ESCALATED outcome merely means "a human must
      // decide", which has now happened, so it proceeds to publish. Previously
      // any non-cleared decision — including routine escalations and the
      // resiliency-mode escalation triggered by a transient governance-DB hiccup
      // — silently re-blocked the post, so reviewers could never approve &
      // publish a flagged/warning post.
      // The re-evaluation must never crash the human decision. If the Decision
      // Engine (e.g. the content-safety classifier / Groq) is unavailable, we
      // defer to the reviewer who explicitly approved rather than 500-ing.
      let decision: Awaited<ReturnType<typeof evaluateIntent>> | null = null;
      try {
        decision = await evaluateIntent(intentId, '', workspaceId);
      } catch (evalErr) {
        logger.warn(
          { err: evalErr instanceof Error ? evalErr.message : String(evalErr), intentId },
          '[review-action] decision re-evaluation failed — honoring reviewer approval',
        );
      }
      if (decision && decision.status === 'REJECTED') {
        await setIntentStatus(intentId, 'GOVERNANCE_BLOCKED', `Blocked by Decision Engine: ${decision.decision_class}`, decision.decision_id);
        await recordReviewer(intentId, userId, reason);
        await syncWorkflowInstanceStatus(intentId, 'blocked');
        await syncAgentRunFromIntent(intentId, 'GOVERNANCE_BLOCKED', `Blocked by Decision Engine: ${decision.decision_class}`);
        return res.status(200).json({ success: true, blocked: true, data: { status: 'GOVERNANCE_BLOCKED', decision_class: decision.decision_class } });
      }
      await setIntentStatus(intentId, 'APPROVED', reason || null, decision?.decision_id);
      await recordReviewer(intentId, userId, reason);
      await syncWorkflowInstanceStatus(intentId, 'completed');
      await syncAgentRunFromIntent(intentId, 'APPROVED');
      internalEventBus.emit('execution.requested', { intentId, orgId: workspaceId });
      return res.status(200).json({ success: true, data: { status: 'APPROVED' } });
    }

    if (action === 'reject') {
      if (intent.agent_id) {
        internalEventBus.emit('agent.trust.penalized', { agentId: intent.agent_id, reason: 'Agent post rejected in Review Queue.', penalty: -5 });
      }
      await supabaseAdmin
        .from('publish_intents')
        .update({ status: 'REJECTED', feedback: reason || null })
        .eq('id', intentId);
      await recordReviewer(intentId, userId, reason);
      await syncWorkflowInstanceStatus(intentId, 'failed');
      await syncAgentRunFromIntent(intentId, 'REJECTED', reason ? `Rejected: ${reason}` : 'Rejected by reviewer');
      // Notify the post's creator (whoever they are) that it was rejected, with
      // the reviewer's reason. Persisted so it shows even if they were offline.
      await notifyCreatorRejected(intent.creator_id, reason, intentId);
      return res.status(200).json({ success: true, data: { status: 'REJECTED' } });
    }

    // return → send back to creator for revision
    await supabaseAdmin
      .from('publish_intents')
      .update({ status: 'RETURNED', feedback: reason || null })
      .eq('id', intentId);
    await recordReviewer(intentId, userId, reason);
    await syncWorkflowInstanceStatus(intentId, 'cancelled');
    await syncAgentRunFromIntent(intentId, 'RETURNED');
    return res.status(200).json({ success: true, data: { status: 'RETURNED' } });
  } catch (error) {
    next(error);
  }
};

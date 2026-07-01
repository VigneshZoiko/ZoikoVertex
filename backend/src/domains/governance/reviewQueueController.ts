import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/authMiddleware';
import { createAuditEvent } from '../../services/auditTrail.service';
import { supabaseAdmin } from '../../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as reviewQueueService from '../../services/reviewQueue.service';
import * as validationService from '../../services/validationDesk.service';
import * as reviewEvidence from '../../services/reviewEvidence.service';
import { DEFAULT_TENANT_ID } from '../../shared/constants';
import { buildAuthContext } from '../../shared/serviceAuth';

async function getTenantId(req: AuthRequest): Promise<string> {
  return req.user?.workspace_id || DEFAULT_TENANT_ID;
}

export async function createItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const auth = buildAuthContext(req.user);

    const body = req.body as {
      workspace_id: string;
      item_type: string;
      source_module: string;
      source_entity_id: string;
      title: string;
      content_snapshot?: Record<string, unknown>;
      platform?: string;
      campaign_id?: string;
      priority?: string;
      risk_level?: string;
      risk_category?: string;
      due_at?: string;
    };

    const item = await reviewQueueService.createReviewItem({
      tenant_id: tenantId,
      workspace_id: body.workspace_id || tenantId,
      item_type: body.item_type as any,
      source_module: body.source_module,
      source_entity_id: body.source_entity_id,
      title: body.title,
      content_snapshot: body.content_snapshot,
      platform: body.platform,
      campaign_id: body.campaign_id,
      submitted_by: userId,
      priority: body.priority as any,
      risk_level: body.risk_level as any,
      risk_category: body.risk_category,
      due_at: body.due_at,
    }, auth);

    await logReviewAuditEvent({
      workspaceId: tenantId, userId, itemId: item.id,       action: 'review.item.submitted',
      summary: `Review item "${item.title}" created`, itemType: item.item_type, riskLevel: item.risk_level,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

async function resolveUserInfo(userIds: string[]): Promise<Record<string, { name: string; role: string }>> {
  if (!userIds.length) return {};
  const [usersRes, membersRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, full_name, email').in('id', userIds),
    supabaseAdmin.from('workspace_members').select('user_id, role').in('user_id', userIds),
  ]);
  const roleMap: Record<string, string> = {};
  (membersRes.data || []).forEach((m: any) => { roleMap[m.user_id] = m.role; });
  const map: Record<string, { name: string; role: string }> = {};
  (usersRes.data || []).forEach((u: any) => {
    map[u.id] = { name: u.full_name || u.email || 'Unknown', role: roleMap[u.id] || 'Creator' };
  });
  return map;
}

export async function listItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const q = req.query as Record<string, string>;

    const result = await reviewQueueService.listReviewItems({
      tenant_id: tenantId,
      status: q.status ? q.status.split(',') : undefined,
      assigned_to: q.assigned_to || undefined,
      risk_level: q.risk_level || undefined,
      priority: q.priority || undefined,
      item_type: q.item_type || undefined,
      source_module: q.source_module || undefined,
      search: q.search || undefined,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });

    const rawItems: any[] = (result as any).items || [];
    const userIds = [...new Set(rawItems.map((i: any) => i.submitted_by).filter(Boolean))] as string[];
    const userMap = await resolveUserInfo(userIds);
    const enrichedItems = rawItems.map((i: any) => ({
      ...i,
      submitter_name: userMap[i.submitted_by]?.name,
      submitter_role: userMap[i.submitted_by]?.role,
    }));

    res.json({ success: true, ...(result as any), items: enrichedItems });
  } catch (error) {
    next(error);
  }
}

export async function getItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const item = await reviewQueueService.getReviewItem(params.id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const decisions = await reviewQueueService.listReviewDecisions(item.id);
    const notes = await reviewQueueService.listReviewNotes(item.id);
    const auditLog = await reviewQueueService.listReviewAuditLog(item.id);

    const userRole = (req.user as any)?.role || 'REVIEWER';
    const eligibility = reviewQueueService.calculateEligibility(item, String(userRole).toUpperCase());

    const submittedBy = (item as any).submitted_by;
    const userMap = submittedBy ? await resolveUserInfo([submittedBy]) : {};

    // Backfill content_snapshot from source validation item when it was not stored
    let contentSnapshot = (item as any).content_snapshot || {};
    const hasMedia = Array.isArray(contentSnapshot.urls) && contentSnapshot.urls.length > 0;
    if (!hasMedia && (item as any).source_module === 'validation_desk' && (item as any).source_entity_id) {
      try {
        const sourceItem = await validationService.getValidationItem((item as any).source_entity_id);
        if (sourceItem?.content_snapshot && Array.isArray((sourceItem.content_snapshot as any).urls)) {
          contentSnapshot = sourceItem.content_snapshot as Record<string, unknown>;
        }
      } catch { /* non-blocking */ }
    }

    const enrichedItem = {
      ...(item as any),
      content_snapshot: contentSnapshot,
      submitter_name: userMap[submittedBy]?.name,
      submitter_role: userMap[submittedBy]?.role,
    };

    res.json({
      success: true,
      data: {
        ...enrichedItem,
        decisions,
        notes,
        auditLog,
        eligibility,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function takeAction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const auth = buildAuthContext(req.user);

    const params = req.params as { id: string };
    const id = params.id;
    const { action, reason, note, new_urls, content: resubmitContent, topic: resubmitTopic } = req.body;

    const item = await reviewQueueService.getReviewItem(id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });
    const workspaceId: string = (item as any).workspace_id || tenantId;

    const userRole = String((req.user as any)?.role || 'REVIEWER').toUpperCase();
    const eligibility = reviewQueueService.calculateEligibility(item, userRole);

    if (eligibility === 'BLOCKED') {
      return res.status(423).json({ error: 'Action blocked: item is in blocked state' });
    }

    if (action === 'approve') {
      if (eligibility === 'ELEVATED_APPROVAL_REQUIRED') {
        return res.status(403).json({ error: 'Elevated approval required for critical risk items' });
      }
      if (eligibility === 'REVISION_REQUIRED') {
        return res.status(400).json({ error: 'Revision required before approval' });
      }
      if (eligibility === 'ESCALATION_REQUIRED') {
        return res.status(400).json({ error: 'Item must be escalated before approval' });
      }

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'APPROVED', userId,
      }, auth);
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'APPROVED', reason, note, decided_by: userId,
      }, auth);

      // ── Critical: update media_library FIRST before any side-effects that could throw ──
      // If notifications or audit events fail, the media asset must still become available.
      if (item.source_module === 'media_library' && item.source_entity_id) {
        const approveUpdate: Record<string, unknown> = { status: 'available' };
        const snapshotUrls = (item as any).content_snapshot?.urls;
        if (Array.isArray(snapshotUrls) && snapshotUrls.length > 0) {
          approveUpdate.urls = snapshotUrls;
          approveUpdate.url = snapshotUrls[0];
        }
        await supabaseAdmin.from('media_library').update(approveUpdate).eq('id', item.source_entity_id).eq('workspace_id', workspaceId);
      }

      // Non-critical side-effects — fire-and-forget so a failure never prevents the response
      supabaseAdmin.from('notifications').insert({
        id: uuidv4(),
        user_id: item.submitted_by,
        title: '✅ Media Approved by Reviewer',
        body: `Your media "${item.title}" has been reviewed and approved. ${note ? 'Reviewer note: ' + note : ''}`,
        type: 'GOVERNANCE',
        link: '/review-queue',
        read: false,
      }).then(undefined, () => {});

      logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.approved',
        summary: `Review item "${item.title}" approved`,
        itemType: item.item_type, riskLevel: item.risk_level,
      }).catch(() => {});

      await reviewEvidence.safeRecord('approve', () => reviewEvidence.recordApprove({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'reject') {
      if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'REJECTED', feedback: note, userId,
      }, auth);
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'REJECTED', reason, note, decided_by: userId,
      }, auth);

      // Critical: update media_library FIRST
      if (item.source_module === 'media_library' && item.source_entity_id) {
        await supabaseAdmin.from('media_library').update({ status: 'blocked' }).eq('id', item.source_entity_id).eq('workspace_id', workspaceId);
      }

      supabaseAdmin.from('notifications').insert({
        id: uuidv4(),
        user_id: item.submitted_by,
        title: '❌ Media Rejected by Reviewer',
        body: `Your media "${item.title}" was rejected. Reason: ${reason}. ${note ? 'Note: ' + note : ''}`,
        type: 'GOVERNANCE',
        link: '/review-queue',
        read: false,
      }).then(undefined, () => {});

      logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.rejected',
        summary: `Review item "${item.title}" rejected: ${reason}`,
        itemType: item.item_type, riskLevel: item.risk_level,
      }).catch(() => {});

      await reviewEvidence.safeRecord('reject', () => reviewEvidence.recordReject({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'request_revision') {
      if (!note) return res.status(400).json({ error: 'Revision instructions are required' });

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'AWAITING_REVISION', feedback: note, userId,
      }, auth);
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'REVISION_REQUESTED', reason, note, decided_by: userId,
      }, auth);

      await supabaseAdmin.from('review_notes').insert({
        review_item_id: id,
        note_body: note,
        created_by: userId,
      });

      // Notify creator with revision instructions (non-critical)
      supabaseAdmin.from('notifications').insert({
        id: uuidv4(),
        user_id: item.submitted_by,
        title: '🔄 Post Returned — Revision Required',
        body: `Your submission "${item.title}" was returned by the reviewer with instructions: ${note}. Go to Returned Items to view and resubmit.`,
        type: 'GOVERNANCE',
        link: '/returned',
        read: false,
      }).then(undefined, () => {});

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.revision_requested',
        summary: `Revision requested for "${item.title}"`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      await reviewEvidence.safeRecord('request_revision', () => reviewEvidence.recordRequestRevision({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'resubmit') {
      // Build the content_snapshot patch (merge updated media, captions, topic)
      const existing = (item as any).content_snapshot || {};
      const snapshotPatch: Record<string, unknown> = {};
      if (new_urls?.length) snapshotPatch.urls = new_urls;
      if (resubmitTopic) snapshotPatch.topic = resubmitTopic;
      if (resubmitContent?.universal !== undefined) {
        snapshotPatch.copy = resubmitContent.universal;
        snapshotPatch.universal = resubmitContent.universal;
      }
      if (resubmitContent?.platforms && Object.keys(resubmitContent.platforms).length > 0) {
        snapshotPatch.platform_captions = resubmitContent.platforms;
      }

      // Single atomic update: status, assigned_to clear, and optional snapshot patch.
      // We use supabaseAdmin directly (bypasses the service's queue:manage permission gate)
      // because CREATOR role is allowed to resubmit their own items via returnedWrite middleware.
      const newTitle = resubmitContent?.universal?.trim()
        ? resubmitContent.universal.slice(0, 80).trim()
        : resubmitTopic?.trim()
          ? resubmitTopic.slice(0, 80).trim()
          : null;
      const resubmitFields: Record<string, unknown> = {
        status: 'PENDING_REVIEW',
        assigned_to: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(newTitle ? { title: newTitle } : {}),
      };
      if (Object.keys(snapshotPatch).length > 0) {
        resubmitFields.content_snapshot = { ...existing, ...snapshotPatch };
      }

      const { data: updated, error: resubmitError } = await supabaseAdmin
        .from('review_items')
        .update(resubmitFields)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (resubmitError) throw resubmitError;

      // Upsert an approval_items entry so the item also appears in the Approval Console
      const { data: existingApproval } = await supabaseAdmin
        .from('approval_items')
        .select('id')
        .eq('source_entity_id', id)
        .eq('source_module', 'review_queue')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingApproval) {
        await supabaseAdmin
          .from('approval_items')
          .update({ approval_status: 'PENDING_APPROVAL', updated_at: new Date().toISOString() })
          .eq('id', existingApproval.id)
          .eq('tenant_id', tenantId);
      } else {
        await supabaseAdmin.from('approval_items').insert({
          id: uuidv4(),
          tenant_id: tenantId,
          workspace_id: workspaceId,
          source_module: 'review_queue',
          source_entity_id: id,
          item_type: (item as any).item_type || 'SOCIAL_POST',
          title: item.title,
          approval_status: 'PENDING_APPROVAL',
          submitted_by: userId,
          risk_level: item.risk_level || 'LOW',
          required_approval_level: 1,
          submitted_at: new Date().toISOString(),
        });
      }

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.resubmitted',
        summary: `"${item.title}" resubmitted by creator for re-review`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      await reviewEvidence.safeRecord('resubmit', () => reviewEvidence.recordResubmit({ item, tenantId, workspaceId, userId, reason, note, auth, new_urls }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'escalate') {
      if (!reason) return res.status(400).json({ error: 'Escalation reason is required' });

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'ESCALATED', feedback: note, userId,
      }, auth);
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'ESCALATED', reason, note, decided_by: userId,
      }, auth);

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.escalated',
        summary: `Review item "${item.title}" escalated: ${reason}`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      // Notify all admins and governance admins in the workspace
      try {
        const { data: adminMembers } = await supabaseAdmin
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', tenantId)
          .in('role', ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN']);
        const adminIds: string[] = (adminMembers || []).map((m: any) => m.user_id).filter(Boolean);
        if (adminIds.length > 0) {
          await supabaseAdmin.from('notifications').insert(
            adminIds.map((adminId: string) => ({
              id: uuidv4(),
              user_id: adminId,
              title: '🚨 Escalation Alert: Review Item Requires Your Attention',
              body: `A review item "${item.title}" has been escalated and requires admin review. Reason: ${reason}${note ? '. Note: ' + note : ''}.`,
              type: 'ESCALATION',
              category: 'SECURITY',
              priority: 'HIGH',
              link: '/review-queue',
              read: false,
            }))
          );
        }
        // Also notify the creator that their item was escalated
        if (item.submitted_by && item.submitted_by !== userId) {
          await supabaseAdmin.from('notifications').insert({
            id: uuidv4(),
            user_id: item.submitted_by,
            title: '⬆️ Your Item Has Been Escalated',
            body: `Your review item "${item.title}" was escalated for admin review. Reason: ${reason}.`,
            type: 'ESCALATION',
            category: 'WORKFLOW',
            priority: 'HIGH',
            link: '/review-queue',
            read: false,
          });
        }
      } catch { /* non-blocking — notifications never fail the main action */ }

      await reviewEvidence.safeRecord('escalate', () => reviewEvidence.recordEscalate({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'override') {
      if (eligibility === 'OVERRIDE_PROHIBITED') {
        return res.status(403).json({ error: 'Override not allowed for this item' });
      }

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'APPROVED', feedback: note, userId,
      }, auth);
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'OVERRIDE_APPLIED', reason, note, decided_by: userId,
      }, auth);
      await reviewQueueService.recordOverride({
        review_item_id: id, override_reason: reason || 'Override applied',
        risk_acknowledgement: note, overridden_by: userId,
      }, auth);

      // Critical: update media_library FIRST
      if (item.source_module === 'media_library' && item.source_entity_id) {
        const overrideUpdate: Record<string, unknown> = { status: 'available' };
        const snapshotUrls = (item as any).content_snapshot?.urls;
        if (Array.isArray(snapshotUrls) && snapshotUrls.length > 0) {
          overrideUpdate.urls = snapshotUrls;
          overrideUpdate.url = snapshotUrls[0];
        }
        await supabaseAdmin.from('media_library').update(overrideUpdate).eq('id', item.source_entity_id).eq('workspace_id', workspaceId);
      }

      logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.override',
        summary: `Override applied to "${item.title}": ${reason}`,
        itemType: item.item_type, riskLevel: item.risk_level,
      }).catch(() => {});

      await reviewEvidence.safeRecord('override', () => reviewEvidence.recordOverride({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'assign') {
      const body = req.body as { assigned_to?: string; team?: string; due_at?: string };
      if (!body.assigned_to) return res.status(400).json({ error: 'Assignee required' });

      const updated = await reviewQueueService.assignReviewItem({
        id, tenant_id: tenantId, assigned_to: body.assigned_to, assigned_by: userId,
        team: body.team, due_at: body.due_at, note,
      }, auth);

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.assigned',
        summary: `Review item "${item.title}" assigned`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });

      await reviewEvidence.safeRecord('assign', () => reviewEvidence.recordAssign({ item, tenantId, workspaceId, userId, reason, note, auth, assigned_to: (req.body as any).assigned_to }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'release') {
      if (item.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Only approved items can be released' });
      }

      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'RELEASED', userId,
      }, auth);
      await reviewQueueService.recordDecision({
        review_item_id: id, decision_type: 'APPROVED', reason: 'Released to production', decided_by: userId,
      }, auth);

      // Critical: update media_library FIRST
      if (item.source_module === 'media_library' && item.source_entity_id) {
        const releaseUpdate: Record<string, unknown> = { status: 'available' };
        const snapshotUrls = (item as any).content_snapshot?.urls;
        if (Array.isArray(snapshotUrls) && snapshotUrls.length > 0) {
          releaseUpdate.urls = snapshotUrls;
          releaseUpdate.url = snapshotUrls[0];
        }
        await supabaseAdmin.from('media_library').update(releaseUpdate).eq('id', item.source_entity_id).eq('workspace_id', workspaceId);
      }

      logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.released',
        summary: `Review item "${item.title}" released`, itemType: item.item_type, riskLevel: item.risk_level,
      }).catch(() => {});

      await reviewEvidence.safeRecord('release', () => reviewEvidence.recordRelease({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'add_note') {
      if (!note) return res.status(400).json({ error: 'Note text required' });

      const result = await reviewQueueService.addReviewNote({
        review_item_id: id, note_body: note, created_by: userId,
      }, auth);

      await reviewEvidence.safeRecord('add_note', () => reviewEvidence.recordAddNote({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: result });
    }

    if (action === 'claim') {
      // Reviewer claims the item — removes from others' view, sets assigned_to
      if (item.assigned_to && item.assigned_to !== userId) {
        return res.status(409).json({ error: 'Item already claimed by another reviewer' });
      }
      const updated = await reviewQueueService.updateReviewItemStatus({
        id, tenant_id: tenantId, status: 'IN_REVIEW', userId,
      }, auth);
      // Set assigned_to
      await supabaseAdmin
        .from('review_items')
        .update({ assigned_to: userId })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.claimed',
        summary: `Review item "${item.title}" claimed by reviewer`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });
      await reviewEvidence.safeRecord('claim', () => reviewEvidence.recordClaim({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, data: updated });
    }

    if (action === 'unclaim') {
      // Reviewer releases item back to shared pool
      if (item.assigned_to && item.assigned_to !== userId) {
        return res.status(403).json({ error: 'You can only unclaim items assigned to you' });
      }
      await supabaseAdmin
        .from('review_items')
        .update({ assigned_to: null, status: 'PENDING_REVIEW' })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      await logReviewAuditEvent({
        workspaceId: tenantId, userId, itemId: id, action: 'review.item.unclaimed',
        summary: `Review item "${item.title}" returned to shared pool`,
        itemType: item.item_type, riskLevel: item.risk_level,
      });
      await reviewEvidence.safeRecord('unclaim', () => reviewEvidence.recordUnclaim({ item, tenantId, workspaceId, userId, reason, note, auth }));
      return res.json({ success: true, message: 'Item released back to shared review queue' });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    next(error);
  }
}

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const stats = await reviewQueueService.getReviewStats(tenantId, userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getEligibility(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const item = await reviewQueueService.getReviewItem(params.id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const userRole = String((req.user as any)?.role || 'REVIEWER').toUpperCase();
    const eligibility = reviewQueueService.calculateEligibility(item, userRole);

    res.json({ success: true, data: { eligibility, item_id: item.id } });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLog(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const params = req.params as { id: string };
    const item = await reviewQueueService.getReviewItem(params.id, tenantId);
    if (!item) return res.status(404).json({ error: 'Review item not found' });

    const log = await reviewQueueService.listReviewAuditLog(item.id);
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
}

export async function getReviewValidation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const itemId = req.params.id as string;
    const item = await reviewQueueService.getReviewItem(itemId, tenantId);
    if (!item) return res.json({ success: true, data: [] });

    // Link via source_entity_id from review item to validation_items.source_entity_id
    const sourceEntityId = item.source_entity_id;
    const { data: validationItems } = await supabaseAdmin
      .from('validation_items')
      .select('id')
      .eq('source_entity_id', sourceEntityId)
      .limit(1);

    if (validationItems && validationItems.length > 0) {
      const validationItemId = validationItems[0].id;
      const runs = await validationService.getValidationRuns(validationItemId);
      if (runs && runs.length > 0) {
        const results = await Promise.all(
          runs.map(r => validationService.getValidationRunResults((r as { id: string }).id).catch(() => null))
        );
        return res.json({ success: true, data: results.filter(Boolean) });
      }
    }

    res.json({ success: true, data: [] });
  } catch (error) { next(error); }
}

export async function getReviewPolicyFlags(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const itemId = req.params.id as string;
    const item = await reviewQueueService.getReviewItem(itemId, tenantId);
    if (!item) return res.json({ success: true, data: [] });

    // Query for policy flags from approval_rule_conflicts
    const sourceEntityId = item.source_entity_id;
    const { data: conflicts } = await supabaseAdmin
      .from('approval_rule_conflicts')
      .select('*')
      .or(`related_rule_id.eq.${sourceEntityId},approval_rule_id.eq.${sourceEntityId}`)
      .limit(10);

    res.json({ success: true, data: conflicts || [] });
  } catch (error) { next(error); }
}

export async function getReviewNotesHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const params = req.params as { id: string };
    const notes = await reviewQueueService.listReviewNotes(params.id);
    res.json({ success: true, data: notes });
  } catch (error) { next(error); }
}

export async function getReviewRevisionHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const params = req.params as { id: string };
    const decisions = await reviewQueueService.listReviewDecisions(params.id);
    res.json({ success: true, data: decisions });
  } catch (error) { next(error); }
}

export async function assignReviewItemHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenantId = await getTenantId(req);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const auth = buildAuthContext(req.user);
    const params = req.params as { id: string };
    const result = await reviewQueueService.assignReviewItem({ id: params.id, assigned_to: userId, assigned_by: userId, tenant_id: tenantId }, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function addReviewNoteHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const auth = buildAuthContext(req.user);
    const params = req.params as { id: string };
    const result = await reviewQueueService.addReviewNote({ review_item_id: params.id, note_body: req.body.note_body, created_by: userId }, auth);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function bulkReviewAction(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const action = req.params.action;
    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'item_ids array is required' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const auth = buildAuthContext(req.user);
    const results = [];
    for (const id of item_ids) {
      try {
        const result = await reviewQueueService.recordDecision({ review_item_id: id, decision_type: action as any, decided_by: userId, reason: req.body.reason || 'Bulk action' }, auth);
        results.push({ id, success: true, data: result });
      } catch (e: any) {
        results.push({ id, success: false, error: e.message });
      }
    }
    res.json({ success: true, data: results });
  } catch (error) { next(error); }
}

async function logReviewAuditEvent(params: {
  workspaceId: string;
  userId: string;
  itemId: string;
  action: string;
  summary: string;
  itemType: string;
  riskLevel: string;
}) {
  try {
    await createAuditEvent({
      workspace_id: params.workspaceId,
      tenant_id: params.workspaceId,
      event_category: 'approval',
      event_type: params.action as any,
      event_title: params.summary,
      event_summary: params.summary,
      actor: { actor_id: params.userId, actor_type: 'human_user' },
      object: { object_type: 'review_item', object_id: params.itemId },
      authority: { permission_used: 'queue:view' },
      risk_level: (params.riskLevel || 'low').toLowerCase() as any,
      status: 'success',
      evidence_state: 'not_preserved',
      retention_class: 'REGULATED',
    });
  } catch {
    // Silent fail for audit logging
  }
}

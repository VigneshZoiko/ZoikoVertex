import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { logToDatabase } from '../../shared/databaseLogger';
import { internalEventBus } from '../../shared/internalEventBus';
import { AuthRequest } from '../../shared/authMiddleware';

import { evaluateIntent } from '../decisions/decisionEngine';
import { ApprovalEngine } from '../decisions/approvalEngine';
import { logAuditEvent } from './evidenceController';

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
});

export const submitIntent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { content, mediaUrls, mediaUrl, targetAccountIds } = SubmitIntentSchema.parse(req.body);
    const platformPostTypes: Record<string, string> = req.body.platformPostTypes || {};
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User context missing' });
    }

    const urlsToSave = mediaUrls || (mediaUrl ? [mediaUrl] : []);

    const workspaceId = req.user?.workspace_id;
    const isSuperAdmin = req.user?.is_superadmin;

    if (!workspaceId && !isSuperAdmin) {
      return res.status(403).json({ error: 'User is not associated with a workspace' });
    }

    const targetWorkspaceId = workspaceId || '00000000-0000-0000-0000-000000000000'; // Default Dev Workspace for God Mode

    const { data: accounts, error: accError } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform')
      .in('id', targetAccountIds);

    if (accError) throw accError;

    const intentsToCreate = accounts.map((acc) => {
      let finalCaption = content.universal;
      if (content.platforms && content.platforms[acc.platform]) {
        finalCaption = content.platforms[acc.platform];
      }
      const postType = platformPostTypes[acc.platform] || null;

      return {
        workspace_id: targetWorkspaceId,
        creator_id: userId,
        target_account_ids: [acc.id],
        content: finalCaption,
        media_urls: urlsToSave,
        media_url: urlsToSave[0] || null,
        status: 'APPROVED',
        platform: acc.platform,
        // post_type stored in risk_factors metadata until a dedicated column is migrated
        risk_level: 'LOW',
        risk_score: 0,
        risk_factors: postType ? [{ type: 'post_type', value: postType }] : [],
        requires_approval: false,
        approval_level: 'AUTO_APPROVE',
      };
    });

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .insert(intentsToCreate)
      .select();

    if (error) throw error;

    // Fire execution immediately for all intents
    for (const intent of data) {
      internalEventBus.emit('execution.requested', { intentId: intent.id });
    }

    await logAuditEvent({
      workspaceId: targetWorkspaceId,
      actorId: userId,
      actorType: 'USER',
      action: `Directly publishing ${data.length} intents (testing mode)`,
      objectType: 'PUBLISH_INTENT',
      module: 'Governance',
      metadata: { count: data.length },
    });

    res.status(200).json({
      success: true,
      count: data.length,
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

    const userRoleResult = req.user?.workspace_id ? await supabaseAdmin.from('workspace_members').select('role').eq('user_id', userId).eq('workspace_id', req.user.workspace_id).maybeSingle() : null;
    const userRole = userRoleResult?.data?.role || (req.user?.is_superadmin ? 'ADMIN' : 'CREATOR');
    const isSuperAdmin = req.user?.is_superadmin;

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

    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    let query = supabaseAdmin.from('publish_intents').delete().eq('id', id);

    if (member?.role !== 'ADMIN' && !req.user?.is_superadmin) {
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
    const workspaceId = req.user?.workspace_id;

    const userRoleResult = workspaceId
      ? await supabaseAdmin.from('workspace_members').select('role').eq('user_id', userId).eq('workspace_id', workspaceId).maybeSingle()
      : null;
    const role = userRoleResult?.data?.role || (isSuperAdmin ? 'ADMIN' : null);

    if (!role && !isSuperAdmin) {
      return res.status(200).json({ success: true, data: [] });
    }

    let query = supabaseAdmin.from('publish_intents').select('*');

    if (isSuperAdmin) {
      // Fetch all intents unfiltered, then filter in JS.
      // The status column is a PostgreSQL enum whose exact values are managed
      // in Supabase — using enum literals in the query risks "invalid input value"
      // errors whenever new status names are introduced. JS filtering is safer.
      const { data: allData, error: allErr } = await supabaseAdmin
        .from('publish_intents')
        .select('*')
        .order('created_at', { ascending: false });

      if (allErr) {
        if ((allErr as any).code === '42P01') return res.status(200).json({ success: true, data: [] });
        throw allErr;
      }

      const pending = (allData || []).filter((r: any) =>
        typeof r.status === 'string' && r.status.startsWith('PENDING_')
      );
      return res.status(200).json({ success: true, data: pending });
    } else if (role === 'CREATOR') {
      query = query.eq('creator_id', userId).eq('status', 'RETURNED');
    } else {
      query = query.eq('status', `PENDING_${role}`);
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

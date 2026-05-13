import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { logToDatabase } from '../../shared/databaseLogger';
import { internalEventBus } from '../../shared/internalEventBus';
import { AuthRequest } from '../../shared/authMiddleware';
import { RiskClassifier } from '../decisions/riskClassifier';
import { evaluateIntent } from '../decisions/decisionEngine';
import { ApprovalEngine } from '../../services/governance/approvalEngine';

const SubmitIntentSchema = z.object({
  content: z.object({
    universal: z.string().min(1),
    platforms: z.record(z.string(), z.string()).optional(),
  }),
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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User context missing' });
    }

    const urlsToSave = mediaUrls || (mediaUrl ? [mediaUrl] : []);

    // 1. Fetch workspace_id for the user
    const { data: member, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .single();

    if (memberError) throw memberError;

    // 2. Fetch account details
    const { data: accounts, error: accError } = await supabaseAdmin
      .from('connected_accounts')
      .select('id, platform')
      .in('id', targetAccountIds);

    if (accError) throw accError;

    // 3. Create separate intents for each account with risk assessment
    const intentsToCreate = accounts.map((acc) => {
      let finalCaption = content.universal;
      if (content.platforms && content.platforms[acc.platform]) {
        finalCaption = content.platforms[acc.platform];
      }

      // Assess risk for this content
      const riskAssessment = RiskClassifier.assessContent(
        finalCaption,
        acc.platform,
      );

      // Determine approval path using the new engine
      const approvalPath = ApprovalEngine.getApprovalPath({
        platform: acc.platform,
        risk_level: riskAssessment.level,
        // Add other factors if available in the future
      });

      return {
        workspace_id: member.workspace_id,
        creator_id: userId,
        target_account_ids: [acc.id],
        content: finalCaption,
        media_urls: urlsToSave,
        media_url: urlsToSave[0] || null,
        status: approvalPath.length > 0 ? `PENDING_${approvalPath[0]}` : 'APPROVED',
        platform: acc.platform,
        risk_level: riskAssessment.level,
        risk_score: riskAssessment.score,
        risk_factors: riskAssessment.factors,
        requires_approval: approvalPath.length > 0,
        approval_level: approvalPath.join(' -> '),
      };
    });

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .insert(intentsToCreate)
      .select();

    if (error) throw error;

    // Create governance artifacts for audit trail
    for (const intent of data) {
      if (intent.risk_level && intent.risk_level !== 'LOW') {
        await supabaseAdmin.from('governance_artifacts').insert({
          intent_id: intent.id,
          artifact_type: 'risk_assessment',
          evidence_data: {
            level: intent.risk_level,
            score: intent.risk_score,
            factors: intent.risk_factors,
            platform: intent.platform,
            assessed_at: new Date().toISOString(),
          },
          policy_version: 'v1.0',
        });
      }
    }

    await logToDatabase(
      'info',
      'Governance',
      `Created ${intentsToCreate.length} publish intents with risk assessment`,
      { userId, count: intentsToCreate.length },
    );

    res.status(200).json({
      success: true,
      count: data.length,
      risk_summary: data.map((d) => ({
        id: d.id,
        risk_level: d.risk_level,
        risk_score: d.risk_score,
        approval_required: d.requires_approval,
        approval_level: d.approval_level,
      })),
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

    // Security: Verify user has permission to transition (Admin/Manager check)
    const { data: member, error: roleError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !member)
      throw new Error('Unauthorized: Workspace membership required');
    const userRole = member.role;

    // 2. Fetch extended context for Superadmin check
    const { data: userContext, error: contextError } = await supabaseAdmin
      .from('users')
      .select('is_superadmin')
      .eq('id', userId)
      .single();

    const isSuperAdmin = !contextError && userContext?.is_superadmin;

    if (userRole === 'CREATOR' && newStatus !== 'CANCELLED' && !isSuperAdmin) {
      return res
        .status(403)
        .json({ error: 'Creators can only cancel their own intents' });
    }

    await logToDatabase(
      'info',
      'Governance',
      `Transitioning ${intentId} to ${newStatus} by ${userRole}`,
      { intentId, newStatus, feedback, userId },
    );

    // 1. If transitioning to APPROVED (from a reviewer)
    if (newStatus === 'APPROVED') {
      const { data: intent, error: fetchErr } = await supabaseAdmin
        .from('publish_intents')
        .select('*')
        .eq('id', intentId)
        .single();

      if (fetchErr || !intent) throw new Error('Intent context missing');

      // Check if user is authorized to approve this specific step
      const currentPath = intent.approval_level ? intent.approval_level.split(' -> ') : ['MANAGER'];
      const currentStatus = intent.status; // e.g. PENDING_MANAGER
      const currentRequiredRole = currentStatus.startsWith('PENDING_') ? currentStatus.replace('PENDING_', '') : currentPath[0];

      if (!ApprovalEngine.canUserApprove(userRole, currentRequiredRole, isSuperAdmin)) {
        return res.status(403).json({ error: `You do not have the required role (${currentRequiredRole}) to approve this step.` });
      }

      // Determine next status in path
      const currentIndex = currentPath.indexOf(currentRequiredRole);
      const nextRole = currentPath[currentIndex + 1];

      let statusToSet = 'APPROVED';
      if (nextRole && !isSuperAdmin) {
        statusToSet = `PENDING_${nextRole}`;
      }

      // If finally APPROVED, run Decision Engine
      if (statusToSet === 'APPROVED') {
        const decisionResult = await evaluateIntent(intentId, '', intent.workspace_id);
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

        const { data, error } = await supabaseAdmin
          .from('publish_intents')
          .update({ status: statusToSet, feedback: feedback || null, decision_id: decisionResult.decision_id })
          .eq('id', intentId)
          .select()
          .single();

        if (error) throw error;
        internalEventBus.emit('execution.requested', { intentId, orgId: intent.workspace_id });
        return res.status(200).json({ success: true, data });
      } else {
        // Just move to next pending state
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

    // 2. Handle other transitions (RETURNED, CANCELLED, etc.)
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

    // Ensure only the creator or an Admin can delete
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    let query = supabaseAdmin
      .from('publish_intents')
      .delete()
      .eq('id', id);

    if (member?.role === 'ADMIN') {
      // Admin can delete any intent
      query = query;
    } else {
      // Non-admin can only delete their own
      query = query.eq('creator_id', userId);
    }

    const { error } = await query;

    if (error) throw error;

    await logToDatabase('info', 'Governance', `Deleted publish intent ${id}`, {
      userId,
    });

    res
      .status(200)
      .json({ success: true, message: 'Post deleted successfully' });
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

    // Fetch intents for this user
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

    // 1. Get user role from workspace
    const { data: member, error: roleError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !member) throw new Error('Workspace context missing');
    const role = member.role;

    // 2. Get user context for Superadmin check
    const { data: userContext } = await supabaseAdmin
      .from('users')
      .select('is_superadmin')
      .eq('id', userId)
      .single();

    const isSuperAdmin = userContext?.is_superadmin;

    // 3. Determine what to fetch based on role
    let query = supabaseAdmin.from('publish_intents').select(`
        *,
        creator:users!publish_intents_creator_id_fkey(full_name, email)
      `);

    if (isSuperAdmin) {
      // Superadmins see everything that is pending any level of approval
      query = query.like('status', 'PENDING_%');
    } else if (role === 'CREATOR') {
      // Creators see their own RETURNED posts
      query = query.eq('creator_id', userId).eq('status', 'RETURNED');
    } else {
      // Reviewers see posts pending their specific role
      query = query.eq('status', `PENDING_${role}`);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });
    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

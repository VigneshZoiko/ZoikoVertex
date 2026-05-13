import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { logToDatabase } from '../../shared/databaseLogger';
import { internalEventBus } from '../../shared/internalEventBus';
import { AuthRequest } from '../../shared/authMiddleware';
import { RiskClassifier } from '../../services/governance/riskClassifier';
import { evaluateIntent } from '../../services/decision/decisionEngine';

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

      return {
        workspace_id: member.workspace_id,
        creator_id: userId,
        target_account_ids: [acc.id],
        content: finalCaption,
        media_urls: urlsToSave,
        media_url: urlsToSave[0] || null,
        status: 'PENDING_ADMIN',
        platform: acc.platform,
        risk_level: riskAssessment.level,
        risk_score: riskAssessment.score,
        risk_factors: riskAssessment.factors,
        requires_approval: riskAssessment.requiresApproval,
        approval_level: riskAssessment.approvalLevel,
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

    if (userRole === 'CREATOR' && newStatus !== 'CANCELLED') {
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

    // 1. If APPROVED, run Decision Engine before committing status
    if (newStatus === 'APPROVED') {
      const { data: intentMeta, error: metaError } = await supabaseAdmin
        .from('publish_intents')
        .select('workspace_id')
        .eq('id', intentId)
        .single();

      if (metaError || !intentMeta) throw new Error('Intent not found');

      const decisionResult = await evaluateIntent(intentId, '', intentMeta.workspace_id);

      logger.info(
        { intentId, decisionResult },
        '[Governance] Decision Engine evaluated intent',
      );

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

      // Governance cleared — write decision_id alongside APPROVED status
      const { data, error } = await supabaseAdmin
        .from('publish_intents')
        .update({ status: newStatus, feedback: feedback || null, decision_id: decisionResult.decision_id })
        .eq('id', intentId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`[Governance] Governance cleared for ${intentId}. Emitting execution.requested...`);
      internalEventBus.emit('execution.requested', { intentId, orgId: intentMeta.workspace_id });

      return res.status(200).json({ success: true, data });
    }

    // 2. Non-APPROVED transitions — update status directly
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

    // 1. Get user role
    const { data: member, error: roleError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !member) throw new Error('Workspace context missing');
    const role = member.role;

    // 2. Determine what to fetch based on role
    let query = supabaseAdmin.from('publish_intents').select(`
        *,
        creator:users!publish_intents_creator_id_fkey(full_name, email)
      `);

    if (role === 'CREATOR') {
      // Creators see their own RETURNED posts
      query = query.eq('creator_id', userId).eq('status', 'RETURNED');
    } else if (role === 'MANAGER') {
      // Managers see posts pending manager approval
      query = query.eq('status', 'PENDING_MANAGER');
    } else if (role === 'ADMIN') {
      // Admins see posts pending admin approval
      query = query.eq('status', 'PENDING_ADMIN');
    } else {
      return res.status(403).json({ error: 'Invalid role' });
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

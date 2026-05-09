import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';
import { ExecutionService } from '../social/executionService';

// Helper for database logging
const logToDatabase = async (level: string, service: string, message: string, payload?: any) => {
  try {
    await supabaseAdmin.from('system_logs').insert({ level, service, message, payload });
  } catch (err) {
    logger.error({ err }, '[Governance] Failed to log to DB');
  }
};

export const submitIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic, content, mediaUrls, mediaUrl, targetAccountIds, userId } = req.body;

    const urlsToSave = mediaUrls || (mediaUrl ? [mediaUrl] : []);

    if (!targetAccountIds || targetAccountIds.length === 0) {
      return res.status(400).json({ error: 'No target accounts selected' });
    }

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

    // 3. Create separate intents for each account
    const intentsToCreate = accounts.map(acc => {
      let finalCaption = content.universal;
      if (content.platforms && content.platforms[acc.platform]) {
        finalCaption = content.platforms[acc.platform];
      }

      return {
        workspace_id: member.workspace_id,
        creator_id: userId,
        target_account_ids: [acc.id],
        content: finalCaption,
        media_urls: urlsToSave,
        media_url: urlsToSave[0] || null, // Keep for backward compatibility
        status: 'PENDING_ADMIN', // Aligning with the existing status name
        platform: acc.platform
      };
    });

    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .insert(intentsToCreate)
      .select();

    if (error) throw error;

    await logToDatabase('info', 'Governance', `Created ${intentsToCreate.length} publish intents`, { userId, count: intentsToCreate.length });

    res.status(200).json({ success: true, count: data.length });
  } catch (error) {
    next(error);
  }
};

export const transitionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { intentId, newStatus, feedback, userId, userRole } = req.body;

    if (!intentId || !newStatus || !userId) {
      res.status(400).json({ error: 'Missing required governance fields' });
      return;
    }

    logger.info(`[Governance] Transitioning ${intentId} to ${newStatus} by ${userRole}`);
    await logToDatabase('info', 'Governance', `Transitioning ${intentId} to ${newStatus} by ${userRole}`, { intentId, newStatus, feedback, userId });

    // 1. Update the intent status
    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .update({ status: newStatus, feedback: feedback || null })
      .eq('id', intentId)
      .select()
      .single();

    if (error) throw error;

    // 2. If APPROVED, trigger real publishing
    if (newStatus === 'APPROVED') {
      console.log(`[GOVERNANCE] Detected APPROVED status for ${intentId}. Triggering ExecutionService...`);
      ExecutionService.publishIntent(intentId).catch(err => {
        logger.error({ err }, `[Governance] Async execution failed for ${intentId}`);
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId } = req.query; // Expecting userId to verify ownership

    // Ideally, we'd also call the social platform APIs here to delete the live post
    // if the intent status is PUBLISHED. For now, we remove the record from our system.

    const { error } = await supabaseAdmin
      .from('publish_intents')
      .delete()
      .eq('id', id)
      // .eq('creator_id', userId) // Security: ensure only the creator can delete

    if (error) throw error;

    await logToDatabase('info', 'Governance', `Deleted publish intent ${id}`, { userId });

    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};


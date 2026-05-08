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

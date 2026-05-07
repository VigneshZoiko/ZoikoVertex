import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { logger } from '../../shared/logger';

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

    await logToDatabase('info', 'Governance', `Transitioning ${intentId} to ${newStatus} by ${userRole}`, { intentId, newStatus, feedback, userId });

    // 1. Update the intent status
    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .update({ status: newStatus, feedback: feedback || null })
      .eq('id', intentId)
      .select()
      .single();

    if (error) throw error;

    // 2. If APPROVED, simulate publishing after a delay
    if (newStatus === 'APPROVED') {
      logger.info(`[Execution] Scheduling simulated publish for intent ${intentId}...`);
      setTimeout(async () => {
        try {
          await supabaseAdmin
            .from('publish_intents')
            .update({ status: 'PUBLISHED' })
            .eq('id', intentId);
          await logToDatabase('info', 'Execution', `Intent ${intentId} successfully PUBLISHED (Simulated).`, { intentId });
        } catch (execErr) {
          logger.error({ execErr }, `[Execution] Failed to publish ${intentId}`);
        }
      }, 10000); // 10 second delay
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

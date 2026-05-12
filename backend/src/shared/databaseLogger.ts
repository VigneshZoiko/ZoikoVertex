import { supabaseAdmin } from './supabase';
import { logger } from './logger';

export const logToDatabase = async (
  level: string,
  service: string,
  message: string,
  payload?: Record<string, unknown>,
) => {
  try {
    await supabaseAdmin
      .from('system_logs')
      .insert({ level, service, message, payload });
  } catch (err) {
    logger.error({ err }, `[${service}] Failed to log to DB`);
  }
};

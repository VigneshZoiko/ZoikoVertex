import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';

const POLL_INTERVAL = 5 * 60 * 1000; // every 5 minutes
let workerRunning = false;

async function checkSlaBreaches(): Promise<void> {
  const now = new Date().toISOString();

  const { data: breached, error } = await supabaseAdmin
    .from('publish_intents')
    .select('id, workspace_id, sla_due_at, status')
    .eq('status', 'PENDING_REVIEW')
    .lt('sla_due_at', now)
    .is('sla_breached_at', null);

  if (error) {
    logger.error({ error }, '[sla-breach] Failed to query breached intents');
    return;
  }

  if (!breached || breached.length === 0) return;

  for (const intent of breached) {
    try {
      await supabaseAdmin
        .from('publish_intents')
        .update({ sla_breached_at: now })
        .eq('id', intent.id);

      logger.warn(
        { intentId: intent.id, workspaceId: intent.workspace_id, sla_due_at: intent.sla_due_at },
        '[sla-breach] Publish intent SLA breached',
      );
    } catch (err) {
      logger.error({ err, intentId: intent.id }, '[sla-breach] Error marking intent as breached');
    }
  }

  logger.info({ count: breached.length }, '[sla-breach] SLA breach pass complete');
}

async function runPass(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    await checkSlaBreaches();
  } catch (err) {
    logger.error({ err }, '[sla-breach] Worker pass error');
  } finally {
    workerRunning = false;
  }
}

export function startSlaBreachWorker(): void {
  logger.info('[sla-breach] Starting (poll every 5m)');
  runPass();
  setInterval(runPass, POLL_INTERVAL);
}

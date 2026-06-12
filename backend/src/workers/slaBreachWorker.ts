import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { randomUUID } from 'crypto';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const SLA_HOURS = 24;

async function checkSlaBreaches() {
  const cutoff = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000).toISOString();

  const { data: overdue, error } = await supabaseAdmin
    .from('publish_intents')
    .select('id, workspace_id, creator_id, content, platform')
    .eq('status', 'PENDING_REVIEW')
    .lt('created_at', cutoff)
    .limit(50);

  if (error) {
    logger.error({ error }, '[SLAWorker] Query failed');
    return;
  }

  if (!overdue || overdue.length === 0) return;

  logger.info({ count: overdue.length }, '[SLAWorker] Overdue items found');

  for (const item of overdue) {
    const contentPreview = (item.content || '(no content)').slice(0, 80);

    // Notify the creator that their item breached SLA
    try {
      await supabaseAdmin.from('notifications').insert({
        id: randomUUID(),
        user_id: item.creator_id,
        title: '⏰ Review SLA Breached',
        body: `Your ${item.platform || 'content'} has been waiting over ${SLA_HOURS}h for review.`,
        type: 'WARNING',
        link: `/publish?revisionId=${item.id}`,
        read: false,
      });
    } catch { /* non-blocking */ }

    // Notify workspace admins
    try {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('workspace_id', item.workspace_id)
        .in('role', ['ADMIN', 'WORKSPACE_OWNER', 'GOVERNANCE_ADMIN', 'SUPERADMIN', 'SECURITY_ADMIN']);

      if (admins) {
        for (const admin of admins) {
          try {
            await supabaseAdmin.from('notifications').insert({
              id: randomUUID(),
              user_id: admin.id,
              title: '🚨 SLA Breach — Review Overdue',
              body: `"${contentPreview}" has been waiting over ${SLA_HOURS}h.`,
              type: 'WARNING',
              link: '/review-queue',
              read: false,
            });
          } catch { /* single admin notification failure is non-blocking */ }
        }
      }
    } catch { /* non-blocking */ }
  }
}

export function startSlaBreachWorker() {
  logger.info('[SLAWorker] Starting SLA breach monitor');

  checkSlaBreaches().catch(err =>
    logger.error({ err }, '[SLAWorker] Initial pass failed')
  );

  setInterval(() => {
    checkSlaBreaches().catch(err =>
      logger.error({ err }, '[SLAWorker] Scheduled pass failed')
    );
  }, POLL_INTERVAL_MS);
}

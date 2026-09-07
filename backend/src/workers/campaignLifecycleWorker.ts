/**
 * Campaign Lifecycle Worker
 *
 * Runs on a schedule and marks campaigns COMPLETED once their end date has
 * passed (status was ACTIVE / PAUSED / SCHEDULED). Keeps ZoikoVertex's stored
 * status in sync with reality so the UI, filters, and stats all agree.
 *
 * Meta already stops delivery at the ad set's end_time, so this does not need
 * to call Meta — it only reconciles the local status. (Read paths also derive
 * the same via effectiveCampaignStatus() for immediacy between passes.)
 */

import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';
import { RUNNING_STATUSES } from '../domains/campaigns/campaignStatus';

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function endExpiredCampaigns(): Promise<void> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('id')
    .in('status', RUNNING_STATUSES)
    .not('end_at', 'is', null)
    .lt('end_at', nowIso);

  if (error) {
    logger.error({ error }, '[CampaignLifecycle] Failed to query expired campaigns');
    return;
  }
  if (!data || data.length === 0) return;

  const ids = data.map((c: { id: string }) => c.id);
  const { error: upErr } = await supabaseAdmin
    .from('campaigns')
    .update({ status: 'COMPLETED', updated_at: nowIso })
    .in('id', ids);

  if (upErr) {
    logger.error({ upErr }, '[CampaignLifecycle] Failed to mark campaigns COMPLETED');
    return;
  }
  logger.info(`[CampaignLifecycle] Marked ${ids.length} campaign(s) COMPLETED — end date passed`);
}

export function startCampaignLifecycleWorker(): void {
  logger.info('[CampaignLifecycle] Starting — ending expired campaigns every 15m');
  endExpiredCampaigns().catch((err) => logger.error({ err }, '[CampaignLifecycle] Initial pass failed'));
  setInterval(() => {
    endExpiredCampaigns().catch((err) => logger.error({ err }, '[CampaignLifecycle] Scheduled pass failed'));
  }, POLL_INTERVAL_MS);
}

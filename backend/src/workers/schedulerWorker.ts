import { logger } from '../shared/logger';
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';
import { ExecutionService } from '../domains/channels/executionService';

const POLL_INTERVAL_MS        = 60_000;
const MAX_RETRY_ATTEMPTS      = 3;
const STALE_THRESHOLD_HOURS   = 2;        // posts older than this get EXPIRED, not published
const ORPHAN_THRESHOLD_MINUTES = 10;      // PROCESSING posts stuck longer than this get reset
const RETRY_BACKOFF_MINUTES   = [5, 15, 45]; // backoff per attempt (1st, 2nd, 3rd)

let _running = false;
let _lastRunAt: Date | null = null;
const _todayStats = { published: 0, failed: 0, expired: 0, retried: 0 };

// Exported so the health endpoint can read live stats without a DB round-trip
export function getSchedulerStats() {
  return {
    running: _running,
    lastRunAt: _lastRunAt?.toISOString() ?? null,
    pollIntervalMs: POLL_INTERVAL_MS,
    today: { ..._todayStats },
  };
}

// --- Orphan reset -----------------------------------------------------------
// On startup, any post stuck as PROCESSING (from a prior crashed instance)
// is reset to SCHEDULED so the catch-up sweep picks it up.
async function resetOrphanedPosts(): Promise<void> {
  const cutoff = new Date(Date.now() - ORPHAN_THRESHOLD_MINUTES * 60_000).toISOString();

  const { data: orphans } = await supabaseAdmin
    .from('scheduled_posts')
    .select('id')
    .eq('status', 'PROCESSING')
    .lt('updated_at', cutoff);

  if (!orphans || orphans.length === 0) return;

  logger.warn(`[Scheduler] Resetting ${orphans.length} orphaned PROCESSING post(s)`);

  await supabaseAdmin
    .from('scheduled_posts')
    .update({ status: 'SCHEDULED', updated_at: new Date().toISOString() })
    .eq('status', 'PROCESSING')
    .lt('updated_at', cutoff);

  await supabaseAdmin
    .from('scheduler_jobs')
    .update({ execution_status: 'PENDING' })
    .in('post_id', orphans.map(o => o.id));
}

// --- Per-post publish -------------------------------------------------------
async function publishPost(post: {
  id: string;
  platform: string;
  content: string;
  media_url: string | null;
  workspace_id: string;
  scheduled_time: string;
}): Promise<void> {
  // Atomic claim: only this instance proceeds if we can flip SCHEDULED → PROCESSING
  const { data: claimed } = await supabaseAdmin
    .from('scheduled_posts')
    .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
    .eq('id', post.id)
    .eq('status', 'SCHEDULED')
    .select('id')
    .single();

  if (!claimed) return; // Another instance already claimed it

  // Stale guard: refuse to publish content that is too old to be relevant
  const ageMs = Date.now() - new Date(post.scheduled_time).getTime();
  if (ageMs > STALE_THRESHOLD_HOURS * 3_600_000) {
    const ageHours = (ageMs / 3_600_000).toFixed(1);
    logger.warn(`[Scheduler] Post ${post.id} is ${ageHours}h overdue — marking EXPIRED`);
    await supabaseAdmin.from('scheduled_posts').update({ status: 'EXPIRED' }).eq('id', post.id);
    await supabaseAdmin.from('scheduler_jobs').update({ execution_status: 'EXPIRED' }).eq('post_id', post.id);
    await logToDatabase('warn', 'Scheduler', `Post ${post.id} expired (${ageHours}h overdue)`, { platform: post.platform });
    _todayStats.expired++;
    return;
  }

  await supabaseAdmin
    .from('scheduler_jobs')
    .update({ execution_status: 'PROCESSING' })
    .eq('post_id', post.id);

  try {
    await ExecutionService.publishIntent(post.id);

    await supabaseAdmin
      .from('scheduled_posts')
      .update({ status: 'PUBLISHED', published_time: new Date().toISOString() })
      .eq('id', post.id);

    await supabaseAdmin
      .from('scheduler_jobs')
      .update({ execution_status: 'COMPLETED' })
      .eq('post_id', post.id);

    await logToDatabase('info', 'Scheduler', `Published post ${post.id}`, { platform: post.platform });
    logger.info(`[Scheduler] Published post ${post.id} (${post.platform})`);
    _todayStats.published++;

  } catch (err: any) {
    // Retry logic: read current attempt count then decide
    const { data: job } = await supabaseAdmin
      .from('scheduler_jobs')
      .select('retry_count')
      .eq('post_id', post.id)
      .single();

    const attempt = (job?.retry_count ?? 0) + 1;

    if (attempt <= MAX_RETRY_ATTEMPTS) {
      const backoffMin = RETRY_BACKOFF_MINUTES[attempt - 1] ?? 45;
      const nextAttempt = new Date(Date.now() + backoffMin * 60_000).toISOString();

      // Reset post to SCHEDULED with updated scheduled_time = next attempt
      // so the regular poller picks it up naturally at the right moment
      await supabaseAdmin
        .from('scheduled_posts')
        .update({ status: 'SCHEDULED', scheduled_time: nextAttempt, updated_at: new Date().toISOString() })
        .eq('id', post.id);

      await supabaseAdmin
        .from('scheduler_jobs')
        .update({ execution_status: 'PENDING', retry_count: attempt, next_attempt: nextAttempt })
        .eq('post_id', post.id);

      logger.warn(`[Scheduler] Post ${post.id} retry ${attempt}/${MAX_RETRY_ATTEMPTS} in ${backoffMin}min`);
      await logToDatabase('warn', 'Scheduler', `Retry ${attempt}/${MAX_RETRY_ATTEMPTS} for post ${post.id} in ${backoffMin}min`, { error: err.message });
      _todayStats.retried++;
    } else {
      // Max retries exceeded — permanent failure
      await supabaseAdmin.from('scheduled_posts').update({ status: 'FAILED' }).eq('id', post.id);
      await supabaseAdmin
        .from('scheduler_jobs')
        .update({ execution_status: 'FAILED', retry_count: attempt })
        .eq('post_id', post.id);

      logger.error({ err }, `[Scheduler] Post ${post.id} permanently failed after ${MAX_RETRY_ATTEMPTS} retries`);
      await logToDatabase('error', 'Scheduler', `Post ${post.id} permanently failed after ${MAX_RETRY_ATTEMPTS} retries`, { error: err.message });
      _todayStats.failed++;
    }
  }
}

// --- Main poll loop ---------------------------------------------------------
async function processDuePosts(label: string): Promise<void> {
  _lastRunAt = new Date();
  const now = new Date().toISOString();

  const { data: duePosts, error } = await supabaseAdmin
    .from('scheduled_posts')
    .select('id, platform, content, media_url, workspace_id, scheduled_time')
    .eq('status', 'SCHEDULED')
    .lte('scheduled_time', now);

  if (error) {
    logger.error({ error }, `[Scheduler:${label}] Failed to query due posts`);
    return;
  }

  if (!duePosts || duePosts.length === 0) return;

  logger.info(`[Scheduler:${label}] Processing ${duePosts.length} due post(s) in parallel`);

  // Parallel publish — all due posts fire concurrently, not one-by-one
  await Promise.allSettled(duePosts.map(post => publishPost(post)));
}

// --- Init -------------------------------------------------------------------
export const initWorker = async (): Promise<void> => {
  if (_running) return;
  _running = true;

  logger.info('[Scheduler] DB-backed scheduler initialising — no Redis required');

  // 1. Recover any posts stuck PROCESSING from a prior crashed container
  await resetOrphanedPosts();

  // 2. Catch-up sweep: publish everything that came due during downtime
  await processDuePosts('startup');

  // 3. Regular 60s poll — all state persisted in Supabase, never in RAM
  setInterval(() => processDuePosts('poll'), POLL_INTERVAL_MS);

  logger.info('[Scheduler] Polling every 60s. Retry logic active. Upstash/Redis eliminated.');
};

// Null stub — BullMQ removed. Kept so any stale import reference compiles.
export const getQueue = async () => null;

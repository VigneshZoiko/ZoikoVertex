/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../shared/logger';
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';
import { ExecutionService } from '../domains/channels/executionService';

let connection: IORedis | null = null;
let publishQueue: Queue | null = null;
let _redisOk = false;

async function tryConnect(): Promise<IORedis | null> {
  if (!env.REDIS_URL) return null;
  if (_redisOk && connection) return connection;
  try {
    const c = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    await c.ping();
    connection = c;
    _redisOk = true;
    return connection;
  } catch {
    logger.warn('[Redis] Unavailable — skipping Redis-backed features');
    return null;
  }
}

export async function getQueue(): Promise<Queue | null> {
  if (!env.REDIS_URL) return null;
  const conn = await tryConnect();
  if (!conn) return null;
  if (!publishQueue) {
    publishQueue = new Queue('PublishQueue', { connection: conn });
  }
  return publishQueue;
}

export const initWorker = async () => {
  if (!env.REDIS_URL) {
    logger.warn('[Worker] REDIS_URL not set — skipping worker init.');
    return;
  }

  const conn = await tryConnect();
  if (!conn) {
    logger.warn('[Worker] Redis unavailable — skipping worker init.');
    return;
  }

  try {
    const workerConn = new IORedis(env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 2000, 10000);
      },
    });
    workerConn.on('error', () => {});

    const worker = new Worker('PublishQueue', async (job) => {
      const { postId, platform, content } = job.data;
      logger.info(`[Worker] Processing post ${postId} for ${platform}`);

      try {
        await supabaseAdmin.from('scheduler_jobs')
          .update({ execution_status: 'PROCESSING' })
          .eq('post_id', postId);

        const { data: post, error: fetchError } = await supabaseAdmin
          .from('scheduled_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (fetchError || !post) throw new Error(`Post ${postId} not found`);

        await ExecutionService.publishIntent(postId);

        const { error: postError } = await supabaseAdmin.from('scheduled_posts')
          .update({ status: 'PUBLISHED', published_time: new Date().toISOString() })
          .eq('id', postId);

        if (postError) throw postError;

        await supabaseAdmin.from('scheduler_jobs')
          .update({ execution_status: 'COMPLETED' })
          .eq('post_id', postId);

        await logToDatabase('info', 'Worker', `Successfully published post ${postId}`, { platform, content });
        return { success: true, postId };

      } catch (error: any) {
        logger.error({ error }, `[Worker] Failed to publish post ${postId}`);

        await supabaseAdmin.from('scheduled_posts').update({ status: 'FAILED' }).eq('id', postId);
        await supabaseAdmin.from('scheduler_jobs').update({ execution_status: 'FAILED' }).eq('post_id', postId);
        await logToDatabase('error', 'Worker', `Failed to publish post ${postId}`, { error: error.message });

        throw error;
      }
    }, { connection: workerConn });

    worker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
    });
  } catch {
    logger.warn('[Worker] Redis unavailable — worker initialization skipped.');
  }
};

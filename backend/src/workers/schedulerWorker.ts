/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../shared/logger';
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';
import { ExecutionService } from '../domains/channels/executionService';

let connection: IORedis | null = null;
let publishQueue: Queue | null = null;

function getConnection(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 2000, 10000);
      },
    });
    let _redisErrLogged = false;
    connection.on('error', (err: any) => {
      if (!_redisErrLogged) {
        logger.error(`[Redis] Connection error: ${err.message}`);
        _redisErrLogged = true;
      }
    });
  }
  return connection;
}

export function getQueue(): Queue | null {
  if (!env.REDIS_URL) return null;
  if (!publishQueue) {
    publishQueue = new Queue('PublishQueue', { connection: getConnection()! });
  }
  return publishQueue;
}

// Initialize the worker
export const initWorker = () => {
  if (!env.REDIS_URL) {
    logger.warn('[Worker] REDIS_URL not set — skipping worker init. Install Redis or configure REDIS_URL for delayed publishing.');
    return;
  }

  logger.info('[Worker] Initializing PublishQueue Worker...');

  const worker = new Worker(
    'PublishQueue',
    async (job: Job) => {
      const { postId, platform, content } = job.data;
      logger.info(`[Worker] Processing post ${postId} for ${platform}`);
      
      try {
        // 1. Update job status to PROCESSING
        await supabaseAdmin.from('scheduler_jobs')
          .update({ execution_status: 'PROCESSING' })
          .eq('post_id', postId);

        // 2. Fetch post to confirm it exists
        const { data: post, error: fetchError } = await supabaseAdmin
          .from('scheduled_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (fetchError || !post) throw new Error(`Post ${postId} not found`);

        // 3. Delegate to ExecutionService for real platform API calls
        await ExecutionService.publishIntent(postId);

        // 4. Update post and job status after successful publish
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
    },
    { connection: getConnection()! }
  );

  worker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
  });

  return worker;
};

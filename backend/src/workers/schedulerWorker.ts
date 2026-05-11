import { Worker, Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../shared/logger';
import { supabaseAdmin } from '../shared/supabase';
import { logToDatabase } from '../shared/databaseLogger';

let connection: IORedis | null = null;
let publishQueue: Queue | null = null;

function getConnection(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
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

        // 2. SIMULATE EXTERNAL API CALL TO PLATFORM (Meta, Twitter, etc.)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 3. Update the post status to PUBLISHED
        const { error: postError } = await supabaseAdmin.from('scheduled_posts')
          .update({ 
            status: 'PUBLISHED', 
            published_time: new Date().toISOString() 
          })
          .eq('id', postId);

        if (postError) throw postError;

        // 4. Mark job as COMPLETED
        await supabaseAdmin.from('scheduler_jobs')
          .update({ execution_status: 'COMPLETED' })
          .eq('post_id', postId);

        await logToDatabase('info', 'Worker', `Successfully published post ${postId}`, { platform, content });
        return { success: true, postId };

      } catch (error: any) {
        logger.error({ error }, `[Worker] Failed to publish post ${postId}`);
        
        // Mark job and post as FAILED
        await supabaseAdmin.from('scheduler_jobs').update({ execution_status: 'FAILED' }).eq('post_id', postId);
        await supabaseAdmin.from('scheduled_posts').update({ status: 'FAILED' }).eq('id', postId);
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';

import { getQueue } from '../../workers/schedulerWorker';
import { linkPublishToWorkflow } from '../../services/workflowPublishLink.service';

// Timezone mapping for audience regions
const REGION_TIMEZONE_MAP: Record<string, string> = {
  'Global': 'UTC',
  'US (EST)': 'America/New_York',
  'US (PST)': 'America/Los_Angeles',
  'UK / Europe': 'Europe/London',
  'Asia Pacific': 'Asia/Tokyo',
  'Australia': 'Australia/Sydney',
  'India': 'Asia/Kolkata',
  'Middle East': 'Asia/Dubai',
  'South America': 'America/Sao_Paulo',
  'Canada (EST)': 'America/Toronto',
  'Canada (PST)': 'America/Vancouver',
};

function convertTimeToUserTimezone(audienceTime: string, audienceTimezone: string, userTimezone: string): string {
  try {
    const [hours, minutes, seconds] = audienceTime.split(':').map(Number);
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds));
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(utcDate);
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const second = parts.find(p => p.type === 'second')?.value || '00';
    
    return `${hour}:${minute}:${second}`;
  } catch (error) {
    logger.error({ error, audienceTime, audienceTimezone, userTimezone }, '[Scheduler] Timezone conversion failed');
    return audienceTime;
  }
}

// Schema for the recommendation input
const RecommendSchema = z.object({
  platform: z.string(),
  niche: z.string().min(2),
  audienceRegion: z.string(),
  audienceAgeGroup: z.string(),
  userTimezone: z.string().optional().default('UTC'),
  targetDate: z.string().optional().default(''), // YYYY-MM-DD
});

function getDayName(dateStr: string): string {
  if (!dateStr) return 'general';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en', { weekday: 'long' });
  } catch { return 'general'; }
}



export const getRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { platform, niche, audienceRegion, audienceAgeGroup, userTimezone, targetDate } = RecommendSchema.parse(req.body);
    const resolvedDate = targetDate || new Date().toISOString().split('T')[0];

    logger.info({ platform, niche, audienceRegion, audienceAgeGroup, userTimezone }, '[Scheduler] Fetching recommendations');

    const audienceTimezone = REGION_TIMEZONE_MAP[audienceRegion] || 'UTC';

    // 1. Check cache (posting_windows table)
    const { data: cachedWindows, error: cacheError } = await supabaseAdmin
      .from('posting_windows')
      .select('*')
      .ilike('platform', platform)
      .ilike('audience_region', audienceRegion)
      .ilike('audience_age_group', audienceAgeGroup)
      .gte('confidence_score', 0.85)
      .limit(3);

    if (!cacheError && cachedWindows && cachedWindows.length > 0) {
      await logToDatabase('info', 'Scheduler', `Cache hit for recommendations: ${platform} / ${niche}`, { cachedCount: cachedWindows.length });

      const formattedCache = cachedWindows.map(w => ({
        best_time: w.best_start_time.slice(0, 5),
        audience_timezone: audienceTimezone,
        user_local_time: convertTimeToUserTimezone(w.best_start_time, audienceTimezone, userTimezone).slice(0, 5),
        confidence_score: w.confidence_score,
        reasoning_points: [`Peak engagement window for ${audienceAgeGroup} on ${platform} based on historical data.`],
        source: "cache",
        target_date: resolvedDate,
      }));

      return res.status(200).json({ 
        success: true, 
        recommendations: formattedCache,
        timezone_info: {
          audience_region: audienceRegion,
          audience_timezone: audienceTimezone,
          user_timezone: userTimezone
        }
      });
    }

    // 2. AI Fallback (Dynamic Generation)
    if (!env.GEMINI_API_KEY) {
      logger.warn('[Scheduler] GEMINI_API_KEY missing, using generic fallback');
      return res.status(200).json({
        success: true,
        recommendations: [{
          best_time: "12:00",
          audience_timezone: audienceTimezone,
          user_local_time: convertTimeToUserTimezone("12:00:00", audienceTimezone, userTimezone).slice(0, 5),
          confidence_score: 0.70,
          reasoning_points: ["Generic midday posting window.", "Broad audience activity peak."],
          source: "fallback",
          target_date: resolvedDate,
        }],
        timezone_info: {
          audience_region: audienceRegion,
          audience_timezone: audienceTimezone,
          user_timezone: userTimezone
        }
      });
    }

    await logToDatabase('info', 'Scheduler', `Generating AI recommendations for: ${platform} / ${niche}`, { platform, audienceRegion, userTimezone });

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    // Try models in order — fall back if overloaded
    const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let model = genAI.getGenerativeModel({ model: GEMINI_MODELS[0] });
    // Model selection happens at generateContent — use retry wrapper below

    const dayName = getDayName(resolvedDate);

    const prompt = `You are a social media data analyst. Find the 3 best specific posting times for maximum engagement.

INPUT:
- Platform: ${platform}
- Niche: ${niche}
- Audience Location: ${audienceRegion} (timezone: ${audienceTimezone})
- Audience Age: ${audienceAgeGroup}
- Target Date: ${resolvedDate} (${dayName})

TASK:
Analyze this demographic's daily routine on ${platform} in ${audienceTimezone}. Factor in ${dayName} behavioral patterns (weekday vs weekend habits differ significantly).

Return 3 precise posting times — NOT ranges, give exact minutes like 13:05 or 09:30.
For each time, give 2-4 concise bullet points (max 130 chars each) explaining WHY it works for this specific niche and demographic. Be specific — mention the audience, platform, day, and content niche.

RESPONSE (strict JSON, no markdown, no backticks):
{
  "recommendations": [
    {
      "best_time": "HH:mm",
      "confidence_score": 0.00,
      "reasoning_points": [
        "Specific insight about why this exact time works for this audience and niche",
        "Another behavioral insight",
        "Optional third insight"
      ]
    }
  ]
}`;

    const workspaceId = req.user?.workspace_id as string | undefined;
    const callModel = async (p: string): Promise<string> => {
      let t = '';
      for (const modelId of GEMINI_MODELS) {
        try {
          model = genAI.getGenerativeModel({ model: modelId });
          const result = await model.generateContent(p);
          t = (await result.response).text();
          break;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand')) {
            continue;
          }
          throw e;
        }
      }
      return t;
    };

    // Phase 4.D — prefer the governed 'scheduler_recommendation' prompt; on
    // governance block, audited fallback (fail-closed in production when
    // PROMPT_GOVERNANCE_ENFORCED) to the inline prompt so behavior is unchanged
    // while the flag is off.

    let text = '';
    const governed = await GovernedModelGate.execute({
      useCaseKey: 'scheduler_recommendation',
      workspaceId: workspaceId || '',
      variables: {
        platform, niche,
        audience_region: audienceRegion,
        audience_timezone: audienceTimezone,
        audience_age_group: audienceAgeGroup,
        target_date: resolvedDate,
        day_name: dayName,
      },
      modelProvider: 'gemini',
      actorId: req.user?.id,
      invoke: callModel,
    });
    if (governed.ok) {
      text = governed.output || '';
    } else {
      await GovernedModelGate.legacyInlineFallback('scheduler_recommendation', workspaceId, `governed prompt unavailable: ${governed.code}`);
      text = await callModel(prompt);
    }
    if (!text) throw new Error('All Gemini models unavailable — please try again shortly');
    
    let parsed;
    try {
      const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanedJson);
    } catch (e) {
      logger.error({ text, e }, '[Scheduler] AI response parsing failed');
      return res.status(500).json({ error: 'AI response parsing failed' });
    }

    // 3. Cache the new AI recommendations asynchronously
    try {
      if (parsed.recommendations && parsed.recommendations.length > 0) {
        const insertPayload = parsed.recommendations.map((rec: any) => ({
          platform,
          audience_region: audienceRegion,
          audience_age_group: audienceAgeGroup,
          best_start_time: rec.best_start_time,
          best_end_time: rec.best_end_time,
          confidence_score: rec.confidence_score,
          timezone: audienceTimezone
        }));
        supabaseAdmin.from('posting_windows').insert(insertPayload).then(({ error }) => {
          if (error) logger.error({ error }, '[Scheduler] Failed to cache AI recommendations');
        });
      }
    } catch (e) {
      logger.error({ e }, '[Scheduler] Error processing AI recommendation payload for cache');
    }

    const recommendationsWithTimezone = parsed.recommendations.map((r: any) => ({
      best_time: r.best_time,
      audience_timezone: audienceTimezone,
      user_local_time: convertTimeToUserTimezone((r.best_time + ':00'), audienceTimezone, userTimezone).slice(0, 5),
      confidence_score: r.confidence_score,
      reasoning_points: Array.isArray(r.reasoning_points) ? r.reasoning_points : [r.reasoning || ''],
      source: "ai",
      target_date: resolvedDate,
    }));

    res.status(200).json({
      success: true,
      recommendations: recommendationsWithTimezone,
      timezone_info: {
        audience_region: audienceRegion,
        audience_timezone: audienceTimezone,
        user_timezone: userTimezone
      }
    });

  } catch (error) {
    logger.error({ error }, '[Scheduler] getRecommendations error');
    next(error);
  }
};

const SchedulePostSchema = z.object({
  content: z.string().min(1),
  mediaUrl: z.string().optional(),
  platform: z.string(),
  scheduledTime: z.string().datetime(),
  campaignId: z.string().uuid().nullable().optional(),
});

export const schedulePost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content, mediaUrl, platform, scheduledTime, campaignId } = SchedulePostSchema.parse(req.body);
    const creatorId = req.user?.id;
    if (!creatorId) return res.status(401).json({ error: 'Unauthorized' });

    // Identify user's workspace
    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', creatorId).single();
    if (!member?.workspace_id) return res.status(403).json({ error: 'Workspace context missing' });

    await logToDatabase('info', 'Scheduler', `Scheduling new post for ${platform}`, { platform, scheduledTime, workspaceId: member.workspace_id });

    // 1. Create the canonical post record
    const { data: post, error: postError } = await supabaseAdmin
      .from('scheduled_posts')
      .insert({
        creator_id: creatorId,
        workspace_id: member.workspace_id,
        campaign_id: campaignId || null,
        content,
        media_url: mediaUrl || null,
        platform,
        scheduled_time: scheduledTime,
        status: 'SCHEDULED'
      })
      .select()
      .single();

    if (postError) throw postError;

    // 2. Enqueue the scheduler job
    const { error: jobError } = await supabaseAdmin
      .from('scheduler_jobs')
      .insert({
        post_id: post.id,
        execution_status: 'PENDING',
        next_attempt: scheduledTime
      });

    if (jobError) throw jobError;

    // 3. Enqueue the actual task in BullMQ with a delay (if Redis available)
    const queue = getQueue();
    if (queue) {
      const scheduledDate = new Date(scheduledTime);
      const delay = Math.max(0, scheduledDate.getTime() - Date.now());

      await queue.add(
        'publish-post', 
        { postId: post.id, platform, content, mediaUrl }, 
        { delay, jobId: post.id }
      );
    } else {
      logger.warn('[Scheduler] Redis unavailable — skipping BullMQ enqueue. Post saved to DB only.');
    }

    // Additively link this scheduled post to a governed Publishing Workflow
    // instance (visible on the Workflows page). Best-effort — never blocks.
    linkPublishToWorkflow({
      workspaceId: member.workspace_id,
      startedBy: creatorId,
      platform,
      content,
      postId: post.id,
      scheduled: true,
      scheduledTime,
    }).catch((err) => logger.warn({ err }, '[Scheduler] workflow link failed (non-blocking)'));

    res.status(201).json({ success: true, post });
  } catch (error) {
    next(error);
  }
};

export const cancelScheduledPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const isSuper = req.user?.is_superadmin;
    const userWorkspaceId = req.user?.workspace_id;

    // Verify ownership or workspace access
    let query = supabaseAdmin.from('scheduled_posts').select('id, workspace_id').eq('id', id);
    if (!isSuper) {
      if (!userWorkspaceId) return res.status(403).json({ error: 'Workspace context missing' });
      query = query.eq('workspace_id', userWorkspaceId);
    }
    const { data: post } = await query.single();

    if (!post) return res.status(403).json({ error: 'Forbidden: Post not found in your workspace' });

    // 1. Delete the background job in BullMQ (if Redis available)
    const queue = getQueue();
    if (queue) {
      const bullJob = await queue.getJob(id);
      if (bullJob) await bullJob.remove();
    }

    // 2. Delete the DB job record
    await supabaseAdmin.from('scheduler_jobs').delete().eq('post_id', id);

    // 2. Mark post as cancelled
    const { data, error } = await supabaseAdmin
      .from('scheduled_posts')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logToDatabase('info', 'Scheduler', `Cancelled scheduled post ${id}`);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const ListPostsQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const listScheduledPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'User ID required' });

    const isSuper = req.user?.is_superadmin;
    const userWorkspaceId = req.user?.workspace_id;

    const { status, startDate, endDate, limit, offset } = ListPostsQuerySchema.parse(req.query);

    let query = supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .order('scheduled_time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (!isSuper) {
      if (!userWorkspaceId) return res.status(403).json({ error: 'Workspace context missing' });
      query = query.eq('workspace_id', userWorkspaceId);
    }

    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('scheduled_time', startDate);
    if (endDate) query = query.lte('scheduled_time', endDate);

    const { data: posts, error } = await query;
    if (error) throw error;

    const { count } = await supabaseAdmin
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', userId)
      .then(({ count }) => ({ count }));

    res.status(200).json({
      success: true,
      posts: posts || [],
      pagination: {
        total: count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error({ error }, '[Scheduler] listScheduledPosts error');
    next(error);
  }
};

const UpdateScheduleSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrl: z.string().optional(),
  scheduledTime: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'CANCELLED']).optional(),
});

export const updateScheduledPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'User ID required' });

    const { data: userData } = await supabaseAdmin.from('users').select('is_superadmin').eq('id', userId).single();
    const isSuper = userData?.is_superadmin;
    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).single();

    const updates = UpdateScheduleSchema.parse(req.body);

    let fetchQuery = supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .eq('id', id);
    
    if (!isSuper) {
      fetchQuery = fetchQuery.eq('workspace_id', member?.workspace_id);
    }

    const { data: existingPost, error: fetchError } = await fetchQuery.single();

    if (fetchError || !existingPost) return res.status(404).json({ success: false, error: 'Post not found in your workspace' });

    if (existingPost.status === 'PUBLISHED' || existingPost.status === 'FAILED') {
      return res.status(400).json({ success: false, error: 'Cannot update posts that are already published or failed' });
    }

    const updatePayload: any = { ...updates, updated_at: new Date().toISOString() };
    
    if (updates.scheduledTime) {
      updatePayload.scheduled_time = updates.scheduledTime;
      
      const { error: jobError } = await supabaseAdmin
        .from('scheduler_jobs')
        .update({ next_attempt: updates.scheduledTime })
        .eq('post_id', id);
        
      if (jobError) logger.warn({ jobError }, '[Scheduler] Failed to update scheduler job time');
    }

    if (updates.status === 'CANCELLED') {
      const queue = getQueue();
      if (queue) {
        const bullJob = await queue.getJob(id);
        if (bullJob) await bullJob.remove();
      }
      await supabaseAdmin.from('scheduler_jobs').delete().eq('post_id', id);
    }

    const { data: updatedPost, error: updateError } = await supabaseAdmin
      .from('scheduled_posts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await logToDatabase('info', 'Scheduler', `Updated scheduled post ${id}`, { updates });

    res.status(200).json({ success: true, post: updatedPost });
  } catch (error) {
    logger.error({ error }, '[Scheduler] updateScheduledPost error');
    next(error);
  }
};

export const getScheduledPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'User ID required' });

    const { data: userData } = await supabaseAdmin.from('users').select('is_superadmin').eq('id', userId).single();
    const isSuper = userData?.is_superadmin;
    const { data: member } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).single();

    let query = supabaseAdmin
      .from('scheduled_posts')
      .select('*')
      .eq('id', id);

    if (!isSuper) {
      query = query.eq('workspace_id', member?.workspace_id);
    }

    const { data: post, error } = await query.single();

    if (error || !post) return res.status(404).json({ success: false, error: 'Post not found in your workspace' });

    res.status(200).json({ success: true, post });
  } catch (error) {
    logger.error({ error }, '[Scheduler] getScheduledPost error');
    next(error);
  }
};


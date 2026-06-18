 
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';

import { linkPublishToWorkflow } from '../../services/workflowPublishLink.service';
import { getSchedulerStats } from '../../workers/schedulerWorker';
import { trackUsage } from '../monitoring/usageController';

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
    const workspaceId = req.user?.workspace_id;

    logger.info({ platform, niche, audienceRegion, audienceAgeGroup, userTimezone }, '[Scheduler] Fetching recommendations');

    const audienceTimezone = REGION_TIMEZONE_MAP[audienceRegion] || 'UTC';

    // Pull real workspace engagement history to ground AI recommendations in
    // actual performance data rather than generic industry averages
    let engagementContext = '';
    if (workspaceId) {
      const { data: pastPosts } = await supabaseAdmin
        .from('scheduled_posts')
        .select('scheduled_time, engagement_score')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .eq('status', 'PUBLISHED')
        .not('engagement_score', 'is', null)
        .order('published_time', { ascending: false })
        .limit(100);

      if (pastPosts && pastPosts.length >= 5) {
        const byHour: Record<number, { total: number; count: number }> = {};
        for (const p of pastPosts) {
          const hour = new Date(p.scheduled_time).getHours();
          if (!byHour[hour]) byHour[hour] = { total: 0, count: 0 };
          byHour[hour].total += Number(p.engagement_score) || 0;
          byHour[hour].count++;
        }
        const topHours = Object.entries(byHour)
          .map(([h, d]) => ({ hour: Number(h), avg: +(d.total / d.count).toFixed(2), posts: d.count }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 5);

        engagementContext = `\n\nWORKSPACE PERFORMANCE DATA (${pastPosts.length} published ${platform} posts):` +
          `\nTop hours by avg engagement score: ${topHours.map(h => `${String(h.hour).padStart(2, '0')}:00 (score ${h.avg}, ${h.posts} posts)`).join(' | ')}` +
          `\nPrioritise these proven times — they outperform generic industry averages for this specific workspace's audience.`;
      }
    }

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
    if (!env.GROQ_API_KEY) {
      logger.warn('[Scheduler] GROQ_API_KEY missing, using generic fallback');
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

    const groqScheduler = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.GROQ_API_KEY, timeout: 30_000 });

    const dayName = getDayName(resolvedDate);

    const prompt = `You are a social media data analyst. Find the 3 best specific posting times for maximum engagement.

INPUT:
- Platform: ${platform}
- Niche: ${niche}
- Audience Location: ${audienceRegion} (timezone: ${audienceTimezone})
- Audience Age: ${audienceAgeGroup}
- Target Date: ${resolvedDate} (${dayName})${engagementContext}

TASK:
Analyze this demographic's daily routine on ${platform} in ${audienceTimezone}. Factor in ${dayName} behavioral patterns (weekday vs weekend habits differ significantly). If workspace performance data is provided above, weight those hours heavily — they are proven winners for this specific audience.

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

    let schedulerTokensUsed = 0;
    const callModel = async (p: string): Promise<string> => {
      const completion = await groqScheduler.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: p }],
        temperature: 0,
        max_tokens: 1024,
      });
      schedulerTokensUsed += completion.usage?.total_tokens ?? 0;
      return completion.choices[0]?.message?.content || '';
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
      modelProvider: 'groq',
      actorId: req.user?.id,
      invoke: callModel,
    });
    if (governed.ok) {
      text = governed.output || '';
    } else {
      await GovernedModelGate.legacyInlineFallback('scheduler_recommendation', workspaceId, `governed prompt unavailable: ${governed.code}`);
      text = await callModel(prompt);
    }
    if (!text) throw new Error('Groq model unavailable — please try again shortly');

    if (workspaceId) {
      const qty = schedulerTokensUsed > 0 ? schedulerTokensUsed : 384;
      trackUsage({ workspaceId, resourceType: 'AI_TOKENS', quantity: qty, costUsd: qty * 0.0000001, unit: 'tokens', referenceType: 'scheduler_recommendation', metadata: { model: 'llama-3.3-70b-versatile', platform, estimated: schedulerTokensUsed === 0 } });
    }
    
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

    // Conflict check: reject if another post on the same platform is already
    // scheduled within ±30 minutes — prevents platform rate-limit collisions
    const windowStart = new Date(new Date(scheduledTime).getTime() - 30 * 60_000).toISOString();
    const windowEnd   = new Date(new Date(scheduledTime).getTime() + 30 * 60_000).toISOString();

    const { data: conflicts } = await supabaseAdmin
      .from('scheduled_posts')
      .select('id, scheduled_time')
      .eq('workspace_id', member.workspace_id)
      .eq('platform', platform)
      .in('status', ['SCHEDULED', 'PROCESSING'])
      .gte('scheduled_time', windowStart)
      .lte('scheduled_time', windowEnd);

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'conflict',
        message: `Another ${platform} post is already scheduled within 30 minutes of this time. Choose a different time to avoid platform rate limits.`,
        conflicting_post: conflicts[0],
      });
    }

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
      // Scan the attached media on scheduled posts too.
      imageUrls: mediaUrl ? [mediaUrl] : [],
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

    // Delete the DB job record
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
  status: z.enum(['SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED', 'EXPIRED']).optional(),
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

// --- Item 7: Health endpoint ------------------------------------------------
export const getSchedulerHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = getSchedulerStats();
    const workspaceId = req.user?.workspace_id;

    // Live queue depth from DB
    const [queuedRes, failedTodayRes, publishedTodayRes] = await Promise.allSettled([
      supabaseAdmin
        .from('scheduled_posts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['SCHEDULED', 'PROCESSING'])
        .eq('workspace_id', workspaceId ?? ''),
      supabaseAdmin
        .from('scheduled_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'FAILED')
        .eq('workspace_id', workspaceId ?? '')
        .gte('updated_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabaseAdmin
        .from('scheduled_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PUBLISHED')
        .eq('workspace_id', workspaceId ?? '')
        .gte('published_time', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const queued       = queuedRes.status === 'fulfilled' ? (queuedRes.value.count ?? 0) : 0;
    const failedToday  = failedTodayRes.status === 'fulfilled' ? (failedTodayRes.value.count ?? 0) : 0;
    const publishedToday = publishedTodayRes.status === 'fulfilled' ? (publishedTodayRes.value.count ?? 0) : 0;
    const total = publishedToday + failedToday;
    const successRate = total > 0 ? Math.round((publishedToday / total) * 100) : 100;

    res.json({
      success: true,
      data: {
        ...stats,
        db: { queued, publishedToday, failedToday, successRate },
      },
    });
  } catch (error) {
    next(error);
  }
};

// --- Item 8: Auto-place "Best Time" -----------------------------------------
// Platform-specific fallback hours (UTC) when workspace has no engagement history
const PLATFORM_BEST_HOURS: Record<string, number[]> = {
  instagram:  [8, 12, 17, 19],
  facebook:   [9, 13, 15, 18],
  linkedin:   [8, 10, 12, 17],
  twitter:    [9, 12, 15, 17],
  tiktok:     [7, 15, 19, 21],
  youtube:    [12, 15, 17, 20],
  threads:    [9, 12, 17, 20],
  pinterest:  [8, 21],
};

const BestSlotSchema = z.object({
  platform: z.string(),
  userTimezone: z.string().optional().default('UTC'),
});

export const getBestSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { platform } = BestSlotSchema.parse(req.body);
    const workspaceId = req.user?.workspace_id;
    if (!workspaceId) return res.status(403).json({ error: 'Workspace context missing' });

    const platformKey = platform.toLowerCase();

    // 1. Build ranked hour list from real engagement data
    let rankedHours: number[] = [];

    const { data: pastPosts } = await supabaseAdmin
      .from('scheduled_posts')
      .select('scheduled_time, engagement_score')
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .eq('status', 'PUBLISHED')
      .not('engagement_score', 'is', null)
      .order('published_time', { ascending: false })
      .limit(200);

    if (pastPosts && pastPosts.length >= 5) {
      const byHour: Record<number, { total: number; count: number }> = {};
      for (const p of pastPosts) {
        const h = new Date(p.scheduled_time).getHours();
        if (!byHour[h]) byHour[h] = { total: 0, count: 0 };
        byHour[h].total += Number(p.engagement_score) || 0;
        byHour[h].count++;
      }
      rankedHours = Object.entries(byHour)
        .map(([h, d]) => ({ hour: Number(h), avg: d.total / d.count }))
        .sort((a, b) => b.avg - a.avg)
        .map(x => x.hour);
    }

    // Fall back to platform defaults when insufficient workspace data
    if (rankedHours.length === 0) {
      rankedHours = PLATFORM_BEST_HOURS[platformKey] ?? [9, 12, 17];
    }

    // 2. Fetch all scheduled posts for this workspace+platform in the next 7 days
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString();

    const { data: existing } = await supabaseAdmin
      .from('scheduled_posts')
      .select('scheduled_time')
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .in('status', ['SCHEDULED', 'PROCESSING'])
      .gte('scheduled_time', now.toISOString())
      .lte('scheduled_time', sevenDaysOut);

    const occupiedMs = (existing ?? []).map(p => new Date(p.scheduled_time).getTime());

    const isSlotFree = (candidateMs: number): boolean => {
      const GAP = 30 * 60_000; // 30-minute buffer
      return !occupiedMs.some(t => Math.abs(t - candidateMs) < GAP);
    };

    // 3. Walk through the next 7 days, best hour first, find first free slot
    for (const hour of rankedHours) {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + dayOffset);
        candidate.setHours(hour, 0, 0, 0);

        if (candidate.getTime() <= now.getTime()) continue; // must be in the future

        if (isSlotFree(candidate.getTime())) {
          return res.json({
            success: true,
            data: {
              suggested_time: candidate.toISOString(),
              hour,
              day_offset: dayOffset,
              source: pastPosts && pastPosts.length >= 5 ? 'engagement_data' : 'platform_defaults',
              platform,
            },
          });
        }
      }
    }

    // All best slots taken — return first completely free slot
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      for (let hour = 0; hour < 24; hour++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + dayOffset);
        candidate.setHours(hour, 0, 0, 0);
        if (isSlotFree(candidate.getTime())) {
          return res.json({
            success: true,
            data: {
              suggested_time: candidate.toISOString(),
              hour,
              day_offset: dayOffset,
              source: 'fallback_first_free',
              platform,
            },
          });
        }
      }
    }

    res.status(200).json({ success: false, error: 'No free slots in the next 7 days' });
  } catch (error) {
    logger.error({ error }, '[Scheduler] getBestSlot error');
    next(error);
  }
};


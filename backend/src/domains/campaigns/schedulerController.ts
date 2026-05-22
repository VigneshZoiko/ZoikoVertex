/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from "express";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import { supabaseAdmin } from "../../shared/supabase";
import { AuthRequest } from "../../shared/authMiddleware";
import { logToDatabase } from "../../shared/databaseLogger";
import { getParam } from "../../shared/request";

import { getQueue } from "../../workers/schedulerWorker";

// =========================
// Timezone Mapping
// =========================

const REGION_TIMEZONE_MAP: Record<string, string> = {
  Global: "UTC",
  "US (EST)": "America/New_York",
  "US (PST)": "America/Los_Angeles",
  "UK / Europe": "Europe/London",
  "Asia Pacific": "Asia/Tokyo",
  Australia: "Australia/Sydney",
  India: "Asia/Kolkata",
  "Middle East": "Asia/Dubai",
  "South America": "America/Sao_Paulo",
  "Canada (EST)": "America/Toronto",
  "Canada (PST)": "America/Vancouver",
};

// =========================
// Timezone Conversion
// =========================

function convertTimeToUserTimezone(
  audienceTime: string,
  _audienceTimezone: string,
  userTimezone: string,
): string {
  try {
    const [hours, minutes, seconds] = audienceTime.split(":").map(Number);

    const now = new Date();

    const utcDate = new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        seconds,
      ),
    );

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: userTimezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcDate);

    const hour = parts.find((p) => p.type === "hour")?.value || "00";

    const minute = parts.find((p) => p.type === "minute")?.value || "00";

    const second = parts.find((p) => p.type === "second")?.value || "00";

    return `${hour}:${minute}:${second}`;
  } catch (error) {
    logger.error(
      {
        error,
        audienceTime,
        userTimezone,
      },
      "[Scheduler] Timezone conversion failed",
    );

    return audienceTime;
  }
}

// =========================
// Schemas
// =========================

const RecommendSchema = z.object({
  platform: z.string(),
  niche: z.string().min(2),
  audienceRegion: z.string(),
  audienceAgeGroup: z.string(),
  userTimezone: z.string().optional().default("UTC"),
});

const SchedulePostSchema = z.object({
  content: z.string().min(1),
  mediaUrl: z.string().optional(),
  platform: z.string(),
  scheduledTime: z.string().datetime(),
  campaignId: z.string().uuid().nullable().optional(),
});

const ListPostsQuerySchema = z.object({
  status: z.enum(["SCHEDULED", "PUBLISHED", "FAILED", "CANCELLED"]).optional(),

  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  limit: z.coerce.number().min(1).max(100).default(20),

  offset: z.coerce.number().min(0).default(0),
});

const UpdateScheduleSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrl: z.string().optional(),
  scheduledTime: z.string().datetime().optional(),

  status: z.enum(["SCHEDULED", "CANCELLED"]).optional(),
});

// =========================
// Get Recommendations
// =========================

export const getRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { platform, niche, audienceRegion, audienceAgeGroup, userTimezone } =
      RecommendSchema.parse(req.body);

    const audienceTimezone = REGION_TIMEZONE_MAP[audienceRegion] || "UTC";

    logger.info(
      {
        platform,
        niche,
        audienceRegion,
        audienceAgeGroup,
        userTimezone,
      },
      "[Scheduler] Fetching recommendations",
    );

    // =========================
    // Cache Lookup
    // =========================

    const { data: cachedWindows, error: cacheError } = await supabaseAdmin
      .from("posting_windows")
      .select("*")
      .ilike("platform", platform)
      .ilike("audience_region", audienceRegion)
      .ilike("audience_age_group", audienceAgeGroup)
      .gte("confidence_score", 0.85)
      .limit(3);

    if (!cacheError && cachedWindows && cachedWindows.length > 0) {
      await logToDatabase(
        "info",
        "Scheduler",
        `Cache hit for recommendations: ${platform} / ${niche}`,
        {
          cachedCount: cachedWindows.length,
        },
      );

      const formattedCache = cachedWindows.map((w) => ({
        best_start_time: w.best_start_time,
        best_end_time: w.best_end_time,

        audience_timezone: audienceTimezone,

        user_local_time_start: convertTimeToUserTimezone(
          w.best_start_time,
          audienceTimezone,
          userTimezone,
        ),

        user_local_time_end: convertTimeToUserTimezone(
          w.best_end_time,
          audienceTimezone,
          userTimezone,
        ),

        confidence_score: w.confidence_score,

        reasoning:
          "Based on historical high-engagement data for this demographic.",

        source: "cache",
      }));

      return res.status(200).json({
        success: true,
        recommendations: formattedCache,

        timezone_info: {
          audience_region: audienceRegion,
          audience_timezone: audienceTimezone,
          user_timezone: userTimezone,
        },
      });
    }

    // =========================
    // Fallback if Gemini Missing
    // =========================

    if (!env.GEMINI_API_KEY) {
      logger.warn("[Scheduler] GEMINI_API_KEY missing, using fallback");

      const fallbackStart = "12:00:00";
      const fallbackEnd = "14:00:00";

      return res.status(200).json({
        success: true,

        recommendations: [
          {
            best_start_time: fallbackStart,
            best_end_time: fallbackEnd,

            audience_timezone: audienceTimezone,

            user_local_time_start: convertTimeToUserTimezone(
              fallbackStart,
              audienceTimezone,
              userTimezone,
            ),

            user_local_time_end: convertTimeToUserTimezone(
              fallbackEnd,
              audienceTimezone,
              userTimezone,
            ),

            confidence_score: 0.7,

            reasoning: "Generic peak hour recommendation.",

            source: "fallback",
          },
        ],

        timezone_info: {
          audience_region: audienceRegion,
          audience_timezone: audienceTimezone,
          user_timezone: userTimezone,
        },
      });
    }

    // =========================
    // Gemini AI Recommendation
    // =========================

    await logToDatabase(
      "info",
      "Scheduler",
      `Generating AI recommendations for ${platform}`,
      {
        platform,
        audienceRegion,
        userTimezone,
      },
    );

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Act as a Master Social Media Data Analyst.

Platform: ${platform}
Niche: ${niche}
Audience Region: ${audienceRegion}
Audience Age: ${audienceAgeGroup}
Audience Timezone: ${audienceTimezone}

Return top 2 best posting windows.

STRICT JSON ONLY:
{
  "recommendations": [
    {
      "best_start_time": "HH:mm:ss",
      "best_end_time": "HH:mm:ss",
      "confidence_score": 0.95,
      "reasoning": "Reason"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    const text = response.text();

    let parsed: any;

    try {
      const cleanedJson = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      parsed = JSON.parse(cleanedJson);
    } catch (error) {
      logger.error(
        {
          text,
          error,
        },
        "[Scheduler] AI response parsing failed",
      );

      return res.status(500).json({
        error: "AI response parsing failed",
      });
    }

    // =========================
    // Cache AI Results
    // =========================

    try {
      if (parsed.recommendations && parsed.recommendations.length > 0) {
        const insertPayload = parsed.recommendations.map((rec: any) => ({
          platform,
          audience_region: audienceRegion,
          audience_age_group: audienceAgeGroup,

          best_start_time: rec.best_start_time,
          best_end_time: rec.best_end_time,

          confidence_score: rec.confidence_score,

          timezone: audienceTimezone,
        }));

        supabaseAdmin
          .from("posting_windows")
          .insert(insertPayload)
          .then(({ error }) => {
            if (error) {
              logger.error(
                { error },
                "[Scheduler] Failed to cache AI recommendations",
              );
            }
          });
      }
    } catch (error) {
      logger.error({ error }, "[Scheduler] Cache processing failed");
    }

    const recommendations = parsed.recommendations.map((r: any) => ({
      best_start_time: r.best_start_time,

      best_end_time: r.best_end_time,

      audience_timezone: audienceTimezone,

      user_local_time_start: convertTimeToUserTimezone(
        r.best_start_time,
        audienceTimezone,
        userTimezone,
      ),

      user_local_time_end: convertTimeToUserTimezone(
        r.best_end_time,
        audienceTimezone,
        userTimezone,
      ),

      confidence_score: r.confidence_score,

      reasoning: r.reasoning,

      source: "ai",
    }));

    return res.status(200).json({
      success: true,
      recommendations,

      timezone_info: {
        audience_region: audienceRegion,
        audience_timezone: audienceTimezone,
        user_timezone: userTimezone,
      },
    });
  } catch (error) {
    logger.error({ error }, "[Scheduler] getRecommendations error");

    next(error);
  }
};

// =========================
// Schedule Post
// =========================

export const schedulePost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { content, mediaUrl, platform, scheduledTime, campaignId } =
      SchedulePostSchema.parse(req.body);

    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", creatorId)
      .single();

    if (!member?.workspace_id) {
      return res.status(403).json({
        error: "Workspace context missing",
      });
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        creator_id: creatorId,
        workspace_id: member.workspace_id,

        campaign_id: campaignId || null,

        content,

        media_url: mediaUrl || null,

        platform,

        scheduled_time: scheduledTime,

        status: "SCHEDULED",
      })
      .select()
      .single();

    if (postError) {
      throw postError;
    }

    const { error: jobError } = await supabaseAdmin
      .from("scheduler_jobs")
      .insert({
        post_id: post.id,
        execution_status: "PENDING",
        next_attempt: scheduledTime,
      });

    if (jobError) {
      throw jobError;
    }

    const queue = getQueue();

    if (queue) {
      const delay = new Date(scheduledTime).getTime() - new Date().getTime();

      if (delay > 0) {
        await queue.add(
          "publish-post",
          {
            postId: post.id,
          },
          {
            delay,
            jobId: post.id,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }
    }

    await logToDatabase(
      "info",
      "Scheduler",
      `Scheduled new post for ${platform}`,
      {
        postId: post.id,
      },
    );

    return res.status(201).json({
      success: true,
      post,
    });
  } catch (error) {
    logger.error({ error }, "[Scheduler] schedulePost error");

    next(error);
  }
};

export const listScheduledPosts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = ListPostsQuerySchema.parse(req.query);

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", creatorId)
      .single();

    if (!member?.workspace_id) {
      return res.status(403).json({ error: "Workspace context missing" });
    }

    let postsQuery = supabaseAdmin
      .from("scheduled_posts")
      .select("*", { count: "exact" })
      .eq("workspace_id", member.workspace_id)
      .order("scheduled_time", { ascending: true })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.status) {
      postsQuery = postsQuery.eq("status", query.status);
    }

    if (query.startDate) {
      postsQuery = postsQuery.gte("scheduled_time", query.startDate);
    }

    if (query.endDate) {
      postsQuery = postsQuery.lte("scheduled_time", query.endDate);
    }

    const { data: posts, error, count } = await postsQuery;

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: posts || [],
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: count || 0,
      },
    });
  } catch (error) {
    logger.error({ error }, "[Scheduler] listScheduledPosts error");
    next(error);
  }
};

export const getScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postId = getParam(req, "id");

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", creatorId)
      .single();

    if (!member?.workspace_id) {
      return res.status(403).json({ error: "Workspace context missing" });
    }

    const { data: post, error } = await supabaseAdmin
      .from("scheduled_posts")
      .select("*")
      .eq("id", postId)
      .eq("workspace_id", member.workspace_id)
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    logger.error({ error }, "[Scheduler] getScheduledPost error");
    next(error);
  }
};

export const updateScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postId = getParam(req, "id");
    const updates = UpdateScheduleSchema.parse(req.body);

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", creatorId)
      .single();

    if (!member?.workspace_id) {
      return res.status(403).json({ error: "Workspace context missing" });
    }

    const { data: existingPost, error: existingError } = await supabaseAdmin
      .from("scheduled_posts")
      .select("*")
      .eq("id", postId)
      .eq("workspace_id", member.workspace_id)
      .single();

    if (existingError) {
      throw existingError;
    }

    if (existingPost.status !== "SCHEDULED") {
      return res.status(400).json({
        error: "Only scheduled posts can be updated",
      });
    }

    const updatePayload: Record<string, unknown> = {};

    if (updates.content !== undefined) {
      updatePayload.content = updates.content;
    }

    if (updates.mediaUrl !== undefined) {
      updatePayload.media_url = updates.mediaUrl || null;
    }

    if (updates.scheduledTime !== undefined) {
      updatePayload.scheduled_time = updates.scheduledTime;
    }

    if (updates.status !== undefined) {
      updatePayload.status = updates.status;
    }

    const { data: post, error: updateError } = await supabaseAdmin
      .from("scheduled_posts")
      .update(updatePayload)
      .eq("id", postId)
      .eq("workspace_id", member.workspace_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    if (updates.scheduledTime !== undefined || updates.status !== undefined) {
      await supabaseAdmin
        .from("scheduler_jobs")
        .update({
          next_attempt:
            updates.status === "CANCELLED"
              ? null
              : updates.scheduledTime || existingPost.scheduled_time,
          execution_status:
            updates.status === "CANCELLED" ? "CANCELLED" : "PENDING",
        })
        .eq("post_id", postId);

      const queue = getQueue();

      if (queue) {
        const existingJob = await queue.getJob(String(postId));

        if (existingJob) {
          await existingJob.remove().catch(() => undefined);
        }

        if (post.status === "SCHEDULED") {
          const delay =
            new Date(post.scheduled_time).getTime() - new Date().getTime();

          if (delay > 0) {
            await queue.add(
              "publish-post",
              { postId: post.id },
              {
                delay,
                jobId: post.id,
                removeOnComplete: true,
                removeOnFail: false,
              },
            );
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    logger.error({ error }, "[Scheduler] updateScheduledPost error");
    next(error);
  }
};

export const cancelScheduledPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const creatorId = req.user?.id;

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postId = getParam(req, "id");

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", creatorId)
      .single();

    if (!member?.workspace_id) {
      return res.status(403).json({ error: "Workspace context missing" });
    }

    const { data: post, error } = await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: "CANCELLED",
      })
      .eq("id", postId)
      .eq("workspace_id", member.workspace_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await supabaseAdmin
      .from("scheduler_jobs")
      .update({
        execution_status: "CANCELLED",
        next_attempt: null,
      })
      .eq("post_id", postId);

    const queue = getQueue();

    if (queue) {
      const existingJob = await queue.getJob(String(postId));
      if (existingJob) {
        await existingJob.remove().catch(() => undefined);
      }
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    logger.error({ error }, "[Scheduler] cancelScheduledPost error");
    next(error);
  }
};

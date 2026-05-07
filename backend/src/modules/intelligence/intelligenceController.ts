import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { supabaseAdmin } from '../../shared/supabase';

const GenerateSchema = z.object({
  topic: z.string().min(3),
  contentType: z.string(),
  platforms: z.array(z.string()).default([]),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  tone: z.enum(['professional', 'casual', 'excited', 'educational', 'bold', 'inspirational']).default('professional'),
  useEmojis: z.boolean().default(true),
});

// Helper for database logging
const logToDatabase = async (level: string, service: string, message: string, payload?: any) => {
  try {
    await supabaseAdmin.from('system_logs').insert({ level, service, message, payload });
  } catch (err) {
    logger.error({ err }, '[Intelligence] Failed to log to DB');
  }
};

export const generateContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic, contentType, platforms, length, tone, useEmojis } = GenerateSchema.parse(req.body);
    
    if (!env.GEMINI_API_KEY) {
      return fallbackMock(topic, contentType, tone, length, res);
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const variationIndex = Math.floor(Math.random() * 1000);
    const prompt = `
    Act as a World-Class Social Media Strategist, Brand Auditor, and Creative Copywriter. 
    Your goal is to generate high-converting, brand-safe, and UNIQUE social media content.
    
    INPUT DATA:
    - TOPIC: "${topic}"
    - CONTENT_TYPE: "${contentType}"
    - PLATFORMS: ${platforms.join(', ')}
    - TONE: "${tone}"
    - LENGTH: "${length}"
    - EMOJIS: ${useEmojis ? 'Enabled' : 'Disabled'}
    - VARIATION_ID: ${variationIndex}

    PHASE 1: STRATEGIC ANALYSIS
    1. Identify core value proposition.
    2. Define target audience for ${platforms}.
    3. Determine platform-specific constraints.
    4. Assess ideal sentiment.

    PHASE 2: WRITING GUIDELINES
    - NEVER use AI clichés like "In today's fast-paced world", "Unleash your potential", "Elevate your game".
    - Use "I" or "We" to sound human.
    - Vary sentence length.
    - Ensure length adheres strictly: ${length === 'short' ? 'Max 20 words' : length === 'medium' ? '60-80 words' : '150+ words'}.

    PHASE 3: GOVERNANCE AUDIT
    - Calculate sentiment score (0.0 to 1.0).
    - Calculate brand safety score (0.0 to 1.0).

    RESPONSE FORMAT (STRICT JSON):
    {
      "analysis": { "target_audience": "string", "strategic_hook": "string" },
      "content": {
        "caption": "string",
        "hashtags": ["string", "string", "string"],
        "sentiment_score": number,
        "brand_safety_score": number
      },
      "scheduling": {
        "suggested_times": [
          { "hour": number, "minute": number, "label": "string" }
        ]
      }
    }`;

    logger.info({ topic, length, tone }, '[Intelligence] Generating advanced AI content');
    await logToDatabase('info', 'AI', `Generating post for topic: ${topic}`, { topic, platforms, tone });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('AI response was empty');
    }

    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    
    if (parsed.content.brand_safety_score < 0.8) {
      logger.warn(`[AI] Low brand safety score detected: ${parsed.content.brand_safety_score}`);
    }

    res.status(200).json({
      success: true,
      description: parsed.content.caption + '\n\n' + parsed.content.hashtags.join(' '),
      suggestedTimes: formatTimes(parsed.scheduling.suggested_times),
      metadata: {
        target_audience: parsed.analysis.target_audience,
        sentiment_score: parsed.content.sentiment_score,
        brand_safety_score: parsed.content.brand_safety_score
      }
    });
  } catch (error) {
    next(error);
  }
};

interface SuggestedHour {
  hour: number;
  minute: number;
  label: string;
}

const formatTimes = (hours: SuggestedHour[]) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  
  return hours.map(sh => ({
    time: `${dateStr} ${sh.hour.toString().padStart(2, '0')}:${sh.minute.toString().padStart(2, '0')}:00`,
    label: sh.label
  }));
};

const fallbackMock = (topic: string, contentType: string, tone: string, length: string, res: Response) => {
  logger.warn('[Intelligence] GEMINI_API_KEY missing or failed, using fallback mock');
  
  const tones: Record<string, string> = {
    professional: "We are pleased to announce our latest developments in",
    casual: "Honestly, so stoked about",
    bold: "BREAKING: Everything changes now with",
    inspirational: "The future belongs to those who believe in",
    educational: "Did you know this about"
  };

  const tonePrefix = tones[tone] || "Check out our latest update on";
  let baseDescription = `${tonePrefix} ${topic}. ${contentType} is evolving fast.`;
  
  if (length === 'long') {
    baseDescription += " It's been a long road of testing and refining, but the results speak for themselves.";
  }

  res.status(200).json({
    success: true,
    description: baseDescription,
    suggestedTimes: []
  });
};

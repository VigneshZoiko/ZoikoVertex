import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

const GenerateSchema = z.object({
  topic: z.string().min(3),
  contentType: z.string(),
  platforms: z.array(z.string()).default([]),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  tone: z.enum(['professional', 'casual', 'excited', 'educational']).default('professional'),
  useEmojis: z.boolean().default(true),
});

export const generateContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic, contentType, platforms, length, tone, useEmojis } = GenerateSchema.parse(req.body);
    
    if (!env.GEMINI_API_KEY) {
      return fallbackMock(topic, contentType, tone, length, res);
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const variationIndex = Math.floor(Math.random() * 1000);
    const prompt = `Act as a high-end Social Media Growth Specialist and Creative Copywriter. 
    I need a UNIQUE, organic post for ${platforms.join(' & ')}. 
    Variation ID: ${variationIndex} (Ensure this generation is distinct from previous ones).

    TOPIC: "${topic}"
    CATEGORY: "${contentType}"
    TONE: "${tone}"
    LENGTH: "${length}"
    EMOJIS: ${useEmojis ? 'Use them naturally to enhance engagement' : 'Strictly no emojis'}
    
    TONE DEFINITION:
    - professional: Authority, trust, industry-leading insights.
    - casual: Relatable, friendly, conversational, "best friend" vibe.
    - excited: High energy, FOMO-inducing, celebratory.
    - educational: Value-driven, "how-to", myth-busting, tips & tricks.

    STRICT LENGTH CONSTRAINTS (MANDATORY):
    - SHORT: 1-2 punchy sentences. Max 20 words.
    - MEDIUM: 2-3 detailed paragraphs. Between 60-80 words.
    - LONG: A deep dive with clear structure (Hook, Value, CTA). Over 150 words.
    
    WRITING GUIDELINES:
    - NEVER use AI markers: "In today's fast-paced world", "Unleash your potential", "Elevate your game", "Vibrant".
    - Use "I" or "We" to sound human.
    - Vary sentence length (short/punchy vs long/descriptive).
    - ${useEmojis ? 'Integrate emojis that match the tone.' : ''}
    - Add exactly 3 niche, high-performing hashtags relevant to the topic.
    
    RESPONSE FORMAT (JSON ONLY):
    {
      "description": "...",
      "suggestedHours": [
        { "hour": 10, "minute": 0, "label": "Morning productivity peak" },
        { "hour": 18, "minute": 30, "label": "Evening scrolling peak" }
      ]
    }`;

    logger.info({ topic, length, tone }, '[Intelligence] Generating AI content');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('AI response was empty');
    }

    const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    
    res.status(200).json({
      success: true,
      description: parsed.description,
      suggestedTimes: formatTimes(parsed.suggestedHours)
    });
  } catch (error) {
    next(error);
  }
};

const formatTimes = (hours: any[]) => {
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
    excited: "CANNOT BELIEVE we're finally sharing this about",
    educational: "Did you know this about"
  };

  const tonePrefix = tones[tone] || "Check out our latest update on";
  let baseDescription = `${tonePrefix} ${topic}. ${contentType} is evolving so fast.`;
  
  if (length === 'long') {
    baseDescription += " It's been a long road of testing and refining, but the results speak for themselves.";
  }

  res.status(200).json({
    success: true,
    description: baseDescription,
    suggestedTimes: []
  });
};

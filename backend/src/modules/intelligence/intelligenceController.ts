import { Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';
import { validateAgentCanAct } from './agentRegistry';
import { logAgentRun } from './agentRunLogger';

const STYLE_RULES: Record<string, string> = {
  "MrBeast": "High-energy hooks and curiosity-driven viral pacing.",
  "Alex Hormozi": "Authority tone, aggressive hooks, short sentences.",
  "Apple": "Minimal premium storytelling.",
  "Nike": "Bold motivational emotional tone.",
  "Startup Founder": "Authentic build-in-public style.",
  "Minimal Creator": "Clean concise creator captions."
};

export const analyzeImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { imageBase64 } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const agentCheck = validateAgentCanAct('agent-content-gen-v1', 'content_generation');
    if (!agentCheck.allowed) {
      return res.status(403).json({ error: 'Agent not authorized', reason: agentCheck.reason });
    }

    if (!imageBase64 || !env.GEMINI_API_KEY) {
      return res.status(400).json({ success: false, message: 'Missing image or API key' });
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    const result = await visionModel.generateContent([
      "Extract text and summarize this image for a social media story. Focus on key themes and mood. Keep it concise.",
      { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
    ]);

    const analysis = (await result.response).text();
    await logToDatabase('info', 'AI', `Vision analysis completed for user ${userId}`, { userId, agent_id: 'agent-content-gen-v1', agent_contract_version: 'v1' });

    res.status(200).json({ success: true, analysis });
  } catch (err) {
    next(err);
  }
};

export const generateContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { topic, contentType, platforms, length, tone, useEmojis, styleMode, imageBase64 } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const agentCheck = validateAgentCanAct('agent-content-gen-v1', 'content_generation');
    if (!agentCheck.allowed) {
      return res.status(403).json({ error: 'Agent not authorized', reason: agentCheck.reason });
    }

    let imageAnalysis = "";
    
    // Phase 0: Vision Analysis if image provided
    if (imageBase64 && env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        
        const result = await visionModel.generateContent([
          "Analyze this image for storytelling context. Extract meaningful text if present, otherwise describe the mood, scene, and emotional depth. Be concise and story-ready.",
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
        ]);
        imageAnalysis = (await result.response).text();
        logger.info('[Intelligence] Image analysis completed');
      } catch (err) {
        logger.error({ err }, '[Intelligence] Vision analysis failed');
      }
    }

    if (!env.GROQ_API_KEY) {
      logger.error('[Intelligence] GROQ_API_KEY missing');
      return fallbackMock(topic, contentType, tone, length, res);
    }

    const groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
    
    const selectedStyleRules = styleMode ? STYLE_RULES[styleMode] : "";

    const prompt = `
    Act as a World-Class Social Media Strategist and Copywriter.
    Your goal is to generate UNIQUE, high-converting content for each platform.
    
    INPUT DATA:
    - TOPIC: "${topic}"
    - IMAGE_CONTEXT: "${imageAnalysis || 'None'}"
    - CONTENT_CATEGORY: "${contentType}"
    - TARGETED_PLATFORMS: ${platforms.join(', ')}
    - TONE: "${tone}"
    - STYLE: "${selectedStyleRules}"
    - EMOJIS: ${useEmojis ? 'Enabled' : 'Disabled'}

    PLATFORM GOVERNANCE & CONSTRAINTS (2026 STANDARDS):
    - Instagram: 3-5 hashtags. Length: 125-300 chars.
    - X (Twitter): 1-2 hashtags. Length: 70-120 chars.
    - Threads: 0-1 topic tag. Length: 100-300 chars.
    - LinkedIn: 3-5 hashtags. Length: 150-400 chars.
    - Facebook: 1-3 hashtags. Length: 40-120 chars.
    - Pinterest: 0-3 hashtags. Length: 100-200 chars with keywords.

    WRITING RULES:
    1. MANDATORY: Every platform in TARGETED_PLATFORMS MUST have a unique caption. NO REPEATS.
    2. MANDATORY: You MUST provide the specific number of hashtags defined in the GOVERNANCE section. NEVER leave the 'hashtags' array empty unless specified (e.g. Threads).
    3. STRICT LENGTH LIMITS: You MUST strictly count characters for every platform. Ensure the caption length falls exactly within the specified character ranges (e.g., Facebook 40-120 chars). Do not exceed the maximum character limits under any circumstances.
    4. NO INLINE HASHTAGS: DO NOT include ANY hashtags inside the "caption" string itself. Place all hashtags EXCLUSIVELY in the "hashtags" array. The system will append them automatically.
    5. Hook Strength: Start with a viral-style hook (< 10 words).
    6. Formatting: Use line breaks for readability. Ensure CTAs are platform-appropriate.

    RESPONSE FORMAT (STRICT JSON):
    {
      "analysis": { "target_audience": "string", "strategic_hook": "string" },
      "universal": { "caption": "string", "hashtags": ["string"] },
      "platforms": {
        "Instagram": { "caption": "string", "hashtags": ["string"] },
        "Facebook": { "caption": "string", "hashtags": ["string"] },
        "X": { "caption": "string", "hashtags": ["string"] },
        "LinkedIn": { "caption": "string", "hashtags": ["string"] },
        "Threads": { "caption": "string", "hashtags": ["string"] },
        "Pinterest": { "caption": "string", "hashtags": ["string"] }
      },
      "metrics": { "viral_score": number, "sentiment_score": number },
      "scheduling": { "suggested_times": [ { "hour": number, "minute": number, "label": "string" } ] }
    }`;

    logger.info({ topic, length, tone, styleMode }, '[Intelligence] Generating content via Groq');
    await logToDatabase('info', 'AI', `Generating post via Groq for topic: ${topic}`, { topic, platforms, tone, styleMode, userId, agent_id: 'agent-content-gen-v1', agent_contract_version: 'v1' });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error('AI response was empty');

    const parsed = JSON.parse(text);
    const universalCaption = parsed.universal?.caption || "";
    const universalHashtags = (parsed.universal?.hashtags || []).join(' ');

    res.status(200).json({
      success: true,
      description: universalCaption + '\n\n' + universalHashtags,
      platform_content: parsed.platforms,
      suggestedTimes: formatTimes(parsed.scheduling?.suggested_times || []),
      metadata: {
        target_audience: parsed.analysis?.target_audience || "General",
        sentiment_score: parsed.metrics?.sentiment_score || 0.5,
        viral_score: parsed.metrics?.viral_score || 50
      }
    });

    await logAgentRun('agent-content-gen-v1', 'content_generation', userId, 'SUCCESS', { topic, platforms });
  } catch (error) {
    const userId = (req as AuthRequest).user?.id ?? 'unknown';
    await logAgentRun('agent-content-gen-v1', 'content_generation', userId, 'FAILURE', { error: String(error) });
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
  
  return (hours || []).map(sh => ({
    time: `${dateStr} ${sh.hour.toString().padStart(2, '0')}:${sh.minute.toString().padStart(2, '0')}:00`,
    label: sh.label
  }));
};

const fallbackMock = (topic: string, contentType: string, tone: string, length: string, res: Response) => {
  logger.warn('[Intelligence] Fallback mock used');
  const tonePrefix = "Update on";
  const baseDescription = `${tonePrefix} ${topic}. ${contentType} is evolving fast.`;

  res.status(200).json({
    success: true,
    description: baseDescription,
    suggestedTimes: []
  });
};

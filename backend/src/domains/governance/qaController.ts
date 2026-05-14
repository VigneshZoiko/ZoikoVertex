import { Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';

export const performQualityCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content, platforms, imageBase64 } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!content && !imageBase64) {
      return res.status(400).json({ success: false, message: 'Missing content or image' });
    }

    if (!env.GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'QA Intelligence Engine (Groq) not configured' });
    }

    const groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const prompt = `
    Act as a Senior Quality Assurance Specialist and Brand Governance Officer.
    Perform a deep forensic analysis of the following social media content.
    
    CONTENT: "${content || 'Image-based content'}"
    TARGET PLATFORMS: ${platforms?.join(', ') || 'General'}
    
    EVALUATE THE FOLLOWING METRICS (Score 0-100):
    1. Brand Alignment: Tone, voice consistency, and visual brand identity.
    2. Factual Accuracy: Check for logical inconsistencies or obvious falsehoods.
    3. Formatting: Proper spacing, line breaks, and character counts.
    4. Accessibility: Alt-text quality, readability, and inclusivity.
    5. Platform Readiness: Adherence to specific platform best practices.
    6. Compliance Posture: Legal risks, restricted keywords, or copyright flags.
    7. Content Quality: Grammar, vocabulary depth, and engagement hook strength.
    8. Publishing Fitness: Overall score indicating if it's ready for the public.

    RESPONSE FORMAT (STRICT JSON):
    {
      "scores": {
        "brand_alignment": number,
        "factual_accuracy": number,
        "formatting": number,
        "accessibility": number,
        "platform_readiness": number,
        "compliance": number,
        "content_quality": number,
        "publishing_fitness": number
      },
      "feedback": [
        { "category": "string", "issue": "string", "suggestion": "string", "severity": "low" | "medium" | "high" }
      ],
      "summary": "string",
      "sentiment": {
        "positive": number,
        "neutral": number,
        "negative": number,
        "tone": "string"
      },
      "optimized_content": "string (A version of the content that incorporates all the audit suggestions for maximum effectiveness)"
    }`;

    logger.info({ userId, platforms }, '[QA] Performing quality check');
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error('QA Engine returned empty response');

    const result = JSON.parse(text);

    await logToDatabase('info', 'QA', `Quality check completed for user ${userId}`, { userId, score: result.scores.publishing_fitness });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, '[QA] Quality check failed');
    next(error);
  }
};

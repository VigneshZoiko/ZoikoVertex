import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errorHandler';
import { provisionUser } from './modules/identity/identityController';
import { generateContent } from './modules/intelligence/intelligenceController';

const app = express();
const port = env.PORT;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ZoikoVertex Control Plane API is active.',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.post('/api/v1/users/provision', provisionUser);
app.post('/api/v1/ai/generate', generateContent);


    if (!topic || !contentType) {
      res.status(400).json({ error: 'Missing topic or content type' });
      return;
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        // 1. Live AI Integration via Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // Use the standard model name. If this fails, the catch block will handle it.
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

        console.log(`[AI] Generating ${length}/${tone} post for topic: ${topic}`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsed = JSON.parse(cleanedJson);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        const suggestedTimes = parsed.suggestedHours.map((sh: any) => {
          const hh = sh.hour.toString().padStart(2, '0');
          const mm = sh.minute.toString().padStart(2, '0');
          return {
            time: `${dateStr} ${hh}:${mm}:00`,
            label: sh.label
          };
        });

        res.status(200).json({
          success: true,
          description: parsed.description,
          suggestedTimes: suggestedTimes
        });
        return;
      } catch (aiErr: any) {
        console.warn("Gemini API failed, falling back to mock engine:", aiErr.message || aiErr);
        // Continue to fallback
      }
    }

    // 2. Fallback Mock Engine (If no API key or JSON parse failed)
    const tones: Record<string, string> = {
      professional: "We are pleased to announce our latest developments in",
      casual: "Honestly, so stoked about",
      excited: "CANNOT BELIEVE we're finally sharing this about",
      educational: "Did you know this about"
    };

    const tonePrefix = tones[tone as string] || "Check out our latest update on";
    let baseDescription = `${tonePrefix} ${topic}. ${contentType} is evolving so fast and we're just glad to be part of the journey.`;
    
    if (length === 'long') {
      baseDescription += " It's been a long road of testing and refining, but the results speak for themselves. We've seen incredible feedback and can't wait to see how this impacts the community.";
    }

    const tags = `#${contentType.replace(/\s+/g, '')} #${topic.split(' ')[0].replace(/[^a-zA-Z]/g, '')} #ZoikoVertex`;
    const finalDescription = `${baseDescription}\n\n${tags}`;

    const getSuggestedTimes = (type: string) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      if (type.toLowerCase().includes('business') || type.toLowerCase().includes('tech')) {
        return [
          { time: `${dateStr} 08:30:00`, label: 'High Engagement (Morning Commute)' },
          { time: `${dateStr} 12:15:00`, label: 'Medium Engagement (Lunch Break)' }
        ];
      }
      if (type.toLowerCase().includes('entertainment') || type.toLowerCase().includes('music')) {
        return [
          { time: `${dateStr} 19:00:00`, label: 'Peak Engagement (Evening)' },
          { time: `${dateStr} 21:30:00`, label: 'High Engagement (Late Night)' }
        ];
      }
      return [
        { time: `${dateStr} 10:00:00`, label: 'Steady Engagement (Mid-Morning)' },
        { time: `${dateStr} 15:00:00`, label: 'Afternoon Bump' }
      ];
    };

    await new Promise(r => setTimeout(r, 1500));

    res.status(200).json({
      success: true,
      description: finalDescription,
      suggestedTimes: getSuggestedTimes(contentType as string)
    });

  } catch (err: any) {
    console.error("AI Route Error:", err.message || err);
    if (err.response) {
      console.error("Error Response Data:", err.response.data);
    }
    res.status(500).json({ 
      error: 'AI Synthesis Failed', 
      details: err.message,
      suggestion: "Check if your GEMINI_API_KEY is valid and has access to gemini-1.5-flash."
    });
  }
});

// Global Error Handler
app.use(errorHandler);
 main

// Start Server
try {
  const server = app.listen(port, () => {
    logger.info(`[server]: ZoikoVertex backend running in ${env.NODE_ENV} mode at http://localhost:${port}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`[server] Error: Port ${port} is already in use.`);
    } else {
      logger.error({ err }, '[server] Error');
    }
    process.exit(1);
  });
} catch (startErr) {
  logger.error({ startErr }, '[server] Failed to start');
}

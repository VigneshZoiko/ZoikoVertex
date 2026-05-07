import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './config/env';
import { logger } from './shared/logger';
import { errorHandler } from './shared/errorHandler';

const app = express();
const port = env.PORT;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Persistent Logging Helper
async function logToDatabase(level: string, service: string, message: string, payload?: any) {
  console.log(`[${service}] ${message}`);
  try {
    await supabaseAdmin.from('system_logs').insert({ level, service, message, payload });
  } catch (err) {
    console.error('Failed to log to database:', err);
  }
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'ZoikoVertex Control Plane API is active.',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── User Provisioning ───────────────────────────────────────────────────────
app.post('/api/v1/users/provision', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, role, workspace_id } = req.body;
    await logToDatabase('info', 'Provisioning', `Request for ${email} as ${role}`, { email, role, workspace_id });

    if (!email || !password || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Provisioning] Error: SUPABASE_SERVICE_ROLE_KEY is missing');
      res.status(500).json({ error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY' });
      return;
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    const userId = authData.user.id;

    // 2. Assign role in workspace_members
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .upsert({ workspace_id, user_id: userId, role });

    if (memberError) {
      res.status(500).json({ error: 'User authenticated but role assignment failed: ' + memberError.message });
      return;
    }

    res.status(201).json({ success: true, message: 'User provisioned successfully' });
  } catch (err: any) {
    console.error(`[Provisioning] Internal Error: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── AI Content Generation ───────────────────────────────────────────────────
app.post('/api/v1/ai/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, contentType, platforms, length = 'medium', tone = 'professional', useEmojis = true } = req.body;

    if (!topic || !contentType) {
      res.status(400).json({ error: 'Missing topic or content type' });
      return;
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const variationIndex = Math.floor(Math.random() * 1000);

        const prompt = `
        Act as a World-Class Social Media Strategist and Brand Auditor. 
        Your goal is to generate high-converting, brand-safe social media content.
        
        INPUT DATA:
        - TOPIC: "${topic}"
        - CONTENT_TYPE: "${contentType}"
        - PLATFORMS: ${(platforms as string[]).join(', ')}
        - TONE: "${tone}"
        - LENGTH: "${length}"
        - EMOJIS: ${useEmojis ? 'Enabled' : 'Disabled'}
        - VARIATION_ID: ${variationIndex}

        PHASE 1: STRATEGIC ANALYSIS (Chain-of-Thought)
        1. Identify the core value proposition of the topic.
        2. Define the target audience demographics for the specified platforms.
        3. Determine platform-specific constraints.
        4. Assess the ideal sentiment for this topic and tone.

        PHASE 2: CONTENT GENERATION
        - Draft a primary caption that resonates with the audience.
        - Ensure the length: ${length === 'short' ? 'Max 20 words' : length === 'medium' ? '60-80 words' : '150+ words'}.
        - Select 3 high-performing hashtags based on current trends.

        PHASE 3: GOVERNANCE AUDIT
        - Calculate a sentiment score (0.0 to 1.0).
        - Calculate a brand safety score (0.0 to 1.0).

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

        await logToDatabase('info', 'AI', `Generating post for topic: ${topic}`, { topic, platforms, tone });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (parsed.content.brand_safety_score < 0.8) {
          console.warn(`[AI] Low brand safety score: ${parsed.content.brand_safety_score}`);
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const suggestedTimes = parsed.scheduling.suggested_times.map((sh: any) => ({
          time: `${dateStr} ${sh.hour.toString().padStart(2, '0')}:${sh.minute.toString().padStart(2, '0')}:00`,
          label: sh.label
        }));

        res.status(200).json({
          success: true,
          description: parsed.content.caption + '\n\n' + parsed.content.hashtags.join(' '),
          suggestedTimes,
          metadata: {
            target_audience: parsed.analysis.target_audience,
            sentiment_score: parsed.content.sentiment_score,
            brand_safety_score: parsed.content.brand_safety_score
          }
        });
        return;
      } catch (aiErr: any) {
        console.warn('Gemini API failed, falling back to mock engine:', aiErr.message || aiErr);
      }
    }

    // Fallback Mock Engine
    const tones: Record<string, string> = {
      professional: 'We are pleased to announce our latest developments in',
      casual: 'Honestly, so stoked about',
      bold: 'BREAKING: Everything changes now with',
      inspirational: 'The future belongs to those who believe in',
      educational: 'Did you know this about'
    };

    const tonePrefix = tones[tone as string] || 'Check out our latest update on';
    let baseDescription = `${tonePrefix} ${topic}. ${contentType} is evolving fast and we're glad to be part of the journey.`;

    if (length === 'long') {
      baseDescription += " It's been a long road of testing and refining, but the results speak for themselves. We've seen incredible feedback and can't wait to see how this impacts the community.";
    }

    const tags = `#${(contentType as string).replace(/\s+/g, '')} #${topic.split(' ')[0].replace(/[^a-zA-Z]/g, '')} #ZoikoVertex`;
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
    console.error('AI Route Error:', err.message || err);
    res.status(500).json({
      error: 'AI Synthesis Failed',
      details: err.message,
      suggestion: 'Check if your GEMINI_API_KEY is valid and has access to gemini-1.5-flash.'
    });
  }
});

// ─── Governance & Execution Engine ───────────────────────────────────────────
app.post('/api/v1/governance/transition', async (req: Request, res: Response): Promise<void> => {
  try {
    const { intentId, newStatus, feedback, userId, userRole } = req.body;

    if (!intentId || !newStatus || !userId) {
      res.status(400).json({ error: 'Missing required governance fields' });
      return;
    }

    await logToDatabase('info', 'Governance', `Transitioning ${intentId} to ${newStatus} by ${userRole}`, { intentId, newStatus, feedback, userId });

    // 1. Update the intent status
    const { data, error } = await supabaseAdmin
      .from('publish_intents')
      .update({ status: newStatus, feedback: feedback || null })
      .eq('id', intentId)
      .select()
      .single();

    if (error) throw error;

    // 2. If APPROVED, simulate publishing after a delay
    if (newStatus === 'APPROVED') {
      console.log(`[Execution] Scheduling simulated publish for intent ${intentId}...`);
      setTimeout(async () => {
        try {
          await supabaseAdmin
            .from('publish_intents')
            .update({ status: 'PUBLISHED' })
            .eq('id', intentId);
          await logToDatabase('info', 'Execution', `Intent ${intentId} successfully PUBLISHED (Simulated).`, { intentId });
        } catch (execErr) {
          console.error(`[Execution] Failed to publish ${intentId}:`, execErr);
        }
      }, 10000);
    }

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Governance Route Error:', err.message);
    res.status(500).json({ error: 'Governance Transition Failed', details: err.message });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
try {
  const server = app.listen(port, () => {
    logger.info(`[server]: ZoikoVertex backend running in ${env.NODE_ENV} mode at http://localhost:${port}`);
  });

  server.on('error', (err: Error & { code?: string }) => {
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

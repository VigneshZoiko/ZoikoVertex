import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Intent/Health-check API
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'ZoikoVertex Control Plane API is active.',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

app.post('/api/v1/users/provision', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, role, workspace_id } = req.body;
    console.log(`[Provisioning] Request for ${email} as ${role} in workspace ${workspace_id}`);

    if (!email || !password || !role) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Provisioning] Error: SUPABASE_SERVICE_ROLE_KEY is missing');
      res.status(500).json({ error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY in backend .env' });
      return;
    }

    // 1. Create user in Supabase Auth securely
    console.log(`[Provisioning] Creating Auth user for ${email}...`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      console.error(`[Provisioning] Auth Error: ${authError.message}`);
      res.status(400).json({ error: authError.message });
      return;
    }

    const userId = authData.user.id;
    console.log(`[Provisioning] Auth user created successfully: ${userId}`);

    // 2. Set the role in workspace_members
    console.log(`[Provisioning] Assigning role ${role} to user ${userId}...`);
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .upsert({
        workspace_id,
        user_id: userId,
        role: role
      });

    if (memberError) {
      console.error(`[Provisioning] Member Error: ${memberError.message}`);
      res.status(500).json({ error: 'User authenticated but role assignment failed: ' + memberError.message });
      return;
    }

    console.log(`[Provisioning] Success for ${email}`);
    res.status(201).json({ success: true, message: 'User provisioned successfully' });
  } catch (err: any) {
    console.error(`[Provisioning] Internal Error: ${err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

import { GoogleGenAI } from '@google/genai';

app.post('/api/v1/ai/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, contentType, platforms } = req.body;

    if (!topic || !contentType) {
      res.status(400).json({ error: 'Missing topic or content type' });
      return;
    }

    if (process.env.GEMINI_API_KEY) {
      // 1. Live AI Integration via Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are an expert Social Media Manager. I need to post about "${topic}". The content type is "${contentType}". Target platforms: ${platforms.join(', ')}. 
      Generate a highly engaging, professional 4-5 line description with exactly 3 relevant hashtags at the end.
      
      Also, suggest two peak time slots for this specific content type to maximize engagement.
      
      Respond EXACTLY in this JSON format without markdown blocks:
      {
        "description": "The description string here...",
        "suggestedHours": [
          { "hour": 9, "minute": 30, "label": "Morning Commute" },
          { "hour": 18, "minute": 0, "label": "Evening Wind-Down" }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      const responseText = response.text || "{}";
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
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
      } catch (parseErr) {
        console.error("Failed to parse Gemini JSON", parseErr);
        // Fallback to rules if parse fails
      }
    }

    // 2. Fallback Mock Engine (If no API key or JSON parse failed)
    const prefixes: Record<string, string> = {
      Entertainment: "Get ready to be amazed! 🍿",
      Music: "Turn the volume up! 🎧",
      Technology: "Innovation never sleeps. 🚀",
      Education: "Expand your mind today. 📚",
      Business: "Strategic growth in action. 💼"
    };

    const prefix = prefixes[contentType as string] || "Check this out! ✨";
    const baseDescription = `${prefix} We're thrilled to share our latest update on: ${topic}. This has been in the works for a while and we can't wait to see your reaction.`;
    
    // Generate relevant hashtags based on topic and type
    const tags = `#${contentType.replace(/\s+/g, '')} #${topic.split(' ')[0].replace(/[^a-zA-Z]/g, '')} #ZoikoVertex`;
    
    const finalDescription = `${baseDescription}\n\nDrop your thoughts in the comments below! 👇\n\n${tags}`;

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
    console.error("AI Route Error:", err);
    res.status(500).json({ error: 'AI Synthesis Failed' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`[server]: ZoikoVertex backend is running at http://localhost:${port}`);
});

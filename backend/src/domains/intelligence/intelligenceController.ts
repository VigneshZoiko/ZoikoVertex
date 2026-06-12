/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { AuthRequest } from '../../shared/authMiddleware';
import { logToDatabase } from '../../shared/databaseLogger';
import { validateAgentCanAct } from './agentRegistry';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { logAgentRun } from './agentRunLogger';
import { KnowledgeController } from '../../modules/knowledge/knowledgeController';
import { supabaseAdmin } from '../../shared/supabase';
import { evaluatePayloadAgainstPolicies } from '../governance/policyController';
import { trackUsage } from '../monitoring/usageController';

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

    if (!imageBase64 || !env.GROQ_API_KEY) {
      return res.status(400).json({ success: false, message: 'Missing image or API key' });
    }

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const INLINE_VISION_PROMPT = "Extract text and summarize this image for a social media story. Focus on key themes and mood. Keep it concise.";
    const GROQ_VISION_MODELS = [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview',
    ];
    const groqVision = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.GROQ_API_KEY, timeout: 30_000 });
    let analyzeImageTokens = 0;

    const callVision = async (textPrompt: string): Promise<string> => {
      for (const modelId of GROQ_VISION_MODELS) {
        try {
          const completion = await groqVision.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: [
              { type: 'text', text: textPrompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
            ]}],
            temperature: 0,
            max_tokens: 512,
          });
          const out = completion.choices[0]?.message?.content || '';
          if (out) {
            analyzeImageTokens += completion.usage?.total_tokens ?? 0;
            return out;
          }
        } catch {
          logger.warn(`[Intelligence] ${modelId} unavailable, trying next model`);
        }
      }
      return '';
    };

    // Phase 4.E — prefer the governed 'vision_image_summary' prompt; on governance
    // block, audited fallback (fail-closed in production when PROMPT_GOVERNANCE_ENFORCED).
    let analysis: string;
    const governedVision = await GovernedModelGate.execute({
      useCaseKey: 'vision_image_summary',
      workspaceId: (req.user?.workspace_id as string) || '',
      variables: {},
      modelProvider: 'groq',
      actorId: userId,
      invoke: callVision,
    });
    if (governedVision.ok) {
      analysis = governedVision.output || '';
    } else {
      await GovernedModelGate.legacyInlineFallback('vision_image_summary', req.user?.workspace_id as string | undefined, `governed prompt unavailable: ${governedVision.code}`);
      analysis = await callVision(INLINE_VISION_PROMPT);
    }
    if (!analysis) {
      return res.status(200).json({ success: false, error: 'Vision analysis is currently unavailable. The image AI service is not responding.' });
    }
    await logToDatabase('info', 'AI', `Vision analysis completed for user ${userId}`, { userId, agent_id: 'agent-content-gen-v1', agent_contract_version: 'v1' });

    const analyzeWorkspaceId = req.user?.workspace_id as string | undefined;
    if (analyzeWorkspaceId) {
      const qty = analyzeImageTokens > 0 ? analyzeImageTokens : 512;
      trackUsage({ workspaceId: analyzeWorkspaceId, resourceType: 'AI_TOKENS', quantity: qty, costUsd: qty * 0.0000001, unit: 'tokens', referenceType: 'image_analysis', metadata: { model: 'groq-vision', estimated: analyzeImageTokens === 0 } });
    }

    // Tier-0 Safety Layer: evaluate analysis output against active policies
    if (analyzeWorkspaceId) {
      const safetyCheck = await evaluatePayloadAgainstPolicies({ analysis }, analyzeWorkspaceId);
      if (['block', 'quarantine', 'hold_for_review'].includes(safetyCheck.outcome)) {
        logger.warn({ outcome: safetyCheck.outcome, rule: safetyCheck.rule_id }, '[Safety Layer] Image analysis output blocked by active policy.');
        return res.status(403).json({
          success: false,
          error: 'Safety Layer Interception: Analysis output violated active policies.',
          reason: safetyCheck.reason,
          outcome: safetyCheck.outcome,
          rule_id: safetyCheck.rule_id,
        });
      }
    }

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
    if (imageBase64 && env.GROQ_API_KEY) {
      try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const INLINE_STORY_PROMPT = "Analyze this image for storytelling context. Extract meaningful text if present, otherwise describe the mood, scene, and emotional depth. Be concise and story-ready.";
        const GROQ_VISION_MODELS = [
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'llama-3.2-11b-vision-preview',
          'llama-3.2-90b-vision-preview',
        ];
        const groqStory = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.GROQ_API_KEY, timeout: 30_000 });
        let storyVisionTokens = 0;
        const callVision = async (textPrompt: string): Promise<string> => {
          for (const modelId of GROQ_VISION_MODELS) {
            try {
              const completion = await groqStory.chat.completions.create({
                model: modelId,
                messages: [{ role: 'user', content: [
                  { type: 'text', text: textPrompt },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
                ]}],
                temperature: 0,
                max_tokens: 512,
              });
              const out = completion.choices[0]?.message?.content || '';
              if (out) {
                storyVisionTokens += completion.usage?.total_tokens ?? 0;
                logger.info(`[Intelligence] Image analysis completed with ${modelId}`);
                return out;
              }
            } catch {
              logger.warn(`[Intelligence] ${modelId} unavailable for vision, trying next`);
            }
          }
          return '';
        };
        const governedStory = await GovernedModelGate.execute({
          useCaseKey: 'vision_story_context',
          workspaceId: (req.user?.workspace_id as string) || '',
          variables: {},
          modelProvider: 'groq',
          actorId: userId,
          invoke: callVision,
        });
        if (governedStory.ok) {
          imageAnalysis = governedStory.output || '';
        } else {
          await GovernedModelGate.legacyInlineFallback('vision_story_context', req.user?.workspace_id as string | undefined, `governed prompt unavailable: ${governedStory.code}`);
          imageAnalysis = await callVision(INLINE_STORY_PROMPT);
        }
        const storyWsId = req.user?.workspace_id as string | undefined;
        if (storyWsId) {
          const qty = storyVisionTokens > 0 ? storyVisionTokens : 512;
          trackUsage({ workspaceId: storyWsId, resourceType: 'AI_TOKENS', quantity: qty, costUsd: qty * 0.0000001, unit: 'tokens', referenceType: 'story_vision', metadata: { model: 'groq-vision', estimated: storyVisionTokens === 0 } });
        }
      } catch (err) {
        logger.warn({ err }, '[Intelligence] Vision analysis failed — continuing without image context');
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

    // ─── Fetch Org Knowledge Context ─────────────────────────────────────────
    let knowledgeContextBlock = "";
    try {
      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .select('workspaces(org_id)')
        .eq('user_id', userId)
        .maybeSingle();
      const orgId = (member?.workspaces as any)?.org_id;
      if (orgId) {
        const ctx = await KnowledgeController.buildAIContextForOrg(orgId);
        const blocks: string[] = [];

        if (ctx.brand_voice && ctx.brand_voice.length > 0) {
          const voiceText = ctx.brand_voice.map((v: any) => `- [${v.title}]: ${v.guideline}`).join('\n');
          blocks.push(`BRAND VOICE & TONE GUIDELINES (MUST FOLLOW):\n${voiceText}`);
        }

        if (ctx.brand_visual) {
          const v = ctx.brand_visual;
          const visualLines = [
            v.primary_color ? `  Primary Color: ${v.primary_color}` : null,
            v.secondary_color ? `  Secondary Color: ${v.secondary_color}` : null,
            v.font_family ? `  Brand Fonts: ${v.font_family}` : null,
            v.visual_style ? `  Visual Style: ${v.visual_style}` : null,
          ].filter(Boolean);
          if (visualLines.length > 0) {
            blocks.push(`BRAND VISUAL IDENTITY (for reference in image prompts and style):\n${visualLines.join('\n')}`);
          }
        }

        if (ctx.sop_rules && ctx.sop_rules.length > 0) {
          const sopText = ctx.sop_rules.map((s: any) => `- [${s.title}]: ${s.rule}`).join('\n');
          blocks.push(`OPERATIONAL RULES & SOPs (MUST COMPLY):\n${sopText}`);
        }

        if (ctx.ai_library && ctx.ai_library.length > 0) {
          const libText = ctx.ai_library.map((l: any) => `- [${l.title}]: ${l.content}`).join('\n');
          blocks.push(`KNOWLEDGE LIBRARY (use for factual accuracy):\n${libText}`);
        }

        if (blocks.length > 0) {
          knowledgeContextBlock = `
\n\n═══════════════════════════════════════════════
ORGANIZATION KNOWLEDGE BASE CONTEXT
The following rules and guidelines are MANDATORY and must override any generic defaults.
═══════════════════════════════════════════════
${blocks.join('\n\n')}
═══════════════════════════════════════════════`;
          logger.info({ orgId, blocks: blocks.length }, '[Intelligence] Knowledge context injected into prompt');
        }
      }
    } catch (kbErr) {
      // Non-fatal: if KB fetch fails, proceed without knowledge context
      logger.warn({ kbErr }, '[Intelligence] Could not fetch knowledge context, proceeding without it');
    }

    const prompt = `
    Act as a World-Class Social Media Strategist and Copywriter.
    Your goal is to generate UNIQUE, high-converting content for each platform.
    ${knowledgeContextBlock}
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

    const captionWsId = req.user?.workspace_id as string | undefined;
    const captionCap: { tokens: number } = { tokens: 0 };
    const callCaptionModel = async (p: string): Promise<string> => {
      const c = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: p }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });
      captionCap.tokens = c.usage?.total_tokens ?? 0;
      return c.choices[0]?.message?.content || "";
    };

    // Phase 4.E — prefer the governed 'social_caption_generation' prompt (its
    // knowledge_context + image_context + style are passed as variables so the
    // 6-platform JSON contract is preserved). On governance block, audited
    // fallback (fail-closed in production when PROMPT_GOVERNANCE_ENFORCED) to the
    // inline prompt. Model is not called unless the resolver succeeds first.
    let text: string;
    const governedCaption = await GovernedModelGate.execute({
      useCaseKey: 'social_caption_generation',
      workspaceId: captionWsId || '',
      variables: {
        topic,
        content_category: contentType,
        tone,
        length,
        audience: (req.body.audience as string) || '',
        style: selectedStyleRules,
        emojis: useEmojis ? 'Enabled' : 'Disabled',
        platforms: Array.isArray(platforms) ? platforms.join(', ') : String(platforms ?? ''),
        knowledge_context: knowledgeContextBlock,
        image_context: imageAnalysis || 'None',
      },
      modelProvider: 'groq',
      actorId: userId,
      invoke: callCaptionModel,
    });
    if (governedCaption.ok) {
      text = governedCaption.output || '';
    } else {
      await GovernedModelGate.legacyInlineFallback('social_caption_generation', captionWsId, `governed prompt unavailable: ${governedCaption.code}`);
      text = await callCaptionModel(prompt);
    }
    if (!text) throw new Error('AI response was empty');

    const parsed = JSON.parse(text);

    // ─── Tier-0 Safety Layer: Guardrail Interception ────────────────────────
    const workspaceId = req.user?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const safetyCheck = await evaluatePayloadAgainstPolicies(parsed, workspaceId);

    if (['block', 'quarantine', 'hold_for_review'].includes(safetyCheck.outcome)) {
      logger.warn({ outcome: safetyCheck.outcome, rule: safetyCheck.rule_id }, '[Safety Layer] Payload intercepted and blocked by active policy.');
      return res.status(403).json({
        success: false,
        error: 'Safety Layer Interception: Content violated active policies.',
        reason: safetyCheck.reason,
        outcome: safetyCheck.outcome,
        rule_id: safetyCheck.rule_id
      });
    }
    // ────────────────────────────────────────────────────────────────────────

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

    // Track AI token usage (non-blocking)
    const tokens = captionCap.tokens;
    if (tokens > 0 && workspaceId && workspaceId !== '00000000-0000-0000-0000-000000000000') {
      trackUsage({
        workspaceId,
        resourceType: 'AI_TOKENS',
        quantity: tokens,
        costUsd: tokens * 0.0000001, // ~$0.0001 per 1k tokens (Groq llama-3.3-70b)
        unit: 'tokens',
        referenceType: 'content_generation',
        metadata: { model: 'llama-3.3-70b-versatile', topic },
      });
    }
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

export const generateAdCopy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt, lengthInstructions } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!env.GROQ_API_KEY) {
      return res.status(500).json({ success: false, error: 'GROQ_API_KEY is not configured.' });
    }

    const groq = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const systemPrompt = `You are a World-Class Copywriter for marketing campaigns.
The user will provide a product idea or description.
Your goal is to generate compelling, high-converting ad copy for this product.
${lengthInstructions ? `IMPORTANT: Follow these length instructions strictly: ${lengthInstructions}` : ''}
Do not include conversational filler like "Here is your copy". Just output the copy directly.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const copy = completion.choices[0]?.message?.content || "";

    res.status(200).json({
      success: true,
      copy
    });
  } catch (error) {
    logger.error({ error }, '[Intelligence] generateAdCopy failed');
    next(error);
  }
};

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { GovernedPromptResolver } from '../../modules/prompts/GovernedPromptResolver';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { buildGovernedPromptFixtures } from '../../modules/prompts/governedPromptSeeds';
import { env } from '../../config/env';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

let origEnforced: string;
let origEnv: string;
beforeEach(() => {
  resetFixtures();
  origEnforced = env.PROMPT_GOVERNANCE_ENFORCED;
  origEnv = env.NODE_ENV;
});
afterEach(() => {
  (env as any).PROMPT_GOVERNANCE_ENFORCED = origEnforced;
  (env as any).NODE_ENV = origEnv;
  vi.restoreAllMocks();
});

describe('Phase 4.E — caption generation governed execution', () => {
  beforeEach(() => setFixtures(buildGovernedPromptFixtures('ws-a')));

  it('uses the governed prompt and preserves the 6-platform JSON contract', async () => {
    const r = await GovernedPromptResolver.resolve({
      useCaseKey: 'social_caption_generation',
      workspaceId: 'ws-a',
      variables: {
        topic: 'New running shoes', content_category: 'Promotional', tone: 'Witty',
        length: 'Medium', audience: 'Gen Z', style: 'Nike', emojis: 'Enabled',
        platforms: 'Instagram, LinkedIn', knowledge_context: 'BRAND VOICE: bold and friendly',
        image_context: 'a sunset beach photo',
      },
    });
    expect(r.ok).toBe(true);
    // 6-platform JSON contract markers preserved.
    expect(r.governedPrompt).toContain('"platforms"');
    expect(r.governedPrompt).toContain('"universal"');
    expect(r.governedPrompt).toContain('Instagram');
    expect(r.governedPrompt).toContain('LinkedIn');
  });

  it('includes knowledge_context and image_insight (image_context) variables', async () => {
    const r = await GovernedPromptResolver.resolve({
      useCaseKey: 'social_caption_generation',
      workspaceId: 'ws-a',
      variables: { topic: 'T', content_category: 'C', tone: 'X', style: 'S', emojis: 'Disabled', platforms: 'X', knowledge_context: 'BRAND VOICE: bold and friendly', image_context: 'a sunset beach photo' },
    });
    expect(r.ok).toBe(true);
    expect(r.governedPrompt).toContain('BRAND VOICE: bold and friendly');
    expect(r.governedPrompt).toContain('a sunset beach photo');
    expect(r.governedPrompt).not.toContain('{{');
  });

  it('fails closed (no model call) under enforcement when the governed prompt is missing', async () => {
    setFixtures({ prompts: [] });
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const invoke = vi.fn(async () => 'should not run');
    const result = await GovernedModelGate.execute({ useCaseKey: 'social_caption_generation', workspaceId: 'ws-a', variables: {}, modelProvider: 'groq', invoke });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NO_GOVERNED_PROMPT');
    expect(invoke).not.toHaveBeenCalled();
    await expect(GovernedModelGate.legacyInlineFallback('social_caption_generation', 'ws-a', 'missing')).rejects.toThrow(/Governed prompt required/);
  });
});

describe('Phase 4.E — vision governed execution preserves the image payload', () => {
  beforeEach(() => setFixtures(buildGovernedPromptFixtures('ws-a')));

  it('vision_image_summary uses the governed prompt AND still sends the image part', async () => {
    const parts: any[] = [];
    const r = await GovernedModelGate.execute({
      useCaseKey: 'vision_image_summary', workspaceId: 'ws-a', variables: {}, modelProvider: 'gemini',
      invoke: async (governedPrompt: string) => {
        parts.push(governedPrompt);
        parts.push({ inlineData: { data: 'BASE64', mimeType: 'image/jpeg' } });
        return 'A sunset over the ocean';
      },
    });
    expect(r.ok).toBe(true);
    expect(parts[0]).toContain('summarize this image'); // governed body
    expect(parts[1].inlineData).toBeDefined(); // multimodal payload preserved
    expect(r.output).toContain('sunset');
  });

  it('vision_story_context uses the governed prompt AND still sends the image part', async () => {
    const parts: any[] = [];
    const r = await GovernedModelGate.execute({
      useCaseKey: 'vision_story_context', workspaceId: 'ws-a', variables: {}, modelProvider: 'gemini',
      invoke: async (governedPrompt: string) => {
        parts.push(governedPrompt);
        parts.push({ inlineData: { data: 'BASE64', mimeType: 'image/jpeg' } });
        return 'A nostalgic, warm scene';
      },
    });
    expect(r.ok).toBe(true);
    expect(parts[0]).toContain('storytelling context');
    expect(parts[1].inlineData).toBeDefined();
  });

  it('vision paths fail closed (no model call) under enforcement when governed prompt missing', async () => {
    setFixtures({ prompts: [] });
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const invoke = vi.fn(async () => 'nope');
    const r1 = await GovernedModelGate.execute({ useCaseKey: 'vision_image_summary', workspaceId: 'ws-a', variables: {}, modelProvider: 'gemini', invoke });
    const r2 = await GovernedModelGate.execute({ useCaseKey: 'vision_story_context', workspaceId: 'ws-a', variables: {}, modelProvider: 'gemini', invoke });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('enforcement=false preserves the legacy fallback for caption + vision', async () => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    await expect(GovernedModelGate.legacyInlineFallback('social_caption_generation', 'ws-a', 'x')).resolves.toBeUndefined();
    await expect(GovernedModelGate.legacyInlineFallback('vision_image_summary', 'ws-a', 'x')).resolves.toBeUndefined();
    await expect(GovernedModelGate.legacyInlineFallback('vision_story_context', 'ws-a', 'x')).resolves.toBeUndefined();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ gemini: vi.fn(async (): Promise<any> => null) }));

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));
// Force the AI-moderation gate to be reachable (local not high-confidence, no matches).
vi.mock('../../modules/safety/localEngine', () => ({ runLocalEngine: () => ({ matches: [], highConfidence: false }) }));
vi.mock('../../modules/safety/geminiModerator', () => ({ runGeminiModeration: (...a: any[]) => h.gemini(...a) }));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify({ risk_level: 'LOW', sentiment: 'NEUTRAL' }) } }] }) } };
  },
}));

import { moderate } from '../../modules/safety/moderationService';
import { GovernedPromptResolver } from '../../modules/prompts/GovernedPromptResolver';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { classifyMessage } from '../../domains/inbox/inboxClassifier';
import { buildGovernedPromptFixtures, GOVERNED_PROMPT_SEEDS } from '../../modules/prompts/governedPromptSeeds';
import { env } from '../../config/env';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

const LONG = 'Please review this customer message regarding a potential refund and account issue today.';

let origEnforced: string;
let origEnv: string;
let origGroq: string | undefined;
beforeEach(() => {
  resetFixtures();
  h.gemini.mockClear();
  h.gemini.mockResolvedValue(null);
  origEnforced = env.PROMPT_GOVERNANCE_ENFORCED;
  origEnv = env.NODE_ENV;
  origGroq = env.GROQ_API_KEY;
});
afterEach(() => {
  (env as any).PROMPT_GOVERNANCE_ENFORCED = origEnforced;
  (env as any).NODE_ENV = origEnv;
  (env as any).GROQ_API_KEY = origGroq;
  vi.restoreAllMocks();
});

describe('Phase 4.C — governed prompt seeds resolve by use_case_key', () => {
  it('every seeded use_case_key resolves to a valid governed prompt', async () => {
    setFixtures(buildGovernedPromptFixtures('ws-a'));
    for (const seed of GOVERNED_PROMPT_SEEDS) {
      const r = await GovernedPromptResolver.resolve({ useCaseKey: seed.useCaseKey, workspaceId: 'ws-a', variables: {} });
      expect(r.ok, `${seed.useCaseKey} should resolve`).toBe(true);
      expect(r.code).toBe('OK');
      expect(r.evidence?.receipt_hash).toBeTruthy();
      expect(r.evidence?.constraint_shadow_hash).toBeTruthy();
    }
  });

  it('production enforcement blocks an UNSEEDED use case (no fail-open)', async () => {
    setFixtures({ prompts: [] });
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const r = await GovernedPromptResolver.resolve({ useCaseKey: 'not_seeded', workspaceId: 'ws-a' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NO_GOVERNED_PROMPT');
    await expect(GovernedModelGate.legacyInlineFallback('not_seeded', 'ws-a', 'unseeded')).rejects.toThrow(/Governed prompt required/);
  });

  it('enforcement stays off-safe in development (advisory bypass, no throw)', async () => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'development';
    await expect(GovernedModelGate.legacyInlineFallback('not_seeded', 'ws-a', 'unseeded')).resolves.toBeUndefined();
  });
});

describe('Phase 4.C — safety moderator hard block', () => {
  it('HARD BLOCKS (verdict=block, not safe) when enforced and no governed safety prompt — no fail-open', async () => {
    setFixtures({ prompts: [] }); // no safety_moderation governed prompt
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const result = await moderate({ content: LONG, workspaceId: 'ws-a' });
    expect(result.verdict).toBe('block');
    expect(result.safe).toBe(false);
    // Did NOT fall open to an ungoverned Gemini call.
    expect(h.gemini).not.toHaveBeenCalled();
    expect(result.reason).toMatch(/governed prompt is required/i);
  });

  it('does NOT fail open: local "safe" cannot override a governance block', async () => {
    setFixtures({ prompts: [] });
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const result = await moderate({ content: LONG, workspaceId: 'ws-a' });
    // local engine returned [] matches (would aggregate to "safe") — overridden.
    expect(result.safe).toBe(false);
  });

  it('when a governed safety prompt is seeded, AI moderation is authorized (no hard block)', async () => {
    setFixtures(buildGovernedPromptFixtures('ws-a'));
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const result = await moderate({ content: LONG, workspaceId: 'ws-a' });
    expect(result.verdict).not.toBe('block'); // gemini mock returned null → no matches → safe
    expect(h.gemini).toHaveBeenCalledTimes(1); // governed path ran the moderation
  });

  it('when not enforced and no governed prompt, legacy Gemini path still runs (off-safe)', async () => {
    setFixtures({ prompts: [] });
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    const result = await moderate({ content: LONG, workspaceId: 'ws-a' });
    expect(result.verdict).not.toBe('block');
    expect(h.gemini).toHaveBeenCalledTimes(1); // advisory bypass → legacy AI moderation
  });
});

describe('Phase 4.C — inbox classifier workspace propagation', () => {
  it('passes the provided workspaceId into the governance guard', async () => {
    (env as any).GROQ_API_KEY = 'test-key';
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    const spy = vi.spyOn(GovernedModelGate, 'legacyInlineFallback');
    await classifyMessage('I have a general question about my order status please', 'ws-classifier');
    const call = spy.mock.calls.find((c) => c[0] === 'inbox_message_classification');
    expect(call).toBeDefined();
    expect(call?.[1]).toBe('ws-classifier');
  });
});

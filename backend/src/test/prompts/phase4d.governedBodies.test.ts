import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ captured: [] as string[] }));

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async (args: any) => {
          const msgs = args.messages || [];
          h.captured.push(String(msgs[msgs.length - 1]?.content ?? ''));
          return { choices: [{ message: { content: JSON.stringify({ risk_level: 'LOW', sentiment: 'NEUTRAL' }) } }] };
        },
      },
    };
  },
}));

import { GOVERNED_PROMPT_SEEDS, buildGovernedPromptFixtures } from '../../modules/prompts/governedPromptSeeds';
import { GovernedPromptResolver } from '../../modules/prompts/GovernedPromptResolver';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { classifyMessage } from '../../domains/inbox/inboxClassifier';
import { env } from '../../config/env';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

let origEnforced: string;
let origEnv: string;
let origGroq: string | undefined;
beforeEach(() => {
  resetFixtures();
  h.captured.length = 0;
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

describe('Phase 4.D — governed prompt bodies honour their contracts', () => {
  it('every seed body contains its required variables', () => {
    for (const seed of GOVERNED_PROMPT_SEEDS) {
      for (const v of seed.requiredVariables) {
        expect(seed.body, `${seed.useCaseKey} must contain {{${v}}}`).toContain(`{{${v}}}`);
      }
    }
  });

  it('every seed body contains its parser contract markers', () => {
    for (const seed of GOVERNED_PROMPT_SEEDS) {
      for (const marker of seed.contractMarkers) {
        expect(seed.body, `${seed.useCaseKey} must contain marker "${marker}"`).toContain(marker);
      }
    }
  });
});

describe('Phase 4.D — migrated sites resolve + render the governed prompt', () => {
  beforeEach(() => setFixtures(buildGovernedPromptFixtures('ws-a')));

  it('scheduler recommendation renders all variables into the governed prompt', async () => {
    const r = await GovernedPromptResolver.resolve({
      useCaseKey: 'scheduler_recommendation',
      workspaceId: 'ws-a',
      variables: { platform: 'instagram', niche: 'fitness', audience_region: 'US', audience_timezone: 'EST', audience_age_group: '25-34', target_date: '2025-06-01', day_name: 'Sunday' },
    });
    expect(r.ok).toBe(true);
    expect(r.governedPrompt).toContain('instagram');
    expect(r.governedPrompt).toContain('fitness');
    expect(r.governedPrompt).toContain('"recommendations"');
    expect(r.governedPrompt).not.toContain('{{'); // every variable rendered
  });

  it('inbox reply renders the customer message + reply contract', async () => {
    const r = await GovernedPromptResolver.resolve({
      useCaseKey: 'inbox_ai_reply',
      workspaceId: 'ws-a',
      variables: { platform: 'X', message: 'Where is my order?', tone: 'friendly', instruction: 'Be warm and helpful' },
    });
    expect(r.ok).toBe(true);
    expect(r.governedPrompt).toContain('Where is my order?');
    expect(r.governedPrompt).toContain('Reply:');
    expect(r.governedPrompt).not.toContain('{{');
  });

  it('inbox classifier USES the governed prompt when seeded (single governed user message)', async () => {
    (env as any).GROQ_API_KEY = 'test-key';
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    const result = await classifyMessage('I have a general question about my recent order', 'ws-a');
    expect(result.risk_level).toBe('LOW');
    // The governed body (with its JSON instructions) reached the model as the prompt —
    // not the bare inline user text.
    expect(h.captured[0]).toContain('Return ONLY a JSON object');
    expect(h.captured[0]).toContain('I have a general question');
  });
});

describe('Phase 4.D — deferred/guarded site enforcement boundary', () => {
  it('enforcement=true blocks a still-guarded site (caption)', async () => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    await expect(GovernedModelGate.legacyInlineFallback('social_caption_generation', 'ws-a', 'still guarded'))
      .rejects.toThrow(/Governed prompt required/);
  });

  it('enforcement=false preserves the legacy fallback for a guarded site', async () => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    await expect(GovernedModelGate.legacyInlineFallback('social_caption_generation', 'ws-a', 'still guarded'))
      .resolves.toBeUndefined();
  });
});

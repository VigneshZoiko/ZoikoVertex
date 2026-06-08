import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { GovernedPromptResolver } from '../../modules/prompts/GovernedPromptResolver';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import { buildGovernedPromptFixtures, GOVERNED_PROMPT_SEEDS } from '../../modules/prompts/governedPromptSeeds';
import { env } from '../../config/env';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

const QA = GOVERNED_PROMPT_SEEDS.find((s) => s.useCaseKey === 'qa_quality_check')!;

let origEnforced: string;
let origEnv: string;
beforeEach(() => {
  resetFixtures();
  origEnforced = env.PROMPT_GOVERNANCE_ENFORCED;
  origEnv = env.NODE_ENV;
  // Simulate enforced production for the whole suite.
  (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
  (env as any).NODE_ENV = 'production';
});
afterEach(() => {
  (env as any).PROMPT_GOVERNANCE_ENFORCED = origEnforced;
  (env as any).NODE_ENV = origEnv;
  vi.restoreAllMocks();
});

describe('Phase 4.F — enforcement readiness (logic-level, mock DB)', () => {
  it('all 9 seeded use-cases resolve under enforcement', async () => {
    setFixtures(buildGovernedPromptFixtures('ws-a'));
    for (const seed of GOVERNED_PROMPT_SEEDS) {
      const r = await GovernedPromptResolver.resolve({ useCaseKey: seed.useCaseKey, workspaceId: 'ws-a', variables: {} });
      expect(r.ok, `${seed.useCaseKey}`).toBe(true);
    }
  });

  it('unseeded use-case fails closed (NO_GOVERNED_PROMPT)', async () => {
    setFixtures(buildGovernedPromptFixtures('ws-a'));
    const r = await GovernedPromptResolver.resolve({ useCaseKey: '__unseeded_fake__', workspaceId: 'ws-a', variables: {} });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NO_GOVERNED_PROMPT');
  });

  it('tampered Constraint Shadow fails closed (hash mismatch)', async () => {
    const f = buildGovernedPromptFixtures('ws-a', [QA]);
    // Mutate sealed content without recomputing the hash.
    f.prompt_constraint_shadows[0].compiled_shadow.rules.push({ id: 'evil', domain: 'output', severity: 'warn', rule: 'tampered', rationale: 'x', applicableTiers: [], enabled: true });
    setFixtures(f);
    const r = await GovernedPromptResolver.resolve({ useCaseKey: 'qa_quality_check', workspaceId: 'ws-a', variables: {} });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONSTRAINT_SHADOW_TAMPERED');
  });

  it('missing governance receipt fails closed', async () => {
    const f = buildGovernedPromptFixtures('ws-a', [QA]);
    f.prompt_evidence_links = [];
    setFixtures(f);
    const r = await GovernedPromptResolver.resolve({ useCaseKey: 'qa_quality_check', workspaceId: 'ws-a', variables: {} });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('RECEIPT_MISSING');
  });

  it('model is NOT called when governance blocks', async () => {
    setFixtures({ prompts: [] });
    const invoke = vi.fn(async () => 'should not run');
    const result = await GovernedModelGate.execute({ useCaseKey: 'qa_quality_check', workspaceId: 'ws-a', variables: {}, modelProvider: 'groq', invoke });
    expect(result.ok).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('records governed evidence on success and a blocked audit event on block', async () => {
    const evidenceSpy = vi.spyOn(PromptEvidenceService, 'record');
    const auditSpy = vi.spyOn(PromptAuditService, 'record');

    // success path
    setFixtures(buildGovernedPromptFixtures('ws-a', [QA]));
    const ok = await GovernedModelGate.execute({ useCaseKey: 'qa_quality_check', workspaceId: 'ws-a', variables: { content: 'hi', platforms: 'X' }, modelProvider: 'groq', invoke: async () => '{}' });
    expect(ok.ok).toBe(true);
    expect(evidenceSpy.mock.calls.some((c) => (c[0] as any)?.event_type === 'prompt.governed_execution.completed')).toBe(true);

    // block path
    resetFixtures();
    setFixtures({ prompts: [] });
    await GovernedPromptResolver.resolve({ useCaseKey: 'qa_quality_check', workspaceId: 'ws-a', variables: {} });
    expect(auditSpy.mock.calls.some((c) => (c[0] as any)?.event_type === 'prompt.governed_execution.blocked')).toBe(true);
  });
});

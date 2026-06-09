import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { GovernedPromptResolver } from '../../modules/prompts/GovernedPromptResolver';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { env } from '../../config/env';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

const KEY = 'inbox_ai_reply';

function seedGoverned(opts: {
  status?: string;
  withShadow?: boolean;
  tamperShadow?: boolean;
  withReceipt?: boolean;
  withDeployment?: boolean;
  useCaseKey?: string;
  riskTier?: string;
} = {}) {
  const {
    status = 'production_active',
    withShadow = true,
    tamperShadow = false,
    withReceipt = true,
    withDeployment = true,
    useCaseKey = KEY,
    riskTier = 'tier_2_medium',
  } = opts;

  const shadow = lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier });
  if (tamperShadow) shadow.compiled_shadow.rules[0].rule = 'TAMPERED — not what was sealed';

  setFixtures({
    prompts: [{ id: 'p1', workspace_id: 'ws-a', use_case_key: useCaseKey, status, risk_tier: riskTier, current_version_id: 'v1' }],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'Reply to {{name}}' }],
    prompt_deployments: withDeployment ? [{ id: 'd1', prompt_version_id: 'v1', environment: 'production', deployed_by: 'u1', created_at: '2025-01-01T00:00:00Z' }] : [],
    prompt_evidence_links: withReceipt ? [{ id: 'el1', prompt_version_id: 'v1', event_type: 'prompt.governance_receipt.generated', evidence_hash: 'RH-abc', created_at: '2025-01-02T00:00:00Z' }] : [],
    prompt_audit_ledger: [],
    prompt_runtime_traces: [],
    prompt_constraint_shadows: withShadow ? [shadow] : [],
  });
}

beforeEach(() => resetFixtures());
afterEach(() => vi.restoreAllMocks());

describe('Phase 4 — GovernedPromptResolver gates', () => {
  it('BLOCKS when no governed prompt exists for the use case', async () => {
    setFixtures({ prompts: [] });
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a', variables: {} });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NO_GOVERNED_PROMPT');
  });

  it('BLOCKS when the prompt is not production-ready (draft)', async () => {
    seedGoverned({ status: 'draft' });
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('NOT_PRODUCTION_READY');
  });

  it('BLOCKS when deployment record is missing', async () => {
    seedGoverned({ withDeployment: false });
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('DEPLOYMENT_MISSING');
  });

  it('BLOCKS when the Constraint Shadow is missing', async () => {
    seedGoverned({ withShadow: false });
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONSTRAINT_SHADOW_MISSING');
  });

  it('BLOCKS when the Constraint Shadow is tampered (hash mismatch)', async () => {
    seedGoverned({ tamperShadow: true });
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONSTRAINT_SHADOW_TAMPERED');
  });

  it('BLOCKS when the governance receipt is missing', async () => {
    seedGoverned({ withReceipt: false });
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('RECEIPT_MISSING');
  });

  it('ALLOWS and renders variables when every governance artifact is valid', async () => {
    seedGoverned();
    const r = await GovernedPromptResolver.resolve({ useCaseKey: KEY, workspaceId: 'ws-a', variables: { name: 'Alice' } });
    expect(r.ok).toBe(true);
    expect(r.code).toBe('OK');
    expect(r.governedPrompt).toBe('Reply to Alice');
    expect(r.evidence?.receipt_hash).toBe('RH-abc');
    expect(r.evidence?.constraint_shadow_hash).toBeTruthy();
    expect(r.evidence?.variables_hash).toBeTruthy();
  });
});

describe('Phase 4 — GovernedModelGate.execute (model call only on valid governance)', () => {
  it('does NOT call the model when governance blocks, and surfaces the code', async () => {
    seedGoverned({ withReceipt: false });
    const invoke = vi.fn(async () => 'should not run');
    const result = await GovernedModelGate.execute({
      useCaseKey: KEY, workspaceId: 'ws-a', variables: { name: 'Bob' }, modelProvider: 'groq', invoke,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('RECEIPT_MISSING');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('calls the model with the GOVERNED prompt and records full evidence on success', async () => {
    seedGoverned();
    const evidenceSpy = vi.spyOn(PromptEvidenceService, 'record');
    const invoke = vi.fn(async (governedPrompt: string) => {
      expect(governedPrompt).toBe('Reply to Alice'); // governed + rendered, not inline
      return 'Hi Alice, thanks for reaching out!';
    });
    const result = await GovernedModelGate.execute({
      useCaseKey: KEY, workspaceId: 'ws-a', variables: { name: 'Alice' }, modelProvider: 'groq', actorId: 'u1', invoke,
    });
    expect(result.ok).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.output).toContain('Hi Alice');
    // Evidence captures every required field.
    const ev = result.evidence!;
    expect(ev.prompt_id).toBe('p1');
    expect(ev.version_id).toBe('v1');
    expect(ev.receipt_hash).toBe('RH-abc');
    expect(ev.constraint_shadow_hash).toBeTruthy();
    expect(ev.model_provider).toBe('groq');
    expect(ev.variables_hash).toBeTruthy();
    expect(ev.output_hash).toBeTruthy();
    // A governed-execution evidence event was recorded.
    expect(evidenceSpy).toHaveBeenCalled();
    expect(evidenceSpy.mock.calls.some((c) => (c[0] as any)?.event_type === 'prompt.governed_execution.completed')).toBe(true);
  });
});

describe('Phase 4 — legacy inline prompt fail-closed policy', () => {
  let origEnforced: string;
  let origEnv: string;
  beforeEach(() => {
    origEnforced = env.PROMPT_GOVERNANCE_ENFORCED;
    origEnv = env.NODE_ENV;
  });
  afterEach(() => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = origEnforced;
    (env as any).NODE_ENV = origEnv;
  });

  it('FAILS CLOSED (throws) for an inline path in production when enforced', async () => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    await expect(GovernedModelGate.legacyInlineFallback('inbox_ai_reply', 'ws-a', 'not migrated'))
      .rejects.toThrow(/Governed prompt required/);
  });

  it('allows (audited advisory) the inline path when not enforced / not production', async () => {
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    (env as any).NODE_ENV = 'production';
    await expect(GovernedModelGate.legacyInlineFallback('inbox_ai_reply', 'ws-a', 'not migrated')).resolves.toBeUndefined();

    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'development';
    await expect(GovernedModelGate.legacyInlineFallback('inbox_ai_reply', 'ws-a', 'not migrated')).resolves.toBeUndefined();
  });
});

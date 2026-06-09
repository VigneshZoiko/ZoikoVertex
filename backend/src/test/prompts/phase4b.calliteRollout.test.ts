import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Capture every prompt the (mocked) model SDK is asked to run, so we can assert
// whether the GOVERNED prompt or the inline prompt reached the model — and
// whether the model was invoked at all.
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
          return { choices: [{ message: { content: JSON.stringify({ scores: {}, feedback: [], summary: 'ok', sentiment: {}, optimized_content: '' }) } }] };
        },
      },
    };
  },
}));

import { performQualityCheck } from '../../domains/governance/qaController';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { env } from '../../config/env';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

function mockReqRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  const req: any = { body: { content: 'Check this caption', platforms: ['Instagram'] }, user: { id: 'u1', workspace_id: 'ws-a' } };
  const next = vi.fn();
  return { req, res, next };
}

function seedGovernedQA() {
  setFixtures({
    prompts: [{ id: 'pq', workspace_id: 'ws-a', use_case_key: 'qa_quality_check', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: 'vq' }],
    prompt_versions: [{ id: 'vq', prompt_id: 'pq', body: 'GOVERNED QA PROMPT for: {{content}}' }],
    prompt_deployments: [{ id: 'dq', prompt_version_id: 'vq', environment: 'production', deployed_by: 'u1', created_at: '2025-01-01T00:00:00Z' }],
    prompt_evidence_links: [{ id: 'elq', prompt_version_id: 'vq', event_type: 'prompt.governance_receipt.generated', evidence_hash: 'RH-qa', created_at: '2025-01-02T00:00:00Z' }],
    prompt_audit_ledger: [],
    prompt_runtime_traces: [],
    prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'vq', promptId: 'pq', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
  });
}

let origEnforced: string;
let origEnv: string;
beforeEach(() => {
  resetFixtures();
  h.captured.length = 0;
  origEnforced = env.PROMPT_GOVERNANCE_ENFORCED;
  origEnv = env.NODE_ENV;
  (env as any).GROQ_API_KEY = 'test-key';
});
afterEach(() => {
  (env as any).PROMPT_GOVERNANCE_ENFORCED = origEnforced;
  (env as any).NODE_ENV = origEnv;
  vi.restoreAllMocks();
});

describe('Phase 4.B — QA quality check governed execution', () => {
  it('uses the GOVERNED prompt and records governed evidence when a governed prompt is valid', async () => {
    seedGovernedQA();
    const evidenceSpy = vi.spyOn(PromptEvidenceService, 'record');
    const { req, res, next } = mockReqRes();
    await performQualityCheck(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    // The model received the GOVERNED, variable-rendered prompt — not the inline template.
    expect(h.captured[0]).toBe('GOVERNED QA PROMPT for: Check this caption');
    // Governed execution evidence was recorded.
    expect(evidenceSpy.mock.calls.some((c) => (c[0] as any)?.event_type === 'prompt.governed_execution.completed')).toBe(true);
  });

  it('falls back to the inline prompt with an advisory audit when no governed prompt and enforcement is OFF', async () => {
    setFixtures({ prompts: [] }); // no governed prompt registered
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'false';
    const { req, res, next } = mockReqRes();
    await performQualityCheck(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    // Inline prompt was used (legacy path preserved while the flag is off).
    expect(h.captured[0]).toContain('Senior Quality Assurance Specialist');
  });

  it('FAILS CLOSED (no model call) when no governed prompt and enforcement is ON in production', async () => {
    setFixtures({ prompts: [] });
    (env as any).PROMPT_GOVERNANCE_ENFORCED = 'true';
    (env as any).NODE_ENV = 'production';
    const { req, res, next } = mockReqRes();
    await performQualityCheck(req, res, next);

    // Error routed through next(); the model was never invoked.
    expect(next).toHaveBeenCalled();
    expect(h.captured.length).toBe(0);
  });
});

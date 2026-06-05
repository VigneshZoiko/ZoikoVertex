import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

vi.mock('crypto', async () => {
  const actual = await vi.importActual('crypto') as typeof import('crypto');
  return { ...actual, randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };
});

import { PromptEvaluationService } from '../../modules/prompts/PromptEvaluationService';
import { FailClosedGuard } from '../../modules/prompts/FailClosedGuard';
import { AdversarialTestService, compileProbe } from '../../modules/prompts/AdversarialTestService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

beforeEach(() => {
  resetFixtures();
});

describe('PromptEvaluationService', () => {
  beforeEach(() => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', name: 'Test', risk_tier: 'tier_2_medium', status: 'draft' }],
      prompt_versions: [
        { id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a helpful assistant. Always cite sources and use safe output.', body_hash: 'abc', immutable: false },
      ],
      prompt_evidence_links: [
        { id: 'e1', prompt_version_id: 'v1', vault_item_id: 'vault-1', event_type: 'prompt.evaluation.instruction_adherence' },
      ],
      prompt_audit_ledger: [],
      prompt_test_runs: [],
    });
  });

  it('returns evaluation results for a valid version', async () => {
    const result = await PromptEvaluationService.evaluatePromptVersion('v1', 'ws-a', 'user-1');
    expect(result).toBeDefined();
    expect(result.promptVersionId).toBe('v1');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.criteriaResults).toBeInstanceOf(Array);
    expect(result.criteriaResults.length).toBe(8);
    expect(result.evaluatedAt).toBeDefined();
  });

  it('includes all 8 evaluation criteria', async () => {
    const result = await PromptEvaluationService.evaluatePromptVersion('v1', 'ws-a', 'user-1');
    const criteriaNames = result.criteriaResults.map((c) => c.criterionName);
    expect(criteriaNames).toContain('Instruction Adherence');
    expect(criteriaNames).toContain('Safety & Policy');
    expect(criteriaNames).toContain('Brand & Tone');
    expect(criteriaNames).toContain('Grounding & Citations');
    expect(criteriaNames).toContain('Tool-Use Governance');
    expect(criteriaNames).toContain('Localization');
    expect(criteriaNames).toContain('Regression');
    expect(criteriaNames).toContain('Adversarial Coverage');
  });

  it('detects hardcoded scores and blocks deployment', async () => {
    setFixtures({
      prompts: [{ id: 'p-hc', workspace_id: 'ws-a', name: 'Hardcoded', risk_tier: 'tier_2_medium', status: 'draft' }],
      prompt_versions: [
        { id: 'v-hc', prompt_id: 'p-hc', version_number: 1, body: 'Score: 95. Everything is perfect.', body_hash: 'abc', immutable: false },
      ],
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      prompt_test_runs: [],
    });
    const result = await PromptEvaluationService.evaluatePromptVersion('v-hc', 'ws-a', 'user-1');
    expect(result.hardcodedScoreDetected).toBe(true);
    expect(result.deploymentBlocked).toBe(true);
    expect(result.passed).toBe(false);
  });
});

describe('FailClosedGuard', () => {
  beforeEach(() => {
    setFixtures({
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      vault_evidence_items: [],
    });
  });

  it('passes through on successful evidence write', async () => {
    const result = await FailClosedGuard.guardEvidenceWrite('test.event', { reason: 'unit-test' }, {
      operation: 'test',
      workspaceId: 'ws-a',
      criticality: 'standard',
    });
    expect(result.success).toBe(true);
    expect(result.evidenceFailed).toBe(false);
    expect(result.auditFailed).toBe(false);
  });

  it('writes evidence and audit on success even with critical guard', async () => {
    const result = await FailClosedGuard.guardEvidenceWrite('test.event', { reason: 'critical-test' }, {
      operation: 'critical-op',
      workspaceId: 'ws-a',
      criticality: 'critical',
      throwOnEvidenceFailure: true,
      throwOnAuditFailure: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('AdversarialTestService', () => {
  it('compileProbe is a function', () => {
    expect(typeof compileProbe).toBe('function');
  });

  it('computePassFail returns PASS for tier 1', () => {
    const result = AdversarialTestService.computePassFail('tier_1_low', {
      total: 10, passed: 7, warnings: 1, failed: 3, overall_score: 70,
      overall_result: 'FAIL', category_scores: {}, critical_failures: 0,
    });
    expect(result).toBe('PASS');
  });

  it('computePassFail returns FAIL for tier 4 low score', () => {
    const result = AdversarialTestService.computePassFail('tier_4_critical', {
      total: 10, passed: 7, warnings: 1, failed: 3, overall_score: 70,
      overall_result: 'FAIL', category_scores: {}, critical_failures: 1,
    });
    expect(result).toBe('FAIL');
  });

  it('isBlockingResult returns true for tier 4 critical non-PASS', () => {
    expect(AdversarialTestService.isBlockingResult('tier_4_critical', 'FAIL')).toBe(true);
    expect(AdversarialTestService.isBlockingResult('tier_3_high', 'FAIL')).toBe(false);
  });

  it('isWarningResult returns true for medium/high tiers non-PASS', () => {
    expect(AdversarialTestService.isWarningResult('tier_3_high', 'FAIL')).toBe(true);
    expect(AdversarialTestService.isWarningResult('tier_4_critical', 'FAIL')).toBe(false);
  });
});

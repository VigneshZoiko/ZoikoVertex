import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';
import { RuntimeVariableGovernanceService } from '../../modules/prompts/RuntimeVariableGovernanceService';
import { GovernanceReceiptService } from '../../modules/prompts/GovernanceReceiptService';
import { ConstraintShadowService } from '../../modules/prompts/ConstraintShadowService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture, compiledShadowFixture } from '../helpers/constraintShadowFixture';

// A fixture set where every deployment gate EXCEPT the Constraint Shadow gate
// passes — so the only variable under test is the shadow. (Tier 3 needs 3
// distinct approved roles + a passing test run.)
function gatesPassingExceptShadow(): Record<string, unknown> {
  return {
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
    prompt_approvals: [
      { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      { id: 'a3', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', reviewer_id: 'user-3', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
    ],
    prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
    prompt_audit_ledger: [],
  };
}

beforeEach(() => resetFixtures());
afterEach(() => vi.restoreAllMocks());

describe('Phase 3.C — Constraint Shadow deploy-time enforcement (Gate 8)', () => {
  it('blocks deploy when Constraint Shadow is MISSING', async () => {
    setFixtures(gatesPassingExceptShadow()); // no prompt_constraint_shadows at all
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_3_high' });
    expect(result.canDeploy).toBe(false);
    expect(result.blockingIssues.some((i) => i.type === 'constraint_shadow_missing')).toBe(true);
  });

  it('blocks deploy when Constraint Shadow is UNLOCKED (compiled but not locked)', async () => {
    setFixtures({
      ...gatesPassingExceptShadow(),
      prompt_constraint_shadows: [compiledShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_3_high' })],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_3_high' });
    expect(result.canDeploy).toBe(false);
    expect(result.blockingIssues.some((i) => i.type === 'constraint_shadow_unlocked')).toBe(true);
  });

  it('blocks deploy when Constraint Shadow hash is MISMATCHED (tampered content)', async () => {
    const tampered = lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_3_high' });
    // Tamper the sealed content WITHOUT recomputing shadow_hash → integrity check must fail.
    tampered.compiled_shadow.rules[0].rule = 'TAMPERED RULE — not what was sealed';
    setFixtures({ ...gatesPassingExceptShadow(), prompt_constraint_shadows: [tampered] });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_3_high' });
    expect(result.canDeploy).toBe(false);
    expect(result.blockingIssues.some((i) => i.type === 'constraint_shadow_hash_mismatch')).toBe(true);
  });

  it('FAILS CLOSED (blocks deploy) when ConstraintShadowService throws', async () => {
    setFixtures({
      ...gatesPassingExceptShadow(),
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_3_high' })],
    });
    vi.spyOn(ConstraintShadowService, 'getCurrentHash').mockRejectedValue(new Error('shadow store unavailable'));
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_3_high' });
    expect(result.canDeploy).toBe(false);
    expect(result.blockingIssues.some((i) => i.type === 'constraint_shadow_unavailable')).toBe(true);
  });

  it('ALLOWS deploy when Constraint Shadow is locked, hash-intact, and current (control case)', async () => {
    setFixtures({
      ...gatesPassingExceptShadow(),
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_3_high' })],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_3_high' });
    expect(result.canDeploy).toBe(true);
    expect(result.blockingIssues.length).toBe(0);
  });
});

describe('Phase 3.C — Runtime enforcement uses the locked DB shadow', () => {
  it('evaluates the LOCKED shadow rules from the DB (tier 4 block rules surface as violations)', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_4_critical' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'x' }],
      prompt_runtime_traces: [],
      prompt_audit_ledger: [],
      prompt_evidence_links: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_4_critical' })],
    });
    const result = await RuntimeVariableGovernanceService.enforce({
      promptVersionId: 'v1',
      parameters: {},
      riskTier: 'tier_4_critical',
      workspaceId: 'ws-a',
    });
    // The blocking rules came from the locked shadow's compiled_shadow, not a bypass.
    expect(result.constraintViolations.length).toBeGreaterThan(0);
    expect(result.constraintViolations.some((v) => v.includes('Tool calls must be explicitly authorized'))).toBe(true);
    expect(result.enforcementAction).toBe('block');
  });

  it('FAILS CLOSED when the locked shadow is MISSING (tier 1 that would otherwise pass)', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'x' }],
      prompt_runtime_traces: [],
      prompt_audit_ledger: [],
      prompt_evidence_links: [],
      // no prompt_constraint_shadows → locked shadow missing
    });
    const result = await RuntimeVariableGovernanceService.enforce({
      promptVersionId: 'v1',
      parameters: {},
      riskTier: 'tier_1_low',
      workspaceId: 'ws-a',
    });
    // tier_1_low with clean params would normally pass/allow; with no locked
    // shadow it must fail closed and BLOCK.
    expect(result.passed).toBe(false);
    expect(result.enforcementAction).toBe('block');
  });
});

describe('Phase 3.C — Governance Receipt hash sensitivity', () => {
  function receiptFixtures(extraApproval: boolean) {
    return {
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'approved_for_staging', name: 'P' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Test body', created_by: 'user-1', created_at: '2025-01-01T00:00:00Z' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'user-2', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
        ...(extraApproval
          ? [{ id: 'a2', prompt_version_id: 'v1', reviewer_id: 'user-3', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T01:00:00Z' }]
          : []),
      ],
      prompt_deployments: [],
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    };
  }

  it('receipt hash changes when governance inputs change (approval chain differs)', async () => {
    setFixtures(receiptFixtures(false));
    const r1 = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a', 'user-1');

    setFixtures(receiptFixtures(true)); // one more approval → different governance input
    const r2 = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a', 'user-1');

    expect(r1.receiptHash).toBeDefined();
    expect(r2.receiptHash).toBeDefined();
    expect(r1.receiptHash).not.toBe(r2.receiptHash);
  });
});

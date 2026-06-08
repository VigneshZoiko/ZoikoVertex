import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { GovernanceReceiptService } from '../../modules/prompts/GovernanceReceiptService';
import { CommissioningService } from '../../modules/prompts/CommissioningService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

beforeEach(() => {
  resetFixtures();
});

describe('GovernanceReceiptService', () => {
  beforeEach(() => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'draft', name: 'Test Prompt' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Test body', created_by: 'user-1', created_at: '2025-01-01T00:00:00Z' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'user-2', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_id: 'user-3', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T01:00:00Z' },
      ],
      prompt_deployments: [
        { id: 'd1', prompt_version_id: 'v1', environment: 'staging', deployed_by: 'user-4', created_at: '2025-01-03T00:00:00Z' },
        { id: 'd2', prompt_version_id: 'v1', environment: 'production', deployed_by: 'user-5', created_at: '2025-01-04T00:00:00Z' },
      ],
      prompt_evidence_links: [
        { id: 'el1', prompt_version_id: 'v1', vault_item_id: 'vi-1' },
        { id: 'el2', prompt_version_id: 'v1', vault_item_id: 'vi-2' },
      ],
      prompt_audit_ledger: [],
    });
  });

  it('generates receipt with all required fields', async () => {
    const receipt = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a');
    expect(receipt).toBeDefined();
    expect(receipt.receiptId).toMatch(/^GR-/);
    expect(receipt.receiptHash).toBeDefined();
    expect(receipt.promptId).toBe('p1');
    expect(receipt.promptVersionId).toBe('v1');
    expect(receipt.promptVersion).toBe(1);
    expect(receipt.receiptStatus).toBe('sealed');
  });

  it('includes policy snapshot with risk tier', async () => {
    const receipt = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a');
    expect(receipt.policySnapshot).toBeDefined();
    expect(receipt.policySnapshot.riskTier).toBe('tier_2_medium');
  });

  it('includes approval snapshot with actor chain', async () => {
    const receipt = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a');
    expect(receipt.approvalSnapshot).toBeDefined();
    expect(receipt.actorChain.length).toBeGreaterThanOrEqual(3);
    expect(receipt.actorChain.some((a: any) => a.role === 'author')).toBe(true);
    expect(receipt.actorChain.some((a: any) => a.role === 'deployer')).toBe(true);
  });

  it('includes deployment and evidence references', async () => {
    const receipt = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a');
    expect(receipt.deploymentSnapshot.deploymentCount).toBe(2);
    expect(receipt.evidenceReferences.length).toBeGreaterThanOrEqual(2);
  });

  it('includes rollback plan', async () => {
    const receipt = await GovernanceReceiptService.generate('p1', 'v1', 'ws-a');
    expect(receipt.rollbackPlan).toBeDefined();
    expect(receipt.rollbackPlan.rollbackProcedure).toBeDefined();
  });
});

describe('CommissioningService', () => {
  beforeEach(() => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'approved_for_staging', name: 'Test' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Test' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_deployments: [{ id: 'd1', prompt_version_id: 'v1', environment: 'production', deployed_by: 'user-1', created_at: '2025-01-02T00:00:00Z' }],
    });
  });

  it('runPreflight returns check results', async () => {
    const result = await CommissioningService.runPreflight('p1', 'v1', 'ws-a');
    expect(result).toBeDefined();
    expect(result.checks).toBeInstanceOf(Array);
    expect(result.checks.length).toBeGreaterThanOrEqual(1);
  });

  it('commission generates a governance receipt', async () => {
    setFixtures({
      prompts: [{ id: 'p2', workspace_id: 'ws-a', risk_tier: 'tier_1_low', status: 'approved_for_staging', name: 'Test 2' }],
      prompt_versions: [{ id: 'v2', prompt_id: 'p2', version_number: 1, body: 'Test' }],
      prompt_approvals: [
        { id: 'a3', prompt_version_id: 'v2', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z', reviewer_id: 'user-2' },
        { id: 'a4', prompt_version_id: 'v2', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-01T01:00:00Z', reviewer_id: 'user-3' },
      ],
      prompt_deployments: [{ id: 'd2', prompt_version_id: 'v2', environment: 'staging', deployed_by: 'user-1', created_at: '2025-01-02T00:00:00Z' }],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v2', suite_id: 'evaluation-tier_1_low', environment: 'evaluation', pass_fail: 'PASS', score_summary: { overall_score: 85 }, run_metadata: {}, created_by: 'system' }],
      prompt_evidence_links: [
        { id: 'el1', prompt_version_id: 'v2', vault_item_id: 'vi-1' },
        { id: 'el2', prompt_version_id: 'v2', vault_item_id: 'vi-2', event_type: 'prompt.governance_receipt.generated' },
      ],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v2', promptId: 'p2', workspaceId: 'ws-a', riskTier: 'tier_1_low' })],
    });
    const result = await CommissioningService.commission('p2', 'v2', 'ws-a', 'user-1', 'Test notes');
    expect(result).toBeDefined();
    expect(result.status).toBe('commissioned');
    expect(result.receiptId).toMatch(/^GR-/);
  });
});

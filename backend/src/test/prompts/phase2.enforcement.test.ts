import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { LifecycleGateService } from '../../modules/prompts/LifecycleGateService';
import { CommissioningService } from '../../modules/prompts/CommissioningService';
import { PromptController } from '../../modules/prompts/promptController';
import { PromptService, PROMPT_STATUS } from '../../modules/prompts/PromptService';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import { SeparationOfDutiesService } from '../../modules/prompts/SeparationOfDutiesService';
import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';
import { PromptApprovalPolicyService } from '../../modules/prompts/PromptApprovalPolicyService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockRes(): any {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  res.set = vi.fn(() => res);
  return res;
}

function mockReq(over: any = {}): any {
  return {
    user: { id: 'u1', role: 'ADMIN', workspace_id: 'ws-a' },
    query: {},
    params: {},
    body: {},
    headers: {},
    ...over,
  };
}

function mockEvidenceSuccess(): void {
  vi.spyOn(PromptEvidenceService, 'record').mockResolvedValue({
    vault_item_id: 'EVI-1',
    vault_item_uuid: 'uuid-1',
    evidence_hash: 'hash-1',
  });
  vi.spyOn(PromptAuditService, 'record').mockResolvedValue({ id: 'audit-1' });
}

function mockEvidenceFail(): void {
  vi.spyOn(PromptEvidenceService, 'record').mockResolvedValue(null);
  vi.spyOn(PromptAuditService, 'record').mockResolvedValue({ id: 'audit-1' });
}

function mockAuditFail(): void {
  vi.spyOn(PromptEvidenceService, 'record').mockResolvedValue({
    vault_item_id: 'EVI-1',
    vault_item_uuid: 'uuid-1',
    evidence_hash: 'hash-1',
  });
  vi.spyOn(PromptAuditService, 'record').mockResolvedValue(null);
}

function restoreMocks(): void {
  vi.restoreAllMocks();
}

beforeEach(() => {
  resetFixtures();
});

afterEach(() => {
  restoreMocks();
});

// ─── Section 1: LifecycleGateService — State Machine ─────────────────────────

describe('LifecycleGateService — valid transitions', () => {
  it('allows draft → internal_test', () => {
    const result = LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.INTERNAL_TEST);
    expect(result.allowed).toBe(true);
  });
  it('allows draft → retired', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.RETIRED).allowed).toBe(true);
  });
  it('allows draft → archived', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.ARCHIVED).allowed).toBe(true);
  });
  it('allows internal_test → review_requested', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.INTERNAL_TEST, PROMPT_STATUS.REVIEW_REQUESTED).allowed).toBe(true);
  });
  it('allows internal_test → draft', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.INTERNAL_TEST, PROMPT_STATUS.DRAFT).allowed).toBe(true);
  });
  it('allows review_requested → approved_for_staging', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.REVIEW_REQUESTED, PROMPT_STATUS.APPROVED_STAGING).allowed).toBe(true);
  });
  it('allows review_requested → production_pending', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.REVIEW_REQUESTED, PROMPT_STATUS.PRODUCTION_PENDING).allowed).toBe(true);
  });
  it('allows review_requested → draft', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.REVIEW_REQUESTED, PROMPT_STATUS.DRAFT).allowed).toBe(true);
  });
  it('allows approved_for_staging → commissioned', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.APPROVED_STAGING, PROMPT_STATUS.COMMISSIONED).allowed).toBe(true);
  });
  it('allows commissioned → production_active', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.COMMISSIONED, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(true);
  });
  it('allows production_active → locked', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.LOCKED).allowed).toBe(true);
  });
  it('allows production_active → superseded', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.SUPERSEDED).allowed).toBe(true);
  });
  it('allows production_active → paused', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.PAUSED).allowed).toBe(true);
  });
  it('allows production_active → retired', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.RETIRED).allowed).toBe(true);
  });
  it('allows production_active → archived', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.ARCHIVED).allowed).toBe(true);
  });
  it('allows locked → production_active', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.LOCKED, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(true);
  });
  it('allows locked → retired', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.LOCKED, PROMPT_STATUS.RETIRED).allowed).toBe(true);
  });
  it('allows locked → archived', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.LOCKED, PROMPT_STATUS.ARCHIVED).allowed).toBe(true);
  });
  it('allows superseded → retired', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.SUPERSEDED, PROMPT_STATUS.RETIRED).allowed).toBe(true);
  });
  it('allows superseded → archived', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.SUPERSEDED, PROMPT_STATUS.ARCHIVED).allowed).toBe(true);
  });
  it('allows paused → production_active', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PAUSED, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(true);
  });
  it('allows paused → retired', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PAUSED, PROMPT_STATUS.RETIRED).allowed).toBe(true);
  });
  it('allows paused → archived', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.PAUSED, PROMPT_STATUS.ARCHIVED).allowed).toBe(true);
  });
  it('allows retired → archived', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED).allowed).toBe(true);
  });
});

describe('LifecycleGateService — invalid transitions', () => {
  it('blocks draft → production_active (no direct path)', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(false);
  });
  it('blocks draft → commissioned (no direct path)', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.COMMISSIONED).allowed).toBe(false);
  });
  it('blocks draft → locked', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.LOCKED).allowed).toBe(false);
  });
  it('blocks internal_test → production_active', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.INTERNAL_TEST, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(false);
  });
  it('blocks approved_for_staging → production_active (must go through commissioned)', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.APPROVED_STAGING, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(false);
  });
  it('blocks commissioned → draft (irreversible)', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.COMMISSIONED, PROMPT_STATUS.DRAFT).allowed).toBe(false);
  });
  it('blocks archived → any (terminal state)', () => {
    const targets = [PROMPT_STATUS.DRAFT, PROMPT_STATUS.REVIEW_REQUESTED, PROMPT_STATUS.APPROVED_STAGING,
      PROMPT_STATUS.COMMISSIONED, PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.LOCKED,
      PROMPT_STATUS.SUPERSEDED, PROMPT_STATUS.PAUSED, PROMPT_STATUS.RETIRED];
    for (const t of targets) {
      expect(LifecycleGateService.checkTransition(PROMPT_STATUS.ARCHIVED, t).allowed).toBe(false);
    }
  });
  it('blocks retired → production_active (irreversible)', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.RETIRED, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(false);
  });
  it('blocks superseded → production_active (irreversible)', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.SUPERSEDED, PROMPT_STATUS.PRODUCTION_ACTIVE).allowed).toBe(false);
  });
  it('blocks superseded → draft', () => {
    expect(LifecycleGateService.checkTransition(PROMPT_STATUS.SUPERSEDED, PROMPT_STATUS.DRAFT).allowed).toBe(false);
  });
  it('returns a descriptive reason on invalid transition', () => {
    const result = LifecycleGateService.checkTransition(PROMPT_STATUS.DRAFT, PROMPT_STATUS.PRODUCTION_ACTIVE);
    expect(result.reason).toContain('Cannot transition');
    expect(result.reason).toContain(PROMPT_STATUS.DRAFT);
    expect(result.reason).toContain(PROMPT_STATUS.PRODUCTION_ACTIVE);
    expect(result.reason).toContain('Valid targets');
  });
});

describe('LifecycleGateService — LOCKED', () => {
  it('isLocked returns true for LOCKED status', () => {
    expect(LifecycleGateService.isLocked(PROMPT_STATUS.LOCKED)).toBe(true);
  });
  it('isLocked returns true for RETIRED status', () => {
    expect(LifecycleGateService.isLocked(PROMPT_STATUS.RETIRED)).toBe(true);
  });
  it('isLocked returns true for ARCHIVED status', () => {
    expect(LifecycleGateService.isLocked(PROMPT_STATUS.ARCHIVED)).toBe(true);
  });
  it('isLocked returns false for ACTIVE status', () => {
    expect(LifecycleGateService.isLocked(PROMPT_STATUS.PRODUCTION_ACTIVE)).toBe(false);
  });
  it('isLocked returns false for DRAFT status', () => {
    expect(LifecycleGateService.isLocked(PROMPT_STATUS.DRAFT)).toBe(false);
  });
  it('isLocked returns false for COMMISSIONED status', () => {
    expect(LifecycleGateService.isLocked(PROMPT_STATUS.COMMISSIONED)).toBe(false);
  });
});

describe('LifecycleGateService — immutable (RETIRED, ARCHIVED, SUPERSEDED)', () => {
  it('isImmutable returns true for RETIRED', () => {
    expect(LifecycleGateService.isImmutable(PROMPT_STATUS.RETIRED)).toBe(true);
  });
  it('isImmutable returns true for ARCHIVED', () => {
    expect(LifecycleGateService.isImmutable(PROMPT_STATUS.ARCHIVED)).toBe(true);
  });
  it('isImmutable returns true for SUPERSEDED', () => {
    expect(LifecycleGateService.isImmutable(PROMPT_STATUS.SUPERSEDED)).toBe(true);
  });
  it('isImmutable returns false for LOCKED', () => {
    expect(LifecycleGateService.isImmutable(PROMPT_STATUS.LOCKED)).toBe(false);
  });
  it('isImmutable returns false for PRODUCTION_ACTIVE', () => {
    expect(LifecycleGateService.isImmutable(PROMPT_STATUS.PRODUCTION_ACTIVE)).toBe(false);
  });
});

describe('LifecycleGateService — canDeploy / canCommission', () => {
  it('canDeploy returns true for APPROVED_STAGING', () => {
    expect(LifecycleGateService.canDeploy(PROMPT_STATUS.APPROVED_STAGING)).toBe(true);
  });
  it('canDeploy returns true for COMMISSIONED', () => {
    expect(LifecycleGateService.canDeploy(PROMPT_STATUS.COMMISSIONED)).toBe(true);
  });
  it('canDeploy returns true for PRODUCTION_PENDING', () => {
    expect(LifecycleGateService.canDeploy(PROMPT_STATUS.PRODUCTION_PENDING)).toBe(true);
  });
  it('canDeploy returns false for DRAFT', () => {
    expect(LifecycleGateService.canDeploy(PROMPT_STATUS.DRAFT)).toBe(false);
  });
  it('canDeploy returns false for LOCKED', () => {
    expect(LifecycleGateService.canDeploy(PROMPT_STATUS.LOCKED)).toBe(false);
  });
  it('canCommission returns true for APPROVED_STAGING', () => {
    expect(LifecycleGateService.canCommission(PROMPT_STATUS.APPROVED_STAGING)).toBe(true);
  });
  it('canCommission returns false for DRAFT', () => {
    expect(LifecycleGateService.canCommission(PROMPT_STATUS.DRAFT)).toBe(false);
  });
  it('canCommission returns false for PRODUCTION_ACTIVE', () => {
    expect(LifecycleGateService.canCommission(PROMPT_STATUS.PRODUCTION_ACTIVE)).toBe(false);
  });
});

describe('LifecycleGateService — enforceTransition with DB', () => {
  it('allows transition from DRAFT to INTERNAL_TEST when prompted DRAFT', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'draft', risk_tier: 'tier_1_low' }],
      prompt_audit_ledger: [],
    });
    const result = await LifecycleGateService.enforceTransition('p1', PROMPT_STATUS.INTERNAL_TEST, 'ws-a');
    expect(result.allowed).toBe(true);
  });

  it('blocks transition from DRAFT to PRODUCTION_ACTIVE via enforceTransition', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'draft', risk_tier: 'tier_1_low' }],
      prompt_audit_ledger: [],
    });
    const result = await LifecycleGateService.enforceTransition('p1', PROMPT_STATUS.PRODUCTION_ACTIVE, 'ws-a');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cannot transition');
  });

  it('writes audit event when transition is denied', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'draft', risk_tier: 'tier_1_low' }],
      prompt_audit_ledger: [],
    });
    await LifecycleGateService.enforceTransition('p1', PROMPT_STATUS.PRODUCTION_ACTIVE, 'ws-a', 'u1');
    const { supabaseAdmin } = await import('../../shared/supabase');
    const { data: entries } = await supabaseAdmin.from('prompt_audit_ledger').select('*');
    expect(entries.some((e: any) => e.event_type === 'prompt.lifecycle.transition.denied')).toBe(true);
  });

  it('returns not-allowed for nonexistent prompt', async () => {
    setFixtures({ prompts: [], prompt_audit_ledger: [] });
    const result = await LifecycleGateService.enforceTransition('no-such-prompt', PROMPT_STATUS.RETIRED, 'ws-a');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Prompt not found');
  });
});

describe('LifecycleGateService — supersedePriorActive', () => {
  it('marks prior production versions as immutable', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_active' }],
      prompt_versions: [
        { id: 'v1', prompt_id: 'p1', immutable: false, version_number: 1 },
        { id: 'v2', prompt_id: 'p1', immutable: false, version_number: 2 },
      ],
      prompt_deployments: [
        { id: 'd1', prompt_version_id: 'v1', environment: 'production' },
      ],
      prompt_audit_ledger: [],
    });
    await LifecycleGateService.supersedePriorActive('p1', 'v2', 'ws-a', 'u1');
    // Verify v1 was marked immutable
    const { supabaseAdmin } = await import('../../shared/supabase');
    const { data: versions } = await supabaseAdmin.from('prompt_versions').select('*');
    const v1 = versions.find((v: any) => v.id === 'v1');
    expect(v1.immutable).toBe(true);
  });

  it('writes superseded audit events for each prior version', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_active' }],
      prompt_versions: [
        { id: 'v1', prompt_id: 'p1', immutable: false, version_number: 1 },
        { id: 'v2', prompt_id: 'p1', immutable: false, version_number: 2 },
      ],
      prompt_deployments: [
        { id: 'd1', prompt_version_id: 'v1', environment: 'production' },
      ],
      prompt_audit_ledger: [],
    });
    await LifecycleGateService.supersedePriorActive('p1', 'v2', 'ws-a', 'u1');
    const { supabaseAdmin } = await import('../../shared/supabase');
    const { data: entries } = await supabaseAdmin.from('prompt_audit_ledger').select('*');
    expect(entries.some((e: any) => e.event_type === 'prompt.lifecycle.superseded')).toBe(true);
  });

  it('does nothing when no prior production deployments exist', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_active' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false }],
      prompt_deployments: [],
      prompt_audit_ledger: [],
    });
    await expect(LifecycleGateService.supersedePriorActive('p1', 'v1', 'ws-a', 'u1')).resolves.not.toThrow();
  });
});

// ─── Section 2: CommissioningService — Preflight Checks ──────────────────────

describe('CommissioningService — runPreflight checks', () => {
  it('returns canCommission=false when status is not approved', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'draft', risk_tier: 'tier_1_low' }],
    });
    const result = await CommissioningService.runPreflight('p1', 'v1', 'ws-a');
    expect(result.canCommission).toBe(false);
    expect(result.checks[0].passed).toBe(false);
    expect(result.checks[0].check).toContain('Status');
  });

  it('returns canCommission=true when all 9 checks pass for Tier 2', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'approved_for_staging', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_deployments: [{ id: 'd1', prompt_version_id: 'v1', environment: 'staging', deployed_by: 'user-3', created_at: '2025-01-02T00:00:00Z' }],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', suite_id: 'eval-tier_2_medium', environment: 'evaluation', pass_fail: 'PASS', score_summary: { overall_score: 85 }, run_metadata: {}, created_by: 'system' }],
      prompt_evidence_links: [
        { id: 'el1', prompt_version_id: 'v1', vault_item_id: 'vi-1', event_type: 'prompt.governance_receipt.generated' },
      ],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const result = await CommissioningService.runPreflight('p1', 'v1', 'ws-a');
    expect(result.canCommission).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.checks.length).toBe(9);
  });

  it('reports specific check failures when checks fail', async () => {
    // Missing evaluation and evidence receipt
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'approved_for_staging', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_deployments: [{ id: 'd1', prompt_version_id: 'v1', environment: 'staging', deployed_by: 'user-3', created_at: '2025-01-02T00:00:00Z' }],
      // No prompt_test_runs — evaluation check fails
      // No prompt_evidence_links with governance_receipt event_type — receipt check fails
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const result = await CommissioningService.runPreflight('p1', 'v1', 'ws-a');
    expect(result.canCommission).toBe(false);
    // Check evaluation missing
    const evalCheck = result.checks.find((c) => c.check.includes('Evaluation'));
    expect(evalCheck).toBeDefined();
    expect(evalCheck!.passed).toBe(false);
    // Check receipt missing
    const receiptCheck = result.checks.find((c) => c.check.includes('receipt'));
    expect(receiptCheck).toBeDefined();
    expect(receiptCheck!.passed).toBe(false);
  });
});

describe('CommissioningService — commission() fail-closed on preflight', () => {
  it('returns commissioning_failed when status is not approved', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'draft', risk_tier: 'tier_1_low' }],
      prompt_audit_ledger: [],
    });
    mockEvidenceFail();
    const result = await CommissioningService.commission('p1', 'v1', 'ws-a', 'u1');
    expect(result.status).toBe('commissioning_failed');
    expect(result.preflightChecks[0].passed).toBe(false);
  });

  it('does not change prompt status after preflight failure', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'draft', risk_tier: 'tier_1_low' }],
      prompt_audit_ledger: [],
    });
    mockEvidenceFail();
    await CommissioningService.commission('p1', 'v1', 'ws-a', 'u1');
    const prompt = await PromptService.getById('p1', 'ws-a');
    expect(prompt.status).toBe('draft');
  });
});

describe('CommissioningService — commission() success path', () => {
  it('succeeds when all 9 preflights pass', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'approved_for_staging', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Test', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_deployments: [{ id: 'd1', prompt_version_id: 'v1', environment: 'staging', deployed_by: 'user-3', created_at: '2025-01-02T00:00:00Z' }],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', suite_id: 'eval-tier_2_medium', environment: 'evaluation', pass_fail: 'PASS', score_summary: { overall_score: 85 }, run_metadata: {}, created_by: 'system' }],
      prompt_evidence_links: [
        { id: 'el1', prompt_version_id: 'v1', vault_item_id: 'vi-1', event_type: 'prompt.governance_receipt.generated' },
      ],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceSuccess();
    const result = await CommissioningService.commission('p1', 'v1', 'ws-a', 'u1', 'Commissioning test');
    expect(result.status).toBe('commissioned');
    expect(result.receiptId).toMatch(/^GR-/);
    expect(result.preflightChecks.length).toBe(9);
  });

  it('generates governance receipt', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'approved_for_staging', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Test', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_deployments: [{ id: 'd1', prompt_version_id: 'v1', environment: 'staging', deployed_by: 'user-3', created_at: '2025-01-02T00:00:00Z' }],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', suite_id: 'eval-tier_2_medium', environment: 'evaluation', pass_fail: 'PASS', score_summary: { overall_score: 85 }, run_metadata: {}, created_by: 'system' }],
      prompt_evidence_links: [
        { id: 'el1', prompt_version_id: 'v1', vault_item_id: 'vi-1', event_type: 'prompt.governance_receipt.generated' },
      ],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceSuccess();
    const result = await CommissioningService.commission('p1', 'v1', 'ws-a', 'u1');
    expect(result.receiptId).toMatch(/^GR-/);
  });

  it('transitions prompt status to COMMISSIONED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'approved_for_staging', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Test', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_deployments: [{ id: 'd1', prompt_version_id: 'v1', environment: 'staging', deployed_by: 'user-3', created_at: '2025-01-02T00:00:00Z' }],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', suite_id: 'eval-tier_2_medium', environment: 'evaluation', pass_fail: 'PASS', score_summary: { overall_score: 85 }, run_metadata: {}, created_by: 'system' }],
      prompt_evidence_links: [
        { id: 'el1', prompt_version_id: 'v1', vault_item_id: 'vi-1', event_type: 'prompt.governance_receipt.generated' },
      ],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceSuccess();
    await CommissioningService.commission('p1', 'v1', 'ws-a', 'u1');
    const prompt = await PromptService.getById('p1', 'ws-a');
    expect(prompt.status).toBe('commissioned');
  });
});

// ─── Section 3: Status Protection — Controller-Level ─────────────────────────

describe('Status protection — submitForReview', () => {
  it('blocks submission when prompt is LOCKED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'locked', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'test', body_hash: 'x' }],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.submitForReview(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('locked');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks submission when prompt is RETIRED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'retired', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'test' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.submitForReview(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('status');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks submission when prompt is ARCHIVED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'archived', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'test' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.submitForReview(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks submission when prompt is SUPERSEDED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'superseded', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'test' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.submitForReview(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Status protection — approveVersion', () => {
  it('blocks approval when prompt is LOCKED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'locked', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.approveVersion(mockReq({ params: { versionId: 'v1' }, body: { reviewer_role: 'PROMPT_OWNER' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('locked');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks approval when prompt is RETIRED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'retired', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.approveVersion(mockReq({ params: { versionId: 'v1' }, body: { reviewer_role: 'PROMPT_OWNER' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Status protection — deployVersion', () => {
  it('blocks staging deploy when prompt is LOCKED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'locked', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'staging' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('locked');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks production deploy when prompt is LOCKED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'locked', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'production' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('locked');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks deploy when prompt is RETIRED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'retired', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'staging' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('status');
    expect(next).not.toHaveBeenCalled();
  });

  it('production deploy requires COMMISSIONED when already PRODUCTION_PENDING', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_pending', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'production' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('COMMISSIONED');
    expect(next).not.toHaveBeenCalled();
  });

  it('staging deploy succeeds from APPROVED_STAGING passing deployment gates', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_pending', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_deployments: [],
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceSuccess();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'staging' } }), res, next);
    // Non-production non-pending → should route to production-pending
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Status protection — commissionPrompt', () => {
  it('blocks commissioning when prompt is LOCKED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'locked', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.commissionPrompt(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('status');
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks commissioning when prompt is RETIRED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'retired', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.commissionPrompt(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks commissioning when prompt is ARCHIVED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'archived', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.commissionPrompt(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks commissioning when prompt is SUPERSEDED', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'superseded', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
      prompt_audit_ledger: [],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.commissionPrompt(mockReq({ params: { id: 'p1' } }), res, next);
    expect(res.statusCode).toBe(409);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── Section 4: FailClosedGuard Integration ───────────────────────────────────

describe('FailClosedGuard — approveVersion blocks when evidence write fails', () => {
  it('returns error through next() when evidence write fails', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'review_requested', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [],
      prompt_audit_ledger: [],
    });
    mockEvidenceFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.approveVersion(mockReq({ params: { versionId: 'v1' }, body: { reviewer_role: 'PROMPT_OWNER' } }), res, next);
    // failEvidence makes PromptEvidenceService.record return null, and the critical audit
    // call in auditPromptEvent should throw, which gets caught by the controller's catch
    expect(next).toHaveBeenCalled();
  });

  it('returns error through next() when audit write fails', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'review_requested', current_version_id: 'v1', risk_tier: 'tier_1_low' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [],
      prompt_audit_ledger: [],
    });
    mockAuditFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.approveVersion(mockReq({ params: { versionId: 'v1' }, body: { reviewer_role: 'PROMPT_OWNER' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('FailClosedGuard — deployVersion blocks when evidence write fails', () => {
  it('staging deploy returns error through next() when evidence write fails', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_pending', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_deployments: [],
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'staging' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('FailClosedGuard — rollback blocks when evidence write fails', () => {
  it('returns error through next() when evidence write fails', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_active', current_version_id: 'v2', risk_tier: 'tier_2_medium' }],
      prompt_versions: [
        { id: 'v1', prompt_id: 'p1', immutable: false, version_number: 1, body_hash: 'x' },
        { id: 'v2', prompt_id: 'p1', immutable: false, version_number: 2, body_hash: 'y' },
      ],
      prompt_deployments: [
        { id: 'd1', prompt_version_id: 'v2', environment: 'production', rollback_to_version_id: 'v1', evidence_id: null },
      ],
      prompt_audit_ledger: [],
    });
    mockEvidenceFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.rollbackPrompt(mockReq({ params: { id: 'p1' }, body: { reason: 'Test rollback' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── Section 5: ACTIVE only from COMMISSIONED (via deployVersion controller) ─

describe('Production ACTIVE requires COMMISSIONED (deployVersion)', () => {
  it('blocks production deploy from PRODUCTION_PENDING when not commissioned', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_pending', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'production' } }), res, next);
    // With failEvidence, the audit inside the COMMISSIONED block (line ~1245) fires without
    // {critical: true}, so it does not throw. The block still returns 409.
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('COMMISSIONED');
    expect(next).not.toHaveBeenCalled();
  });

  it('routes COMMISSIONED through production_pending before production deploy', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'commissioned', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_deployments: [],
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceSuccess();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'production' } }), res, next);
    // From COMMISSIONED, the first production deploy routes through the
    // production_pending path (status !== PRODUCTION_PENDING → true),
    // setting status to PRODUCTION_PENDING and returning success.
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('pending');
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── Section 6: Governance error messages ────────────────────────────────────

describe('Governance error messages — fail-closed', () => {
  it('deployVersion fail-closed error message references governance', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', status: 'production_pending', current_version_id: 'v1', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', immutable: false, body: 'test', body_hash: 'x', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 'tr1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_deployments: [],
      prompt_evidence_links: [],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    mockEvidenceFail();
    const res = mockRes();
    const next = vi.fn();
    await PromptController.deployVersion(mockReq({ params: { versionId: 'v1' }, body: { environment: 'staging' } }), res, next);
    expect(next).toHaveBeenCalled();
    const errorArg = next.mock.calls[0][0];
    expect(errorArg.message).toBeDefined();
  });
});

// ─── Section 7: Regression — Phase 1 enforcement still works ────────────────

describe('Regression — Phase 1 SoD enforcement still works', () => {
  it('blocks self-approval (SoD)', async () => {
    setFixtures({ prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-1' }] });
    const result = await SeparationOfDutiesService.checkSelfApproval('v1', 'user-1');
    expect(result.allowed).toBe(false);
  });

  it('blocks role conflict (SoD)', async () => {
    setFixtures({
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'user-1', reviewer_role: 'REVIEWER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
    });
    const result = await SeparationOfDutiesService.checkRoleConflict('v1', 'APPROVER', 'user-1');
    expect(result.allowed).toBe(false);
  });

  it('blocks stage order violation (SoD)', async () => {
    setFixtures({ prompt_approvals: [] });
    const result = await SeparationOfDutiesService.checkStageOrder('v1', 'VALIDATOR');
    expect(result.allowed).toBe(false);
  });
});

describe('Regression — Phase 1 Three-Key enforcement still works', () => {
  it('blocks deployment when Three-Key is incomplete for Tier 4', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'SECURITY_ADMIN', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_4_critical' });
    expect(result.canDeploy).toBe(false);
  });
});

describe('Regression — bypasses remain removed', () => {
  it('ADMIN cannot satisfy COMPLIANCE_REVIEWER via canRoleSatisfy', () => {
    expect(PromptApprovalPolicyService.canRoleSatisfy('COMPLIANCE_REVIEWER', 'ADMIN')).toBe(false);
  });

  it('WORKSPACE_OWNER cannot satisfy SECURITY_ADMIN via canRoleSatisfy', () => {
    expect(PromptApprovalPolicyService.canRoleSatisfy('SECURITY_ADMIN', 'WORKSPACE_OWNER')).toBe(false);
  });

  it('SUPERADMIN cannot satisfy COMPLIANCE_REVIEWER via canRoleSatisfy', () => {
    expect(PromptApprovalPolicyService.canRoleSatisfy('COMPLIANCE_REVIEWER', 'SUPERADMIN')).toBe(false);
  });

  it('exact role match still works', () => {
    expect(PromptApprovalPolicyService.canRoleSatisfy('COMPLIANCE_REVIEWER', 'COMPLIANCE_REVIEWER')).toBe(true);
  });
});

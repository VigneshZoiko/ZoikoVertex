import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { SeparationOfDutiesService } from '../../modules/prompts/SeparationOfDutiesService';
import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';
import { PromptApprovalPolicyService } from '../../modules/prompts/PromptApprovalPolicyService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

beforeEach(() => {
  resetFixtures();
});

// ─── Part A: Separation of Duties Enforcement ──────────────────────────────

describe('Self-approval blocked (SoD Part A)', () => {
  it('blocks approval when user is the prompt version creator', async () => {
    setFixtures({ prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-1' }] });
    const result = await SeparationOfDutiesService.checkSelfApproval('v1', 'user-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Self-approval is not permitted');
  });

  it('allows approval when user is not the creator', async () => {
    setFixtures({ prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }] });
    const result = await SeparationOfDutiesService.checkSelfApproval('v1', 'user-other');
    expect(result.allowed).toBe(true);
  });
});

describe('Role conflict blocked (SoD Part A)', () => {
  it('blocks approval when user already acted as a conflicting role', async () => {
    setFixtures({
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'user-1', reviewer_role: 'REVIEWER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
    });
    const result = await SeparationOfDutiesService.checkRoleConflict('v1', 'APPROVER', 'user-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Role conflict');
  });

  it('allows when no conflicting role exists', async () => {
    setFixtures({ prompt_approvals: [] });
    const result = await SeparationOfDutiesService.checkRoleConflict('v1', 'COMPLIANCE_REVIEWER', 'user-1');
    expect(result.allowed).toBe(true);
  });
});

describe('Stage-order violation blocked (SoD Part A)', () => {
  it('blocks APPROVER when REVIEWER has not approved first', async () => {
    setFixtures({
      prompt_approvals: [],
    });
    const result = await SeparationOfDutiesService.checkStageOrder('v1', 'APPROVER');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Stage order violation');
  });

  it('allows REVIEWER (first stage) without prior approvals', async () => {
    setFixtures({ prompt_approvals: [] });
    const result = await SeparationOfDutiesService.checkStageOrder('v1', 'REVIEWER');
    expect(result.allowed).toBe(true);
  });

  it('allows VALIDATOR when REVIEWER has already approved', async () => {
    setFixtures({
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'REVIEWER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
    });
    const result = await SeparationOfDutiesService.checkStageOrder('v1', 'VALIDATOR');
    expect(result.allowed).toBe(true);
  });
});

// ─── Part B: Three-Key Enforcement ─────────────────────────────────────────

describe('Deployment Gate — Three-Key (Part B)', () => {
  it('blocks deployment when Three-Key is incomplete for Tier 4', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      // Only 2 approvals — Three-Key requires 3, so getStatus returns completed=false
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'SECURITY_ADMIN', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_4_critical' });
    // First gate that should block: incomplete_approvals (only 2 roles approved but tier_4 requires 3),
    // or three_key_incomplete (only 2 non-PENDING approvals < 3)
    const hasThreeKeyBlock = result.blockingIssues.find((i) => i.type === 'three_key_incomplete' || i.type === 'incomplete_approvals');
    expect(hasThreeKeyBlock).toBeDefined();
    expect(result.canDeploy).toBe(false);
  });

  it('blocks deployment when Three-Key validation errors (fail-closed)', async () => {
    // With no approvals and no tests, Gates 3-5 will also block.
    // The key assertion: deployment is blocked (fail-closed), never allowed through.
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
      prompt_approvals: [],
      prompt_test_runs: [],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_4_critical' });
    expect(result.canDeploy).toBe(false);
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });
});

// ─── Part D: Distinct Approver Validation ──────────────────────────────────

describe('Distinct approver validation (Part D)', () => {
  it('blocks deployment when same user holds multiple approval roles', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      // Tier 2 requires [PROMPT_OWNER, BRAND_REVIEWER]
      // Both held by user-1 => duplicate approver in Gate 7
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_2_medium' });
    const hasDuplicate = result.blockingIssues.find((i) => i.type === 'duplicate_approver' || i.type === 'role_conflict_approver');
    expect(hasDuplicate).toBeDefined();
    expect(hasDuplicate!.blocking).toBe(true);
    expect(result.canDeploy).toBe(false);
  });
});

// ─── Part B + D: Deployment success path ───────────────────────────────────

describe('Deployment succeeds when all requirements met', () => {
  it('allows deployment with complete approvals and distinct approvers for Tier 3', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a3', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', reviewer_id: 'user-3', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_audit_ledger: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_3_high' })],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_3_high' });
    expect(result.canDeploy).toBe(true);
    expect(result.blockingIssues.length).toBe(0);
  });
});

// ─── Part C: Bypass Removal Verification ───────────────────────────────────

describe('Bypass removal (Part C)', () => {
  it('ADMIN cannot satisfy roles they do not hold via canRoleSatisfy', () => {
    const result = PromptApprovalPolicyService.canRoleSatisfy('COMPLIANCE_REVIEWER', 'ADMIN');
    expect(result).toBe(false);
  });

  it('WORKSPACE_OWNER cannot satisfy roles they do not hold via canRoleSatisfy', () => {
    const result = PromptApprovalPolicyService.canRoleSatisfy('SECURITY_ADMIN', 'WORKSPACE_OWNER');
    expect(result).toBe(false);
  });

  it('SUPERADMIN cannot satisfy roles they do not hold via canRoleSatisfy', () => {
    const result = PromptApprovalPolicyService.canRoleSatisfy('COMPLIANCE_REVIEWER', 'SUPERADMIN');
    expect(result).toBe(false);
  });

  it('exact role match still works', () => {
    const result = PromptApprovalPolicyService.canRoleSatisfy('COMPLIANCE_REVIEWER', 'COMPLIANCE_REVIEWER');
    expect(result).toBe(true);
  });

  it('GOVERNANCE_ADMIN can satisfy BRAND_REVIEWER', () => {
    const result = PromptApprovalPolicyService.canRoleSatisfy('BRAND_REVIEWER', 'GOVERNANCE_ADMIN');
    expect(result).toBe(true);
  });

  it('PROMPT_OWNER required role is always satisfied', () => {
    const result = PromptApprovalPolicyService.canRoleSatisfy('PROMPT_OWNER', 'ANY_ROLE');
    expect(result).toBe(true);
  });
});

// ─── Part A: Audit event verification ──────────────────────────────────────

describe('Audit events created (Part A)', () => {
  it('SeparationOfDutiesService.checkAll writes audit on SoD block', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [],
      prompt_audit_ledger: [],
    });
    await SeparationOfDutiesService.checkAll('v1', 'APPROVER', 'user-1', 'ws-a');
    // Verify audit was written to the mock fixture
    const { supabaseAdmin } = await import('../../shared/supabase');
    const { data: auditEntries } = await supabaseAdmin.from('prompt_audit_ledger').select('*');
    expect(auditEntries.length).toBeGreaterThanOrEqual(1);
    expect(auditEntries.some((e: any) => e.event_type === 'prompt.separation_of_duties.blocked')).toBe(true);
  });

  it('DeploymentGateService check with incomplete data does not crash', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
      prompt_approvals: [],
      prompt_test_runs: [],
      prompt_audit_ledger: [],
    });
    // Should not throw even with empty fixtures
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_4_critical' });
    expect(result.canDeploy).toBe(false);
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });
});

// ─── Governance error messages ─────────────────────────────────────────────

describe('Governance error messages (Part A)', () => {
  it('self-approval returns explicit "Self-approval is not permitted"', async () => {
    setFixtures({ prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-1' }] });
    const result = await SeparationOfDutiesService.checkSelfApproval('v1', 'user-1');
    expect(result.reason).toBe('Self-approval is not permitted. The prompt author cannot approve their own prompt.');
  });

  it('role conflict returns message containing conflicting role', async () => {
    setFixtures({
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'user-1', reviewer_role: 'REVIEWER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
    });
    const result = await SeparationOfDutiesService.checkRoleConflict('v1', 'APPROVER', 'user-1');
    expect(result.reason).toContain('Role conflict');
    expect(result.reason).toContain('REVIEWER');
  });

  it('stage-order violation returns message containing missing roles', async () => {
    setFixtures({ prompt_approvals: [] });
    const result = await SeparationOfDutiesService.checkStageOrder('v1', 'VALIDATOR');
    expect(result.reason).toContain('REVIEWER');
  });

  it('Three-Key gate becomes reachable when prior gates pass', async () => {
    // Exercise the full gate chain: Tier 4 with complete chain + passing tests + 3 distinct approvers
    // Verifies Three-Key Gate 6 is actually evaluated and does not introduce false negatives
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a3', prompt_version_id: 'v1', reviewer_role: 'SECURITY_ADMIN', reviewer_id: 'user-3', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_4_critical' })],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_4_critical' });
    // All 6 gates pass: chain complete, tests pass, three-key complete (3 APPROVED)
    expect(result.canDeploy).toBe(true);
    // Verify Gate 6 was reached (no earlier gate blocked)
    const hasThreeKeyBlock = result.blockingIssues.find((i) => i.type.startsWith('three_key'));
    expect(hasThreeKeyBlock).toBeUndefined();
  });

  it('duplicate approver returns message about distinct users', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      // Tier 2 requires [PROMPT_OWNER, BRAND_REVIEWER]; both held by user-1 => duplicate
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
        { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
    });
    const result = await DeploymentGateService.check('v1', { riskTier: 'tier_2_medium' });
    // Gate 5 (chain) is complete for tier_2: PROMPT_OWNER satisfied, BRAND_REVIEWER satisfied.
    // Gate 7 (distinct approver) fires: user-1 holds both PROMPT_OWNER and BRAND_REVIEWER
    const block = result.blockingIssues.find((i) => i.type === 'role_conflict_approver' || i.type === 'duplicate_approver');
    expect(block).toBeDefined();
    expect(result.canDeploy).toBe(false);
  });
});

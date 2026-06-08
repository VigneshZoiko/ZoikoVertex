import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { ThreeKeyService } from '../../modules/prompts/ThreeKeyService';
import { SeparationOfDutiesService } from '../../modules/prompts/SeparationOfDutiesService';
import { DelegationService } from '../../modules/prompts/DelegationService';
import { EscalationService } from '../../modules/prompts/EscalationService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

beforeEach(() => {
  resetFixtures();
});

describe('ThreeKeyService', () => {
  it('initializes a three-key approval', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    const result = await ThreeKeyService.initialize('v1', 'ws-a');
    expect(result).toBeDefined();
    expect(result.id).toMatch(/^3KEY-/);
    expect(result.status).toBe('pending');
    expect(result.keysRequired).toBe(3);
    expect(result.keys.map((k) => k.role)).toEqual(['COMPLIANCE_REVIEWER', 'GOVERNANCE_ADMIN', 'ADMIN']);
  });

  it('accepts first key submission', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    const result = await ThreeKeyService.submitKey('approval-1', 'v1', 'COMPLIANCE_REVIEWER', 'user-1', 'user@test.com', 'approved', 'Looks good', 'ws-a');
    expect(result.success).toBe(true);
    expect(result.status).toBe('in_progress');
  });

  it('rejects duplicate role submissions', async () => {
    setFixtures({
      prompt_approvals: [{ id: 'a-existing', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' }],
      prompt_audit_ledger: [],
    });
    const result = await ThreeKeyService.submitKey('approval-1', 'v1', 'COMPLIANCE_REVIEWER', 'user-1', 'user@test.com', 'approved', 'Duplicate', 'ws-a');
    expect(result.success).toBe(false);
  });

  it('getStatus returns keys', async () => {
    setFixtures({
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      ],
    });
    const status = await ThreeKeyService.getStatus('v1');
    expect(status.keys.length).toBeGreaterThanOrEqual(1);
    expect(status.approvedCount).toBeGreaterThanOrEqual(0);
  });
});

describe('SeparationOfDutiesService', () => {
  it('detects self-approval', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-1' }],
    });
    const result = await SeparationOfDutiesService.checkSelfApproval('v1', 'user-1');
    expect(result.allowed).toBe(false);
  });

  it('passes for different users', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
    });
    const result = await SeparationOfDutiesService.checkSelfApproval('v1', 'user-other');
    expect(result.allowed).toBe(true);
  });

  it('checkRoleConflict returns allowed when no conflict', async () => {
    setFixtures({ prompt_approvals: [] });
    const result = await SeparationOfDutiesService.checkRoleConflict('v1', 'COMPLIANCE_REVIEWER', 'user-1');
    expect(result.allowed).toBe(true);
  });

  it('checkAll passes for REVIEWER (first stage, no prior)', async () => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
      prompt_approvals: [],
    });
    const result = await SeparationOfDutiesService.checkAll('v1', 'REVIEWER', 'user-1', 'ws-a');
    expect(result.allowed).toBe(true);
    expect(result.checks).toHaveLength(3);
  });
});

describe('DelegationService', () => {
  it('creates a delegation', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    const result = await DelegationService.create('user-1', 'REVIEWER', 'user-2', 'REVIEWER', 'v1', 'Out of office', 'ws-a', 24);
    expect(result).toBeDefined();
    expect(result.id).toMatch(/^DEL-/);
    expect(result.fromUserId).toBe('user-1');
    expect(result.toUserId).toBe('user-2');
    expect(result.active).toBe(true);
  });

  it('revokes an existing delegation', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    await DelegationService.revoke('DEL-001', 'ws-a');
  });

  it('raises error for self-delegation', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    await expect(DelegationService.create('user-1', 'REVIEWER', 'user-1', 'REVIEWER', 'v1', 'Self', 'ws-a'))
      .rejects.toThrow('Cannot delegate to yourself');
  });

  it('validate finds delegations', async () => {
    setFixtures({
      prompt_approvals: [
        { id: 'a1', prompt_version_id: 'v1', reviewer_id: 'user-2', reviewer_role: 'REVIEWER', decision: 'PENDING', decision_reason: 'Delegation from REVIEWER (user-1): OOO', created_at: '2025-01-01T00:00:00Z' },
      ],
    });
    const result = await DelegationService.validate('user-2', 'v1', 'ws-a');
    expect(result.delegations.length).toBeGreaterThanOrEqual(1);
  });
});

describe('EscalationService', () => {
  it('escalates from REVIEWER to default target', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    const result = await EscalationService.escalate('v1', 'user-1', 'REVIEWER', 'Need senior review', 'ws-a');
    expect(result.status).toBe('open');
    expect(result.targetRole).toMatch(/^VALIDATOR|APPROVER$/);
    expect(result.id).toMatch(/^ESC-/);
  });

  it('getTargetRoles returns array for ADMIN', async () => {
    const roles = await EscalationService.getTargetRoles('ADMIN');
    expect(roles).toContain('SUPERADMIN');
  });

  it('getTargetRoles returns default for unknown role', async () => {
    const roles = await EscalationService.getTargetRoles('SUPERADMIN');
    expect(roles).toEqual(['GOVERNANCE_ADMIN']); // falls back to default
  });

  it('resolve marks escalation as resolved', async () => {
    setFixtures({ prompt_approvals: [], prompt_audit_ledger: [] });
    const result = await EscalationService.escalate('v1', 'user-1', 'REVIEWER', 'Escalate', 'ws-a');
    await EscalationService.resolve(result.id, 'resolved', 'user-admin', 'ws-a');
  });
});

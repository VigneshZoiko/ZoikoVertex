import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import {
  getRequiredApprovalChain,
  recordKeyDecision,
  validateApprovalQuorum,
  checkActivationEligibility,
  roleSatisfies,
} from '../../services/workflowThreeKey.service';

beforeEach(() => {
  resetFixtures();
});

// ─── Part A: Approval Chain Rules per Risk Level ─────────────────────

describe('getRequiredApprovalChain', () => {
  it('returns single key for low risk', () => {
    expect(getRequiredApprovalChain('low')).toEqual(['AGENT_ARCHITECT']);
  });

  it('returns two keys for medium risk', () => {
    expect(getRequiredApprovalChain('medium')).toEqual(['AGENT_ARCHITECT', 'ADMIN']);
  });

  it('returns three keys for high risk', () => {
    const chain = getRequiredApprovalChain('high');
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe('AGENT_ARCHITECT');
    expect(chain[1]).toBe('WORKSPACE_OWNER');
    expect(chain[2]).toBe('GOVERNANCE_ADMIN');
  });

  it('returns three keys for critical risk', () => {
    const chain = getRequiredApprovalChain('critical');
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe('AGENT_ARCHITECT');
    expect(chain[1]).toBe('WORKSPACE_OWNER');
    expect(chain[2]).toBe('GOVERNANCE_ADMIN');
  });

  it('defaults to single key for unknown risk level', () => {
    expect(getRequiredApprovalChain('unknown')).toEqual(['AGENT_ARCHITECT']);
  });
});

// ─── Part B: Role Validation ─────────────────────────────────────────

describe('roleSatisfies', () => {
  it('exact role match returns true', () => {
    expect(roleSatisfies('AGENT_ARCHITECT', 'AGENT_ARCHITECT')).toBe(true);
    expect(roleSatisfies('ADMIN', 'ADMIN')).toBe(true);
    expect(roleSatisfies('GOVERNANCE_ADMIN', 'GOVERNANCE_ADMIN')).toBe(true);
  });

  it('ADMIN can satisfy WORKSPACE_OWNER key', () => {
    expect(roleSatisfies('ADMIN', 'WORKSPACE_OWNER')).toBe(true);
  });

  it('WORKSPACE_OWNER can satisfy ADMIN key', () => {
    expect(roleSatisfies('WORKSPACE_OWNER', 'ADMIN')).toBe(true);
  });

  it('SUPERADMIN can satisfy any role', () => {
    expect(roleSatisfies('SUPERADMIN', 'AGENT_ARCHITECT')).toBe(true);
    expect(roleSatisfies('SUPERADMIN', 'GOVERNANCE_ADMIN')).toBe(true);
    expect(roleSatisfies('SUPERADMIN', 'WORKSPACE_OWNER')).toBe(true);
  });

  it('GOVERNANCE_ADMIN can satisfy AGENT_ARCHITECT for approval purposes', () => {
    expect(roleSatisfies('GOVERNANCE_ADMIN', 'AGENT_ARCHITECT')).toBe(true);
  });

  it('AGENT_ARCHITECT cannot satisfy ADMIN key', () => {
    expect(roleSatisfies('AGENT_ARCHITECT', 'ADMIN')).toBe(false);
  });

  it('AGENT_OPERATOR cannot satisfy AGENT_ARCHITECT key', () => {
    expect(roleSatisfies('AGENT_OPERATOR', 'AGENT_ARCHITECT')).toBe(false);
  });

  it('lowercase role matching works', () => {
    expect(roleSatisfies('admin', 'WORKSPACE_OWNER')).toBe(true);
    expect(roleSatisfies('agent_architect', 'AGENT_ARCHITECT')).toBe(true);
  });
});

// ─── Part C: Self-Approval Prevention ───────────────────────────────

describe('Self-approval prevention', () => {
  it('blocks decision when approver is the workflow creator', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-1', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-self', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-1', chain_id: 'chain-1', approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    await expect(
      recordKeyDecision({
        chainId: 'chain-1',
        approvalSequence: 1,
        approverId: 'user-self',
        approverName: 'Self Approver',
        approverRole: 'AGENT_ARCHITECT',
        decision: 'approved',
      }),
    ).rejects.toThrow('Self-approval is prohibited');
  });

  it('allows decision when approver is different from creator', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-2', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-2', chain_id: 'chain-2', approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    const result = await recordKeyDecision({
      chainId: 'chain-2',
      approvalSequence: 1,
      approverId: 'user-approver',
      approverName: 'Approver',
      approverRole: 'AGENT_ARCHITECT',
      decision: 'approved',
    });

    expect(result.key.decision).toBe('approved');
    expect(result.chainStatus).toBe('approved');
  });
});

// ─── Part D: Duplicate Approval Prevention ──────────────────────────

describe('Duplicate approval prevention', () => {
  it('blocks decision when key already has a decision', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-3', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-3', chain_id: 'chain-3', approval_sequence: 1, required_role: 'AGENT_ARCHITECT', decision: 'approved', approver_id: 'user-a' },
      ],
    });

    await expect(
      recordKeyDecision({
        chainId: 'chain-3',
        approvalSequence: 1,
        approverId: 'user-b',
        approverName: 'User B',
        approverRole: 'AGENT_ARCHITECT',
        decision: 'approved',
      }),
    ).rejects.toThrow('already been decided');
  });

  it('blocks decision when same user already approved another key in the chain', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-4', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'medium', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-4a', chain_id: 'chain-4', approval_sequence: 1, required_role: 'AGENT_ARCHITECT', decision: 'approved', approver_id: 'user-x' },
        { id: 'key-4b', chain_id: 'chain-4', approval_sequence: 2, required_role: 'ADMIN' },
      ],
    });

    await expect(
      recordKeyDecision({
        chainId: 'chain-4',
        approvalSequence: 2,
        approverId: 'user-x',
        approverName: 'User X',
        approverRole: 'ADMIN',
        decision: 'approved',
      }),
    ).rejects.toThrow('already approved a key in this chain');
  });
});

// ─── Part E: Role Validation on Key Decision ────────────────────────

describe('Role validation on key decision', () => {
  it('blocks decision when user role does not match required role', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-5', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-5', chain_id: 'chain-5', approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    await expect(
      recordKeyDecision({
        chainId: 'chain-5',
        approvalSequence: 1,
        approverId: 'user-bad-role',
        approverName: 'Bad Role',
        approverRole: 'VIEWER',
        decision: 'approved',
      }),
    ).rejects.toThrow('cannot satisfy required role');
  });
});

// ─── Part F: Rejection/Change Request Requires Reason ───────────────

describe('Mandatory reason for rejection', () => {
  it('blocks rejection without a reason', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-6', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-6', chain_id: 'chain-6', approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    await expect(
      recordKeyDecision({
        chainId: 'chain-6',
        approvalSequence: 1,
        approverId: 'user-other',
        approverName: 'Other',
        approverRole: 'AGENT_ARCHITECT',
        decision: 'rejected',
        reason: '',
      }),
    ).rejects.toThrow('Reason is mandatory');
  });

  it('blocks changes_requested without a reason', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-6b', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-6b', chain_id: 'chain-6b', approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    await expect(
      recordKeyDecision({
        chainId: 'chain-6b',
        approvalSequence: 1,
        approverId: 'user-other',
        approverName: 'Other',
        approverRole: 'AGENT_ARCHITECT',
        decision: 'changes_requested',
      }),
    ).rejects.toThrow('Reason is mandatory');
  });
});

// ─── Part G: Evidence Creation on Approval ──────────────────────────

describe('Evidence creation on decision', () => {
  it('generates evidence reference when recording key decision', async () => {
    setFixtures({
      workflow_approval_chains: [
        { id: 'chain-7', workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-7', chain_id: 'chain-7', approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    const result = await recordKeyDecision({
      chainId: 'chain-7',
      approvalSequence: 1,
      approverId: 'user-other',
      approverName: 'Other Approver',
      approverRole: 'AGENT_ARCHITECT',
      decision: 'approved',
    });

    expect(result.key.decision).toBe('approved');
    expect(result.key.evidence_ref).toBeTruthy();
    expect(typeof result.key.evidence_ref).toBe('string');
  });
});

// ─── Part H: Activation Blocking ────────────────────────────────────

describe('Activation protection', () => {
  it('blocks activation when no approval chain exists', async () => {
    setFixtures({
      workflow_approval_chains: [],
      workflow_approval_keys: [],
    });

    const result = await checkActivationEligibility({ versionId: 'v-none', workflowId: 'wf-1' });
    expect(result.eligible).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('blocks activation when quorum not satisfied (missing keys)', async () => {
    const chainId = 'chain-8';
    setFixtures({
      workflow_approval_chains: [
        { id: chainId, workflow_id: 'wf-1', version_id: 'v-1', risk_level: 'high', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-8a', chain_id: chainId, approval_sequence: 1, required_role: 'AGENT_ARCHITECT', decision: 'approved', evidence_ref: 'ev-1' },
        { id: 'key-8b', chain_id: chainId, approval_sequence: 2, required_role: 'WORKSPACE_OWNER', decision: 'approved', evidence_ref: 'ev-2' },
        // key-8c for GOVERNANCE_ADMIN is missing — not yet decided
        { id: 'key-8c', chain_id: chainId, approval_sequence: 3, required_role: 'GOVERNANCE_ADMIN' },
      ],
    });

    const result = await checkActivationEligibility({ versionId: 'v-1', workflowId: 'wf-1' });
    expect(result.eligible).toBe(false);
    expect(result.blockers.some(b => b.includes('pending') || b.includes('Missing'))).toBe(true);
  });

  it('allows activation when all Three-Key requirements met', async () => {
    const chainId = 'chain-9';
    setFixtures({
      workflow_approval_chains: [
        { id: chainId, workflow_id: 'wf-1', version_id: 'v-2', risk_level: 'medium', status: 'approved', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-9a', chain_id: chainId, approval_sequence: 1, required_role: 'AGENT_ARCHITECT', decision: 'approved', evidence_ref: 'ev-1' },
        { id: 'key-9b', chain_id: chainId, approval_sequence: 2, required_role: 'ADMIN', decision: 'approved', evidence_ref: 'ev-2' },
      ],
    });

    const result = await checkActivationEligibility({ versionId: 'v-2', workflowId: 'wf-1' });
    expect(result.eligible).toBe(true);
    expect(result.blockers.length).toBe(0);
  });

  it('blocks activation when approved keys lack evidence references', async () => {
    const chainId = 'chain-10';
    setFixtures({
      workflow_approval_chains: [
        { id: chainId, workflow_id: 'wf-1', version_id: 'v-3', risk_level: 'low', status: 'approved', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-10', chain_id: chainId, approval_sequence: 1, required_role: 'AGENT_ARCHITECT', decision: 'approved', evidence_ref: null },
      ],
    });

    const result = await checkActivationEligibility({ versionId: 'v-3', workflowId: 'wf-1' });
    // Activation is not eligible; blockers contain at least one blocking issue
    expect(result.eligible).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});

// ─── Part I: Full Approval Chain Completion ─────────────────────────

describe('Approval chain completion', () => {
  it('chain status becomes approved when all keys are approved', async () => {
    const chainId = 'chain-11';
    setFixtures({
      workflow_approval_chains: [
        { id: chainId, workflow_id: 'wf-1', version_id: 'v-4', risk_level: 'medium', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-11a', chain_id: chainId, approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
        { id: 'key-11b', chain_id: chainId, approval_sequence: 2, required_role: 'ADMIN' },
      ],
    });

    // Key 1: AGENT_ARCHITECT approves
    await recordKeyDecision({
      chainId,
      approvalSequence: 1,
      approverId: 'user-arch',
      approverName: 'Architect',
      approverRole: 'AGENT_ARCHITECT',
      decision: 'approved',
    });

    // Key 2: ADMIN approves — chain should become "approved"
    const result = await recordKeyDecision({
      chainId,
      approvalSequence: 2,
      approverId: 'user-admin',
      approverName: 'Admin',
      approverRole: 'ADMIN',
      decision: 'approved',
    });

    expect(result.chainStatus).toBe('approved');
  });

  it('chain status becomes rejected when any key is rejected', async () => {
    const chainId = 'chain-12';
    setFixtures({
      workflow_approval_chains: [
        { id: chainId, workflow_id: 'wf-1', version_id: 'v-5', risk_level: 'low', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-12', chain_id: chainId, approval_sequence: 1, required_role: 'AGENT_ARCHITECT' },
      ],
    });

    const result = await recordKeyDecision({
      chainId,
      approvalSequence: 1,
      approverId: 'user-other',
      approverName: 'Other',
      approverRole: 'AGENT_ARCHITECT',
      decision: 'rejected',
      reason: 'Missing compliance documentation',
    });

    expect(result.chainStatus).toBe('rejected');
  });

  it('validateApprovalQuorum returns correct counts', async () => {
    const chainId = 'chain-13';
    setFixtures({
      workflow_approval_chains: [
        { id: chainId, workflow_id: 'wf-1', version_id: 'v-6', risk_level: 'high', status: 'in_progress', created_by: 'user-creator', created_at: '2025-01-01T00:00:00Z' },
      ],
      workflow_approval_keys: [
        { id: 'key-13a', chain_id: chainId, approval_sequence: 1, required_role: 'AGENT_ARCHITECT', decision: 'approved' },
        { id: 'key-13b', chain_id: chainId, approval_sequence: 2, required_role: 'WORKSPACE_OWNER' },
      ],
    });

    const quorum = await validateApprovalQuorum({ versionId: 'v-6' });
    expect(quorum.totalKeys).toBe(2);
    expect(quorum.approvedKeys).toBe(1);
    expect(quorum.quorumSatisfied).toBe(false);
    expect(quorum.missingRoles).toContain('WORKSPACE_OWNER');
  });
});

// ─── Part J: Version Service State Enum Consistency ────────────────

describe('Workflow version service enum consistency', () => {
  it('version service uses lowercase state values matching DB schema', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../services/workflowVersion.service.ts'),
      'utf8',
    );

    // Should not contain TitleCase state values
    const titleCaseStates = ["'Draft'", "'Testing'", "'Pending Approval'", "'Approved'", "'Active'", "'Paused'", "'Deprecated'", "'Retired'"];
    for (const state of titleCaseStates) {
      expect(src).not.toContain(`state: ${state}`);
      expect(src).not.toContain(`state: '${state}`);
    }

    // Should contain lowercase enum values
    expect(src).toContain("state: 'draft'");
    expect(src).toContain("state: 'pending_approval'");
    expect(src).toContain("state: 'approved'");
    expect(src).toContain("state: 'active'");
    expect(src).toContain("state: 'paused'");
    expect(src).toContain("state: 'retired'");
  });

  it('template service uses lowercase status comparisons', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../services/workflowTemplate.service.ts'),
      'utf8',
    );

    expect(src).toContain('=== "active"');
    expect(src).toContain('=== "retired"');
    expect(src).toContain('!== "draft"');
  });

  it('approval service uses null for pending decisions, not PENDING string', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../services/workflowApproval.service.ts'),
      'utf8',
    );

    expect(src).not.toContain("'PENDING'");
    expect(src).toContain('.is(');
  });
});

// ─── Part K: Server Route Registration ─────────────────────────────

describe('Three-Key route registration', () => {
  it('registers Three-Key routes with correct guards', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../server.ts'),
      'utf8',
    );

    expect(src).toContain('getThreeKeyChain');
    expect(src).toContain('recordThreeKeyDecision');
    expect(src).toContain('getThreeKeyQuorum');
    expect(src).toContain('listPendingThreeKeyChains');
    expect(src).toContain('workflowApprove');
  });
});

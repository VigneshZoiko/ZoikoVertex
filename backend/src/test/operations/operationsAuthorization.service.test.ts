import { describe, it, expect } from 'vitest';
import {
  assertOperationsPermission,
  canPerformOperationsAction,
  requireReason,
  getRuntimeActionGates,
} from '../../services/operationsAuthorization.service';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    role: overrides.role as string | null || 'ADMIN' as string | null,
    workspace_id: 'ws-1',
    is_superadmin: false,
    ...overrides,
  } as any;
}

describe('assertOperationsPermission', () => {
  it('allows ADMIN to view', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'ADMIN' }), 'view')).not.toThrow();
  });

  it('allows SUPERADMIN any action', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'VIEWER', is_superadmin: true }), 'emergency_pause')).not.toThrow();
  });

  it('allows GOVERNANCE_ADMIN to pause', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'GOVERNANCE_ADMIN' }), 'pause')).not.toThrow();
  });

  it('allows AGENT_OPERATOR to retry', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'AGENT_OPERATOR' }), 'retry')).not.toThrow();
  });

  it('allows AUDITOR to export evidence', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'AUDITOR' }), 'export_evidence')).not.toThrow();
  });

  it('allows REVIEWER to escalate', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'REVIEWER' }), 'escalate')).not.toThrow();
  });

  it('denies VIEWER emergency_pause', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'VIEWER' }), 'emergency_pause')).toThrow('Permission denied');
  });

  it('denies CREATOR any operations action', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'CREATOR' }), 'view')).toThrow('Permission denied');
  });

  it('denies undefined user', () => {
    expect(() => assertOperationsPermission(undefined, 'view')).toThrow('Authenticated user context');
  });

  it('denies ANALYST from stopping runs', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'ANALYST' }), 'stop')).toThrow('Permission denied');
  });

  it('allows SECURITY_ADMIN to emergency_pause', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'SECURITY_ADMIN' }), 'emergency_pause')).not.toThrow();
  });

  it('allows BRAND_REVIEWER to quarantine', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'BRAND_REVIEWER' }), 'quarantine')).not.toThrow();
  });

  it('denies CAMPAIGN_MANAGER from deleting runs', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'CAMPAIGN_MANAGER' }), 'delete_run')).toThrow('Permission denied');
  });

  it('allows WORKSPACE_OWNER to manage queue', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'WORKSPACE_OWNER' }), 'manage_queue')).not.toThrow();
  });

  it('allows COMPLIANCE_REVIEWER to create incident', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'COMPLIANCE_REVIEWER' }), 'create_incident')).not.toThrow();
  });

  it('allows APPROVER to escalate', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'APPROVER' }), 'escalate')).not.toThrow();
  });

  it('denies APPROVER from retrying', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'APPROVER' }), 'retry')).toThrow('Permission denied');
  });

  it('allows AGENT_ARCHITECT to delete_run', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'AGENT_ARCHITECT' }), 'delete_run')).not.toThrow();
  });
});

describe('canPerformOperationsAction', () => {
  it('returns allowed true for valid role+action', () => {
    const gate = canPerformOperationsAction(makeUser({ role: 'ADMIN' }), 'pause');
    expect(gate.allowed).toBe(true);
    expect(gate.action).toBe('pause');
  });

  it('returns allowed false with reason for invalid role', () => {
    const gate = canPerformOperationsAction(makeUser({ role: 'CREATOR' }), 'pause');
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('Permission denied');
  });

  it('returns allowed false for undefined user', () => {
    const gate = canPerformOperationsAction(undefined, 'view');
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('Authenticated user context');
  });
});

describe('requireReason', () => {
  it('accepts valid reason string >= 8 characters', () => {
    expect(requireReason('Emergency brand safety pause', 'pause')).toBe('Emergency brand safety pause');
  });

  it('throws on short reason', () => {
    expect(() => requireReason('Short', 'pause')).toThrow('at least 8 characters');
  });

  it('throws on empty reason', () => {
    expect(() => requireReason('', 'pause')).toThrow('at least 8 characters');
  });

  it('throws on non-string reason', () => {
    expect(() => requireReason(123, 'pause')).toThrow('at least 8 characters');
  });

  it('trims whitespace', () => {
    expect(() => requireReason('  short  ', 'stop')).toThrow('at least 8 characters');
  });
});

describe('hold / release_hold permission', () => {
  it('allows REVIEWER to hold', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'REVIEWER' }), 'hold')).not.toThrow();
  });

  it('allows VALIDATOR to hold', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'VALIDATOR' }), 'hold')).not.toThrow();
  });

  it('allows APPROVER to release_hold', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'APPROVER' }), 'release_hold')).not.toThrow();
  });

  it('allows AGENT_OPERATOR to hold', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'AGENT_OPERATOR' }), 'hold')).not.toThrow();
  });

  it('denies VIEWER from holding', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'VIEWER' }), 'hold')).toThrow('Permission denied');
  });

  it('denies ANALYST from release_hold', () => {
    expect(() => assertOperationsPermission(makeUser({ role: 'ANALYST' }), 'release_hold')).toThrow('Permission denied');
  });

  it('requires reason for hold', () => {
    expect(() => requireReason('', 'hold')).toThrow('at least 8 characters');
  });

  it('requires reason for release_hold', () => {
    expect(() => requireReason('Short', 'release_hold')).toThrow('at least 8 characters');
  });

  it('accepts valid reason for hold', () => {
    expect(requireReason('Manual intervention required for brand review', 'hold')).toBe('Manual intervention required for brand review');
  });

  it('accepts valid reason for release_hold', () => {
    expect(requireReason('Brand review complete, safe to proceed', 'release_hold')).toBe('Brand review complete, safe to proceed');
  });
});

describe('getRuntimeActionGates', () => {
  it('returns gate array with all actions', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'RUNNING');
    expect(Array.isArray(gates)).toBe(true);
    expect(gates.length).toBeGreaterThanOrEqual(8);
  });

  it('allows pause on RUNNING status', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'RUNNING');
    const pauseGate = gates.find((g) => g.action === 'pause');
    expect(pauseGate?.allowed).toBe(true);
  });

  it('allows stop on RUNNING status', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'RUNNING');
    const stopGate = gates.find((g) => g.action === 'stop');
    expect(stopGate?.allowed).toBe(true);
  });

  it('blocks retry on RUNNING status', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'RUNNING');
    const retryGate = gates.find((g) => g.action === 'retry');
    expect(retryGate?.allowed).toBe(false);
  });

  it('allows retry on FAILED status', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'FAILED');
    const retryGate = gates.find((g) => g.action === 'retry');
    expect(retryGate?.allowed).toBe(true);
  });

  it('allows resume only on PAUSED status', () => {
    const pausedGates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'PAUSED');
    expect(pausedGates.find((g) => g.action === 'resume')?.allowed).toBe(true);

    const runningGates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'RUNNING');
    expect(runningGates.find((g) => g.action === 'resume')?.allowed).toBe(false);
  });

  it('restricts emergency_pause to RUNNING or QUEUED', () => {
    for (const status of ['SCHEDULED', 'FAILED', 'COMPLETED', 'PAUSED']) {
      const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), status);
      expect(gates.find((g) => g.action === 'emergency_pause')?.allowed).toBe(false);
    }
    let gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'RUNNING');
    expect(gates.find((g) => g.action === 'emergency_pause')?.allowed).toBe(true);
    gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'QUEUED');
    expect(gates.find((g) => g.action === 'emergency_pause')?.allowed).toBe(true);
  });

  it('correctly denies restricted_mode for non-admin roles', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ANALYST' }), 'RUNNING');
    const restrictedGate = gates.find((g) => g.action === 'restricted_mode');
    expect(restrictedGate?.allowed).toBe(false);
    expect(restrictedGate?.reason).toContain('Permission denied');
  });

  it('returns reasons for denied actions', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'COMPLETED');
    const pauseGate = gates.find((g) => g.action === 'pause');
    expect(pauseGate?.allowed).toBe(false);
    expect(pauseGate?.reason).toContain('not valid');
  });

  it('allows hold on RUNNING, QUEUED, SCHEDULED, WAITING_HUMAN_REVIEW statuses', () => {
    for (const status of ['RUNNING', 'QUEUED', 'SCHEDULED', 'WAITING_HUMAN_REVIEW']) {
      const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), status);
      expect(gates.find((g) => g.action === 'hold')?.allowed).toBe(true);
    }
  });

  it('blocks hold on FAILED, COMPLETED, STOPPED, QUARANTINED statuses', () => {
    for (const status of ['FAILED', 'COMPLETED', 'STOPPED', 'QUARANTINED']) {
      const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), status);
      expect(gates.find((g) => g.action === 'hold')?.allowed).toBe(false);
    }
  });

  it('allows release_hold only on PAUSED status', () => {
    const pausedGates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), 'PAUSED');
    expect(pausedGates.find((g) => g.action === 'release_hold')?.allowed).toBe(true);

    for (const status of ['RUNNING', 'QUEUED', 'FAILED', 'COMPLETED', 'STOPPED', 'SCHEDULED', 'WAITING_HUMAN_REVIEW', 'QUARANTINED']) {
      const gates = getRuntimeActionGates(makeUser({ role: 'ADMIN' }), status);
      expect(gates.find((g) => g.action === 'release_hold')?.allowed).toBe(false);
    }
  });

  it('denies hold for ANALYST role', () => {
    const gates = getRuntimeActionGates(makeUser({ role: 'ANALYST' }), 'RUNNING');
    expect(gates.find((g) => g.action === 'hold')?.allowed).toBe(false);
    expect(gates.find((g) => g.action === 'hold')?.reason).toContain('Permission denied');
  });
});

import { describe, it, expect } from 'vitest';
import { assertOperationsPermission, assertWorkspaceScope } from '../../services/operationsAuthorization.service';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    role: 'ADMIN',
    workspace_id: 'ws-1',
    is_superadmin: false,
    ...overrides,
  } as any;
}

describe('RBAC enforcement — role coverage', () => {
  const ALL_OPERATIONS_ACTIONS = [
    'view', 'manage_queue', 'pause', 'resume', 'stop', 'retry',
    'quarantine', 'escalate', 'emergency_pause', 'restricted_mode',
    'export_evidence', 'create_incident', 'run_policy_check', 'start', 'delete_run',
    'hold', 'release_hold',
  ] as const;

  interface RoleActionMatrix {
    role: string;
    allowed: string[];
    denied: string[];
  }

  const MATRIX: RoleActionMatrix[] = [
    { role: 'SUPERADMIN', allowed: ALL_OPERATIONS_ACTIONS as unknown as string[], denied: [] },
    { role: 'ADMIN', allowed: ALL_OPERATIONS_ACTIONS as unknown as string[], denied: [] },
    { role: 'WORKSPACE_OWNER', allowed: ALL_OPERATIONS_ACTIONS as unknown as string[], denied: [] },
    { role: 'AGENT_OPERATOR', allowed: ['view', 'manage_queue', 'pause', 'resume', 'stop', 'retry', 'escalate', 'create_incident', 'hold', 'release_hold'], denied: ['delete_run', 'emergency_pause', 'restricted_mode', 'export_evidence', 'quarantine', 'run_policy_check'] },
    { role: 'GOVERNANCE_ADMIN', allowed: ['view', 'manage_queue', 'pause', 'resume', 'stop', 'retry', 'quarantine', 'escalate', 'emergency_pause', 'restricted_mode', 'export_evidence', 'create_incident', 'run_policy_check'], denied: ['delete_run'] },
    { role: 'SECURITY_ADMIN', allowed: ['view', 'pause', 'stop', 'quarantine', 'escalate', 'emergency_pause', 'restricted_mode', 'export_evidence', 'create_incident', 'run_policy_check'], denied: ['manage_queue', 'resume', 'retry', 'start', 'delete_run'] },
    { role: 'REVIEWER', allowed: ['view', 'manage_queue', 'escalate', 'create_incident', 'hold', 'release_hold'], denied: ['pause', 'resume', 'stop', 'retry', 'quarantine', 'emergency_pause', 'restricted_mode', 'export_evidence', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'VALIDATOR', allowed: ['view', 'manage_queue', 'escalate', 'create_incident', 'hold', 'release_hold'], denied: ['pause', 'resume', 'stop', 'retry', 'quarantine', 'emergency_pause', 'restricted_mode', 'export_evidence', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'APPROVER', allowed: ['view', 'manage_queue', 'escalate', 'create_incident', 'hold', 'release_hold'], denied: ['pause', 'resume', 'stop', 'retry', 'quarantine', 'emergency_pause', 'restricted_mode', 'export_evidence', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'BRAND_REVIEWER', allowed: ['view', 'quarantine', 'escalate', 'create_incident'], denied: ['manage_queue', 'pause', 'resume', 'stop', 'retry', 'emergency_pause', 'restricted_mode', 'export_evidence', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'COMPLIANCE_REVIEWER', allowed: ['view', 'quarantine', 'escalate', 'export_evidence', 'create_incident', 'run_policy_check'], denied: ['manage_queue', 'pause', 'resume', 'stop', 'retry', 'emergency_pause', 'restricted_mode', 'start', 'delete_run'] },
    { role: 'AUDITOR', allowed: ['view', 'export_evidence'], denied: ['manage_queue', 'pause', 'resume', 'stop', 'retry', 'quarantine', 'escalate', 'emergency_pause', 'restricted_mode', 'create_incident', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'ANALYST', allowed: ['view'], denied: ['manage_queue', 'pause', 'resume', 'stop', 'retry', 'quarantine', 'escalate', 'emergency_pause', 'restricted_mode', 'export_evidence', 'create_incident', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'VIEWER', allowed: ['view'], denied: ['manage_queue', 'pause', 'resume', 'stop', 'retry', 'quarantine', 'escalate', 'emergency_pause', 'restricted_mode', 'export_evidence', 'create_incident', 'run_policy_check', 'start', 'delete_run'] },
    { role: 'CREATOR', allowed: [], denied: ALL_OPERATIONS_ACTIONS as unknown as string[] },
  ];

  for (const roleEntry of MATRIX) {
    for (const action of roleEntry.allowed) {
      it(`allows ${roleEntry.role} to ${action}`, () => {
        const user = roleEntry.role === 'SUPERADMIN'
          ? makeUser({ role: 'VIEWER', is_superadmin: true })
          : makeUser({ role: roleEntry.role });
        expect(() => assertOperationsPermission(user, action as any)).not.toThrow();
      });
    }
    for (const action of roleEntry.denied) {
      it(`denies ${roleEntry.role} from ${action}`, () => {
        const user = makeUser({ role: roleEntry.role });
        expect(() => assertOperationsPermission(user, action as any)).toThrow('Permission denied');
      });
    }
  }
});

describe('assertWorkspaceScope', () => {
  it('passes when workspace matches', () => {
    expect(() => assertWorkspaceScope(makeUser({ workspace_id: 'ws-1' }), 'ws-1')).not.toThrow();
  });

  it('throws when workspace does not match', () => {
    expect(() => assertWorkspaceScope(makeUser({ workspace_id: 'ws-1' }), 'ws-other')).toThrow('outside the current workspace scope');
  });

  it('passes for superadmin regardless of workspace', () => {
    expect(() => assertWorkspaceScope(makeUser({ workspace_id: 'ws-1', is_superadmin: true }), 'ws-other')).not.toThrow();
  });

  it('throws when user is undefined', () => {
    expect(() => assertWorkspaceScope(undefined, 'ws-1')).toThrow('Authenticated user context');
  });
});

describe('Cross-tenant denial', () => {
  it('denies access to runs in a different workspace', () => {
    const user = makeUser({ workspace_id: 'tenant-a' });
    expect(() => assertWorkspaceScope(user, 'tenant-b')).toThrow('outside the current workspace scope');
  });

  it('allows superadmin to access any workspace', () => {
    const user = makeUser({ workspace_id: 'tenant-a', is_superadmin: true });
    expect(() => assertWorkspaceScope(user, 'tenant-b')).not.toThrow();
  });
});

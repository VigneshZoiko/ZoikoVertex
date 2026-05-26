import { beforeEach, describe, expect, it } from 'vitest';
import { mockSupabaseClear, mockSupabaseNext } from './setup';

import {
  listActors,
  getAuthorityAtEvent,
  resolveAuthorityBindingForAuditEvent,
  verifyIdentityLedgerChain,
  createDelegation,
  revokeDelegation,
  listDelegations,
  requestBreakGlass,
  activateBreakGlass,
  endBreakGlass,
  reviewBreakGlass,
  applyLegalHold,
  releaseLegalHold,
  preserveToVault,
  reconstructIdentityChain,
} from '../services/identityLedger.service';

describe('Identity Ledger', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('masks sensitive actor fields for auditors in actor lists', async () => {
    mockSupabaseNext([
      {
        id: 'actor-row-1',
        actor_id: 'user-001',
        workspace_id: 'WRK-001',
        tenant_id: 'default',
        actor_type: 'human_user',
        display_name: 'Maya Chen',
        email: 'maya@example.com',
        email_hash: 'hash',
        state: 'active',
        external_identity_id: 'okta_001',
        source_system: 'workspace_members',
        source_ref_id: 'user-001',
        authority_class: 'standard',
        risk_level: 'medium',
        risk_flags: ['temporary_privilege'],
        current_roles: ['ADMIN'],
        current_permissions: ['audit:view', 'identity-ledger:view'],
        current_authority_snapshot_id: 'AUTH-001',
        last_activity_at: '2026-05-21T10:00:00Z',
        profile: {},
        last_synced_at: '2026-05-21T10:00:00Z',
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      },
    ]);

    const result = await listActors({
      workspace_id: 'WRK-001',
      viewer: { user_id: 'auditor-001', workspace_role: 'AUDITOR' },
    });

    expect(result.total).toBe(1);
    expect(result.actors[0].email).toMatch(/^sha256:/);
    expect(result.actors[0].external_identity_id).toMatch(/^sha256:/);
    expect(result.actors[0].current_permissions).toBe('SUMMARY_ONLY:2_permissions');
  });

  it('resolves event-time authority using the linked snapshot first', async () => {
    mockSupabaseNext({
      id: 'audit-uuid-1',
      event_id: 'AUD-2026-001',
      event_type: 'evidence.item_preserved',
      event_title: 'Evidence Preserved',
      timestamp_utc: '2026-05-21T09:00:00Z',
      status: 'success',
      actor: { actor_id: 'user-001', actor_type: 'human_user' },
      authority: { authority_snapshot_id: 'AUTH-OLD' },
    });

    mockSupabaseNext({
      id: 'snapshot-old-row',
      authority_snapshot_id: 'AUTH-OLD',
      actor_id: 'user-001',
      actor_type: 'human_user',
      tenant_id: 'default',
      workspace_id: 'WRK-001',
      effective_from: '2026-05-20T09:00:00Z',
      effective_until: '2026-05-21T10:00:00Z',
      roles_at_time: [{ role_id: 'ADMIN', role_name: 'ADMIN' }],
      permissions_at_time: ['audit:view'],
      policy_constraints: {},
      delegation_context: null,
      agent_context: null,
      service_account_context: null,
      source_lineage: [],
      snapshot_hash: 'hash-old',
      created_by_ledger_entry_id: 'IDL-OLD',
      superseded_by: 'AUTH-CURRENT',
      created_at: '2026-05-20T09:00:00Z',
    });

    mockSupabaseNext({
      id: 'actor-row-1',
      actor_id: 'user-001',
      workspace_id: 'WRK-001',
      tenant_id: 'default',
      actor_type: 'human_user',
      display_name: 'Maya Chen',
      email: 'maya@example.com',
      email_hash: 'hash',
      state: 'active',
      external_identity_id: 'maya@example.com',
      source_system: 'workspace_members',
      source_ref_id: 'user-001',
      authority_class: 'standard',
      risk_level: 'low',
      risk_flags: [],
      current_roles: ['COMPLIANCE_REVIEWER'],
      current_permissions: ['identity-ledger:view'],
      current_authority_snapshot_id: 'AUTH-CURRENT',
      last_activity_at: '2026-05-21T10:30:00Z',
      profile: {},
      last_synced_at: '2026-05-21T10:30:00Z',
      created_at: '2026-05-21T10:30:00Z',
      updated_at: '2026-05-21T10:30:00Z',
    });

    mockSupabaseNext({
      id: 'snapshot-current-row',
      authority_snapshot_id: 'AUTH-CURRENT',
      actor_id: 'user-001',
      actor_type: 'human_user',
      tenant_id: 'default',
      workspace_id: 'WRK-001',
      effective_from: '2026-05-21T10:00:00Z',
      effective_until: null,
      roles_at_time: [{ role_id: 'COMPLIANCE_REVIEWER', role_name: 'COMPLIANCE_REVIEWER' }],
      permissions_at_time: ['identity-ledger:view'],
      policy_constraints: {},
      delegation_context: null,
      agent_context: null,
      service_account_context: null,
      source_lineage: [],
      snapshot_hash: 'hash-current',
      created_by_ledger_entry_id: 'IDL-CURRENT',
      superseded_by: null,
      created_at: '2026-05-21T10:00:00Z',
    });

    const result = await getAuthorityAtEvent({
      workspace_id: 'WRK-001',
      audit_event_id: 'AUD-2026-001',
      viewer: { user_id: 'admin-001', workspace_role: 'ADMIN' },
    });

    expect(result?.resolved_by).toBe('linked_snapshot');
    expect(result?.authority_at_event).toBeTruthy();
    expect(result?.difference_warning).toBe('Current authority differs from the event-time snapshot.');
  });

  it('creates a snapshot binding for a live human actor when none exists yet', async () => {
    mockSupabaseNext({ user_id: 'user-001', role: 'ADMIN' });
    mockSupabaseNext({ id: 'user-001', full_name: 'Maya Chen', email: 'maya@example.com', is_superadmin: false });
    mockSupabaseNext([]);
    mockSupabaseNext([]);
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext({
      id: 'ledger-row-1',
      ledger_entry_id: 'IDL-NEW-1',
      tenant_id: 'default',
      workspace_id: 'WRK-001',
      data_residency: 'auto',
      schema_version: '1.0',
      entry_type: 'identity.created',
      entry_category: 'identity_assertion',
      timestamp_utc: '2026-05-21T09:00:00Z',
      received_at: '2026-05-21T09:00:00Z',
      actor_id: 'user-001',
      actor_type: 'human_user',
      source: {},
      authority_change: {},
      session_context: {},
      approvals: [],
      linked_authority_snapshot_id: 'AUTH-NEW-1',
      risk: {},
      retention: {},
      hash: 'hash-1',
      prev_hash: null,
      created_at: '2026-05-21T09:00:00Z',
    });
    mockSupabaseNext({
      id: 'snapshot-row-1',
      authority_snapshot_id: 'AUTH-NEW-1',
      actor_id: 'user-001',
      actor_type: 'human_user',
      tenant_id: 'default',
      workspace_id: 'WRK-001',
      effective_from: '2026-05-21T09:00:00Z',
      effective_until: null,
      roles_at_time: [{ role_id: 'ADMIN', role_name: 'ADMIN' }],
      permissions_at_time: ['dashboard:view', 'identity-ledger:view'],
      policy_constraints: {},
      delegation_context: null,
      agent_context: null,
      service_account_context: null,
      source_lineage: [],
      snapshot_hash: 'snapshot-hash',
      created_by_ledger_entry_id: 'IDL-NEW-1',
      superseded_by: null,
      created_at: '2026-05-21T09:00:00Z',
    });
    mockSupabaseNext({
      id: 'actor-row-1',
      actor_id: 'user-001',
      workspace_id: 'WRK-001',
      tenant_id: 'default',
      actor_type: 'human_user',
      display_name: 'Maya Chen',
      email: 'maya@example.com',
      email_hash: 'hash',
      state: 'active',
      external_identity_id: 'maya@example.com',
      source_system: 'workspace_members',
      source_ref_id: 'user-001',
      authority_class: 'admin',
      risk_level: 'low',
      risk_flags: [],
      current_roles: ['ADMIN'],
      current_permissions: ['dashboard:view', 'identity-ledger:view'],
      current_authority_snapshot_id: 'AUTH-NEW-1',
      last_activity_at: null,
      profile: {},
      last_synced_at: '2026-05-21T09:00:00Z',
      created_at: '2026-05-21T09:00:00Z',
      updated_at: '2026-05-21T09:00:00Z',
    });

    const result = await resolveAuthorityBindingForAuditEvent({
      workspace_id: 'WRK-001',
      timestamp_utc: '2026-05-21T09:00:00Z',
      actor: { actor_id: 'user-001', actor_type: 'human_user' },
      authority: { permission_used: 'identity-ledger:view' },
    });

    expect(result.authority_snapshot_id).toBe('AUTH-NEW-1');
    expect(result.roles_at_event).toEqual(['ADMIN']);
    expect(result.actor_display_name).toBe('Maya Chen');
  });

  it('marks the ledger chain as broken when entry hashes do not match', async () => {
    mockSupabaseNext([
      {
        id: 'ledger-row-1',
        ledger_entry_id: 'IDL-1',
        tenant_id: 'default',
        workspace_id: 'WRK-001',
        data_residency: 'auto',
        schema_version: '1.0',
        entry_type: 'identity.created',
        entry_category: 'identity_assertion',
        timestamp_utc: '2026-05-21T09:00:00Z',
        received_at: '2026-05-21T09:00:00Z',
        actor_id: 'user-001',
        actor_type: 'human_user',
        source: {},
        authority_change: {},
        session_context: {},
        approvals: [],
        linked_authority_snapshot_id: 'AUTH-1',
        risk: {},
        retention: {},
        hash: 'bad-hash-1',
        prev_hash: null,
        created_at: '2026-05-21T09:00:00Z',
      },
      {
        id: 'ledger-row-2',
        ledger_entry_id: 'IDL-2',
        tenant_id: 'default',
        workspace_id: 'WRK-001',
        data_residency: 'auto',
        schema_version: '1.0',
        entry_type: 'authority.snapshot_created',
        entry_category: 'role_permission',
        timestamp_utc: '2026-05-21T10:00:00Z',
        received_at: '2026-05-21T10:00:00Z',
        actor_id: 'user-001',
        actor_type: 'human_user',
        source: {},
        authority_change: {},
        session_context: {},
        approvals: [],
        linked_authority_snapshot_id: 'AUTH-2',
        risk: {},
        retention: {},
        hash: 'bad-hash-2',
        prev_hash: 'not-the-first-hash',
        created_at: '2026-05-21T10:00:00Z',
      },
    ]);

    mockSupabaseNext({
      id: 'verification-row-1',
      verification_id: 'IDV-1',
      tenant_id: 'default',
      workspace_id: 'WRK-001',
      status: 'broken',
      last_verified_entry_id: 'IDL-2',
      verified_entry_count: 2,
      broken_links: [{ ledger_entry_id: 'IDL-1' }, { ledger_entry_id: 'IDL-2' }],
      verified_at: '2026-05-21T11:00:00Z',
      created_by: 'admin-001',
      created_at: '2026-05-21T11:00:00Z',
    });

    const result = await verifyIdentityLedgerChain({
      workspace_id: 'WRK-001',
      created_by: 'admin-001',
    });

    expect(result.status).toBe('broken');
    expect(result.verified_entry_count).toBe(2);
  });

  it('hydrates actor seed with delegation context when active delegations exist', async () => {
    mockSupabaseNext({ user_id: 'user-001', role: 'VIEWER' });
    mockSupabaseNext({ id: 'user-001', full_name: 'Maya Chen', email: 'maya@example.com', is_superadmin: false });
    mockSupabaseNext([
      {
        id: 'del-1',
        delegator_id: 'user-002',
        delegatee_id: 'user-001',
        tenant_id: 'default',
        scope: { roles: ['ADMIN'], permissions: ['special:action'] },
        status: 'ACTIVE',
        expires_at: '2030-01-01T00:00:00Z',
      }
    ]);
    mockSupabaseNext([]);
    
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext({ ledger_entry_id: 'IDL-DEL' });
    mockSupabaseNext({ authority_snapshot_id: 'AUTH-DEL', permissions_at_time: ['dashboard:view', 'special:action'], roles_at_time: [{ role_name: 'DELEGATED_ACTOR' }] });
    mockSupabaseNext({ state: 'active', display_name: 'Maya Chen' });

    const result = await resolveAuthorityBindingForAuditEvent({
      workspace_id: 'WRK-001',
      timestamp_utc: '2026-05-21T09:00:00Z',
      actor: { actor_id: 'user-001', actor_type: 'human_user' },
    });

    expect(result.roles_at_event).toContain('DELEGATED_ACTOR');
    expect(result.permissions_at_event).toContain('special:action');
  });

  it('hydrates actor seed with break-glass context when emergency session is active', async () => {
    mockSupabaseNext({ user_id: 'user-001', role: 'VIEWER' });
    mockSupabaseNext({ id: 'user-001', full_name: 'Maya Chen', email: 'maya@example.com', is_superadmin: false });
    mockSupabaseNext([]);
    mockSupabaseNext([
      {
        id: 'bg-1',
        actor_id: 'user-001',
        tenant_id: 'default',
        status: 'ACTIVE',
        elevated_roles: ['SUPERADMIN'],
        reason: 'P0 Incident'
      }
    ]);
    
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext({ ledger_entry_id: 'IDL-BG' });
    mockSupabaseNext({ authority_snapshot_id: 'AUTH-BG', permissions_at_time: ['*'], roles_at_time: [{ role_name: 'SUPERADMIN' }] });
    mockSupabaseNext({ state: 'break_glass_active', display_name: 'Maya Chen' });

    const result = await resolveAuthorityBindingForAuditEvent({
      workspace_id: 'WRK-001',
      timestamp_utc: '2026-05-21T09:00:00Z',
      actor: { actor_id: 'user-001', actor_type: 'human_user' },
    });

    expect(result.actor_state_at_event).toBe('break_glass_active');
    expect(result.permissions_at_event).toContain('*');
  });

  it('creates a delegation entry in the identity_delegations table', async () => {
    mockSupabaseNext({
      id: 'del-001',
      delegator_id: 'user-002',
      delegatee_id: 'user-003',
      tenant_id: 'default',
      scope: { roles: ['ADMIN'], permissions: ['special:action'] },
      expires_at: '2030-01-01T00:00:00Z',
      reason: 'Temporary backup',
      status: 'ACTIVE',
      created_at: '2026-05-21T10:00:00Z',
    });

    const result = await createDelegation({
      tenant_id: 'default',
      delegator_id: 'user-002',
      delegatee_id: 'user-003',
      scope: { roles: ['ADMIN'], permissions: ['special:action'] },
      expires_at: '2030-01-01T00:00:00Z',
      reason: 'Temporary backup',
    });

    expect(result.id).toBe('del-001');
    expect(result.delegator_id).toBe('user-002');
    expect(result.delegatee_id).toBe('user-003');
  });

  it('revokes a delegation by setting status to REVOKED', async () => {
    mockSupabaseNext({
      id: 'del-001',
      status: 'REVOKED',
      revoked_at: '2026-05-21T11:00:00Z',
      revoked_by: 'user-001',
    });

    const result = await revokeDelegation({ id: 'del-001', revoked_by: 'user-001' });

    expect(result.status).toBe('REVOKED');
    expect(result.revoked_by).toBe('user-001');
  });

  it('lists delegations filtered by tenant and optional status', async () => {
    mockSupabaseNext([
      {
        id: 'del-001',
        delegator_id: 'user-002',
        delegatee_id: 'user-003',
        tenant_id: 'default',
        status: 'ACTIVE',
        created_at: '2026-05-21T10:00:00Z',
      },
    ]);

    const result = await listDelegations({ tenant_id: 'default', status: 'ACTIVE' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('del-001');
    expect(result[0].status).toBe('ACTIVE');
  });

  it('requests a break-glass session with elevated roles', async () => {
    mockSupabaseNext({
      id: 'bg-001',
      actor_id: 'user-001',
      tenant_id: 'default',
      reason: 'P0 incident response',
      status: 'ACTIVE',
      elevated_roles: ['SUPERADMIN'],
    });

    const result = await requestBreakGlass({
      tenant_id: 'default',
      actor_id: 'user-001',
      reason: 'P0 incident response',
      elevated_roles: ['SUPERADMIN'],
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.reason).toBe('P0 incident response');
  });

  it('activates a break-glass session', async () => {
    mockSupabaseNext({
      id: 'bg-001',
      status: 'ACTIVE',
    });

    const result = await activateBreakGlass({ id: 'bg-001' });

    expect(result.status).toBe('ACTIVE');
  });

  it('ends an active break-glass session', async () => {
    mockSupabaseNext({
      id: 'bg-001',
      status: 'ENDED',
      ends_at: '2026-05-21T12:00:00Z',
    });

    const result = await endBreakGlass({ id: 'bg-001' });

    expect(result.status).toBe('ENDED');
    expect(result.ends_at).toBeTruthy();
  });

  it('reviews a break-glass session with approval', async () => {
    mockSupabaseNext({
      id: 'bg-001',
      review_status: 'APPROVED',
      review_notes: 'Reviewed and approved',
      reviewed_by: 'admin-001',
      reviewed_at: '2026-05-21T12:30:00Z',
    });

    const result = await reviewBreakGlass({
      id: 'bg-001',
      reviewer_id: 'admin-001',
      status: 'APPROVED',
      notes: 'Reviewed and approved',
    });

    expect(result.review_status).toBe('APPROVED');
    expect(result.reviewed_by).toBe('admin-001');
  });

  it('applies a legal hold on a ledger entry', async () => {
    mockSupabaseNext({
      id: 'entry-001',
      ledger_entry_id: 'IDL-001',
      linked_authority_snapshot_id: 'AUTH-001',
      legal_hold_status: true,
      legal_hold_expiry: null,
    });

    mockSupabaseNext(undefined);

    const result = await applyLegalHold({
      workspace_id: 'WRK-001',
      ledger_entry_id: 'IDL-001',
      reason: 'Litigation hold',
    });

    expect(result.legal_hold_status).toBe(true);
    expect(result.ledger_entry_id).toBe('IDL-001');
  });

  it('releases a legal hold on a ledger entry', async () => {
    mockSupabaseNext({
      id: 'entry-001',
      ledger_entry_id: 'IDL-001',
      linked_authority_snapshot_id: 'AUTH-001',
      legal_hold_status: false,
    });

    mockSupabaseNext(undefined);

    const result = await releaseLegalHold({
      workspace_id: 'WRK-001',
      ledger_entry_id: 'IDL-001',
      reason: 'Hold resolved',
    });

    expect(result.legal_hold_status).toBe(false);
  });

  it('preserves a ledger entry to the evidence vault', async () => {
    mockSupabaseNext({
      id: 'entry-001',
      ledger_entry_id: 'IDL-001',
      retention: { class: 'EVIDENCE_VAULT', preserved: true, reason: 'Regulatory requirement' },
    });

    const result = await preserveToVault({
      workspace_id: 'WRK-001',
      ledger_entry_id: 'IDL-001',
      reason: 'Regulatory requirement',
    });

    expect(result.ledger_entry_id).toBe('IDL-001');
    expect((result as any).retention.class).toBe('EVIDENCE_VAULT');
    expect((result as any).retention.preserved).toBe(true);
  });

  it('reconstructs identity chain authority snapshots in chronological order', async () => {
    mockSupabaseNext([
      {
        id: 'snap-1',
        authority_snapshot_id: 'AUTH-1',
        actor_id: 'user-001',
        effective_from: '2026-01-01T00:00:00Z',
        effective_until: '2026-03-01T00:00:00Z',
        roles_at_time: [{ role_id: 'VIEWER', role_name: 'VIEWER' }],
        permissions_at_time: ['audit:view'],
        snapshot_hash: 'hash-1',
      },
      {
        id: 'snap-2',
        authority_snapshot_id: 'AUTH-2',
        actor_id: 'user-001',
        effective_from: '2026-03-01T00:00:00Z',
        effective_until: null,
        roles_at_time: [{ role_id: 'ADMIN', role_name: 'ADMIN' }],
        permissions_at_time: ['audit:view', 'identity-ledger:view'],
        snapshot_hash: 'hash-2',
      },
    ]);

    const result = await reconstructIdentityChain({
      workspace_id: 'WRK-001',
      actor_id: 'user-001',
      case_id: 'CASE-001',
    });

    expect(result).toHaveLength(2);
    expect(result[0].authority_snapshot_id).toBe('AUTH-1');
    expect(result[1].authority_snapshot_id).toBe('AUTH-2');
    expect(result[0].effective_from).toBe('2026-01-01T00:00:00Z');
    expect(result[1].effective_from).toBe('2026-03-01T00:00:00Z');
  });
});

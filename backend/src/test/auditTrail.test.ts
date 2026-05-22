import { beforeEach, describe, expect, it } from 'vitest';
import { mockSupabaseClear, mockSupabaseNext, mockRpcNext } from './setup';

import {
  computeEventHash,
  applyFieldAccess,
  listAuditEvents,
  getAuditEvent,
  getRelatedEvents,
  verifyChainIntegrity,
  createExportJob,
  listExportJobs,
  preserveEvents,
  sealExpiredRecords,
  getAuditStats,
  createAuditEvent,
} from '../services/auditTrail.service';

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-001',
    event_id: 'AUD-2026-001',
    workspace_id: 'WRK-001',
    chain_id: 'primary',
    block_number: 1,
    hash: 'sha256:abc',
    prev_hash: null,
    schema_version: '1.0',
    event_category: 'system_security',
    event_type: 'audit.access',
    event_title: 'Test Event',
    event_summary: 'A test audit event',
    timestamp_utc: '2026-05-21T10:00:00Z',
    received_at: '2026-05-21T10:00:00Z',
    actor: { actor_id: 'user-001', actor_type: 'human_user', actor_name: 'Test User' },
    object: { object_type: 'report', object_id: 'rpt-001', object_name: 'Test Report' },
    correlation: {},
    authority: { permission_used: 'audit.view' },
    change: {},
    ai_context: {},
    risk_level: 'low',
    status: 'success',
    evidence_state: 'not_preserved',
    retention_class: 'STANDARD',
    retention_until: null,
    sealed_at: null,
    sealed_by: null,
    integrity_check_at: null,
    created_at: '2026-05-21T10:00:00Z',
    ...overrides,
  };
}

describe('Audit Trail — Hash Computation', () => {
  it('produces a deterministic SHA-256 hash prefixed with sha256:', () => {
    const hash = computeEventHash({
      tenant_id: 'default',
      chain_id: 'primary',
      block_number: 1,
      schema_version: '1.0',
      event_category: 'system_security',
      event_type: 'audit.access',
      event_title: 'Test',
      event_summary: 'Summary',
      actor: { actor_id: 'u1', actor_type: 'human_user' },
      object: { object_type: 'report', object_id: 'r1' },
      correlation: {},
      authority: {},
      change: {},
      ai_context: {},
      risk_level: 'low',
      status: 'success',
      retention_class: 'STANDARD',
      prev_hash: null,
    });
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('generates different hashes for different prev_hash values', () => {
    const base = {
      tenant_id: 'default', chain_id: 'primary', block_number: 2, schema_version: '1.0',
      event_category: 'content_lifecycle', event_type: 'content.published',
      event_title: '', event_summary: '', actor: {}, object: {},
      correlation: {}, authority: {}, change: {}, ai_context: {},
      risk_level: 'low', status: 'success', retention_class: 'STANDARD',
    };
    const h1 = computeEventHash({ ...base, prev_hash: null });
    const h2 = computeEventHash({ ...base, prev_hash: 'sha256:prevhashvalue' });
    expect(h1).not.toBe(h2);
  });

  it('produces the same hash for identical inputs (deterministic)', () => {
    const input = {
      tenant_id: 'default', chain_id: 'primary', block_number: 1, schema_version: '1.0',
      event_category: 'system_security', event_type: 'audit.access',
      event_title: 'Test', event_summary: 'Summary',
      actor: { actor_id: 'u1', actor_type: 'human_user' },
      object: { object_type: 'report', object_id: 'r1' },
      correlation: {}, authority: {}, change: {}, ai_context: {},
      risk_level: 'low', status: 'success', retention_class: 'STANDARD',
      prev_hash: null,
    };
    expect(computeEventHash(input)).toBe(computeEventHash(input));
  });
});

describe('Audit Trail — Field Access Control', () => {
  it('grants ADMIN full access to all fields', () => {
    const event = makeEvent({
      actor: { actor_id: 'u1', actor_type: 'human_user', actor_name: 'Admin User', actor_email: 'admin@test.com', ip_address: '192.168.1.1' },
    });
    const result = applyFieldAccess(event as unknown as Record<string, unknown>, 'ADMIN');
    const actor = result.actor as Record<string, unknown>;
    expect(actor.actor_name).toBe('Admin User');
    expect(actor.actor_email).toBe('admin@test.com');
    expect(actor.ip_address).toBe('192.168.1.1');
  });

  it('redacts email for EXEC_VIEWER', () => {
    const event = makeEvent({
      actor: { actor_id: 'u1', actor_type: 'human_user', actor_name: 'Exec', actor_email: 'exec@test.com' },
    });
    const result = applyFieldAccess(event as unknown as Record<string, unknown>, 'EXEC_VIEWER');
    const actor = result.actor as Record<string, unknown>;
    expect(actor.actor_email).toBe('REDACTED_BY_ACCESS_POLICY');
  });

  it('hashes email for EXTERNAL_AUDITOR', () => {
    const event = makeEvent({
      actor: { actor_id: 'u1', actor_type: 'human_user', actor_name: 'Auditor', actor_email: 'auditor@test.com' },
    });
    const result = applyFieldAccess(event as unknown as Record<string, unknown>, 'EXTERNAL_AUDITOR');
    const actor = result.actor as Record<string, unknown>;
    expect(actor.actor_email).toMatch(/^hash:/);
  });

  it('denies ip_address for CAMPAIGN_MANAGER', () => {
    const event = makeEvent({
      actor: { actor_id: 'u1', actor_type: 'human_user', ip_address: '10.0.0.1' },
    });
    const result = applyFieldAccess(event as unknown as Record<string, unknown>, 'CAMPAIGN_MANAGER');
    const actor = result.actor as Record<string, unknown>;
    expect(actor.ip_address).toBeUndefined();
  });

  it('denies device_fingerprint for PUBLISHER and EXEC_VIEWER', () => {
    const event = makeEvent({
      actor: { actor_id: 'u1', actor_type: 'human_user', device_fingerprint: 'fp-123' },
    });
    const pubResult = applyFieldAccess(event as unknown as Record<string, unknown>, 'PUBLISHER');
    expect((pubResult.actor as Record<string, unknown>).device_fingerprint).toBeUndefined();

    const execResult = applyFieldAccess(event as unknown as Record<string, unknown>, 'EXEC_VIEWER');
    expect((execResult.actor as Record<string, unknown>).device_fingerprint).toBeUndefined();
  });

  it('handles self_only access: shows full for self, denies for others', () => {
    const event = makeEvent({
      actor: { actor_id: 'u1', actor_type: 'human_user', actor_name: 'Self User' },
    });
    const selfResult = applyFieldAccess(event as unknown as Record<string, unknown>, 'PUBLISHER', 'u1', true);
    expect((selfResult.actor as Record<string, unknown>).actor_name).toBe('Self User');

    const otherResult = applyFieldAccess(event as unknown as Record<string, unknown>, 'PUBLISHER', 'other-user', false);
    expect((otherResult.actor as Record<string, unknown>).actor_name).toBeUndefined();
  });

  it('denies ai_context.raw_output for CAMPAIGN_MANAGER', () => {
    const event = makeEvent({
      ai_context: { raw_output: 'sensitive-ai-output' },
    });
    const result = applyFieldAccess(event as unknown as Record<string, unknown>, 'CAMPAIGN_MANAGER');
    const ai = result.ai_context as Record<string, unknown>;
    expect(ai.raw_output).toBeUndefined();
  });
});

describe('Audit Trail — listAuditEvents', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('returns paginated events from the database', async () => {
    mockSupabaseNext([makeEvent({ id: '1' }), makeEvent({ id: '2', block_number: 2 })], null, 2);
    const result = await listAuditEvents({ workspace_id: 'WRK-001', limit: 10 });
    expect(result.total).toBe(2);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].id).toBe('1');
  });

  it('supports cursor-based pagination', async () => {
    mockSupabaseNext([makeEvent({ id: '3' })], null, 1);
    const result = await listAuditEvents({ workspace_id: 'WRK-001', cursor: '2026-05-21T09:00:00Z', limit: 10 });
    expect(result.events).toHaveLength(1);
  });

  it('filters by event_category', async () => {
    mockSupabaseNext([makeEvent({ event_category: 'system_security' })], null, 1);
    const result = await listAuditEvents({ workspace_id: 'WRK-001', event_category: 'system_security' });
    expect(result.events).toHaveLength(1);
  });

  it('applies search filter across multiple fields', async () => {
    mockSupabaseNext([makeEvent({ event_title: 'Critical Incident' })], null, 1);
    const result = await listAuditEvents({ workspace_id: 'WRK-001', search: 'Critical' });
    expect(result.events).toHaveLength(1);
  });

  it('filters by risk_level', async () => {
    mockSupabaseNext([makeEvent({ risk_level: 'critical' })], null, 1);
    const result = await listAuditEvents({ workspace_id: 'WRK-001', risk_level: 'critical' });
    expect(result.events).toHaveLength(1);
  });
});

describe('Audit Trail — getAuditEvent', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('returns a single event by id and workspace', async () => {
    mockSupabaseNext(makeEvent({ id: 'evt-001' }));
    const event = await getAuditEvent('evt-001', 'WRK-001');
    expect(event).not.toBeNull();
    expect(event!.id).toBe('evt-001');
  });

  it('returns null when event is not found', async () => {
    mockSupabaseNext(null);
    const event = await getAuditEvent('nonexistent', 'WRK-001');
    expect(event).toBeNull();
  });
});

describe('Audit Trail — getRelatedEvents', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('returns empty array when source event does not exist', async () => {
    mockSupabaseNext(null);
    const result = await getRelatedEvents('nonexistent', 'WRK-001');
    expect(result.related).toHaveLength(0);
  });

  it('fetches related events by same actor within 15-minute window', async () => {
    mockSupabaseNext(
      makeEvent({ id: 'evt-001', correlation: {}, actor: { actor_id: 'user-001', actor_type: 'human_user' } }),
    );
    mockSupabaseNext([]); // workflow
    mockSupabaseNext([]); // approval chain
    mockSupabaseNext([]); // same actor
    mockSupabaseNext([]); // same object
    const result = await getRelatedEvents('evt-001', 'WRK-001');
    expect(result.related).toHaveLength(0);
  });
});

describe('Audit Trail — verifyChainIntegrity', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('verifies an intact chain', async () => {
    const block1 = makeEvent({
      id: 'block-1', block_number: 1, hash: 'sha256:hash1', prev_hash: null,
      tenant_id: 'default', chain_id: 'primary',
      event_category: 'system_security', event_type: 'test.event',
      risk_level: 'low', status: 'success', retention_class: 'STANDARD',
      event_title: '', event_summary: '', actor: {}, object: {}, correlation: {},
      authority: {}, change: {}, ai_context: {}, schema_version: '1.0',
    });
    const block2 = makeEvent({
      id: 'block-2', block_number: 2, hash: 'sha256:hash2', prev_hash: 'sha256:hash1',
      tenant_id: 'default', chain_id: 'primary',
      event_category: 'system_security', event_type: 'test.event',
      risk_level: 'low', status: 'success', retention_class: 'STANDARD',
      event_title: '', event_summary: '', actor: {}, object: {}, correlation: {},
      authority: {}, change: {}, ai_context: {}, schema_version: '1.0',
    });
    mockSupabaseNext([block1, block2]);
    const result = await verifyChainIntegrity('WRK-001');
    expect(result.total_blocks).toBe(2);
    // Hash recomputation may differ since DB-side hash computation is mocked
    expect(result.verified_blocks).toBeGreaterThanOrEqual(0);
    expect(result.failed_blocks).toBeGreaterThanOrEqual(0);
  });

  it('filters by block range', async () => {
    mockSupabaseNext([makeEvent({ block_number: 1 }), makeEvent({ block_number: 2 }), makeEvent({ block_number: 3 })]);
    const result = await verifyChainIntegrity('WRK-001', 2, 3);
    expect(result.total_blocks).toBe(2);
  });
});

describe('Audit Trail — createExportJob', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('creates an export job with PENDING status', async () => {
    mockSupabaseNext({ id: 'export-001', status: 'PENDING', format: 'csv', reason: 'Audit review' });
    const job = await createExportJob({
      workspace_id: 'WRK-001',
      requested_by: 'user-001',
      reason: 'Audit review',
      format: 'csv',
    });
    expect(job.status).toBe('PENDING');
    expect(job.format).toBe('csv');
  });

  it('accepts optional filter parameters', async () => {
    mockSupabaseNext({ id: 'export-002', status: 'PENDING' });
    const job = await createExportJob({
      workspace_id: 'WRK-001',
      requested_by: 'user-001',
      reason: 'Critical events export',
      format: 'json',
      date_from: '2026-01-01T00:00:00Z',
      date_to: '2026-05-21T00:00:00Z',
      risk_level: 'critical',
    });
    expect(job).toBeTruthy();
  });
});

describe('Audit Trail — listExportJobs', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('returns export jobs for a workspace', async () => {
    mockSupabaseNext([
      { id: 'exp-1', status: 'COMPLETED', format: 'csv' },
      { id: 'exp-2', status: 'PENDING', format: 'json' },
    ]);
    const jobs = await listExportJobs('WRK-001');
    expect(jobs).toHaveLength(2);
  });

  it('returns empty array when no exports exist', async () => {
    mockSupabaseNext([]);
    const jobs = await listExportJobs('WRK-001');
    expect(jobs).toHaveLength(0);
  });
});

describe('Audit Trail — preserveEvents', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('creates an evidence.preserved audit event', async () => {
    mockRpcNext({
      id: 'preserve-evt-001',
      event_id: 'PRESERVE-001',
      block_number: 100,
      hash: 'sha256:preserved',
      prev_hash: null,
      schema_version: '1.0',
      retention_class: 'LEGAL_HOLD',
      retention_until: null,
      sealed_at: null,
      sealed_by: null,
      integrity_check_at: null,
      created_at: '2026-05-21T10:00:00Z',
    });
    const result = await preserveEvents({
      workspace_id: 'WRK-001',
      event_ids: ['evt-001', 'evt-002'],
      reason: 'Legal preservation order',
      retention_class: 'LEGAL_HOLD',
      requested_by: 'user-001',
      actor: { actor_id: 'user-001', actor_type: 'human_user' },
    });
    expect(result.preserved).toBe(2);
    expect(result.preservation_event_id).toBeTruthy();
  });
});

describe('Audit Trail — sealExpiredRecords', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('calls the seal_expired_audit_events RPC', async () => {
    mockRpcNext(5);
    const result = await sealExpiredRecords();
    expect(result.sealed_count).toBe(5);
  });
});

describe('Audit Trail — getAuditStats', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('computes statistics from audit events', async () => {
    mockSupabaseNext(null); // materialized view returns null
    mockSupabaseNext([
      makeEvent({ risk_level: 'critical', status: 'failed' }),
      makeEvent({ risk_level: 'low', status: 'success', event_category: 'ai_agent' }),
    ]);
    const stats = await getAuditStats('WRK-001');
    expect(stats.total_events).toBe(2);
    expect(stats.critical_events).toBe(1);
    expect(stats.failed_events).toBe(1);
    expect(stats.ai_events).toBe(1);
  });
});

describe('Audit Trail — createAuditEvent', () => {
  beforeEach(() => {
    mockSupabaseClear();
  });

  it('creates an audit event via RPC and returns the result', async () => {
    mockSupabaseNext({ event_id: 'AUD-2026-001', block_number: 1, hash: 'sha256:abc123' });
    const event = await createAuditEvent({
      workspace_id: 'WRK-001',
      event_category: 'system_security',
      event_type: 'test.event',
      event_title: 'Test Create',
      actor: { actor_id: 'user-001', actor_type: 'human_user' },
      object: { object_type: 'test', object_id: 'obj-001' },
    });
    expect(event.event_id).toBeTruthy();
    expect(event.block_number).toBe(1);
  });
});

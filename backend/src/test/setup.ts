import { vi } from 'vitest';

// ─── Mock supabase chain ─────────────────────────────────────────────────────
// All mocks defined inside vi.hoisted so they exist before vi.mock factories run

const hoisted = vi.hoisted(() => {
  const dataQueue: Array<{ data: any; error: any; count?: number }> = [];
  const rpcQueue: Array<{ data: any; error: any }> = [];

  const mqb = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    then: vi.fn(function (this: any, resolve: (value: { data: any; error: any; count?: number }) => void) {
      const next = dataQueue.shift() || { data: null, error: null, count: 0 };
      resolve(next);
    }),
  };
  const mf = vi.fn(() => mqb);

  function next(data: any, error: any = null, count?: number) {
    dataQueue.push({ data, error, count });
  }

  function clear() {
    dataQueue.length = 0;
    rpcQueue.length = 0;
  }

  function rpcNext(data: any, error: any = null) {
    rpcQueue.push({ data, error });
  }

  const rpcMock = vi.fn(() => {
    const next = rpcQueue.shift() || { data: null, error: null };
    return Promise.resolve(next);
  });

  return { mqb, mf, next, clear, rpcNext, rpcMock };
});

vi.mock('../shared/supabase', () => ({
  supabaseAdmin: { from: hoisted.mf, rpc: hoisted.rpcMock },
}));

// ─── Mock audit services ─────────────────────────────────────────────────────

vi.mock('../services/auditTrail.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/auditTrail.service')>();
  return {
    ...actual,
    createAuditEvent: vi.fn().mockResolvedValue({ event_id: 'test-event-id-12345', block_number: 1 }),
  };
});

vi.mock('../services/auditTrailStreaming.service', () => ({
  createSubscription: vi.fn(),
  listSubscriptions: vi.fn(),
  deliverToSubscription: vi.fn().mockResolvedValue(undefined),
}));

const { mqb: mockQueryBuilder, mf: mockFrom, next: mockSupabaseNext, clear: mockSupabaseClear, rpcNext: mockRpcNext } = hoisted;
export { mockQueryBuilder, mockFrom, mockSupabaseNext, mockSupabaseClear, mockRpcNext };

// ─── Test data factories ─────────────────────────────────────────────────────

export function createMockCase(overrides: Record<string, any> = {}) {
  return {
    id: 'test-case-uuid',
    case_id: 'CASE-TEST001',
    tenant_id: 'TEN-001',
    workspace_id: 'WRK-001',
    case_type: 'security_incident',
    title: 'Test Security Incident',
    summary: 'A test case for QA validation',
    severity: 'high',
    status: 'new',
    owner_user_id: null,
    source: 'manual',
    source_event_ids: [],
    related_object_ids: [],
    legal_hold_active: false,
    privilege_flag: false,
    retention_class: 'standard',
    sla_due_at: null,
    closed_at: null,
    closure: null,
    schema_version: '1.0',
    data_residency: 'auto',
    chain_hash: null,
    prev_hash: null,
    block_number: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    participants: [],
    ...overrides,
  };
}

export function createMockEvidence(overrides: Record<string, any> = {}) {
  return {
    id: 'test-evidence-uuid',
    case_id: 'test-case-uuid',
    source_type: 'audit_event',
    source_id: 'evt-001',
    relevance: 'primary',
    vault_status: 'not_preserved',
    hash: 'abc123hash',
    chain_block_number: null,
    added_by: 'user-001',
    added_reason: 'QA test evidence',
    pin_reason: null,
    pinned_at: null,
    is_pinned: false,
    removed_at: null,
    removal_reason: null,
    metadata: {},
    added_at: '2026-01-01T00:00:00Z',
    privilege_flag: false,
    privileged_by: null,
    privileged_at: null,
    ...overrides,
  };
}

export function createMockAction(overrides: Record<string, any> = {}) {
  return {
    id: 'test-action-uuid',
    case_id: 'test-case-uuid',
    action_type: 'case_created',
    actor_id: 'user-001',
    reason: 'QA test action',
    before_state: null,
    after_state: { status: 'new' },
    audit_event_id: 'audit-001',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockNote(overrides: Record<string, any> = {}) {
  return {
    id: 'test-note-uuid',
    case_id: 'test-case-uuid',
    note_class: 'internal_investigation',
    content: 'Test investigation note',
    author_id: 'user-001',
    is_edited: false,
    original_content: null,
    edited_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockTask(overrides: Record<string, any> = {}) {
  return {
    id: 'test-task-uuid',
    case_id: 'test-case-uuid',
    title: 'Review evidence',
    description: null,
    owner_id: 'user-001',
    status: 'open',
    due_at: null,
    evidence_link: null,
    completion_proof: null,
    created_at: '2026-01-01T00:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

export function createMockExport(overrides: Record<string, any> = {}) {
  return {
    id: 'test-export-uuid',
    case_id: 'test-case-uuid',
    export_type: 'internal_investigation',
    package_type: 'internal_investigation',
    format: 'json',
    redaction_profile: 'standard',
    status: 'draft',
    reason: 'QA test export',
    requested_by: 'user-001',
    approved_by: null,
    rejected_reason: null,
    scope: {},
    manifest: null,
    redaction_log: [],
    hash: null,
    file_size: null,
    file_path: null,
    delivery_method: null,
    delivered_at: null,
    expires_at: null,
    generated_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockSubscription(overrides: Record<string, any> = {}) {
  return {
    id: 'test-sub-uuid',
    workspace_id: 'WRK-001',
    name: 'Test SIEM',
    subscription_type: 'siem',
    endpoint_url: 'https://siem.example.com/webhook',
    secret: 'test-secret',
    event_filters: {},
    status: 'ACTIVE',
    created_by: 'user-001',
    created_at: '2026-01-01T00:00:00Z',
    last_delivery_at: null,
    delivery_count: 0,
    ...overrides,
  };
}

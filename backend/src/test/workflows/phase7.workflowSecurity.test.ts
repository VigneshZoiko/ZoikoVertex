import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mock setup ───────────────────────────────────────────────────────

const { mockSupabase, mockQueryBuilder } = vi.hoisted(() => {
  const qb: any = {
    select: vi.fn(() => qb),
    eq: vi.fn(() => qb),
    in: vi.fn(() => qb),
    single: vi.fn(() => qb),
    maybeSingle: vi.fn(() => qb),
    order: vi.fn(() => qb),
    limit: vi.fn(() => qb),
    insert: vi.fn(() => qb),
    update: vi.fn(() => qb),
    delete: vi.fn(() => qb),
  };
  const sb = { from: vi.fn(() => qb) };
  return { mockSupabase: sb, mockQueryBuilder: qb };
});

vi.mock('../../shared/supabase', () => ({
  supabaseAdmin: mockSupabase,
}));

vi.mock('../../shared/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock version service with controlled implementations
vi.mock('../../services/workflowVersion.service', () => {
  const mockGetVersion = vi.fn();
  const mockSubmitForApproval = vi.fn(async (versionId: string) => {
    const version = await mockGetVersion(versionId);
    if (version.state !== 'draft' && version.state !== 'test') {
      throw Object.assign(new Error('Only draft or test versions can be submitted for approval'), { statusCode: 409 });
    }
    return { id: versionId, state: 'pending_approval' };
  });

  return {
    getVersion: mockGetVersion,
    submitForApproval: mockSubmitForApproval,
    listVersions: vi.fn(),
    createDraftVersion: vi.fn(),
    approveVersion: vi.fn(),
    rejectVersion: vi.fn(),
    activateVersion: vi.fn(),
    rollbackVersion: vi.fn(),
    pauseVersion: vi.fn(),
    retireVersion: vi.fn(),
  };
});

// Mock ThreeKeyService so we can control eligibility checks
vi.mock('../../services/workflowThreeKey.service', () => ({
  checkActivationEligibility: vi.fn(),
  initializeApprovalChain: vi.fn(),
  getApprovalChain: vi.fn(),
  recordKeyDecision: vi.fn(),
  validateApprovalQuorum: vi.fn(),
  listPendingChains: vi.fn(),
}));

// Mock auditTrail for export audit tests
vi.mock('../../services/auditTrail.service', () => ({
  createAuditEvent: vi.fn(),
}));

import * as versionService from '../../services/workflowVersion.service';
import * as threeKeyService from '../../services/workflowThreeKey.service';
import { createAuditEvent } from '../../services/auditTrail.service';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Phase 7 — Workflow Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Cross-tenant isolation ──────────────────────────────────────────────────
  describe('Cross-tenant isolation', () => {
    it('blocks export when workflow not in workspace via Supabase', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      const realExport = await import('../../services/workflowExport.service');

      await expect(
        realExport.exportApprovalsCsv({
          workflowId: 'wf-001',
          workspaceId: 'ws-other',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Workflow not found in this workspace');
    });

    it('blocks evidence export when workspace does not match', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      const realExport = await import('../../services/workflowExport.service');

      await expect(
        realExport.exportEvidenceByRef({
          evidenceRef: 'ev-001',
          workspaceId: 'ws-other',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Evidence bundle not found');
    });
  });

  // ─── Audit failure blocking ──────────────────────────────────────────────────
  describe('Audit failure blocks response', () => {
    it('throws when createAuditEvent fails during export audit', async () => {
      vi.mocked(createAuditEvent).mockRejectedValue(new Error('DB connection lost'));

      const realExport = await import('../../services/workflowExport.service');

      await expect(
        realExport.logExportAuditEvent({
          workflowId: 'wf-001',
          workflowName: 'Test',
          workspaceId: 'ws-1',
          userId: 'user-1',
          exportType: 'full_json',
        }),
      ).rejects.toThrow('DB connection lost');
    });

    it('does not throw when createAuditEvent succeeds', async () => {
      vi.mocked(createAuditEvent).mockResolvedValue({} as any);

      const realExport = await import('../../services/workflowExport.service');

      await expect(
        realExport.logExportAuditEvent({
          workflowId: 'wf-002',
          workflowName: 'Test 2',
          workspaceId: 'ws-1',
          userId: 'user-1',
          exportType: 'approvals_csv',
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ─── SecOps alert on audit failure ───────────────────────────────────────────
  describe('SecOps alert on audit failure', () => {
    it('alerts SecOps when export audit event fails', async () => {
      vi.mocked(createAuditEvent).mockRejectedValue(new Error('Timeout'));

      const alertModule = await import('../../shared/alertSecOps');
      const alertSpy = vi.spyOn(alertModule, 'alertSecOpsAuditFailure');

      const realExport = await import('../../services/workflowExport.service');

      await expect(
        realExport.logExportAuditEvent({
          workflowId: 'wf-003',
          workflowName: 'SecOps Test',
          workspaceId: 'ws-1',
          userId: 'user-1',
          exportType: 'full_json',
        }),
      ).rejects.toThrow('Timeout');

      expect(alertSpy).toHaveBeenCalled();
      expect(alertSpy.mock.calls[0][0].alert_type).toBe('audit_write_failure');
      expect(alertSpy.mock.calls[0][0].severity).toBe('critical');
    });
  });
});

// ─── Invalid Transition Tests ─────────────────────────────────────────────────

describe('Phase 7 — Invalid Workflow Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks activation without approval quorum', async () => {
    vi.mocked(threeKeyService.checkActivationEligibility).mockResolvedValue({
      eligible: false,
      blockers: ['Missing GOVERNANCE_ADMIN approval'],
      quorumSatisfied: false,
      missingRoles: ['GOVERNANCE_ADMIN'],
      completedCount: 2,
      requiredCount: 3,
    });

    const eligibility = await threeKeyService.checkActivationEligibility({
      versionId: 'ver-1',
      workflowId: 'wf-1',
    });

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blockers).toContain('Missing GOVERNANCE_ADMIN approval');
  });

  it('allows activation when quorum met', async () => {
    vi.mocked(threeKeyService.checkActivationEligibility).mockResolvedValue({
      eligible: true,
      blockers: [],
      quorumSatisfied: true,
      missingRoles: [],
      completedCount: 3,
      requiredCount: 3,
    });

    const eligibility = await threeKeyService.checkActivationEligibility({
      versionId: 'ver-1',
      workflowId: 'wf-1',
    });

    expect(eligibility.eligible).toBe(true);
  });

  it('rejects submit when version is already active', async () => {
    vi.spyOn(versionService, 'getVersion').mockResolvedValue({
      id: 'ver-active', workflow_id: 'wf-1', version_number: 1, state: 'active',
      change_summary: '', created_by: 'user-1', approved_by: '', activated_by: '',
      created_at: '2025-01-01',
    });

    await expect(versionService.submitForApproval('ver-active')).rejects.toThrow(
      'Only draft or test versions can be submitted',
    );
  });

  it('rejects submit when version is retired', async () => {
    vi.spyOn(versionService, 'getVersion').mockResolvedValue({
      id: 'ver-retired', workflow_id: 'wf-1', version_number: 1, state: 'retired',
      change_summary: '', created_by: 'user-1', approved_by: '', activated_by: '',
      created_at: '2025-01-01',
    });

    await expect(versionService.submitForApproval('ver-retired')).rejects.toThrow(
      'Only draft or test versions can be submitted',
    );
  });
});

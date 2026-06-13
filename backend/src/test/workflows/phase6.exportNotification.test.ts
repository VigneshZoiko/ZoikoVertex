 
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock supabaseAdmin (must use vi.hoisted since vi.mock is hoisted to top) ─

const { mockSupabase, mockQueryBuilder } = vi.hoisted(() => {
  const qb: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  // Self-chaining: default return `this`
  for (const key of Object.keys(qb)) {
    qb[key].mockReturnValue(qb);
  }

  const sb = {
    from: vi.fn(() => qb),
    channel: vi.fn(),
  };

  return { mockSupabase: sb, mockQueryBuilder: qb };
});

vi.mock('../../shared/supabase', () => ({
  supabaseAdmin: mockSupabase,
}));

// ─── Mock auditTrail service ────────────────────────────────────────────────

vi.mock('../../services/auditTrail.service', () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: 'audit-123' }),
}));

// ─── Mock uuid ──────────────────────────────────────────────────────────────

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid-12345',
}));

// ─── Mock crypto ────────────────────────────────────────────────────────────

vi.mock('crypto', () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mock-sha256-hash'),
      })),
    })),
  },
  createHash: vi.fn(() => ({
    update: vi.fn(() => ({
      digest: vi.fn(() => 'mock-sha256-hash'),
    })),
  })),
}));

// ─── Import modules after mocks ─────────────────────────────────────────────

import * as exportService from '../../services/workflowExport.service';
import * as notificationService from '../../services/workflowNotification.service';
import * as evidenceService from '../../services/workflowEvidence.service';

// ─── Reset mocks before each test ───────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default: return empty results for all queries
  mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.neq.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.in.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.range.mockReturnValue(mockQueryBuilder);
  mockSupabase.from.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
  mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Phase 6 — Workflow Export Service', () => {
  describe('exportWorkflowFull', () => {
    it('throws 404 when workflow not in workspace', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      await expect(
        exportService.exportWorkflowFull({
          workflowId: 'wf-001',
          workspaceId: 'ws-other',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Workflow not found in this workspace');
    });

    it('returns full export payload with evidence_ref and hash', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 'wf-001', workspace_id: 'ws-1' },
        error: null,
      });
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'wf-001', name: 'Test Workflow', status: 'active', risk_level: 'medium', created_at: '2025-01-01', updated_at: '2025-06-01' },
        error: null,
      });

      // Versions
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_versions') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'ver-1', version_number: 1, state: 'approved', created_at: '2025-01-15', created_by: 'user-1' },
                    { id: 'ver-2', version_number: 2, state: 'active', created_at: '2025-05-01', created_by: 'user-1' },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'workflow_evidence_bundles') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'ev-1', evidence_ref: 'abc123def456', canonical_hash: 'mock-sha256-hash', bundle_type: 'run', actor_name: 'Alice', sealed_at: '2025-06-01', created_at: '2025-06-01', policy_results: [{ step_name: 'policy-1', status: 'passed' }], warnings: ['warning-1'], blocks: [], errors: [], workspace_id: 'ws-1', workflow_id: 'wf-001', version_id: 'ver-2', output_snapshot: {}, input_snapshot: {}, dependency_results: [], approval_chain_state: {} },
                    { id: 'ev-2', evidence_ref: 'xyz789uvw012', canonical_hash: 'mock-sha256-hash-2', bundle_type: 'simulation', actor_name: 'Bob', sealed_at: '2025-05-15', created_at: '2025-05-15', policy_results: [], warnings: [], blocks: ['block-1'], errors: ['error-1'], workspace_id: 'ws-1', workflow_id: 'wf-001', version_id: 'ver-1', output_snapshot: {}, input_snapshot: {}, dependency_results: [], approval_chain_state: {} },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'workflow_approval_chains') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              in: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({ data: [{ id: 'chain-1', version_id: 'ver-2', status: 'approved', workflow_approval_keys: [{ approval_sequence: 1, required_role: 'ADMIN', decision: 'approved' }] }], error: null }),
              })),
            })),
          };
        }
        return mockQueryBuilder;
      });

      const result = await exportService.exportWorkflowFull({
        workflowId: 'wf-001',
        workspaceId: 'ws-1',
        userId: 'user-1',
        userEmail: 'admin@test.com',
        reason: 'audit',
      });

      expect(result).toBeDefined();
      expect(result.exported_by).toBe('admin@test.com');
      expect(result.export_reason).toBe('audit');
      expect(result.workflow.name).toBe('Test Workflow');
      expect(result.workflow.id).toBe('wf-001');

      // evidence_refs and hash are present
      expect(result.metrics.evidence_refs).toContain('abc123def456');
      expect(result.metrics.evidence_refs).toContain('xyz789uvw012');
      expect(result.metrics.total_evidence_bundles).toBe(2);

      // approval chain included
      expect(result.approval_chains).toHaveLength(1);
      expect(result.approval_chains[0].status).toBe('approved');

      // simulation context (empty in mock but present)
      expect(result.simulation_results).toBeDefined();

      // dependency results present
      expect(result.dependency_results).toBeDefined();

      // policy results flattened from evidence bundles
      expect(result.policy_results.length).toBeGreaterThanOrEqual(1);

      // warnings/blocks/errors aggregated
      expect(result.warnings).toContain('[abc123def456] warning-1');
      expect(result.blocks).toContain('[xyz789uvw012] block-1');
      expect(result.errors).toContain('[xyz789uvw012] error-1');

      // timestamps
      expect(result.exported_at).toBeDefined();
    });

    it('blocks cross-workspace access', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      await expect(
        exportService.exportWorkflowFull({
          workflowId: 'wf-001',
          workspaceId: 'ws-attacker',
          userId: 'user-2',
        }),
      ).rejects.toThrow('Workflow not found in this workspace');
    });
  });

  describe('exportApprovalsCsv', () => {
    it('returns CSV string with approval data', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 'wf-001', workspace_id: 'ws-1' },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_versions') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'ver-1', version_number: 1 }],
                error: null,
              }),
            })),
          };
        }
        if (table === 'workflow_approval_chains') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              in: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'chain-1',
                    version_id: 'ver-1',
                    status: 'approved',
                    created_at: '2025-06-01',
                    workflow_approval_keys: [
                      { approval_sequence: 1, required_role: 'ADMIN', approver_name: 'Alice', decision: 'approved', decided_at: '2025-06-02', evidence_ref: 'ev123', reason: '' },
                      { approval_sequence: 2, required_role: 'MANAGER', approver_name: 'Bob', decision: 'approved', decided_at: '2025-06-03', evidence_ref: 'ev456', reason: '' },
                    ],
                  }],
                  error: null,
                }),
              })),
            })),
          };
        }
        return mockQueryBuilder;
      });

      const csv = await exportService.exportApprovalsCsv({
        workflowId: 'wf-001',
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(csv).toBeTruthy();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('chain_id,version_id,status');
      expect(csv).toContain('ADMIN');
      expect(csv).toContain('approved');
      expect(csv).toContain('Alice');
      expect(csv).toContain('Bob');
    });

    it('returns empty string for no versions', async () => {
      // Reset all mocks
      vi.clearAllMocks();
      // Re-self-chain
      for (const key of Object.keys(mockQueryBuilder)) {
        mockQueryBuilder[key].mockReset();
        mockQueryBuilder[key].mockReturnValue(mockQueryBuilder);
      }

      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 'wf-001', workspace_id: 'ws-1' },
        error: null,
      });

      mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);

      // For workflow_versions table: return empty array
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_versions') {
          const qb = { ...mockQueryBuilder };
          qb.select = vi.fn(() => {
            const qb2 = { ...qb };
            qb2.eq = vi.fn(() => {
              const qb3 = { ...qb2 };
              qb3.order = vi.fn().mockResolvedValue({ data: [], error: null });
              return qb3;
            });
            return qb2;
          });
          return qb;
        }
        return mockQueryBuilder;
      });

      const csv = await exportService.exportApprovalsCsv({
        workflowId: 'wf-001',
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(csv).toBe('');
    });
  });

  describe('exportEvidenceByRef', () => {
    it('throws 404 when evidence not found', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      // getEvidenceByRef returns null
      vi.spyOn(evidenceService, 'getEvidenceByRef').mockResolvedValue(null as any);

      await expect(
        exportService.exportEvidenceByRef({
          evidenceRef: 'nonexistent',
          workspaceId: 'ws-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Evidence bundle not found');
    });

    it('throws when evidence workspace does not match', async () => {
      vi.spyOn(evidenceService, 'getEvidenceByRef').mockResolvedValue({
        id: 'ev-1',
        workspace_id: 'ws-other',
        workflow_id: 'wf-001',
        version_id: 'ver-1',
        evidence_ref: 'abc123',
        canonical_hash: 'hash',
        bundle_type: 'run',
        created_at: '',
        sealed_at: null,
        input_snapshot: {},
        output_snapshot: {},
        policy_results: [],
        dependency_results: [],
        approval_chain_state: {},
        errors: [],
        warnings: [],
        blocks: [],
        hash_algo: 'sha-256',
        actor_id: null,
        actor_name: null,
      } as any);

      await expect(
        exportService.exportEvidenceByRef({
          evidenceRef: 'abc123',
          workspaceId: 'ws-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Evidence bundle not found in this workspace');
    });
  });

  describe('buildPdfReadyPayload', () => {
    it('produces structured PDF-ready payload', () => {
      const mockExport: any = {
        exported_at: '2025-06-01T00:00:00Z',
        exported_by: 'admin',
        export_reason: 'audit',
        workflow: { id: 'wf-1', name: 'Test', status: 'active', risk_level: 'medium', created_at: null, updated_at: null },
        versions: [{ id: 'v1', version_number: 1, state: 'active', created_at: '2025-01-01', created_by: 'user' }],
        evidence_bundles: [{ evidence_ref: 'abc', bundle_type: 'run', actor_name: 'Alice', sealed_at: null, canonical_hash: 'hash', created_at: '2025-01-01' }],
        approval_chains: [],
        simulation_results: [],
        dependency_results: [{ dependency_type: 'agent', dependency_name: 'Agent-1', dependency_id_ref: 'ag-1', health: 'healthy', impact_level: 'low', blocking: false }],
        policy_results: [],
        warnings: [],
        blocks: [],
        errors: [],
        metrics: { total_versions: 1, total_evidence_bundles: 1, total_simulations: 0, total_approvals: 0, total_dependencies: 1, total_policy_checks: 0, evidence_refs: ['abc'] },
      };

      const result = exportService.buildPdfReadyPayload(mockExport);

      expect(result.title).toContain('Test');
      expect(result.subtitle).toContain('wf-1');
      expect(result.generated_at).toBe('2025-06-01T00:00:00Z');
      expect(result.generated_by).toBe('admin');
      expect(result.sections.length).toBeGreaterThanOrEqual(4);
      expect(result.sections[0].heading).toBe('Workflow Overview');
      expect(result.sections[0].type).toBe('key_value');
    });
  });

  describe('exportRuntimeTimelineCsv', () => {
    it('throws 404 when workflow not in workspace', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

      await expect(
        exportService.exportRuntimeTimelineCsv({
          workflowId: 'wf-001',
          workspaceId: 'ws-other',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Workflow not found in this workspace');
    });

    it('returns CSV with runtime timeline data', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 'wf-001', workspace_id: 'ws-1' },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_versions') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'ver-1', version_number: 1 }],
                error: null,
              }),
            })),
          };
        }
        if (table === 'workflow_instances') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'inst-1', version_id: 'ver-1', status: 'completed', started_at: '2025-06-01T10:00:00Z', completed_at: '2025-06-01T10:05:00Z', trigger_type: 'manual', trigger_source: 'user' },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'workflow_step_runs') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              in: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [
                    { instance_id: 'inst-1', step_name: 'policy-check', step_type: 'policy_check', status: 'completed', started_at: '2025-06-01T10:01:00Z', completed_at: '2025-06-01T10:02:00Z', actor_type: 'system', actor_id: 'sys', error_code: '', reason_code: '' },
                    { instance_id: 'inst-1', step_name: 'approval-gate', step_type: 'approval_gate', status: 'completed', started_at: '2025-06-01T10:02:00Z', completed_at: '2025-06-01T10:04:00Z', actor_type: 'human_user', actor_id: 'user-1', error_code: '', reason_code: '' },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        return mockQueryBuilder;
      });

      const csv = await exportService.exportRuntimeTimelineCsv({
        workflowId: 'wf-001',
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(csv).toBeTruthy();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('instance_id');
      expect(csv).toContain('step_name');
      expect(csv).toContain('policy-check');
      expect(csv).toContain('approval-gate');
      expect(csv).toContain('completed');
    });

    it('returns CSV with instance-only row when no step runs', async () => {
      mockQueryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 'wf-001', workspace_id: 'ws-1' },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workflow_versions') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'ver-1', version_number: 1 }],
                error: null,
              }),
            })),
          };
        }
        if (table === 'workflow_instances') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              eq: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'inst-2', version_id: 'ver-1', status: 'running', started_at: '2025-06-01T10:00:00Z', completed_at: null, trigger_type: 'api', trigger_source: 'webhook' },
                  ],
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'workflow_step_runs') {
          return {
            ...mockQueryBuilder,
            select: vi.fn(() => ({
              ...mockQueryBuilder,
              in: vi.fn(() => ({
                ...mockQueryBuilder,
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          };
        }
        return mockQueryBuilder;
      });

      const csv = await exportService.exportRuntimeTimelineCsv({
        workflowId: 'wf-001',
        workspaceId: 'ws-1',
        userId: 'user-1',
      });

      expect(csv).toContain('inst-2');
      expect(csv).toContain('running');
    });
  });

  describe('logExportAuditEvent', () => {
    it('creates an audit event for export successfully', async () => {
      await expect(
        exportService.logExportAuditEvent({
          workflowId: 'wf-001',
          workflowName: 'Test Workflow',
          workspaceId: 'ws-1',
          userId: 'user-1',
          userEmail: 'admin@test.com',
          exportType: 'full_json',
          reason: 'audit',
        }),
      ).resolves.toBeUndefined();
    });

    it('throws when createAuditEvent fails', async () => {
      // Override the mock to reject for this test
      const { createAuditEvent } = await import('../../services/auditTrail.service');
      vi.mocked(createAuditEvent).mockRejectedValueOnce(new Error('Audit write failed'));

      await expect(
        exportService.logExportAuditEvent({
          workflowId: 'wf-001',
          workflowName: 'Test Workflow',
          workspaceId: 'ws-1',
          userId: 'user-1',
          exportType: 'approvals_csv',
        }),
      ).rejects.toThrow('Audit write failed');
    });
  });
});

describe('Phase 6 — Workflow Notification Service', () => {
  describe('createInAppNotification', () => {
    it('creates a notification row for a user', async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: null }); // not used
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        ...mockQueryBuilder,
        insert: insertSpy,
      });

      const id = await notificationService.createInAppNotification({
        eventType: 'approval_pending',
        workflowId: 'wf-001',
        workflowName: 'Test Workflow',
        versionId: 'ver-1',
        userId: 'user-1',
        metadata: { required_roles: ['ADMIN', 'MANAGER'] },
      });

      expect(id).toBe('mock-uuid-12345');
      expect(insertSpy).toHaveBeenCalled();
      const insertArg = insertSpy.mock.calls[0][0];
      expect(insertArg.user_id).toBe('user-1');
      expect(insertArg.title).toContain('Approval Required');
      expect(insertArg.type).toBe('workflow_approval_pending');
      expect(insertArg.metadata.event_type).toBe('approval_pending');
      expect(insertArg.metadata.required_roles).toEqual(['ADMIN', 'MANAGER']);
    });
  });

  describe('createWorkflowNotification', () => {
    it('returns events with correct payload shape', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        ...mockQueryBuilder,
        insert: insertSpy,
      });

      const events = await notificationService.createWorkflowNotification({
        eventType: 'dependency_critical_failure',
        workflowId: 'wf-001',
        workflowName: 'Test Workflow',
        versionId: 'ver-1',
        channels: ['in_app', 'email', 'slack'],
        recipientUserIds: ['user-1', 'user-2'],
        metadata: { failed_deps: ['Agent-Prod-1'] },
      });

      // 2 in-app + 1 email placeholder + 1 slack placeholder
      expect(events).toHaveLength(4);

      // In-app events delivered
      const inAppEvents = events.filter((e) => e.channel === 'in_app');
      expect(inAppEvents).toHaveLength(2);
      expect(inAppEvents[0].delivered).toBe(true);
      expect(inAppEvents[0].severity).toBe('critical');
      expect(inAppEvents[0].title).toContain('Critical Dependency Failure');

      // Email placeholder
      const emailEvents = events.filter((e) => e.channel === 'email');
      expect(emailEvents).toHaveLength(1);
      expect(emailEvents[0].delivered).toBe(false);
      expect(emailEvents[0].delivery_error).toContain('Email provider not integrated');

      // Slack placeholder
      const slackEvents = events.filter((e) => e.channel === 'slack');
      expect(slackEvents).toHaveLength(1);
      expect(slackEvents[0].delivered).toBe(false);
    });
  });

  describe('Event type variants', () => {
    it('handles all event types', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        ...mockQueryBuilder,
        insert: insertSpy,
      });

      const types: Array<{ type: notificationService.WorkflowEventType; expectTitle: string; expectSeverity: string }> = [
        { type: 'approval_pending', expectTitle: 'Approval Required', expectSeverity: 'info' },
        { type: 'approval_completed', expectTitle: 'Approval Complete', expectSeverity: 'info' },
        { type: 'simulation_blocked', expectTitle: 'Simulation Blocked', expectSeverity: 'warning' },
        { type: 'dependency_critical_failure', expectTitle: 'Critical Dependency Failure', expectSeverity: 'critical' },
        { type: 'workflow_activated', expectTitle: 'Workflow Activated', expectSeverity: 'info' },
        { type: 'workflow_paused', expectTitle: 'Workflow Paused', expectSeverity: 'info' },
        { type: 'workflow_retired', expectTitle: 'Workflow Retired', expectSeverity: 'info' },
        { type: 'workflow_failed', expectTitle: 'Workflow Failed', expectSeverity: 'critical' },
        { type: 'sla_breach', expectTitle: 'SLA Breach', expectSeverity: 'critical' },
      ];

      for (const t of types) {
        const events = await notificationService.createWorkflowNotification({
          eventType: t.type,
          workflowId: 'wf-001',
          workflowName: 'Test',
          channels: ['in_app'],
          recipientUserIds: ['user-1'],
        });

        const event = events[0];
        expect(event.title).toContain(t.expectTitle);
        expect(event.severity).toBe(t.expectSeverity);
      }
    });
  });
});

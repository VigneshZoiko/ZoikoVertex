import { beforeEach, describe, expect, it } from 'vitest';
import { mockFrom, mockQueryBuilder, mockSupabaseClear, mockSupabaseNext } from './setup';

import {
  getAgentRun,
  resumeRun,
  retryRun,
} from '../services/operationsRun.service';
import {
  exportEvidence,
  getRunEvidence,
} from '../services/operationsEvidence.service';

describe('Operations services', () => {
  beforeEach(() => {
    mockSupabaseClear();
    mockFrom.mockClear();
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as { mockClear: () => void }).mockClear();
      }
    });
  });

  it('scopes getAgentRun to the workspace', async () => {
    mockSupabaseNext({
      id: 'run-1',
      workspace_id: 'WRK-001',
      status: 'RUNNING',
    });

    const result = await getAgentRun('run-1', 'WRK-001');

    expect(result.id).toBe('run-1');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('workspace_id', 'WRK-001');
  });

  it('resumes a paused run back to its previous queued state', async () => {
    mockSupabaseNext({
      id: 'run-2',
      workspace_id: 'WRK-001',
      workflow_id: 'wf-1',
      status: 'PAUSED',
      previous_status: 'QUEUED',
      started_at: null,
    });
    mockSupabaseNext(null);
    mockSupabaseNext(null);

    const result = await resumeRun('WRK-001', 'run-2', 'Dependency cleared', 'user-1', 'ops@example.com');

    expect(result.previous_status).toBe('PAUSED');
    expect(result.new_status).toBe('QUEUED');
  });

  it('creates a linked retry attempt only for failed runs', async () => {
    mockSupabaseNext({
      id: 'run-3',
      workspace_id: 'WRK-001',
      tenant_id: 'TEN-001',
      brand_id: 'brand-1',
      environment: 'production',
      agent_id: 'agent-1',
      agent_name: 'Agent One',
      agent_type: 'CONTENT',
      agent_version: '1',
      workflow_id: 'wf-1',
      workflow_name: 'Workflow',
      workflow_version: '1',
      task_id: 'task-1',
      task_objective: 'Recover failed job',
      status: 'FAILED',
      severity: 'critical',
      owner_id: 'owner-1',
      owner_name: 'Owner',
      priority: 1,
      policy_result: 'BLOCKED',
      evidence_status: 'PARTIAL',
      retry_count: 1,
    });
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext(null);
    mockSupabaseNext(null);

    const result = await retryRun('WRK-001', 'run-3', 'Recover after provider outage', 'user-1', 'ops@example.com');

    expect(result.original_run_id).toBe('run-3');
    expect(result.new_run_id).toBeTruthy();
    expect(mockFrom.mock.calls.some(([table]) => table === 'run_events')).toBe(true);
  });

  it('exports evidence with workspace scoping and an immutable run event', async () => {
    mockSupabaseNext({
      id: 'bundle-1',
      workspace_id: 'WRK-001',
      run_id: 'run-4',
      status: 'LOCKED',
      locked_at: '2026-05-01T00:00:00Z',
      storage_ref: null,
    });
    mockSupabaseNext(null);
    mockSupabaseNext(null);

    const result = await exportEvidence({
      workspaceId: 'WRK-001',
      bundleId: 'bundle-1',
      exportedBy: 'user-1',
      exportedByName: 'auditor@example.com',
      exportReason: 'Audit request',
    });

    expect(result.id).toBe('bundle-1');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('workspace_id', 'WRK-001');
    expect(mockFrom.mock.calls.some(([table]) => table === 'run_events')).toBe(true);
  });

  it('fails closed when evidence bundle is outside the caller workspace', async () => {
    mockSupabaseNext(null);

    await expect(getRunEvidence('bundle-x', 'WRK-001')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

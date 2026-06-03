import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

// Spy/stub the reused services so we can assert non-blocking + violation-only audit.
vi.mock('../../modules/prompts/PromptEvidenceService', () => ({
  PromptEvidenceService: { record: vi.fn() },
}));
vi.mock('../../modules/prompts/PromptAuditService', () => ({
  PromptAuditService: { record: vi.fn() },
}));
vi.mock('../../modules/prompts/PromptDependencyService', () => ({
  PromptDependencyService: { getGraph: vi.fn() },
}));

import { setFixtures, resetFixtures, mockState } from '../helpers/supabaseMock';
import { PromptRuntimeTraceService } from '../../modules/prompts/PromptRuntimeTraceService';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import { PromptDependencyService } from '../../modules/prompts/PromptDependencyService';

const WS_A = 'ws-a';
const WS_B = 'ws-b';

const RECEIPT = { vault_item_uuid: 'vault-uuid-1', vault_item_id: 'EVI-1', evidence_hash: 'hash-1' };

function baseFixtures() {
  setFixtures({
    prompts: [{ id: 'p1', workspace_id: WS_A, tenant_id: WS_A, risk_tier: 'tier_2_medium' }],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
    prompt_runtime_traces: [],
  });
}

beforeEach(() => {
  resetFixtures();
  vi.clearAllMocks();
  (PromptEvidenceService.record as any).mockResolvedValue(RECEIPT);
  (PromptAuditService.record as any).mockResolvedValue(null);
  (PromptDependencyService.getGraph as any).mockResolvedValue({ summary: { total: 0, blocked: false } });
});

describe('PromptRuntimeTraceService.ingestRuntimeTrace — tenant validation', () => {
  it('MISSING_WORKSPACE when workspace_id is absent', async () => {
    baseFixtures();
    const r = await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: '', prompt_version_id: 'v1' });
    expect(r).toEqual({ ok: false, code: 'MISSING_WORKSPACE' });
  });

  it('VERSION_NOT_FOUND when the version does not exist', async () => {
    baseFixtures();
    const r = await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'nope' });
    expect(r).toEqual({ ok: false, code: 'VERSION_NOT_FOUND' });
  });

  it("TENANT_MISMATCH when the version's prompt is in another workspace", async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: WS_B, tenant_id: WS_B, risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
      prompt_runtime_traces: [],
    });
    const r = await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'v1' });
    expect(r).toEqual({ ok: false, code: 'TENANT_MISMATCH' });
  });
});

describe('PromptRuntimeTraceService.ingestRuntimeTrace — happy path & evidence', () => {
  it('stamps workspace/tenant from the prompt and persists the evidence receipt', async () => {
    baseFixtures();
    const r = await PromptRuntimeTraceService.ingestRuntimeTrace({
      workspace_id: WS_A, prompt_version_id: 'v1', model_id: 'gpt', execution_id: 'exec-1',
    });
    expect(r.ok).toBe(true);
    const trace = (r as any).trace;
    expect(trace.workspace_id).toBe(WS_A);
    expect(trace.tenant_id).toBe(WS_A);
    expect(trace.prompt_id).toBe('p1');
    expect(trace.evidence_id).toBe('vault-uuid-1');
    expect(trace.evidence_ref).toBe('EVI-1');
    expect(trace.evidence_hash).toBe('hash-1');
    expect(mockState.fixtures.prompt_runtime_traces).toHaveLength(1);
  });

  it('is NON-BLOCKING when evidence preservation returns null', async () => {
    baseFixtures();
    (PromptEvidenceService.record as any).mockResolvedValue(null);
    const r = await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'v1' });
    expect(r.ok).toBe(true);
    expect((r as any).trace.evidence_id).toBeNull();
    expect(mockState.fixtures.prompt_runtime_traces).toHaveLength(1);
  });

  it('is NON-BLOCKING when the dependency snapshot throws', async () => {
    baseFixtures();
    (PromptDependencyService.getGraph as any).mockRejectedValue(new Error('graph boom'));
    const r = await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'v1' });
    expect(r.ok).toBe(true);
    expect((r as any).trace.dependency_health_snapshot).toEqual({});
  });

  it('appends (does not overwrite) on repeated ingest — append-only behavior', async () => {
    baseFixtures();
    await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'v1' });
    await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'v1' });
    expect(mockState.fixtures.prompt_runtime_traces).toHaveLength(2);
  });
});

describe('PromptRuntimeTraceService.ingestRuntimeTrace — violation-only audit', () => {
  it('writes prompt.runtime.violation audit ONLY when violation=true', async () => {
    baseFixtures();
    await PromptRuntimeTraceService.ingestRuntimeTrace({ workspace_id: WS_A, prompt_version_id: 'v1', violation: false });
    expect(PromptAuditService.record).not.toHaveBeenCalled();

    await PromptRuntimeTraceService.ingestRuntimeTrace({
      workspace_id: WS_A, prompt_version_id: 'v1', violation: true, violation_reason: 'blocked claim',
    });
    expect(PromptAuditService.record).toHaveBeenCalledTimes(1);
    expect((PromptAuditService.record as any).mock.calls[0][0]).toMatchObject({ event_type: 'prompt.runtime.violation' });
  });
});

describe('PromptRuntimeTraceService — reads (tenant-scoped)', () => {
  beforeEach(() => {
    setFixtures({
      prompt_runtime_traces: [
        { id: 't1', workspace_id: WS_A, prompt_id: 'p1', prompt_version_id: 'v1', violation: false, created_at: '2026-01-01' },
        { id: 't2', workspace_id: WS_A, prompt_id: 'p1', prompt_version_id: 'v1', violation: true, created_at: '2026-01-02' },
        { id: 't3', workspace_id: WS_B, prompt_id: 'p1', prompt_version_id: 'v1', violation: true, created_at: '2026-01-03' },
      ],
    });
  });

  it('listByPrompt excludes cross-tenant rows and supports violation_only', async () => {
    const all = await PromptRuntimeTraceService.listByPrompt('p1', WS_A);
    expect(all.total).toBe(2);
    const violations = await PromptRuntimeTraceService.listByPrompt('p1', WS_A, { violation_only: true });
    expect(violations.total).toBe(1);
    expect(violations.records[0].id).toBe('t2');
  });

  it('listByVersion is workspace-scoped and paginates', async () => {
    const res = await PromptRuntimeTraceService.listByVersion('v1', WS_A, { limit: 1 });
    expect(res.total).toBe(2);
    expect(res.records).toHaveLength(1);
    expect(res.limit).toBe(1);
  });

  it('clamps limit to 200', async () => {
    const res = await PromptRuntimeTraceService.listByPrompt('p1', WS_A, { limit: 9999 });
    expect(res.limit).toBe(200);
  });
});

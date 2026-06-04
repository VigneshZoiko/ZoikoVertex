import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

vi.mock('../../modules/prompts/PromptRuntimeTraceService', () => ({
  PromptRuntimeTraceService: { ingestRuntimeTrace: vi.fn(), listByPrompt: vi.fn(), listByVersion: vi.fn() },
}));
vi.mock('../../modules/prompts/services/PromptIncidentService', () => ({
  PromptIncidentService: { openIncident: vi.fn(), updateIncident: vi.fn(), closeIncident: vi.fn(), getIncident: vi.fn(), listByPrompt: vi.fn() },
}));
vi.mock('../../modules/prompts/services/PromptEvidenceExportService', () => ({
  PromptEvidenceExportService: { createPromptEvidenceExport: vi.fn(), getPromptEvidenceExport: vi.fn() },
}));
vi.mock('../../modules/prompts/PromptService', () => ({
  PromptService: { requireById: vi.fn().mockResolvedValue({ id: 'p1' }) },
  PROMPT_STATUS: {}, PROMPT_RISK_TIER: {},
  normalizePromptStatus: (x: string) => x, normalizePromptRiskTier: (x: string) => x,
}));

import { PromptController } from '../../modules/prompts/promptController';
import { PromptRuntimeTraceService } from '../../modules/prompts/PromptRuntimeTraceService';
import { PromptIncidentService } from '../../modules/prompts/services/PromptIncidentService';
import { PromptEvidenceExportService } from '../../modules/prompts/services/PromptEvidenceExportService';

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  return res;
}
function mockReq(over: any = {}): any {
  return { user: { id: 'u1', workspace_id: 'ws-a', role: 'CREATOR' }, query: {}, params: {}, body: {}, headers: {}, ...over };
}
const gov = (over: any = {}) => mockReq({ user: { id: 'u1', workspace_id: 'ws-a', role: 'GOVERNANCE_ADMIN' }, ...over });
const serviceKey = (over: any = {}) => mockReq({ user: { id: 'svc', workspace_id: 'ws-a', api_key_id: 'k1', api_key_scopes: ['write:prompt_runtime_trace'] }, ...over });

beforeEach(() => vi.clearAllMocks());

describe('ingestRuntimeTrace — auth matrix + error mapping', () => {
  it('403 for a weak JWT (no service key, non-governance role)', async () => {
    const res = mockRes();
    await PromptController.ingestRuntimeTrace(mockReq({ body: { prompt_version_id: 'v1' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(PromptRuntimeTraceService.ingestRuntimeTrace).not.toHaveBeenCalled();
  });

  it('201 for a governance JWT on success', async () => {
    (PromptRuntimeTraceService.ingestRuntimeTrace as any).mockResolvedValue({ ok: true, trace: { id: 't1' } });
    const res = mockRes();
    await PromptController.ingestRuntimeTrace(gov({ body: { prompt_version_id: 'v1' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toMatchObject({ success: true, data: { id: 't1' } });
  });

  it('passes for a scoped service key', async () => {
    (PromptRuntimeTraceService.ingestRuntimeTrace as any).mockResolvedValue({ ok: true, trace: { id: 't2' } });
    const res = mockRes();
    await PromptController.ingestRuntimeTrace(serviceKey({ body: { prompt_version_id: 'v1' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([
    ['MISSING_WORKSPACE', 400],
    ['VERSION_NOT_FOUND', 404],
    ['TENANT_MISMATCH', 403],
  ])('maps %s → %d', async (code, status) => {
    (PromptRuntimeTraceService.ingestRuntimeTrace as any).mockResolvedValue({ ok: false, code });
    const res = mockRes();
    await PromptController.ingestRuntimeTrace(gov({ body: { prompt_version_id: 'v1' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(status);
  });
});

describe('incident handlers — role gating + error mapping', () => {
  it('createIncident 403 for non-governance role', async () => {
    const res = mockRes();
    await PromptController.createIncident(mockReq({ params: { id: 'p1' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(PromptIncidentService.openIncident).not.toHaveBeenCalled();
  });

  it('createIncident 201 for governance role on success', async () => {
    (PromptIncidentService.openIncident as any).mockResolvedValue({ ok: true, incident: { id: 'i1' } });
    const res = mockRes();
    await PromptController.createIncident(gov({ params: { id: 'p1' }, body: {} }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updateIncident maps INVALID_TRANSITION → 409', async () => {
    (PromptIncidentService.updateIncident as any).mockResolvedValue({ ok: false, code: 'INVALID_TRANSITION' });
    const res = mockRes();
    await PromptController.updateIncident(gov({ params: { incidentId: 'i1' }, body: { status: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('closeIncident maps ALREADY_CLOSED → 409', async () => {
    (PromptIncidentService.closeIncident as any).mockResolvedValue({ ok: false, code: 'ALREADY_CLOSED' });
    const res = mockRes();
    await PromptController.closeIncident(gov({ params: { incidentId: 'i1' }, body: {} }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('getIncident 404 when not found (read allowed for any authed user)', async () => {
    (PromptIncidentService.getIncident as any).mockResolvedValue(null);
    const res = mockRes();
    await PromptController.getIncident(mockReq({ params: { incidentId: 'ghost' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('listPromptIncidents returns contract for an authed user', async () => {
    (PromptIncidentService.listByPrompt as any).mockResolvedValue({ records: [], total: 0, limit: 50, offset: 0 });
    const res = mockRes();
    await PromptController.listPromptIncidents(mockReq({ params: { id: 'p1' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toEqual({ total: 0, limit: 50, offset: 0 });
  });
});

describe('evidence export handlers — permission matrix + error mapping', () => {
  it('403 for a weak JWT', async () => {
    const res = mockRes();
    await PromptController.createPromptEvidenceExport(mockReq({ params: { id: 'p1' }, body: { reason: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(PromptEvidenceExportService.createPromptEvidenceExport).not.toHaveBeenCalled();
  });

  it('AUDITOR may export (201)', async () => {
    (PromptEvidenceExportService.createPromptEvidenceExport as any).mockResolvedValue({ ok: true, data: { export_id: 'EXP-1' } });
    const res = mockRes();
    await PromptController.createPromptEvidenceExport(
      mockReq({ user: { id: 'a1', workspace_id: 'ws-a', role: 'AUDITOR' }, params: { id: 'p1' }, body: { reason: 'audit' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('API key with prompt.export.evidence scope may export', async () => {
    (PromptEvidenceExportService.createPromptEvidenceExport as any).mockResolvedValue({ ok: true, data: {} });
    const res = mockRes();
    await PromptController.createPromptEvidenceExport(
      mockReq({ user: { id: 'svc', workspace_id: 'ws-a', api_key_id: 'k', api_key_scopes: ['prompt.export.evidence'] }, params: { id: 'p1' }, body: { reason: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([
    ['MISSING_REASON', 400],
    ['NO_EVIDENCE', 409],
    ['TENANT_MISMATCH', 403],
  ])('maps create %s → %d', async (code, status) => {
    (PromptEvidenceExportService.createPromptEvidenceExport as any).mockResolvedValue({ ok: false, code });
    const res = mockRes();
    await PromptController.createPromptEvidenceExport(gov({ params: { id: 'p1' }, body: { reason: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(status);
  });

  it('getPromptEvidenceExport maps EXPORT_NOT_FOUND → 404', async () => {
    (PromptEvidenceExportService.getPromptEvidenceExport as any).mockResolvedValue({ ok: false, code: 'EXPORT_NOT_FOUND' });
    const res = mockRes();
    await PromptController.getPromptEvidenceExport(
      mockReq({ user: { id: 'c', workspace_id: 'ws-a', role: 'COMPLIANCE_REVIEWER' }, params: { id: 'p1', exportId: 'e1' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getPromptEvidenceExport 200 on success', async () => {
    (PromptEvidenceExportService.getPromptEvidenceExport as any).mockResolvedValue({ ok: true, data: { export: {} } });
    const res = mockRes();
    await PromptController.getPromptEvidenceExport(
      mockReq({ user: { id: 'c', workspace_id: 'ws-a', role: 'COMPLIANCE_REVIEWER' }, params: { id: 'p1', exportId: 'e1' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
  });
});

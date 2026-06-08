import { describe, it, expect, beforeEach, vi } from 'vitest';

// PHASE FINAL-A — A1 (create paths: import validation + template source rule)
// and A7 (prompt.edit.own vs prompt.edit.any ownership enforcement).

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

// Audit/evidence sinks invoked by auditPromptEvent — mock so denial/success
// paths don't perform real writes.
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../modules/prompts/PromptEvidenceService', () => ({
  PromptEvidenceService: { record: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../modules/prompts/PromptAuditService', () => ({
  PromptAuditService: { record: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
}));

// PROMPT_STATUS must carry real enum values so the template-source gate is meaningful.
vi.mock('../../modules/prompts/PromptService', () => ({
  PromptService: {
    requireById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  PROMPT_STATUS: {
    DRAFT: 'draft',
    INTERNAL_TEST: 'internal_test',
    REVIEW_REQUESTED: 'review_requested',
    APPROVED_STAGING: 'approved_for_staging',
    PRODUCTION_PENDING: 'production_pending',
    COMMISSIONED: 'commissioned',
    PRODUCTION_ACTIVE: 'production_active',
    LOCKED: 'locked',
    SUPERSEDED: 'superseded',
    PAUSED: 'paused',
    RETIRED: 'retired',
    ARCHIVED: 'archived',
  },
  normalizePromptStatus: (x: string) => x,
  normalizePromptRiskTier: (x: string) => x,
}));
vi.mock('../../modules/prompts/PromptVersionService', () => ({
  PromptVersionService: {
    getById: vi.fn().mockResolvedValue({ id: 'v-src', body: 'src body', variables_json: {}, guardrails_json: {}, model_routes_json: {} }),
    create: vi.fn().mockResolvedValue({ id: 'v-new', version_number: 'v1.0' }),
  },
}));
vi.mock('../../modules/prompts/PromptTestService', () => ({
  PromptTestService: { createSuite: vi.fn().mockResolvedValue(null) },
}));

import { PromptController } from '../../modules/prompts/promptController';
import { PromptService } from '../../modules/prompts/PromptService';

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  return res;
}
function mockReq(over: any = {}): any {
  return { user: { id: 'u1', workspace_id: 'ws-a', role: 'AGENT_ARCHITECT' }, query: {}, params: {}, body: {}, headers: {}, ...over };
}

beforeEach(() => vi.clearAllMocks());

describe('A1 — POST /prompts/import (importPrompt) validation', () => {
  it('400 when required fields are missing', async () => {
    const res = mockRes();
    await PromptController.importPrompt(mockReq({ body: {} }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3); // name, prompt_type, risk_tier
    expect(PromptService.create).not.toHaveBeenCalled();
  });

  it('400 when risk_tier is invalid', async () => {
    const res = mockRes();
    await PromptController.importPrompt(mockReq({ body: { name: 'X', prompt_type: 'system', risk_tier: 'tier_9_bogus' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.errors.some((e: string) => e.includes('risk_tier'))).toBe(true);
  });

  it('400 when variables_json is malformed (not object/array)', async () => {
    const res = mockRes();
    await PromptController.importPrompt(mockReq({ body: { name: 'X', prompt_type: 'system', risk_tier: 'tier_2_medium', variables_json: 'oops' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.errors.some((e: string) => e.includes('variables_json'))).toBe(true);
  });

  it('201 + creates prompt and initial version on a valid definition', async () => {
    (PromptService.create as any).mockResolvedValue({ id: 'p-imp', name: 'X', status: 'draft', risk_tier: 'tier_2_medium' });
    const res = mockRes();
    await PromptController.importPrompt(
      mockReq({ body: { name: 'X', prompt_type: 'system', risk_tier: 'tier_2_medium', body: 'hello', variables_json: {} } }),
      res, vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.success).toBe(true);
    expect(PromptService.create).toHaveBeenCalled();
  });
});

describe('A1 — POST /prompts/:id/template (createFromTemplate) source rule', () => {
  it('409 when the source prompt is only a DRAFT (not approved)', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'src', status: 'draft', name: 'Src' });
    const res = mockRes();
    await PromptController.createFromTemplate(mockReq({ params: { id: 'src' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(PromptService.create).not.toHaveBeenCalled();
  });

  it('201 when the source is approved — copies content into a new draft', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'src', status: 'production_active', name: 'Src', prompt_type: 'system_prompt', risk_tier: 'tier_2_medium', current_version_id: 'v-src', knowledge_sources: [], tools_permitted: [] });
    (PromptService.create as any).mockResolvedValue({ id: 'p-new', name: 'Src (From Template)', status: 'draft', risk_tier: 'tier_2_medium' });
    const res = mockRes();
    await PromptController.createFromTemplate(mockReq({ params: { id: 'src' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.success).toBe(true);
    expect(PromptService.create).toHaveBeenCalled();
  });
});

describe('A7 — ownership enforcement in updatePrompt (prompt.edit.own vs prompt.edit.any)', () => {
  it('403 — AGENT_ARCHITECT (edit.own) editing a prompt owned by someone else', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1', status: 'draft', owner_id: 'someone-else', created_by: 'someone-else', risk_tier: 'tier_2_medium' });
    const res = mockRes();
    await PromptController.updatePrompt(mockReq({ params: { id: 'p1' }, body: { description: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.error).toMatch(/edit\.own|edit\.any/);
    expect(PromptService.update).not.toHaveBeenCalled();
  });

  it('allows an OWNER (created_by = caller) with edit.own to edit', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1', status: 'draft', owner_id: 'someone-else', created_by: 'u1', risk_tier: 'tier_2_medium' });
    (PromptService.update as any).mockResolvedValue({ id: 'p1', risk_tier: 'tier_2_medium' });
    const res = mockRes();
    await PromptController.updatePrompt(mockReq({ params: { id: 'p1' }, body: { description: 'x' } }), res, vi.fn());
    expect(PromptService.update).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('allows an ADMIN (edit.any) to edit a prompt owned by someone else', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1', status: 'draft', owner_id: 'someone-else', created_by: 'someone-else', risk_tier: 'tier_2_medium' });
    (PromptService.update as any).mockResolvedValue({ id: 'p1', risk_tier: 'tier_2_medium' });
    const res = mockRes();
    await PromptController.updatePrompt(mockReq({ params: { id: 'p1' }, body: { description: 'x' }, user: { id: 'admin1', workspace_id: 'ws-a', role: 'ADMIN' } }), res, vi.fn());
    expect(PromptService.update).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('allows a superadmin (edit.any) to edit any prompt', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1', status: 'draft', owner_id: 'someone-else', created_by: 'someone-else', risk_tier: 'tier_2_medium' });
    (PromptService.update as any).mockResolvedValue({ id: 'p1', risk_tier: 'tier_2_medium' });
    const res = mockRes();
    await PromptController.updatePrompt(mockReq({ params: { id: 'p1' }, body: { description: 'x' }, user: { id: 'sa', workspace_id: 'ws-a', is_superadmin: true } }), res, vi.fn());
    expect(PromptService.update).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// PHASE FINAL-B — A5 (structured rejection: reason category + notes) and
// A6 (waive-with-justification: admin-override gated, policy-aware, audited).

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../modules/prompts/PromptEvidenceService', () => ({
  PromptEvidenceService: { record: vi.fn().mockResolvedValue({ vault_item_uuid: 'ev-1', vault_item_id: 'ev-1' }) },
}));
vi.mock('../../modules/prompts/PromptAuditService', () => ({
  PromptAuditService: { record: vi.fn().mockResolvedValue({ id: 'audit-1' }) },
}));
vi.mock('../../modules/prompts/PromptService', () => ({
  PromptService: { requireById: vi.fn(), updateStatus: vi.fn().mockResolvedValue({}) },
  PROMPT_STATUS: {
    DRAFT: 'draft', INTERNAL_TEST: 'internal_test', REVIEW_REQUESTED: 'review_requested',
    APPROVED_STAGING: 'approved_for_staging', PRODUCTION_PENDING: 'production_pending',
    COMMISSIONED: 'commissioned', PRODUCTION_ACTIVE: 'production_active', LOCKED: 'locked',
    SUPERSEDED: 'superseded', PAUSED: 'paused', RETIRED: 'retired', ARCHIVED: 'archived',
  },
  normalizePromptStatus: (x: string) => x,
  normalizePromptRiskTier: (x: string) => x,
}));
vi.mock('../../modules/prompts/PromptVersionService', () => ({
  PromptVersionService: { getById: vi.fn() },
}));
vi.mock('../../modules/prompts/PromptApprovalService', () => ({
  PromptApprovalService: { create: vi.fn().mockResolvedValue({ id: 'appr-1' }), listByVersion: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../modules/prompts/DeploymentGateService', () => ({
  DeploymentGateService: { check: vi.fn().mockResolvedValue({ blockingIssues: [], warnings: [] }) },
}));
vi.mock('../../modules/prompts/GovernanceReceiptService', () => ({
  GovernanceReceiptService: { generate: vi.fn().mockResolvedValue({ id: 'receipt-1' }) },
}));
vi.mock('../../modules/prompts/ApprovalInvalidationService', () => ({
  ApprovalInvalidationService: { clear: vi.fn().mockResolvedValue(undefined) },
}));

import { PromptController } from '../../modules/prompts/promptController';
import { PromptService } from '../../modules/prompts/PromptService';
import { PromptVersionService } from '../../modules/prompts/PromptVersionService';
import { PromptApprovalService } from '../../modules/prompts/PromptApprovalService';
import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  return res;
}
function mockReq(over: any = {}): any {
  return { user: { id: 'rev1', workspace_id: 'ws-a', role: 'COMPLIANCE_REVIEWER' }, query: {}, params: {}, body: {}, headers: {}, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  (PromptVersionService.getById as any).mockResolvedValue({ id: 'v1', prompt_id: 'p1', version_number: 'v1.0' });
  (PromptService.requireById as any).mockResolvedValue({ id: 'p1', status: 'review_requested', risk_tier: 'tier_2_medium', current_version_id: 'v1' });
});

describe('A5 — rejectVersion requires a reason category + actionable notes', () => {
  it('400 when category is missing', async () => {
    const res = mockRes();
    await PromptController.rejectVersion(mockReq({ params: { versionId: 'v1' }, body: { comments: 'Please fix the tone' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(PromptApprovalService.create).not.toHaveBeenCalled();
  });

  it('400 when category is invalid', async () => {
    const res = mockRes();
    await PromptController.rejectVersion(mockReq({ params: { versionId: 'v1' }, body: { comments: 'fix it', reason_category: 'banana' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when actionable notes are missing', async () => {
    const res = mockRes();
    await PromptController.rejectVersion(mockReq({ params: { versionId: 'v1' }, body: { reason_category: 'compliance' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('persists category structurally and surfaces it in the response', async () => {
    const res = mockRes();
    await PromptController.rejectVersion(mockReq({ params: { versionId: 'v1' }, body: { comments: 'Add the regulated-claim disclaimer.', reason_category: 'Compliance' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(res.body.data.reason_category).toBe('compliance');
    const createArg = (PromptApprovalService.create as any).mock.calls[0][0];
    expect(createArg.decision).toBe('REJECTED');
    expect(createArg.decision_reason).toContain('[compliance]');
  });
});

describe('A6 — waiveApproval (admin override, policy-aware, audited)', () => {
  it('403 when the caller lacks the admin override capability', async () => {
    const res = mockRes();
    await PromptController.waiveApproval(mockReq({ params: { versionId: 'v1' }, body: { justification: 'time-sensitive launch' }, user: { id: 'rev1', workspace_id: 'ws-a', role: 'COMPLIANCE_REVIEWER' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('400 when justification is too short', async () => {
    const res = mockRes();
    await PromptController.waiveApproval(mockReq({ params: { versionId: 'v1' }, body: { justification: 'no' }, user: { id: 'admin1', workspace_id: 'ws-a', role: 'GOVERNANCE_ADMIN' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('409 — hard safety/compliance block cannot be waived', async () => {
    (DeploymentGateService.check as any).mockResolvedValue({ blockingIssues: [{ blocking: true, type: 'adversarial', detail: 'Adversarial suite not passed' }], warnings: [] });
    const res = mockRes();
    await PromptController.waiveApproval(mockReq({ params: { versionId: 'v1' }, body: { justification: 'launch window is closing fast' }, user: { id: 'admin1', workspace_id: 'ws-a', role: 'GOVERNANCE_ADMIN' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(PromptApprovalService.create).not.toHaveBeenCalled();
  });

  it('200 — records a WAIVED decision + audit when no hard block remains', async () => {
    (DeploymentGateService.check as any).mockResolvedValue({ blockingIssues: [], warnings: [] });
    const res = mockRes();
    await PromptController.waiveApproval(mockReq({ params: { versionId: 'v1' }, body: { justification: 'documented governance override per policy' }, user: { id: 'admin1', workspace_id: 'ws-a', role: 'GOVERNANCE_ADMIN' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    const createArg = (PromptApprovalService.create as any).mock.calls[0][0];
    expect(createArg.decision).toBe('WAIVED');
    expect(createArg.decision_reason).toContain('waiver');
    expect(PromptService.updateStatus).toHaveBeenCalledWith('p1', 'APPROVED_STAGING', 'ws-a');
  });

  it('allows a superadmin to waive', async () => {
    (DeploymentGateService.check as any).mockResolvedValue({ blockingIssues: [], warnings: [] });
    const res = mockRes();
    await PromptController.waiveApproval(mockReq({ params: { versionId: 'v1' }, body: { justification: 'superadmin governance override' }, user: { id: 'sa', workspace_id: 'ws-a', is_superadmin: true } }), res, vi.fn());
    expect(res.body.success).toBe(true);
  });
});

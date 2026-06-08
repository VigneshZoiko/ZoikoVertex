import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { PromptController } from '../../modules/prompts/promptController';
import { buildGovernedPromptFixtures } from '../../modules/prompts/governedPromptSeeds';
import { setFixtures, resetFixtures, mockState } from '../helpers/supabaseMock';

function mockRes(): any {
  const res: any = { statusCode: 200, body: undefined };
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  return res;
}
function mockReq(versionId: string, workspaceId: string): any {
  return { user: { id: 'u1', role: 'GOVERNANCE_ADMIN', workspace_id: workspaceId }, params: { versionId } };
}

function qaIds() {
  const f = buildGovernedPromptFixtures('ws-a');
  const qa = f.prompts.find((p: any) => p.use_case_key === 'qa_quality_check')!;
  return { f, promptId: qa.id as string, versionId: qa.current_version_id as string };
}

beforeEach(() => resetFixtures());

describe('Phase 5.C — GET /prompts/versions/:versionId/sealed-history', () => {
  it('returns sealed history (receipt + shadow + body hash + deployment) for a valid version', async () => {
    const { f, promptId, versionId } = qaIds();
    setFixtures({
      ...f,
      prompt_audit_ledger: [
        { id: 'a1', version_id: versionId, event_type: 'prompt.defensibility_index.computed', after_state: { pdi_score: 88 }, actor_id: 'u-pdi', created_at: '2025-01-02T00:00:00Z' },
        { id: 'a2', version_id: versionId, event_type: 'prompt.commissioning.completed', actor_id: 'u-com', created_at: '2025-01-03T00:00:00Z' },
      ],
      prompt_test_runs: [{ id: 't1', prompt_version_id: versionId, pass_fail: 'PASS', score_summary: { overall_score: 91 }, created_at: '2025-01-02T00:00:00Z' }],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.getVersionSealedHistory(mockReq(versionId, 'ws-a'), res, next);

    expect(next).not.toHaveBeenCalled();
    const d = res.body.data;
    expect(d.prompt_id).toBe(promptId);
    expect(d.version_id).toBe(versionId);
    expect(d.version_status).toBe('production_active');
    expect(d.body_hash).toBeTruthy();
    expect(d.governance_receipt_hash).toBeTruthy();
    expect(d.constraint_shadow_hash).toBeTruthy();
    expect(d.deployment_status).toBe('deployed');
    expect(d.deployment_environment).toBe('production');
    expect(d.pdi_score).toBe(88);
    expect(d.evaluation_score).toBe(91);
    expect(d.commissioned_at).toBe('2025-01-03T00:00:00Z');
    expect(Array.isArray(d.evidence_links)).toBe(true);
    expect(d.evidence_links.length).toBeGreaterThanOrEqual(1);
    expect(d.audit_events.count).toBe(2);
    expect(Array.isArray(d.actors)).toBe(true);
  });

  it('denies cross-workspace access (no data leakage)', async () => {
    const { f, versionId } = qaIds();
    setFixtures(f); // seeded for ws-a
    const res = mockRes();
    const next = vi.fn();
    await PromptController.getVersionSealedHistory(mockReq(versionId, 'ws-other'), res, next);
    // requireById throws for the foreign workspace → routed to next(); no data returned.
    expect(next).toHaveBeenCalled();
    expect(res.body?.data).toBeUndefined();
  });

  it('returns nulls/empty for missing optional artifacts', async () => {
    setFixtures({
      prompt_versions: [{ id: 'vmin', prompt_id: 'pmin', version_number: 1, body: 'x', body_hash: 'bh-min', created_by: 'u1' }],
      prompts: [{ id: 'pmin', workspace_id: 'ws-a', status: 'draft', name: 'Min' }],
    });
    const res = mockRes();
    const next = vi.fn();
    await PromptController.getVersionSealedHistory(mockReq('vmin', 'ws-a'), res, next);

    expect(next).not.toHaveBeenCalled();
    const d = res.body.data;
    expect(d.body_hash).toBe('bh-min');
    expect(d.governance_receipt_hash).toBeNull();
    expect(d.constraint_shadow_hash).toBeNull();
    expect(d.pdi_score).toBeNull();
    expect(d.evaluation_score).toBeNull();
    expect(d.deployment_status).toBeNull();
    expect(d.commissioned_at).toBeNull();
    expect(d.locked_at).toBeNull();
    expect(d.evidence_links).toEqual([]);
    expect(d.audit_events.count).toBe(0);
  });

  it('does not mutate audit/evidence tables (pure read)', async () => {
    const { f, versionId } = qaIds();
    setFixtures(f);
    const beforeEvidence = (mockState.fixtures['prompt_evidence_links'] || []).length;
    const beforeAudit = (mockState.fixtures['prompt_audit_ledger'] || []).length;
    const res = mockRes();
    await PromptController.getVersionSealedHistory(mockReq(versionId, 'ws-a'), res, vi.fn());
    expect((mockState.fixtures['prompt_evidence_links'] || []).length).toBe(beforeEvidence);
    expect((mockState.fixtures['prompt_audit_ledger'] || []).length).toBe(beforeAudit);
  });

  it('route is registered read-only (GET) with the govView read gate', () => {
    const svr = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8');
    expect(svr).toContain("app.get('/api/v1/prompts/versions/:versionId/sealed-history', authenticate, govView, PromptController.getVersionSealedHistory)");
  });
});

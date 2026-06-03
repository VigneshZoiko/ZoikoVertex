import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../modules/prompts/PromptAuditService', () => ({
  PromptAuditService: { record: vi.fn() },
}));
// Mock the Evidence Vault primitives — reuse-only, no real vault tables touched.
vi.mock('../../services/evidenceVault.service', () => ({
  createPackage: vi.fn(),
  sealPackage: vi.fn(),
  createExport: vi.fn(),
  getExportReceipt: vi.fn(),
  getPackage: vi.fn(),
  getPackageManifest: vi.fn(),
  verifyPackage: vi.fn(),
}));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { PromptEvidenceExportService } from '../../modules/prompts/services/PromptEvidenceExportService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import * as vault from '../../services/evidenceVault.service';

const WS_A = 'ws-a';
const WS_B = 'ws-b';

beforeEach(() => {
  resetFixtures();
  vi.clearAllMocks();
  (vault.createPackage as any).mockResolvedValue({ id: 'pkg-uuid', package_id: 'PKG-1' });
  (vault.sealPackage as any).mockResolvedValue({ id: 'pkg-uuid', manifest_hash: 'mh-1', status: 'sealed' });
  (vault.createExport as any).mockResolvedValue({ id: 'exp-uuid', export_id: 'EXP-1', status: 'requested' });
  (PromptAuditService.record as any).mockResolvedValue(null);
});

function seedPromptWithEvidence() {
  setFixtures({
    prompts: [{ id: 'p1', workspace_id: WS_A, tenant_id: WS_A, name: 'P1', risk_tier: 'tier_2_medium' }],
    prompt_evidence_links: [
      { id: 'l1', prompt_id: 'p1', workspace_id: WS_A, vault_item_uuid: 'vi-1', created_at: '2026-01-01' },
      { id: 'l2', prompt_id: 'p1', workspace_id: WS_A, vault_item_uuid: 'vi-2', created_at: '2026-01-02' },
    ],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1' }],
    prompt_runtime_traces: [],
    prompt_incidents: [],
  });
}

describe('PromptEvidenceExportService.createPromptEvidenceExport', () => {
  it('MISSING_REASON when reason is blank', async () => {
    seedPromptWithEvidence();
    const r = await PromptEvidenceExportService.createPromptEvidenceExport({ workspace_id: WS_A, prompt_id: 'p1', reason: '  ' });
    expect(r).toEqual({ ok: false, code: 'MISSING_REASON' });
    expect(vault.createPackage).not.toHaveBeenCalled();
  });

  it('TENANT_MISMATCH for a prompt in another workspace', async () => {
    setFixtures({ prompts: [{ id: 'p1', workspace_id: WS_B, tenant_id: WS_B }], prompt_evidence_links: [] });
    const r = await PromptEvidenceExportService.createPromptEvidenceExport({ workspace_id: WS_A, prompt_id: 'p1', reason: 'audit' });
    expect(r).toEqual({ ok: false, code: 'TENANT_MISMATCH' });
  });

  it('NO_EVIDENCE (no empty packages) when the prompt has no evidence links', async () => {
    setFixtures({ prompts: [{ id: 'p1', workspace_id: WS_A, tenant_id: WS_A }], prompt_evidence_links: [] });
    const r = await PromptEvidenceExportService.createPromptEvidenceExport({ workspace_id: WS_A, prompt_id: 'p1', reason: 'audit' });
    expect(r).toEqual({ ok: false, code: 'NO_EVIDENCE' });
    expect(vault.createPackage).not.toHaveBeenCalled();
  });

  it('creates → seals → exports, stamps prompt_id + reason, audits prompt.evidence.exported', async () => {
    seedPromptWithEvidence();
    const r = await PromptEvidenceExportService.createPromptEvidenceExport({
      workspace_id: WS_A, prompt_id: 'p1', reason: 'regulatory audit', actor_id: 'u1',
    });
    expect(r.ok).toBe(true);

    // createPackage receives the prompt's vault item uuids + metadata.prompt_id + reason
    const pkgArgs = (vault.createPackage as any).mock.calls[0][0];
    expect(pkgArgs.item_ids.sort()).toEqual(['vi-1', 'vi-2']);
    expect(pkgArgs.metadata.prompt_id).toBe('p1');
    expect(pkgArgs.metadata.reason).toBe('regulatory audit');
    expect(pkgArgs.workspace_id).toBe(WS_A);

    expect(vault.sealPackage).toHaveBeenCalledWith('pkg-uuid', 'u1');
    const expArgs = (vault.createExport as any).mock.calls[0][0];
    expect(expArgs.requester_reason).toBe('regulatory audit');
    expect(expArgs.disclosure_mode).toBe('internal'); // default

    expect(PromptAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'prompt.evidence.exported' }));
    expect((r as any).data).toMatchObject({ export_id: 'EXP-1', package_id: 'PKG-1', item_count: 2 });
  });

  it('honours a caller-supplied disclosure_mode', async () => {
    seedPromptWithEvidence();
    await PromptEvidenceExportService.createPromptEvidenceExport({
      workspace_id: WS_A, prompt_id: 'p1', reason: 'x', disclosure_mode: 'external',
    });
    expect((vault.createExport as any).mock.calls[0][0].disclosure_mode).toBe('external');
  });
});

describe('PromptEvidenceExportService.getPromptEvidenceExport — tenancy verification', () => {
  it('EXPORT_NOT_FOUND when export belongs to another workspace', async () => {
    (vault.getExportReceipt as any).mockResolvedValue({ id: 'exp-uuid', workspace_id: WS_B, package_id: 'pkg-uuid' });
    const r = await PromptEvidenceExportService.getPromptEvidenceExport('exp-uuid', 'p1', WS_A);
    expect(r).toEqual({ ok: false, code: 'EXPORT_NOT_FOUND' });
  });

  it('EXPORT_NOT_FOUND when package.metadata.prompt_id does not match', async () => {
    (vault.getExportReceipt as any).mockResolvedValue({ id: 'exp-uuid', workspace_id: WS_A, package_id: 'pkg-uuid' });
    (vault.getPackage as any).mockResolvedValue({ id: 'pkg-uuid', workspace_id: WS_A, metadata: { prompt_id: 'OTHER' } });
    const r = await PromptEvidenceExportService.getPromptEvidenceExport('exp-uuid', 'p1', WS_A);
    expect(r).toEqual({ ok: false, code: 'EXPORT_NOT_FOUND' });
  });

  it('returns receipt + manifest when workspace and prompt_id match', async () => {
    (vault.getExportReceipt as any).mockResolvedValue({ id: 'exp-uuid', workspace_id: WS_A, package_id: 'pkg-uuid' });
    (vault.getPackage as any).mockResolvedValue({ id: 'pkg-uuid', package_id: 'PKG-1', workspace_id: WS_A, status: 'sealed', manifest_hash: 'mh-1', item_count: 2, metadata: { prompt_id: 'p1' } });
    (vault.getPackageManifest as any).mockResolvedValue({ manifest_id: 'MAN-1' });
    (vault.verifyPackage as any).mockResolvedValue({ verified: true });
    const r = await PromptEvidenceExportService.getPromptEvidenceExport('exp-uuid', 'p1', WS_A);
    expect(r.ok).toBe(true);
    expect((r as any).data.package.package_id).toBe('PKG-1');
    expect((r as any).data.manifest).toMatchObject({ manifest_id: 'MAN-1' });
  });
});

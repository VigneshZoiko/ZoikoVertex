import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../modules/prompts/PromptEvidenceService', () => ({
  PromptEvidenceService: { record: vi.fn() },
}));
vi.mock('../../modules/prompts/PromptAuditService', () => ({
  PromptAuditService: { record: vi.fn() },
}));

import { setFixtures, resetFixtures, mockState } from '../helpers/supabaseMock';
import { PromptIncidentService } from '../../modules/prompts/services/PromptIncidentService';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';

const WS_A = 'ws-a';
const WS_B = 'ws-b';
const TRACE_ID = '99999999-9999-9999-9999-999999999999';
const RECEIPT = { vault_item_uuid: 'vault-uuid-1', vault_item_id: 'EVI-1', evidence_hash: 'hash-1' };

function seedPrompt() {
  setFixtures({
    prompts: [{ id: 'p1', workspace_id: WS_A, tenant_id: WS_A, risk_tier: 'tier_3_high' }],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
    prompt_runtime_traces: [{ id: TRACE_ID, workspace_id: WS_A, prompt_id: 'p1' }],
    prompt_incidents: [],
  });
}

beforeEach(() => {
  resetFixtures();
  vi.clearAllMocks();
  (PromptEvidenceService.record as any).mockResolvedValue(RECEIPT);
  (PromptAuditService.record as any).mockResolvedValue(null);
});

describe('PromptIncidentService.openIncident', () => {
  it('opens, generates incident_ref, links trace, preserves evidence + audit', async () => {
    seedPrompt();
    const r = await PromptIncidentService.openIncident({
      workspace_id: WS_A, prompt_id: 'p1', prompt_version_id: 'v1',
      runtime_trace_id: TRACE_ID, deployment_id: '11111111-1111-1111-1111-111111111111',
      severity: 'high', trigger: 'runtime_violation', affected_scope: { channels: ['x'] },
    });
    expect(r.ok).toBe(true);
    const inc = (r as any).incident;
    expect(inc.incident_ref).toMatch(/^PINC-/);
    expect(inc.status).toBe('open');
    expect(inc.workspace_id).toBe(WS_A);
    expect(inc.runtime_trace_id).toBe(TRACE_ID);
    expect(inc.evidence_id).toBe('vault-uuid-1');
    expect(PromptEvidenceService.record).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'prompt.incident.opened' }));
    expect(PromptAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'prompt.incident.opened' }));
  });

  it('TENANT_MISMATCH when prompt belongs to another workspace', async () => {
    setFixtures({ prompts: [{ id: 'p1', workspace_id: WS_B, tenant_id: WS_B }], prompt_versions: [], prompt_incidents: [] });
    const r = await PromptIncidentService.openIncident({ workspace_id: WS_A, prompt_id: 'p1' });
    expect(r).toEqual({ ok: false, code: 'TENANT_MISMATCH' });
  });

  it('VERSION_NOT_FOUND for an unknown version', async () => {
    seedPrompt();
    const r = await PromptIncidentService.openIncident({ workspace_id: WS_A, prompt_id: 'p1', prompt_version_id: 'nope' });
    expect(r).toEqual({ ok: false, code: 'VERSION_NOT_FOUND' });
  });

  it('TRACE_NOT_FOUND when the runtime trace is not in workspace', async () => {
    seedPrompt();
    const r = await PromptIncidentService.openIncident({ workspace_id: WS_A, prompt_id: 'p1', runtime_trace_id: 'ghost' });
    expect(r).toEqual({ ok: false, code: 'TRACE_NOT_FOUND' });
  });

  it('stores advisory deployment_id without validation', async () => {
    seedPrompt();
    const r = await PromptIncidentService.openIncident({
      workspace_id: WS_A, prompt_id: 'p1', deployment_id: '22222222-2222-2222-2222-222222222222',
    });
    expect((r as any).incident.deployment_id).toBe('22222222-2222-2222-2222-222222222222');
  });
});

describe('PromptIncidentService — lifecycle transitions', () => {
  async function openOne() {
    seedPrompt();
    const r = await PromptIncidentService.openIncident({ workspace_id: WS_A, prompt_id: 'p1', severity: 'high' });
    return (r as any).incident.id as string;
  }

  it('allows open → investigating and audits the update', async () => {
    const id = await openOne();
    const r = await PromptIncidentService.updateIncident(id, WS_A, { status: 'investigating' });
    expect(r.ok).toBe(true);
    expect((r as any).incident.status).toBe('investigating');
    expect(PromptAuditService.record).toHaveBeenLastCalledWith(expect.objectContaining({ event_type: 'prompt.incident.updated' }));
  });

  it('rejects an invalid transition (open → bogus) with INVALID_TRANSITION', async () => {
    const id = await openOne();
    const r = await PromptIncidentService.updateIncident(id, WS_A, { status: 'bogus' });
    expect(r).toEqual({ ok: false, code: 'INVALID_TRANSITION' });
  });

  it('closeIncident sets closed fields + audits prompt.incident.closed', async () => {
    const id = await openOne();
    const r = await PromptIncidentService.closeIncident(id, WS_A, { closed_by: '33333333-3333-3333-3333-333333333333', post_incident_note: 'done' });
    expect(r.ok).toBe(true);
    expect((r as any).incident.status).toBe('closed');
    expect((r as any).incident.closed_at).toBeTruthy();
    expect(PromptAuditService.record).toHaveBeenLastCalledWith(expect.objectContaining({ event_type: 'prompt.incident.closed' }));
  });

  it('double close → ALREADY_CLOSED', async () => {
    const id = await openOne();
    await PromptIncidentService.closeIncident(id, WS_A, {});
    const again = await PromptIncidentService.closeIncident(id, WS_A, {});
    expect(again).toEqual({ ok: false, code: 'ALREADY_CLOSED' });
  });

  it('update to closed then transition → ALREADY_CLOSED', async () => {
    const id = await openOne();
    await PromptIncidentService.updateIncident(id, WS_A, { status: 'closed', actor_id: '44444444-4444-4444-4444-444444444444' });
    const r = await PromptIncidentService.updateIncident(id, WS_A, { status: 'investigating' });
    expect(r).toEqual({ ok: false, code: 'ALREADY_CLOSED' });
  });
});

describe('PromptIncidentService — tenant isolation & listing', () => {
  it('getIncident / updateIncident never cross tenants', async () => {
    const id = await (async () => {
      seedPrompt();
      const r = await PromptIncidentService.openIncident({ workspace_id: WS_A, prompt_id: 'p1' });
      return (r as any).incident.id as string;
    })();

    expect(await PromptIncidentService.getIncident(id, WS_B)).toBeNull();
    const upd = await PromptIncidentService.updateIncident(id, WS_B, { status: 'investigating' });
    expect(upd).toEqual({ ok: false, code: 'INCIDENT_NOT_FOUND' });
  });

  it('listByPrompt filters by status and is workspace-scoped', async () => {
    setFixtures({
      prompt_incidents: [
        { id: 'i1', workspace_id: WS_A, prompt_id: 'p1', status: 'open', severity: 'high', created_at: '2026-01-01' },
        { id: 'i2', workspace_id: WS_A, prompt_id: 'p1', status: 'closed', severity: 'low', created_at: '2026-01-02' },
        { id: 'i3', workspace_id: WS_B, prompt_id: 'p1', status: 'open', severity: 'high', created_at: '2026-01-03' },
      ],
    });
    const all = await PromptIncidentService.listByPrompt('p1', WS_A);
    expect(all.total).toBe(2);
    const open = await PromptIncidentService.listByPrompt('p1', WS_A, { status: 'open' });
    expect(open.total).toBe(1);
    expect(open.records[0].id).toBe('i1');
  });
});

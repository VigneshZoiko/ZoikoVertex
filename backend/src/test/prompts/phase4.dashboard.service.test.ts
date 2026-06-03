import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
// Mock the dependency-graph heavy collaborators so we isolate the runtime rollups.
vi.mock('../../modules/prompts/PromptDependencyService', () => ({
  PromptDependencyService: { getGraph: vi.fn() },
}));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { GovernanceDashboardService } from '../../modules/prompts/services/GovernanceDashboardService';
import { PromptDependencyService } from '../../modules/prompts/PromptDependencyService';

const WS_A = 'ws-a';
const WS_B = 'ws-b';

const EMPTY_SUMMARY = { total: 0, by_status: {}, blocking_count: 0, blocked: false, highest_severity: 'none', rollup: [] };

beforeEach(() => {
  resetFixtures();
  vi.clearAllMocks();
  (PromptDependencyService.getGraph as any).mockResolvedValue({ found: true, summary: EMPTY_SUMMARY, edges: [] });
});

describe('GovernanceDashboardService — workspace runtime rollup', () => {
  it('computes tenant-scoped runtime counts, export readiness and completeness', async () => {
    setFixtures({
      prompts: [
        { id: 'p1', workspace_id: WS_A, name: 'P1', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: null, approval_invalidated_at: null },
        { id: 'p2', workspace_id: WS_A, name: 'P2', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, approval_invalidated_at: null },
        { id: 'p3', workspace_id: WS_B, name: 'P3', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, approval_invalidated_at: null },
      ],
      prompt_runtime_traces: [
        { id: 't1', workspace_id: WS_A, prompt_id: 'p1', violation: false },
        { id: 't2', workspace_id: WS_A, prompt_id: 'p1', violation: true },
        { id: 't3', workspace_id: WS_B, prompt_id: 'p3', violation: true }, // other tenant
      ],
      prompt_incidents: [
        { id: 'i1', workspace_id: WS_A, prompt_id: 'p1', status: 'open' },
        { id: 'i2', workspace_id: WS_A, prompt_id: 'p1', status: 'closed' },
      ],
      prompt_evidence_links: [
        { id: 'l1', workspace_id: WS_A, prompt_id: 'p1', vault_item_uuid: 'vi1', created_at: '2026-01-01' },
        { id: 'l2', workspace_id: WS_A, prompt_id: 'p1', vault_item_uuid: 'vi2', created_at: '2026-01-02' },
        { id: 'l3', workspace_id: WS_B, prompt_id: 'p3', vault_item_uuid: 'vi3', created_at: '2026-01-03' },
      ],
      prompt_versions: [],
      prompt_bindings: [],
    });

    const dash = await GovernanceDashboardService.getWorkspaceDashboard(WS_A);
    expect(dash.runtime.runtime_trace_count).toBe(2);       // WS_B excluded
    expect(dash.runtime.runtime_violation_count).toBe(1);
    expect(dash.runtime.open_incident_count).toBe(1);        // closed excluded
    expect(dash.runtime.evidence_link_count).toBe(2);
    expect(dash.runtime.export_ready_prompt_count).toBe(1);  // only p1 has links
    expect(dash.runtime.evidence_completeness_score).toBe(50); // 1 of 2 prompts
    expect(dash.runtime.completeness_basis_truncated).toBe(false);
  });

  it('scores 0 when there are no prompts', async () => {
    setFixtures({ prompts: [], prompt_runtime_traces: [], prompt_incidents: [], prompt_evidence_links: [], prompt_versions: [], prompt_bindings: [] });
    const dash = await GovernanceDashboardService.getWorkspaceDashboard(WS_A);
    expect(dash.runtime.evidence_completeness_score).toBe(0);
    expect(dash.runtime.export_ready_prompt_count).toBe(0);
  });
});

describe('GovernanceDashboardService — prompt snapshot runtime block', () => {
  it('found:false returns a zeroed runtime block', async () => {
    (PromptDependencyService.getGraph as any).mockResolvedValue({ found: false, summary: EMPTY_SUMMARY, edges: [] });
    setFixtures({ prompts: [], prompt_runtime_traces: [], prompt_incidents: [], prompt_evidence_links: [] });
    const snap = await GovernanceDashboardService.getPromptGovernanceSnapshot('nope', WS_A);
    expect(snap.found).toBe(false);
    expect(snap.runtime).toEqual({
      runtime_traces: { total: 0 },
      violations: { total: 0 },
      incidents: { total: 0, open: 0 },
      evidence: { link_count: 0 },
      export_readiness: { export_ready: false, evidence_link_count: 0 },
    });
  });

  it('found:false still reports per-prompt runtime data that exists', async () => {
    (PromptDependencyService.getGraph as any).mockResolvedValue({ found: false, summary: EMPTY_SUMMARY, edges: [] });
    setFixtures({
      prompt_runtime_traces: [
        { id: 't1', workspace_id: WS_A, prompt_id: 'p1', violation: true },
        { id: 't2', workspace_id: WS_A, prompt_id: 'p1', violation: false },
      ],
      prompt_incidents: [{ id: 'i1', workspace_id: WS_A, prompt_id: 'p1', status: 'investigating' }],
      prompt_evidence_links: [{ id: 'l1', workspace_id: WS_A, prompt_id: 'p1', vault_item_uuid: 'vi1', created_at: '2026-01-01' }],
    });
    const snap = await GovernanceDashboardService.getPromptGovernanceSnapshot('p1', WS_A);
    expect(snap.runtime.runtime_traces.total).toBe(2);
    expect(snap.runtime.violations.total).toBe(1);
    expect(snap.runtime.incidents).toEqual({ total: 1, open: 1 });
    expect(snap.runtime.evidence.link_count).toBe(1);
    expect(snap.runtime.export_readiness).toEqual({ export_ready: true, evidence_link_count: 1 });
  });
});

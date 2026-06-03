import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { GovernanceDashboardService } from '../../modules/prompts/services/GovernanceDashboardService';

const WS_A = 'ws-a';
const WS_B = 'ws-b';

beforeEach(() => resetFixtures());

describe('GovernanceDashboardService — workspace dashboard', () => {
  it('rolls up totals, approval validity and deployment readiness (tenant-scoped)', async () => {
    setFixtures({
      prompts: [
        { id: 'p1', workspace_id: WS_A, name: 'P1', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: null, approval_invalidated_at: null },
        { id: 'p2', workspace_id: WS_A, name: 'P2', status: 'draft', risk_tier: 'tier_3_high', current_version_id: null, approval_invalidated_at: '2026-01-01T00:00:00Z' },
        { id: 'p3', workspace_id: WS_B, name: 'P3', status: 'production_active', risk_tier: 'tier_1_low', current_version_id: null, approval_invalidated_at: null },
      ],
      prompt_versions: [],
      prompt_bindings: [],
    });

    const dash = await GovernanceDashboardService.getWorkspaceDashboard(WS_A);
    expect(dash.prompt_totals.total).toBe(2); // WS_B excluded
    expect(dash.prompt_totals.by_status).toEqual({ production_active: 1, draft: 1 });
    expect(dash.prompt_totals.by_risk_tier).toEqual({ tier_2_medium: 1, tier_3_high: 1 });
    expect(dash.approval).toEqual({ invalidated_count: 1, valid_count: 1 });
    expect(dash.deployment.blocked_count).toBe(1); // p2 invalidated
    expect(dash.deployment.ready_count).toBe(1);
    expect(dash.truncated).toBe(false);
  });

  it('honours opts.limit and reports truncation (N+1 bounding)', async () => {
    setFixtures({
      prompts: [
        { id: 'p1', workspace_id: WS_A, name: 'P1', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, approval_invalidated_at: null },
        { id: 'p2', workspace_id: WS_A, name: 'P2', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, approval_invalidated_at: null },
      ],
      prompt_versions: [],
      prompt_bindings: [],
    });
    const dash = await GovernanceDashboardService.getWorkspaceDashboard(WS_A, { limit: 1 });
    expect(dash.prompt_totals.total).toBe(2); // totals over all
    expect(dash.summary.considered_count).toBe(1);
    expect(dash.prompts).toHaveLength(1);
    expect(dash.truncated).toBe(true);
  });
});

describe('GovernanceDashboardService — prompt snapshot', () => {
  it('returns found:false for a missing / cross-tenant prompt', async () => {
    setFixtures({ prompts: [], prompt_versions: [], prompt_bindings: [] });
    const snap = await GovernanceDashboardService.getPromptGovernanceSnapshot('nope', WS_A);
    expect(snap.found).toBe(false);
    expect(snap.degraded_dependencies).toHaveLength(0);
    expect(snap.deployment_impact).toBeNull();
  });

  it('surfaces degraded dependencies with impact, approval validity and notification plan', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: WS_A, name: 'P1', status: 'production_active', current_version_id: 'v1', risk_tier: 'tier_2_medium', approval_invalidated_at: null, owner_id: 'o1', owner_name: 'Owner', created_by: 'c1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
      prompt_bindings: [{ prompt_version_id: 'v1', agent_id: 'aX', environment: 'production' }],
      agents: [{ id: 'aX', name: 'Agent X', status: 'revoked' }],
      prompt_approvals: [{ prompt_version_id: 'v1', reviewer_role: 'compliance' }],
    });

    const snap = await GovernanceDashboardService.getPromptGovernanceSnapshot('p1', WS_A);
    expect(snap.found).toBe(true);
    expect(snap.deployment_impact).not.toBeNull();
    expect(snap.approval_validity.valid).toBe(true);
    expect(snap.degraded_dependencies.length).toBeGreaterThan(0);
    const dep = snap.degraded_dependencies.find((d) => d.target.id === 'aX');
    expect(dep).toBeDefined();
    expect(dep!.health.status).toBe('REVOKED');
    expect(dep!.notification_plan.notifications.length).toBeGreaterThan(0);
  });
});

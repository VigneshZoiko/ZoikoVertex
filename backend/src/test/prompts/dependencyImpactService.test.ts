import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { DependencyImpactService } from '../../modules/prompts/services/DependencyImpactService';

const WS = 'ws-a';

beforeEach(() => resetFixtures());

function baseFixtures(agentStatus: string, approvalInvalidatedAt: string | null = null) {
  return {
    prompts: [
      {
        id: 'p1', workspace_id: WS, name: 'P1', status: 'production_active',
        current_version_id: 'v1', risk_tier: 'tier_2_medium', approval_invalidated_at: approvalInvalidatedAt,
        approval_invalidated_reason: approvalInvalidatedAt ? 'changed after approval' : null,
      },
    ],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1 }],
    prompt_bindings: [{ prompt_version_id: 'v1', agent_id: 'aX', environment: 'production' }],
    agents: [{ id: 'aX', name: 'Agent X', status: agentStatus }],
  };
}

describe('DependencyImpactService — deployment impact', () => {
  it('flags a revoked dependency as a blocker with HIGH risk', async () => {
    setFixtures(baseFixtures('revoked'));
    const res = await DependencyImpactService.analyzeDeploymentImpact('p1', WS);
    expect(res.action).toBe('DEPLOY');
    expect(res.riskLevel).toBe('HIGH');
    expect(res.blockers.length).toBeGreaterThan(0);
    expect(res.blockers.some((b) => b.includes('REVOKED'))).toBe(true);
    expect(res.affected.agents).toContain('Agent X');
    expect(res.approvalStatus.valid).toBe(true);
  });

  it('reports a healthy deployment with no blockers and NONE risk', async () => {
    setFixtures(baseFixtures('active'));
    const res = await DependencyImpactService.analyzeDeploymentImpact('p1', WS);
    expect(res.blockers).toHaveLength(0);
    expect(res.riskLevel).toBe('NONE');
  });

  it('blocks when approval has been invalidated', async () => {
    setFixtures(baseFixtures('active', '2026-01-01T00:00:00Z'));
    const res = await DependencyImpactService.analyzeDeploymentImpact('p1', WS);
    expect(res.approvalStatus.valid).toBe(false);
    expect(res.blockers.some((b) => b.toLowerCase().includes('approval'))).toBe(true);
  });

  it('throws for a prompt outside the caller workspace (tenant isolation)', async () => {
    setFixtures(baseFixtures('active'));
    await expect(DependencyImpactService.analyzeDeploymentImpact('p1', 'other-ws')).rejects.toThrow();
  });
});

describe('DependencyImpactService — archive / rollback', () => {
  it('archive impact never blocks and lists affected entities', async () => {
    setFixtures(baseFixtures('active'));
    const res = await DependencyImpactService.analyzeArchiveImpact('p1', WS);
    expect(res.action).toBe('ARCHIVE');
    expect(res.blockers).toHaveLength(0);
    expect(res.affected.agents).toContain('Agent X');
  });

  it('rollback impact computes an add/remove dependency delta', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: WS, name: 'P1', status: 'production_active', current_version_id: 'v1', risk_tier: 'tier_2_medium', approval_invalidated_at: null }],
      prompt_versions: [
        { id: 'v1', prompt_id: 'p1', version_number: 1 },
        { id: 'v2', prompt_id: 'p1', version_number: 2 },
      ],
      prompt_bindings: [
        { prompt_version_id: 'v1', agent_id: 'aX', environment: 'production' },
        { prompt_version_id: 'v2', agent_id: 'aY', environment: 'production' },
      ],
      agents: [{ id: 'aX', name: 'Agent X', status: 'active' }, { id: 'aY', name: 'Agent Y', status: 'active' }],
    });
    const res = await DependencyImpactService.analyzeRollbackImpact('p1', WS, 'v2');
    expect(res.action).toBe('ROLLBACK');
    expect(res.rollbackDelta).not.toBeNull();
    expect(res.rollbackDelta!.addedDependencies).toContain('agent:aY');
    expect(res.rollbackDelta!.removedDependencies).toContain('agent:aX');
  });
});

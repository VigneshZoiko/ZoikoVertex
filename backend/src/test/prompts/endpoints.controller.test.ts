import { describe, it, expect, beforeEach, vi } from 'vitest';

// Avoid the real Supabase client; controller resolveWorkspaceId reads req.user.
vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

// Mock the dependency services the endpoints delegate to.
vi.mock('../../modules/prompts/services/ReverseDependencyService', () => ({
  ReverseDependencyService: { getDependents: vi.fn() },
}));
vi.mock('../../modules/prompts/services/DependencyNotificationPlanner', () => ({
  DependencyNotificationPlanner: { planNotifications: vi.fn() },
}));
vi.mock('../../modules/prompts/services/GovernanceDashboardService', () => ({
  GovernanceDashboardService: { getWorkspaceDashboard: vi.fn(), getPromptGovernanceSnapshot: vi.fn() },
}));
vi.mock('../../modules/prompts/services/DependencyImpactService', () => ({
  DependencyImpactService: {
    analyzeDeploymentImpact: vi.fn(),
    analyzeRollbackImpact: vi.fn(),
    analyzeArchiveImpact: vi.fn(),
    analyzeRetireImpact: vi.fn(),
  },
}));
vi.mock('../../modules/prompts/PromptDependencyService', () => ({
  PromptDependencyService: { getGraph: vi.fn() },
}));
vi.mock('../../modules/prompts/PromptService', () => ({
  PromptService: { requireById: vi.fn() },
  PROMPT_STATUS: {},
  PROMPT_RISK_TIER: {},
  normalizePromptStatus: (x: string) => x,
  normalizePromptRiskTier: (x: string) => x,
}));
vi.mock('../../modules/prompts/PromptVersionService', () => ({
  PromptVersionService: { getById: vi.fn() },
}));

import { PromptController } from '../../modules/prompts/promptController';
import { ReverseDependencyService } from '../../modules/prompts/services/ReverseDependencyService';
import { DependencyNotificationPlanner } from '../../modules/prompts/services/DependencyNotificationPlanner';
import { GovernanceDashboardService } from '../../modules/prompts/services/GovernanceDashboardService';
import { DependencyImpactService } from '../../modules/prompts/services/DependencyImpactService';
import { PromptDependencyService } from '../../modules/prompts/PromptDependencyService';
import { PromptService } from '../../modules/prompts/PromptService';

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: any) => { res.body = b; return res; });
  return res;
}
function mockReq(over: any = {}): any {
  return { user: { id: 'u1', workspace_id: 'ws-a' }, query: {}, params: {}, ...over };
}

beforeEach(() => vi.clearAllMocks());

describe('GET /prompts/dependents — getPromptDependents', () => {
  it('400 on invalid targetType', async () => {
    const res = mockRes();
    await PromptController.getPromptDependents(mockReq({ query: { targetType: 'bogus', targetId: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('400 on missing targetId', async () => {
    const res = mockRes();
    await PromptController.getPromptDependents(mockReq({ query: { targetType: 'agent' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('200 contract on valid request', async () => {
    (ReverseDependencyService.getDependents as any).mockResolvedValue({ dependents: [], summary: { prompt_count: 0 } });
    const res = mockRes();
    await PromptController.getPromptDependents(mockReq({ query: { targetType: 'agent', targetId: 'aX' } }), res, vi.fn());
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toBeDefined();
    expect(ReverseDependencyService.getDependents).toHaveBeenCalledWith('agent', 'aX', 'ws-a');
  });
});

describe('GET /prompts/dependency-notifications/plan — getDependencyNotificationPlan', () => {
  it('400 on invalid targetType', async () => {
    const res = mockRes();
    await PromptController.getDependencyNotificationPlan(mockReq({ query: { targetType: 'nope', targetId: 'x' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('passes status through unvalidated and returns contract', async () => {
    (DependencyNotificationPlanner.planNotifications as any).mockResolvedValue({ notifications: [], summary: {} });
    const res = mockRes();
    await PromptController.getDependencyNotificationPlan(mockReq({ query: { targetType: 'agent', targetId: 'aX', status: 'anything' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(DependencyNotificationPlanner.planNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'agent', targetId: 'aX', workspaceId: 'ws-a', status: 'anything' }),
    );
  });
});

describe('GET /prompts/governance-dashboard — getGovernanceDashboard', () => {
  it('defaults limit to 100 and returns contract', async () => {
    (GovernanceDashboardService.getWorkspaceDashboard as any).mockResolvedValue({ prompts: [], summary: {} });
    const res = mockRes();
    await PromptController.getGovernanceDashboard(mockReq(), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(GovernanceDashboardService.getWorkspaceDashboard).toHaveBeenCalledWith('ws-a', { limit: 100 });
  });
  it('honours an explicit limit query param', async () => {
    (GovernanceDashboardService.getWorkspaceDashboard as any).mockResolvedValue({ prompts: [], summary: {} });
    const res = mockRes();
    await PromptController.getGovernanceDashboard(mockReq({ query: { limit: '5' } }), res, vi.fn());
    expect(GovernanceDashboardService.getWorkspaceDashboard).toHaveBeenCalledWith('ws-a', { limit: 5 });
  });
});

describe('GET /prompts/:id/governance-snapshot — getPromptGovernanceSnapshot', () => {
  it('404-path: delegates a requireById rejection to next(error)', async () => {
    (PromptService.requireById as any).mockRejectedValue(new Error('not found'));
    const res = mockRes();
    const next = vi.fn();
    await PromptController.getPromptGovernanceSnapshot(mockReq({ params: { id: 'missing' } }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  it('200 contract when prompt exists in workspace', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1' });
    (GovernanceDashboardService.getPromptGovernanceSnapshot as any).mockResolvedValue({ found: true, degraded_dependencies: [] });
    const res = mockRes();
    await PromptController.getPromptGovernanceSnapshot(mockReq({ params: { id: 'p1' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(GovernanceDashboardService.getPromptGovernanceSnapshot).toHaveBeenCalledWith('p1', 'ws-a', { referenceTime: undefined });
  });
});

describe('GET /prompts/:id/dependency-health — getPromptDependencyHealth', () => {
  it('404-path: requireById rejection → next(error)', async () => {
    (PromptService.requireById as any).mockRejectedValue(new Error('not found'));
    const res = mockRes();
    const next = vi.fn();
    await PromptController.getPromptDependencyHealth(mockReq({ params: { id: 'missing' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
  it('projects per-edge health into the contract', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1' });
    (PromptDependencyService.getGraph as any).mockResolvedValue({
      found: true, prompt_id: 'p1', workspace_id: 'ws-a', summary: { total: 1 },
      edges: [{ source: 'v1', target: 'aX', dependency_type: 'agent', environment: 'prod', health: { status: 'HEALTHY', severity: 'none' } }],
    });
    const res = mockRes();
    await PromptController.getPromptDependencyHealth(mockReq({ params: { id: 'p1' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(res.body.data.health).toHaveLength(1);
    expect(res.body.data.health[0]).toMatchObject({ target: 'aX', status: 'HEALTHY' });
  });
});

describe('GET /prompts/:id/impact — getPromptImpact', () => {
  it('400 on invalid action', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await PromptController.getPromptImpact(mockReq({ params: { id: 'p1' }, query: { action: 'bogus' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('400 on rollback without targetVersionId', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1' });
    const res = mockRes();
    await PromptController.getPromptImpact(mockReq({ params: { id: 'p1' }, query: { action: 'rollback' } }), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('200 contract on deploy action', async () => {
    (PromptService.requireById as any).mockResolvedValue({ id: 'p1' });
    (DependencyImpactService.analyzeDeploymentImpact as any).mockResolvedValue({ action: 'DEPLOY', blockers: [] });
    const res = mockRes();
    await PromptController.getPromptImpact(mockReq({ params: { id: 'p1' }, query: { action: 'deploy' } }), res, vi.fn());
    expect(res.body.success).toBe(true);
    expect(res.body.data.action).toBe('DEPLOY');
  });
});

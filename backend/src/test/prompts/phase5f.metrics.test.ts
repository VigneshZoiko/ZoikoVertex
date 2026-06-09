import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { GovernanceMetricsService } from '../../modules/prompts/services/GovernanceMetricsService';
import { governanceMetricsResponseSchema } from '../../modules/prompts/schemas/metrics.schema';
import { PromptScorecardService } from '../../modules/prompts/PromptScorecardService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

beforeEach(() => {
  setFixtures({
    prompts: [
      { id: 'p-tier1', workspace_id: 'ws-a', name: 'Tier 1 Prompt', status: 'draft', risk_tier: 'tier_1_low', current_version_id: 'v1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-tier2', workspace_id: 'ws-a', name: 'Tier 2 Prompt', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: 'v2', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-tier3', workspace_id: 'ws-a', name: 'Tier 3 Prompt', status: 'approved_for_staging', risk_tier: 'tier_3_high', current_version_id: 'v3', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-tier4', workspace_id: 'ws-a', name: 'Tier 4 Prompt', status: 'production_active', risk_tier: 'tier_4_critical', current_version_id: 'v4', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-no-version', workspace_id: 'ws-a', name: 'No Version', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-other-ws', workspace_id: 'ws-b', name: 'Other WS', status: 'draft', risk_tier: 'tier_1_low', current_version_id: 'v5', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-deploy-ok', workspace_id: 'ws-a', name: 'Deploy OK', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: 'v-deploy-ok', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    ],
    prompt_versions: [
      { id: 'v1', prompt_id: 'p-tier1', version_number: 1, body: 'Safe', body_hash: 'a', immutable: false },
      { id: 'v2', prompt_id: 'p-tier2', version_number: 2, body: 'Brand', body_hash: 'b', immutable: false },
      { id: 'v3', prompt_id: 'p-tier3', version_number: 1, body: 'Compliance', body_hash: 'c', immutable: true },
      { id: 'v4', prompt_id: 'p-tier4', version_number: 3, body: 'Critical', body_hash: 'd', immutable: true },
      { id: 'v5', prompt_id: 'p-other-ws', version_number: 1, body: 'Other', body_hash: 'e', immutable: false },
      { id: 'v-deploy-ok', prompt_id: 'p-deploy-ok', version_number: 1, body: 'OK', body_hash: 'f', immutable: false },
    ],
    prompt_approvals: [
      { id: 'ap-v1', workspace_id: 'ws-a', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v2a', workspace_id: 'ws-a', prompt_version_id: 'v2', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v2b', workspace_id: 'ws-a', prompt_version_id: 'v2', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v3a', workspace_id: 'ws-a', prompt_version_id: 'v3', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v3b', workspace_id: 'ws-a', prompt_version_id: 'v3', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v3c', workspace_id: 'ws-a', prompt_version_id: 'v3', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v4a', workspace_id: 'ws-a', prompt_version_id: 'v4', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v4b', workspace_id: 'ws-a', prompt_version_id: 'v4', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-v4c', workspace_id: 'ws-a', prompt_version_id: 'v4', reviewer_role: 'SECURITY_ADMIN', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-deploy-ok-a', workspace_id: 'ws-a', prompt_version_id: 'v-deploy-ok', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-deploy-ok-b', workspace_id: 'ws-a', prompt_version_id: 'v-deploy-ok', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
    ],
    prompt_test_runs: [
      { id: 'tr-v2-std', workspace_id: 'ws-a', prompt_version_id: 'v2', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 95 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v2-adv', workspace_id: 'ws-a', prompt_version_id: 'v2', environment: 'draft', pass_fail: 'PASS', score_summary: {}, run_metadata: { adversarial: true }, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v4-std', workspace_id: 'ws-a', prompt_version_id: 'v4', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 100 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v4-adv', workspace_id: 'ws-a', prompt_version_id: 'v4', environment: 'draft', pass_fail: 'PASS', score_summary: {}, run_metadata: { adversarial: true }, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-deploy-std', workspace_id: 'ws-a', prompt_version_id: 'v-deploy-ok', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 90 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_deployments: [
      { id: 'dep-v4', workspace_id: 'ws-a', prompt_version_id: 'v4', environment: 'production', deployed_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_bindings: [
      { id: 'bind-v4-prod', workspace_id: 'ws-a', prompt_version_id: 'v4', environment: 'production', agent_id: 'agent-1', workflow_id: null, effective_from: '2025-01-03T00:00:00Z', effective_to: null, created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_audit_ledger: [
      { id: 'audit-1', workspace_id: 'ws-a', prompt_id: 'p-tier4', event_type: 'prompt.deployed', created_at: '2025-01-03T00:00:00Z' },
      { id: 'audit-2', workspace_id: 'ws-a', prompt_id: 'p-tier4', event_type: 'prompt.created', created_at: '2025-01-01T00:00:00Z' },
      { id: 'audit-3', workspace_id: 'ws-a', prompt_id: 'p-tier4', event_type: 'prompt.approval.recorded', created_at: '2025-01-02T00:00:00Z' },
      { id: 'audit-4', workspace_id: 'ws-a', prompt_id: 'p-tier4', event_type: 'prompt.version.created', created_at: '2025-01-01T00:00:00Z' },
      { id: 'audit-5', workspace_id: 'ws-a', prompt_id: 'p-tier4', event_type: 'prompt.test.passed', created_at: '2025-01-03T00:00:00Z' },
      { id: 'audit-6', workspace_id: 'ws-a', prompt_id: 'p-tier2', event_type: 'prompt.deployed', created_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_evidence_links: [
      { id: 'ev-1', workspace_id: 'ws-a', prompt_id: 'p-tier4', created_at: '2025-01-03T00:00:00Z' },
      { id: 'ev-2', workspace_id: 'ws-a', prompt_id: 'p-tier4', created_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_test_suites: [],
    prompt_test_scenarios: [],
    prompt_knowledge_bindings: [],
    prompt_tool_permissions: [],
    prompt_drift_log: [],
    workspace_members: [
      { user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' },
    ],
  });
});

afterEach(() => {
  resetFixtures();
});

describe('Phase 5F — Governance Metrics Dashboard', () => {

  // ═══════════════════════════════════════════════════════════════════════
  // Metric Formulas
  // ═══════════════════════════════════════════════════════════════════════

  describe('Metric Formulas', () => {
    it('returns correct total_prompts for workspace', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      // ws-a has 5 prompts (p-tier1, p-tier2, p-tier3, p-tier4, p-no-version, p-deploy-ok)
      expect(metrics.total_prompts).toBe(6);
    });

    it('returns zero metrics for empty workspace', async () => {
      setFixtures({ prompts: [], prompt_versions: [], prompt_approvals: [], prompt_test_runs: [], prompt_deployments: [], prompt_bindings: [], prompt_audit_ledger: [], prompt_evidence_links: [], prompt_test_suites: [], prompt_test_scenarios: [], prompt_knowledge_bindings: [], prompt_tool_permissions: [], prompt_drift_log: [], workspace_members: [] });
      const metrics = await GovernanceMetricsService.compute('ws-empty');
      expect(metrics.total_prompts).toBe(0);
      expect(metrics.healthy_prompts).toBe(0);
      expect(metrics.warning_prompts).toBe(0);
      expect(metrics.critical_prompts).toBe(0);
      expect(metrics.average_score).toBe(0);
      expect(metrics.deploy_ready_count).toBe(0);
      expect(metrics.tier_distribution).toEqual({});
      expect(metrics.top_risks).toEqual([]);
    });

    it('average_score is between 0 and 100', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      expect(metrics.average_score).toBeGreaterThanOrEqual(0);
      expect(metrics.average_score).toBeLessThanOrEqual(100);
    });

    it('healthy + warning + critical equals total_prompts', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      expect(metrics.healthy_prompts + metrics.warning_prompts + metrics.critical_prompts).toBe(metrics.total_prompts);
    });

    it('deploy_ready_count is a number >= 0', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      expect(metrics.deploy_ready_count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metrics.deploy_ready_count)).toBe(true);
    });

    it('tier_distribution covers all tier keys present', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      const allTiers = Object.keys(metrics.tier_distribution);
      expect(allTiers.length).toBeGreaterThanOrEqual(1);
      const sum = Object.values(metrics.tier_distribution).reduce((a, b) => a + b, 0);
      expect(sum).toBe(metrics.total_prompts);
    });

    it('top_risks is sorted lowest score first', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      for (let i = 1; i < metrics.top_risks.length; i++) {
        expect(metrics.top_risks[i].overall_score).toBeGreaterThanOrEqual(metrics.top_risks[i - 1].overall_score);
      }
    });

    it('top_risks contains at most 10 entries', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      expect(metrics.top_risks.length).toBeLessThanOrEqual(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Tenant Isolation
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('ws-a metrics exclude ws-b prompts', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      const otherPrompt = metrics.top_risks.find((r) => r.prompt_id === 'p-other-ws');
      expect(otherPrompt).toBeUndefined();
    });

    it('ws-b returns its own data when non-empty', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-b');
      expect(metrics.total_prompts).toBe(1);
      expect(metrics.top_risks[0].prompt_id).toBe('p-other-ws');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Schema Validation
  // ═══════════════════════════════════════════════════════════════════════

  describe('Schema Validation', () => {
    it('metrics response matches Zod response schema', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      const payload = {
        success: true as const,
        data: metrics,
        generated_at: new Date().toISOString(),
      };
      const parsed = governanceMetricsResponseSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Limit: 0 returns ALL prompts
  // ═══════════════════════════════════════════════════════════════════════

  describe('listScorecards limit:0', () => {
    it('returns all prompts when limit is 0', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a', { limit: 0 });
      expect(result.data.length).toBe(6);
      expect(result.pagination.limit).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // NB1 Regression — adversarial gate on list path
  // ═══════════════════════════════════════════════════════════════════════

  describe('NB1 — Adversarial gate in list path (Tier 4)', () => {
    it('Tier 4 prompt with all approvals and tests is deploy-ready', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      const tier4 = result.data.find((s) => s.prompt_id === 'p-tier4');
      expect(tier4).toBeDefined();
      expect(tier4!.deployment_ready).toBe(true);
    });

    it('Tier 4 prompt missing adversarial pass is NOT deploy-ready', async () => {
      setFixtures({
        prompts: [
          { id: 'p-tier4-no-adv', workspace_id: 'ws-a', name: 'No Adv', status: 'draft', risk_tier: 'tier_4_critical', current_version_id: 'v-no-adv', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        ],
        prompt_versions: [
          { id: 'v-no-adv', prompt_id: 'p-tier4-no-adv', version_number: 1, body: 'No adv test', body_hash: 'x', immutable: false },
        ],
        prompt_approvals: [
          { id: 'ap-owner', workspace_id: 'ws-a', prompt_version_id: 'v-no-adv', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
          { id: 'ap-comp', workspace_id: 'ws-a', prompt_version_id: 'v-no-adv', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
          { id: 'ap-sec', workspace_id: 'ws-a', prompt_version_id: 'v-no-adv', reviewer_role: 'SECURITY_ADMIN', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
        ],
        prompt_test_runs: [
          { id: 'tr-std-only', workspace_id: 'ws-a', prompt_version_id: 'v-no-adv', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 90 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
        ],
        prompt_deployments: [],
        prompt_bindings: [],
        prompt_audit_ledger: [],
        prompt_evidence_links: [],
        prompt_test_suites: [],
        prompt_test_scenarios: [],
        prompt_knowledge_bindings: [],
        prompt_tool_permissions: [],
        prompt_drift_log: [],
        workspace_members: [{ user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' }],
      });
      const result = await PromptScorecardService.listScorecards('ws-a');
      const tier4 = result.data.find((s) => s.prompt_id === 'p-tier4-no-adv');
      expect(tier4).toBeDefined();
      expect(tier4!.deployment_ready).toBe(false);
    });

    it('Tier 2 prompt is deploy-ready with standard tests and approvals (no adversarial required)', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      const tier2 = result.data.find((s) => s.prompt_id === 'p-deploy-ok');
      expect(tier2).toBeDefined();
      expect(tier2!.deployment_ready).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // NB2 Regression — workspace_id guards on batch queries
  // ═══════════════════════════════════════════════════════════════════════

  describe('NB2 — Workspace guards on batch queries', () => {
    it('secondary tables filtered by workspace_id do not leak cross-workspace data', async () => {
      setFixtures({
        prompts: [
          { id: 'p-cross-ws-a', workspace_id: 'ws-a', name: 'A', status: 'draft', risk_tier: 'tier_1_low', current_version_id: 'v-cross-a', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
          { id: 'p-cross-ws-b', workspace_id: 'ws-b', name: 'B', status: 'draft', risk_tier: 'tier_2_medium', current_version_id: 'v-cross-b', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        ],
        prompt_versions: [
          { id: 'v-cross-a', prompt_id: 'p-cross-ws-a', version_number: 1, body: 'A', body_hash: 'a', immutable: false },
          { id: 'v-cross-b', prompt_id: 'p-cross-ws-b', version_number: 1, body: 'B', body_hash: 'b', immutable: false },
        ],
        // ws-b data should NOT leak into ws-a metrics
        prompt_approvals: [
          { id: 'ap-cross-a', workspace_id: 'ws-a', prompt_version_id: 'v-cross-a', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
          { id: 'ap-cross-b', workspace_id: 'ws-b', prompt_version_id: 'v-cross-b', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
        ],
        prompt_test_runs: [
          { id: 'tr-cross-a', workspace_id: 'ws-a', prompt_version_id: 'v-cross-a', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 90 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
        ],
        prompt_deployments: [],
        prompt_bindings: [],
        prompt_audit_ledger: [],
        prompt_evidence_links: [],
        prompt_test_suites: [],
        prompt_test_scenarios: [],
        prompt_knowledge_bindings: [],
        prompt_tool_permissions: [],
        prompt_drift_log: [],
        workspace_members: [{ user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' }],
      });
      const result = await PromptScorecardService.listScorecards('ws-a');
      expect(result.data.length).toBe(1);
      expect(result.data[0].prompt_id).toBe('p-cross-ws-a');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Route Contract (integration smoke)
  // ═══════════════════════════════════════════════════════════════════════

  describe('Route Contract', () => {
    it('computed metrics include all required fields', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      expect(metrics).toHaveProperty('total_prompts');
      expect(metrics).toHaveProperty('healthy_prompts');
      expect(metrics).toHaveProperty('warning_prompts');
      expect(metrics).toHaveProperty('critical_prompts');
      expect(metrics).toHaveProperty('average_score');
      expect(metrics).toHaveProperty('deploy_ready_count');
      expect(metrics).toHaveProperty('tier_distribution');
      expect(metrics).toHaveProperty('top_risks');
    });

    it('top_risks entries have prompt_id, prompt_name, overall_score, severity', async () => {
      const metrics = await GovernanceMetricsService.compute('ws-a');
      for (const risk of metrics.top_risks) {
        expect(risk).toHaveProperty('prompt_id');
        expect(risk).toHaveProperty('prompt_name');
        expect(risk).toHaveProperty('overall_score');
        expect(risk).toHaveProperty('severity');
      }
    });
  });
});

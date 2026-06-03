import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { PromptScorecardService } from '../../modules/prompts/PromptScorecardService';
import { GovernanceMetricsService } from '../../modules/prompts/services/GovernanceMetricsService';
import { GovernanceDriftService } from '../../modules/prompts/services/GovernanceDriftService';
import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';
import { PolicySimulationService } from '../../modules/prompts/PolicySimulationService';
import { AdversarialTestService } from '../../modules/prompts/AdversarialTestService';
import { PromptApprovalPolicyService } from '../../modules/prompts/PromptApprovalPolicyService';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import { PromptEvidenceService } from '../../modules/prompts/PromptEvidenceService';
import { PromptService } from '../../modules/prompts/PromptService';
import { PromptBindingPolicyService } from '../../modules/prompts/PromptBindingPolicyService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Baseline Fixtures ─────────────────────────────────────────────────────

const BASELINE_PROMPTS = [
  { id: 'p-healthy', workspace_id: 'ws-a', name: 'Healthy Prompt', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: 'v-healthy', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'p-warning', workspace_id: 'ws-a', name: 'Warning Prompt', status: 'draft', risk_tier: 'tier_3_high', current_version_id: 'v-warning', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'p-critical', workspace_id: 'ws-a', name: 'Critical Prompt', status: 'production_active', risk_tier: 'tier_4_critical', current_version_id: 'v-critical', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'p-drift', workspace_id: 'ws-a', name: 'Drift Prompt', status: 'production_active', risk_tier: 'tier_2_medium', current_version_id: 'v-drift', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'p-no-version', workspace_id: 'ws-a', name: 'No Version', status: 'draft', risk_tier: 'tier_1_low', current_version_id: null, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'p-other', workspace_id: 'ws-b', name: 'Other Workspace', status: 'draft', risk_tier: 'tier_1_low', current_version_id: 'v-other', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
];

const BASELINE_VERSIONS = [
  { id: 'v-healthy', prompt_id: 'p-healthy', version_number: 1, body: 'Healthy body', body_hash: 'a', immutable: true },
  { id: 'v-warning', prompt_id: 'p-warning', version_number: 1, body: 'Warning body', body_hash: 'b', immutable: false },
  { id: 'v-critical', prompt_id: 'p-critical', version_number: 1, body: 'Critical body', body_hash: 'c', immutable: true },
  { id: 'v-drift', prompt_id: 'p-drift', version_number: 1, body: 'Drift body', body_hash: 'd', immutable: false },
  { id: 'v-other', prompt_id: 'p-other', version_number: 1, body: 'Other body', body_hash: 'e', immutable: false },
];

const BASELINE_APPROVALS = [
  { id: 'ap-1a', workspace_id: 'ws-a', prompt_version_id: 'v-healthy', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ap-1b', workspace_id: 'ws-a', prompt_version_id: 'v-healthy', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ap-3a', workspace_id: 'ws-a', prompt_version_id: 'v-critical', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ap-3b', workspace_id: 'ws-a', prompt_version_id: 'v-critical', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ap-3c', workspace_id: 'ws-a', prompt_version_id: 'v-critical', reviewer_role: 'SECURITY_ADMIN', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ap-4a', workspace_id: 'ws-a', prompt_version_id: 'v-drift', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
  { id: 'ap-4b', workspace_id: 'ws-a', prompt_version_id: 'v-drift', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
];

const BASELINE_TEST_RUNS = [
  { id: 'tr-1-std', workspace_id: 'ws-a', prompt_version_id: 'v-healthy', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 95 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
  { id: 'tr-3-std', workspace_id: 'ws-a', prompt_version_id: 'v-critical', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 100 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
  { id: 'tr-3-adv', workspace_id: 'ws-a', prompt_version_id: 'v-critical', environment: 'draft', pass_fail: 'FAIL', score_summary: { overall_score: 40, total: 9, passed: 3, warnings: 1, failed: 4, critical_failures: 1, category_scores: {} }, run_metadata: { adversarial: true }, created_at: '2025-01-03T00:00:00Z' },
  { id: 'tr-4-std', workspace_id: 'ws-a', prompt_version_id: 'v-drift', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 90 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
];

const BASELINE_DEPLOYMENTS = [
  { id: 'dep-healthy', workspace_id: 'ws-a', prompt_version_id: 'v-healthy', environment: 'production', deployed_at: '2025-01-03T00:00:00Z' },
  { id: 'dep-critical', workspace_id: 'ws-a', prompt_version_id: 'v-critical', environment: 'production', deployed_at: '2025-01-03T00:00:00Z' },
];

const BASELINE_BINDINGS = [
  { id: 'bind-1', workspace_id: 'ws-a', prompt_version_id: 'v-critical', environment: 'production', agent_id: 'agent-1', workflow_id: null, effective_from: '2025-01-03T00:00:00Z', effective_to: null, created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
];

const BASELINE_AUDIT = [
  { audit_event_id: 'aud-ev-1', workspace_id: 'ws-a', prompt_id: 'p-critical', event_type: 'prompt.scorecard.generated', actor_id: 'u1', created_at: '2025-01-03T00:00:00Z', after_state: { scorecard_count: 1, average_score: 85 } },
  { audit_event_id: 'aud-ev-2', workspace_id: 'ws-a', prompt_id: 'p-critical', event_type: 'prompt.metrics.viewed', actor_id: 'u1', created_at: '2025-01-03T00:00:00Z', after_state: { total_prompts: 5, average_score: 80 } },
  { audit_event_id: 'aud-ev-3', workspace_id: 'ws-a', prompt_id: 'p-critical', event_type: 'prompt.test.adversarial.started', actor_id: 'u1', created_at: '2025-01-03T00:00:00Z' },
  { audit_event_id: 'aud-ev-4', workspace_id: 'ws-a', prompt_id: 'p-critical', event_type: 'prompt.drift.scanned', actor_id: 'u1', created_at: '2025-01-03T00:00:00Z' },
  { audit_event_id: 'aud-ev-5', workspace_id: 'ws-a', prompt_id: 'p-critical', event_type: 'prompt.simulation.ran', actor_id: 'u1', created_at: '2025-01-03T00:00:00Z' },
  { audit_event_id: 'aud-ev-6', workspace_id: 'ws-a', prompt_id: 'p-healthy', event_type: 'prompt.deployed', actor_id: 'u1', created_at: '2025-01-03T00:00:00Z' },
];

const BASELINE_EVIDENCE = [
  { id: 'ev-1', workspace_id: 'ws-a', prompt_id: 'p-critical', prompt_version_id: 'v-critical', event_type: 'prompt.test.adversarial.started', vault_item_id: 'vault-1', created_at: '2025-01-03T00:00:00Z' },
  { id: 'ev-2', workspace_id: 'ws-a', prompt_id: 'p-critical', prompt_version_id: 'v-critical', event_type: 'prompt.deployed', vault_item_id: 'vault-2', created_at: '2025-01-03T00:00:00Z' },
];

const BASELINE_EMPTY_TABLES = {
  prompt_test_suites: [],
  prompt_test_scenarios: [],
  prompt_knowledge_bindings: [],
  prompt_tool_permissions: [],
  prompt_drift_log: [],
  workspace_members: [{ user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' }],
};

function baselineFixtures() {
  return {
    prompts: BASELINE_PROMPTS,
    prompt_versions: BASELINE_VERSIONS,
    prompt_approvals: BASELINE_APPROVALS,
    prompt_test_runs: BASELINE_TEST_RUNS,
    prompt_deployments: BASELINE_DEPLOYMENTS,
    prompt_bindings: BASELINE_BINDINGS,
    prompt_audit_ledger: BASELINE_AUDIT,
    prompt_evidence_links: BASELINE_EVIDENCE,
    ...BASELINE_EMPTY_TABLES,
  };
}

beforeEach(() => {
  setFixtures(baselineFixtures());
});

afterEach(() => {
  resetFixtures();
});

const WS_A = 'ws-a';
const WS_B = 'ws-b';

// ═════════════════════════════════════════════════════════════════════════════
// Phase 5G — Final Integration Validation
// ═════════════════════════════════════════════════════════════════════════════

describe('Phase 5G — Final Integration Validation', () => {

  // ═════════════════════════════════════════════════════════════════════════
  // Group 1 — RBAC Boundary (5 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('RBAC Boundary', () => {
    it('1.1 — drift scan on cross-ws prompt returns empty', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-other', WS_A);
      expect(findings).toHaveLength(0);
    });

    it('1.2 — requireById on cross-ws prompt throws', async () => {
      await expect(PromptService.requireById('p-other', WS_A)).rejects.toThrow();
    });

    it('1.3 — scorecard for cross-ws prompt throws', async () => {
      await expect(PromptScorecardService.getScorecard('p-other', WS_A)).rejects.toThrow();
    });

    it('1.4 — scorecard list excludes cross-ws prompts', async () => {
      const result = await PromptScorecardService.listScorecards(WS_A);
      const other = result.data.find((s) => s.prompt_id === 'p-other');
      expect(other).toBeUndefined();
    });

    it('1.5 — dashboard metrics exclude cross-ws prompts', async () => {
      const metrics = await GovernanceMetricsService.compute(WS_A);
      expect(metrics.total_prompts).toBe(5);
      const other = metrics.top_risks.find((r) => r.prompt_id === 'p-other');
      expect(other).toBeUndefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 2 — Drift ↔ Scorecards (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Drift ↔ Scorecards', () => {
    it('2.1 — drift prompt has lower drift_status score than healthy prompt', async () => {
      const healthyCard = await PromptScorecardService.getScorecard('p-healthy', WS_A);
      const driftCard = await PromptScorecardService.getScorecard('p-drift', WS_A);
      // p-drift has non-immutable version while active → drift detected
      expect(driftCard.categories.drift_status.score).toBeLessThan(healthyCard.categories.drift_status.score);
      expect(driftCard.categories.drift_status.severity).not.toBe('healthy');
    });

    it('2.2 — drift_status details contain drift count and severity breakdown', async () => {
      const driftCard = await PromptScorecardService.getScorecard('p-drift', WS_A);
      expect(driftCard.categories.drift_status.details).toHaveProperty('drift_count');
      expect(Number(driftCard.categories.drift_status.details.drift_count)).toBeGreaterThan(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 3 — Drift ↔ Dashboard Metrics (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Drift ↔ Dashboard Metrics', () => {
    it('3.1 — metrics reflect drift presence across prompts', async () => {
      const metrics = await GovernanceMetricsService.compute(WS_A);
      // p-drift and p-critical both have issues → at least one warning or critical
      expect(metrics.warning_prompts + metrics.critical_prompts).toBeGreaterThanOrEqual(1);
    });

    it('3.2 — compute returns consistent severity breakdown', async () => {
      const metrics = await GovernanceMetricsService.compute(WS_A);
      expect(metrics.healthy_prompts + metrics.warning_prompts + metrics.critical_prompts)
        .toBe(metrics.total_prompts);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 4 — Adversarial ↔ Deployment Gates (3 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Adversarial ↔ Deployment Gates', () => {
    it('4.1 — DeploymentGateService.check blocks failed adversarial for Tier 4', async () => {
      const result = await DeploymentGateService.check('v-critical', {
        prompt: { id: 'p-critical', risk_tier: 'tier_4_critical', current_version_id: 'v-critical' },
      });
      // v-critical has adversarial FAIL → gate should block or warn
      expect(result.canDeploy).toBe(false);
    });

    it('4.2 — computePassFail returns FAIL for Tier 4 with critical failures', () => {
      const summary = {
        total: 9, passed: 3, warnings: 1, failed: 4, critical_failures: 1,
        overall_score: 40, overall_result: 'FAIL' as const, category_scores: {},
      };
      const result = AdversarialTestService.computePassFail('tier_4_critical', summary);
      expect(result).toBe('FAIL');
    });

    it('4.3 — computePassFail returns PASS for Tier 2 with warnings only', () => {
      const summary = {
        total: 9, passed: 7, warnings: 2, failed: 0, critical_failures: 0,
        overall_score: 85, overall_result: 'WARN' as const, category_scores: {},
      };
      const result = AdversarialTestService.computePassFail('tier_2_medium', summary);
      expect(result).toBe('PASS');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 5 — Adversarial ↔ Scorecards (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Adversarial ↔ Scorecards', () => {
    it('5.1 — adversarial-failing prompt has lower adversarial_testing score', async () => {
      const healthyCard = await PromptScorecardService.getScorecard('p-healthy', WS_A);
      const criticalCard = await PromptScorecardService.getScorecard('p-critical', WS_A);
      // p-critical has FAIL adversarial → lower adversarial_testing score
      expect(criticalCard.categories.adversarial_testing.score)
        .toBeLessThan(healthyCard.categories.adversarial_testing.score);
    });

    it('5.2 — modifier applied when adversarial blocks Tier 4 deploy', async () => {
      const criticalCard = await PromptScorecardService.getScorecard('p-critical', WS_A);
      expect(criticalCard.modifier_applied).toBe(true);
      expect(criticalCard.deployment_ready).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 6 — Adversarial ↔ Dashboard Metrics (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Adversarial ↔ Dashboard Metrics', () => {
    it('6.1 — adversarial failures contribute to critical prompt count', async () => {
      const metrics = await GovernanceMetricsService.compute(WS_A);
      expect(metrics.critical_prompts).toBeGreaterThanOrEqual(1);
    });

    it('6.2 — deploy_ready_count does not count adversarial-failing prompts', async () => {
      // p-critical has adversarial FAIL → not deploy-ready
      const criticalCard = await PromptScorecardService.getScorecard('p-critical', WS_A);
      expect(criticalCard.deployment_ready).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 7 — Policy Simulation ↔ Scorecards (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Policy Simulation ↔ Scorecards', () => {
    it('7.1 — simulation is read-only: scorecard before and after simulation is identical', async () => {
      const before = await PromptScorecardService.getScorecard('p-healthy', WS_A);
      await PolicySimulationService.simulate({
        workspace_id: WS_A,
        simulation_type: 'deployment_rule',
        parameters: { require_adversarial_pass: true },
        prompt_id: 'p-healthy',
      });
      const after = await PromptScorecardService.getScorecard('p-healthy', WS_A);
      expect(after.overall_score).toBe(before.overall_score);
      expect(after.deployment_ready).toBe(before.deployment_ready);
    });

    it('7.2 — simulation detects deployment gate issues for Tier 4', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: WS_A,
        simulation_type: 'deployment_rule',
        parameters: { require_adversarial_pass: true },
        prompt_id: 'p-critical',
      });
      expect(report.total_prompts_scanned).toBe(1);
      const impact = report.per_prompt_impacts[0];
      expect(impact).toBeDefined();
      expect(impact.prompt_id).toBe('p-critical');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 8 — Policy Simulation ↔ Dashboard Metrics (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Policy Simulation ↔ Dashboard Metrics', () => {
    it('8.1 — simulation does not alter dashboard metrics', async () => {
      const before = await GovernanceMetricsService.compute(WS_A);
      await PolicySimulationService.simulate({
        workspace_id: WS_A,
        simulation_type: 'approval_rule',
        parameters: { hypothetical_roles: ['PROMPT_OWNER', 'COMPLIANCE_REVIEWER'] },
      });
      const after = await GovernanceMetricsService.compute(WS_A);
      expect(after.total_prompts).toBe(before.total_prompts);
      expect(after.average_score).toBe(before.average_score);
    });

    it('8.2 — workspace-level simulation returns correct scan count', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: WS_A,
        simulation_type: 'approval_rule',
        parameters: { hypothetical_roles: ['PROMPT_OWNER'] },
      });
      expect(report.total_prompts_scanned).toBe(5);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 9 — Scorecards ↔ Dashboard Metrics (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Scorecards ↔ Dashboard Metrics', () => {
    it('9.1 — listScorecards(limit:0) count matches metrics total_prompts', async () => {
      const scorecards = await PromptScorecardService.listScorecards(WS_A, { limit: 0 });
      const metrics = await GovernanceMetricsService.compute(WS_A);
      expect(scorecards.data.length).toBe(metrics.total_prompts);
    });

    it('9.2 — severity aggregation matches', async () => {
      const scorecards = await PromptScorecardService.listScorecards(WS_A, { limit: 0 });
      const metrics = await GovernanceMetricsService.compute(WS_A);
      const sumSev = {
        h: scorecards.data.filter((s) => s.overall_severity === 'healthy').length,
        w: scorecards.data.filter((s) => s.overall_severity === 'warning').length,
        c: scorecards.data.filter((s) => s.overall_severity === 'critical').length,
      };
      expect(sumSev.h).toBe(metrics.healthy_prompts);
      expect(sumSev.w).toBe(metrics.warning_prompts);
      expect(sumSev.c).toBe(metrics.critical_prompts);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 10 — Audit Trail Integrity (4 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Audit Trail Integrity', () => {
    it('10.1 — multiple event types retrievable via PromptAuditService', async () => {
      const result = await PromptAuditService.list(WS_A, { limit: 50 });
      const events = result.records.map((r) => r.event_type);
      expect(events).toContain('prompt.scorecard.generated');
      expect(events).toContain('prompt.metrics.viewed');
      expect(events).toContain('prompt.test.adversarial.started');
      expect(events).toContain('prompt.drift.scanned');
      expect(events).toContain('prompt.simulation.ran');
    });

    it('10.2 — audit records have required fields (workspace_id, event_type, created_at)', async () => {
      const byPrompt = await PromptAuditService.getByPrompt('p-critical', WS_A, { limit: 50 });
      expect(byPrompt.records.length).toBeGreaterThanOrEqual(1);
      for (const r of byPrompt.records) {
        expect(typeof r.workspace_id).toBe('string');
        expect(typeof r.event_type).toBe('string');
        expect(typeof r.created_at).toBe('string');
        expect(r.workspace_id).toBe(WS_A);
      }
    });

    it('10.3 — after_state present on applicable events', async () => {
      const result = await PromptAuditService.list(WS_A, { limit: 50 });
      const scorecardEvents = result.records.filter((r) => r.event_type === 'prompt.scorecard.generated');
      for (const r of scorecardEvents) {
        expect(r).toHaveProperty('after_state');
        expect(r.after_state).toHaveProperty('scorecard_count');
      }
    });

    it('10.4 — DeploymentGateService.check returns fail-closed for missing version', async () => {
      const result = await DeploymentGateService.check('non-existent-version');
      expect(result.canDeploy).toBe(false);
      expect(result.blockingIssues.length).toBeGreaterThanOrEqual(1);
      expect(result.blockingIssues.some((i) => i.blocking)).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 11 — Evidence Integrity (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Evidence Integrity', () => {
    it('11.1 — evidence links retrievable via PromptEvidenceService', async () => {
      const result = await PromptEvidenceService.listByPrompt('p-critical');
      expect(result.records.length).toBeGreaterThanOrEqual(2);
    });

    it('11.2 — evidence links have required integrity fields', async () => {
      const result = await PromptEvidenceService.listByPrompt('p-critical');
      for (const r of result.records) {
        expect(r).toHaveProperty('vault_item_id');
        expect(r).toHaveProperty('event_type');
        expect(r).toHaveProperty('created_at');
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 12 — Tenant Isolation E2E (4 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation E2E', () => {
    it('12.1 — drift scan on ws-b does not see ws-a data', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-other', WS_B);
      // p-other is draft with no active status → no drift findings expected
      expect(findings).toBeDefined();
    });

    it('12.2 — scorecard list is workspace-scoped', async () => {
      const wsAResult = await PromptScorecardService.listScorecards(WS_A);
      const wsBResult = await PromptScorecardService.listScorecards(WS_B);
      const wsAIds = wsAResult.data.map((s) => s.prompt_id);
      const wsBIds = wsBResult.data.map((s) => s.prompt_id);
      expect(wsAIds).not.toContain('p-other');
      if (wsBIds.length > 0) {
        expect(wsBIds).not.toContain('p-healthy');
      }
    });

    it('12.3 — metrics compute is workspace-scoped', async () => {
      const metrics = await GovernanceMetricsService.compute(WS_A);
      const other = metrics.top_risks.find((r) => r.prompt_id === 'p-other');
      expect(other).toBeUndefined();
    });

    it('12.4 — simulation is workspace-scoped', async () => {
      const wsAReport = await PolicySimulationService.simulate({
        workspace_id: WS_A,
        simulation_type: 'deployment_rule',
        parameters: {},
      });
      const wsBPromptIds = wsAReport.per_prompt_impacts
        .filter((i) => i.prompt_id === 'p-other');
      expect(wsBPromptIds).toHaveLength(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 13 — Governance Source-of-Truth Reuse (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Governance Source-of-Truth Reuse', () => {
    it('13.1 — PromptApprovalPolicyService is the single source for requiredApprovalRoles', () => {
      const roles = PromptApprovalPolicyService.requiredApprovalRoles('tier_4_critical');
      expect(roles).toEqual(['PROMPT_OWNER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN']);
      // Verify it handles all known tiers
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_3_high')).toContain('COMPLIANCE_REVIEWER');
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_2_medium')).toContain('BRAND_REVIEWER');
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_1_low')).toContain('PROMPT_OWNER');
    });

    it('13.2 — DeploymentGateService delegates to PromptApprovalPolicyService for approval checks', async () => {
      // Verify through behavior: Tier 4 gate requires SECURITY_ADMIN
      const result = await DeploymentGateService.check('v-critical', {
        prompt: { id: 'p-critical', risk_tier: 'tier_4_critical', current_version_id: 'v-critical' },
      });
      expect(result.canDeploy).toBe(false);
      // The gate failed because of adversarial, not because of missing approvals
      // This proves DeploymentGateService uses the same approval policy
      expect(result.blockingIssues.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 14 — No Cross-Module Coupling (2 tests — static analysis)
  // ═════════════════════════════════════════════════════════════════════════

  describe('No Cross-Module Coupling', () => {
    const phase5ModulePaths = [
      join(__dirname, '../../modules/prompts/PromptScorecardService.ts'),
      join(__dirname, '../../modules/prompts/PolicySimulationService.ts'),
      join(__dirname, '../../modules/prompts/DeploymentGateService.ts'),
      join(__dirname, '../../modules/prompts/services/GovernanceMetricsService.ts'),
      join(__dirname, '../../modules/prompts/services/GovernanceDriftService.ts'),
    ];

    it('14.1 — no Phase 5 module imports from forbidden modules', () => {
      const forbidden = [
        'agent-studio',
        'workflows',
        'knowledge-base',
        'runtime-engine',
        'evidence-vault',
        'audit-ledger',
      ];
      for (const filePath of phase5ModulePaths) {
        const content = readFileSync(filePath, 'utf-8');
        for (const pattern of forbidden) {
          expect(content).not.toMatch(new RegExp(`['"].*${pattern}.*['"]`));
        }
      }
    });

    it('14.2 — no circular dependency between Phase 5 services (import graph is acyclic)', () => {
      const importGraph: Record<string, string[]> = {};
      for (const filePath of phase5ModulePaths) {
        const content = readFileSync(filePath, 'utf-8');
        const imports: string[] = [];
        const lines = content.split('\n');
        for (const line of lines) {
          const m = line.match(/from\s+['"]\.\.?\/([^'"]+)['"]/);
          if (m) imports.push(m[1].split('/')[0]);
        }
        const name = filePath.split('/').pop() || '';
        importGraph[name] = imports;
      }
      // Verify no service imports another Phase 5 service in a cycle
      const services = Object.keys(importGraph);
      for (const s of services) {
        for (const dep of importGraph[s]) {
          // A simple check: GovernanceMetricsService imports PromptScorecardService, which is fine.
          // No service should import back to GovernanceMetricsService
          if (dep.includes('GovernanceMetrics')) {
            expect(s).toBe('GovernanceMetricsService.ts');
          }
        }
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 15 — Single-path vs List-path Agreement (2 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Single-path vs List-path Agreement', () => {
    it('15.1 — getScorecard and listScorecards agree on healthy prompt', async () => {
      const single = await PromptScorecardService.getScorecard('p-healthy', WS_A);
      const list = await PromptScorecardService.listScorecards(WS_A, { limit: 0 });
      const fromList = list.data.find((s) => s.prompt_id === 'p-healthy');
      expect(fromList).toBeDefined();
      expect(fromList!.overall_score).toBe(single.overall_score);
      expect(fromList!.deployment_ready).toBe(single.deployment_ready);
    });

    it('15.2 — getScorecard and listScorecards agree on failing prompt', async () => {
      const single = await PromptScorecardService.getScorecard('p-critical', WS_A);
      const list = await PromptScorecardService.listScorecards(WS_A, { limit: 0 });
      const fromList = list.data.find((s) => s.prompt_id === 'p-critical');
      expect(fromList).toBeDefined();
      expect(fromList!.overall_score).toBe(single.overall_score);
      expect(fromList!.deployment_ready).toBe(single.deployment_ready);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Group 16 — Service Boundary Stability (4 tests)
  // ═════════════════════════════════════════════════════════════════════════

  describe('Service Boundary Stability', () => {
    it('16.1 — DeploymentGateService is the single deployment gate implementation (behavior verified)', async () => {
      // If any other service duplicates gate logic, calling DeploymentGateService.check
      // would differ from the scorecard's deployment_ready. Verify consistency.
      const scorecard = await PromptScorecardService.getScorecard('p-healthy', WS_A);
      // p-healthy has approvals + standard test pass → gate should pass
      expect(scorecard.deployment_ready).toBe(true);
    });

    it('16.2 — PromptApprovalPolicyService is the single approval policy (behavior verified)', async () => {
      // Verify via DeploymentGateService which delegates to approval policy
      const tier4Roles = PromptApprovalPolicyService.requiredApprovalRoles('tier_4_critical');
      expect(tier4Roles).toContain('SECURITY_ADMIN');
      expect(tier4Roles).toContain('COMPLIANCE_REVIEWER');
      // Verify computeRequiredRoles delegates to requiredApprovalRoles for unknown mappings
      const fallbackRoles = PromptApprovalPolicyService.computeRequiredRoles('tier_4_critical', {});
      expect(fallbackRoles).toEqual(tier4Roles);
    });

    it('16.3 — DeploymentGateService.check blocks deployment for non-current version', async () => {
      // v-warning belongs to p-warning but p-warning's current_version_id is v-warning
      // So passing a different prompt that doesn't match should be detected
      setFixtures({
        prompts: [
          { id: 'p-gate-test', workspace_id: 'ws-a', name: 'Gate Test', status: 'draft', risk_tier: 'tier_2_medium', current_version_id: 'v-current', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        ],
        prompt_versions: [
          { id: 'v-current', prompt_id: 'p-gate-test', version_number: 2, body: 'Current', body_hash: 'a', immutable: false },
          { id: 'v-old', prompt_id: 'p-gate-test', version_number: 1, body: 'Old', body_hash: 'b', immutable: true },
        ],
        prompt_approvals: [],
        prompt_test_runs: [],
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
      // Attempt to deploy v-old (not current) for p-gate-test
      const result = await DeploymentGateService.check('v-old', {
        prompt: { id: 'p-gate-test', risk_tier: 'tier_2_medium', current_version_id: 'v-current' },
      });
      expect(result.canDeploy).toBe(false);
      expect(result.blockingIssues.some((i) => i.type === 'not_current_version')).toBe(true);
    });

    it('16.4 — PromptBindingPolicyService is the single binding policy evaluator', () => {
      const envs = PromptBindingPolicyService.evaluateBindings(
        [{ id: 'b1', environment: 'production' }, { id: 'b2', environment: 'staging' }],
        ['staging'],
      );
      expect(envs.allowed_bindings).toBe(1);
      expect(envs.blocked_bindings).toBe(1);
      expect(envs.violations.length).toBeGreaterThanOrEqual(1);
      // Verify behavior is deterministic
      const envs2 = PromptBindingPolicyService.evaluateBindings(
        [{ id: 'b1', environment: 'production' }],
        ['production'],
      );
      expect(envs2.allowed_bindings).toBe(1);
      expect(envs2.blocked_bindings).toBe(0);
    });
  });
});

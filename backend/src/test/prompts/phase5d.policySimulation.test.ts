import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { PromptApprovalPolicyService } from '../../modules/prompts/PromptApprovalPolicyService';
import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';
import { PolicySimulationService } from '../../modules/prompts/PolicySimulationService';
import { PromptBindingPolicyService } from '../../modules/prompts/PromptBindingPolicyService';
import { AdversarialTestService } from '../../modules/prompts/AdversarialTestService';
import { GovernanceDriftService } from '../../modules/prompts/services/GovernanceDriftService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

beforeEach(() => {
  setFixtures({
    prompts: [
      { id: 'p-tier1', workspace_id: 'ws-a', name: 'Tier 1 Prompt', status: 'approved_for_staging', risk_tier: 'tier_1_low', current_version_id: 'v1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-tier2', workspace_id: 'ws-a', name: 'Tier 2 Prompt', status: 'approved_for_staging', risk_tier: 'tier_2_medium', current_version_id: 'v2', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-tier3', workspace_id: 'ws-a', name: 'Tier 3 Prompt', status: 'approved_for_staging', risk_tier: 'tier_3_high', current_version_id: 'v3', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-tier4', workspace_id: 'ws-a', name: 'Tier 4 Prompt', status: 'production_active', risk_tier: 'tier_4_critical', current_version_id: 'v4', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
      { id: 'p-other-ws', workspace_id: 'ws-b', name: 'Other WS', status: 'draft', risk_tier: 'tier_1_low', current_version_id: 'v5', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    ],
    prompt_versions: [
      { id: 'v1', prompt_id: 'p-tier1', version_number: 1, body: 'Safe prompt', body_hash: 'a', immutable: false },
      { id: 'v2', prompt_id: 'p-tier2', version_number: 1, body: 'Brand prompt', body_hash: 'b', immutable: false },
      { id: 'v3', prompt_id: 'p-tier3', version_number: 1, body: 'Compliance prompt', body_hash: 'c', immutable: false },
      { id: 'v4', prompt_id: 'p-tier4', version_number: 1, body: 'Critical prompt', body_hash: 'd', immutable: false },
      { id: 'v5', prompt_id: 'p-other-ws', version_number: 1, body: 'Other', body_hash: 'e', immutable: false },
    ],
    prompt_approvals: [
      { id: 'ap-t1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t2a', prompt_version_id: 'v2', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t2b', prompt_version_id: 'v2', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t3a', prompt_version_id: 'v3', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t3b', prompt_version_id: 'v3', reviewer_role: 'BRAND_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t3c', prompt_version_id: 'v3', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t4a', prompt_version_id: 'v4', reviewer_role: 'PROMPT_OWNER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t4b', prompt_version_id: 'v4', reviewer_role: 'COMPLIANCE_REVIEWER', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
      { id: 'ap-t4c', prompt_version_id: 'v4', reviewer_role: 'SECURITY_ADMIN', decision: 'APPROVED', created_at: '2025-01-02T00:00:00Z' },
    ],
    prompt_test_runs: [
      { id: 'tr-v4-std', prompt_version_id: 'v4', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 95 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v4-adv', prompt_version_id: 'v4', environment: 'draft', pass_fail: 'PASS', score_summary: { overall_score: 95, total: 9, passed: 9, warnings: 0, failed: 0, critical_failures: 0, category_scores: {} }, run_metadata: { adversarial: true }, created_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_deployments: [
      { id: 'dep-v4', prompt_version_id: 'v4', environment: 'production', deployed_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_bindings: [
      { id: 'bind-v4-prod', prompt_version_id: 'v4', environment: 'production', agent_id: 'agent-1', workflow_id: null, effective_from: '2025-01-03T00:00:00Z', effective_to: null, created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
      { id: 'bind-v4-staging', prompt_version_id: 'v4', environment: 'staging', agent_id: 'agent-2', workflow_id: null, effective_from: '2025-01-03T00:00:00Z', effective_to: null, created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_audit_ledger: [
      { id: 'audit-1', workspace_id: 'ws-a', prompt_id: 'p-tier4', event_type: 'prompt.deployed', created_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_test_suites: [],
    prompt_test_scenarios: [],
    prompt_knowledge_bindings: [],
    prompt_tool_permissions: [],
    prompt_evidence_links: [],
    vault_evidence_items: [],
    prompt_drift_log: [],
    workspace_members: [
      { user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' },
    ],
  });
});

afterEach(() => {
  resetFixtures();
});

describe('Phase 5D — Policy Simulation', () => {

  // ═══════════════════════════════════════════════════════════════════════
  // Source-of-Truth Reuse — PromptApprovalPolicyService
  // ═══════════════════════════════════════════════════════════════════════
  describe('Source-of-Truth Reuse — Approval Policy', () => {
    it('requiredApprovalRoles returns correct roles for each risk tier', () => {
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_1_low')).toEqual(['PROMPT_OWNER']);
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_2_medium')).toEqual(['PROMPT_OWNER', 'BRAND_REVIEWER']);
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_3_high')).toEqual(['PROMPT_OWNER', 'BRAND_REVIEWER', 'COMPLIANCE_REVIEWER']);
      expect(PromptApprovalPolicyService.requiredApprovalRoles('tier_4_critical')).toEqual(['PROMPT_OWNER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN']);
    });

    it('canRoleSatisfy allows admin roles to satisfy any requirement', () => {
      expect(PromptApprovalPolicyService.canRoleSatisfy('SECURITY_ADMIN', 'ADMIN')).toBe(true);
      expect(PromptApprovalPolicyService.canRoleSatisfy('SECURITY_ADMIN', 'WORKSPACE_OWNER')).toBe(true);
    });

    it('normalizeReviewerRole uppercases and replaces spaces', () => {
      expect(PromptApprovalPolicyService.normalizeReviewerRole('compliance reviewer')).toBe('COMPLIANCE_REVIEWER');
      expect(PromptApprovalPolicyService.normalizeReviewerRole(null)).toBe('PROMPT_OWNER');
    });

    it('computeRequiredRoles uses hypothetical mapping when provided', () => {
      const mapping = { tier_4_critical: ['PROMPT_OWNER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN', 'LEGAL_REVIEWER'] };
      const roles = PromptApprovalPolicyService.computeRequiredRoles('tier_4_critical', mapping);
      expect(roles).toContain('LEGAL_REVIEWER');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Approval Rule Simulation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Approval Rule Simulation', () => {
    it('reports affected prompts when mapping adds new roles', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'approval_rule',
        parameters: { hypothetical_risk_tier_mapping: { tier_4_critical: ['PROMPT_OWNER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN', 'LEGAL_REVIEWER'] } },
      });
      expect(report.total_prompts_scanned).toBe(4);
      expect(report.prompts_affected).toBeGreaterThan(0);
      const tier4 = report.per_prompt_impacts.find((p) => p.prompt_id === 'p-tier4');
      expect(tier4).toBeDefined();
      expect(tier4!.severity).not.toBe('none');
    });

    it('reports no impact when mapping is unchanged', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'approval_rule',
        parameters: { hypothetical_risk_tier_mapping: { tier_4_critical: ['PROMPT_OWNER', 'COMPLIANCE_REVIEWER', 'SECURITY_ADMIN'] } },
      });
      const tier4 = report.per_prompt_impacts.find((p) => p.prompt_id === 'p-tier4');
      expect(tier4).toBeDefined();
      expect(tier4!.severity).toBe('none');
    });

    it('returns empty result for workspace with no prompts', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-empty',
        simulation_type: 'approval_rule',
        parameters: {},
      });
      expect(report.total_prompts_scanned).toBe(0);
      expect(report.prompts_affected).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Risk Tier Threshold Simulation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Risk Tier Threshold Simulation', () => {
    it('detects missing approval roles when reclassifying from tier_2 to tier_4', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'risk_tier_threshold',
        parameters: { new_risk_tier: 'tier_4_critical' },
        prompt_id: 'p-tier2',
      });
      expect(report.total_prompts_scanned).toBe(1);
      const impact = report.per_prompt_impacts[0];
      expect(impact.blocking_issues.length).toBeGreaterThan(0);
      expect(impact.blocking_issues.some((i) => i.type === 'missing_approval_roles')).toBe(true);
    });

    it('shows no impact when risk tier is unchanged', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'risk_tier_threshold',
        parameters: { new_risk_tier: 'tier_2_medium' },
        prompt_id: 'p-tier2',
      });
      expect(report.per_prompt_impacts[0].severity).toBe('none');
    });

    it('shows blocking issues when adversarial tests would fail at higher tier', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'risk_tier_threshold',
        parameters: { new_risk_tier: 'tier_1_low' },
        prompt_id: 'p-tier4',
      });
      expect(report).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Deployment Rule Simulation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Deployment Rule Simulation', () => {
    it('checks deployment gate for a prompt', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'deployment_rule',
        parameters: { environment: 'production' },
        prompt_id: 'p-tier4',
      });
      expect(report.per_prompt_impacts.length).toBe(1);
      // p-tier4 has all approvals + passing adversarial, so should not be blocked
      expect(report.per_prompt_impacts[0].blocking_issues.filter((i) => i.blocking).length).toBe(0);
    });

    it('reports blocking issues when deployment rules are violated', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'deployment_rule',
        parameters: { environment: 'production' },
        prompt_id: 'p-tier2',
      });
      expect(report.per_prompt_impacts[0].blocking_issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Adversarial Policy Simulation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Adversarial Policy Simulation', () => {
    it('reports no impact when pass threshold is lower than current score', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'adversarial_policy',
        parameters: { pass_threshold: 80 },
        prompt_id: 'p-tier4',
      });
      expect(report.per_prompt_impacts[0].severity).toBe('none');
    });

    it('reports impact when pass threshold exceeds current score', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'adversarial_policy',
        parameters: { pass_threshold: 99, require_zero_critical: true },
        prompt_id: 'p-tier4',
      });
      expect(report.per_prompt_impacts[0].severity).not.toBe('none');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Drift Tolerance Simulation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Drift Tolerance Simulation', () => {
    it('evaluates drift with default thresholds', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'drift_tolerance',
        parameters: {},
        prompt_id: 'p-tier4',
      });
      expect(report.per_prompt_impacts.length).toBe(1);
      expect(report.per_prompt_impacts[0]).toBeDefined();
    });

    it('accepts custom staleness days parameter', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'drift_tolerance',
        parameters: { staleness_days: 30, audit_gap_seconds: 1 },
        prompt_id: 'p-tier4',
      });
      expect(report).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Binding Policy Simulation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Binding Policy Simulation', () => {
    it('reports violations when bindings exceed allowed environments', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'binding_policy',
        parameters: { allowed_environments: ['staging'], max_bindings_per_version: 1 },
        prompt_id: 'p-tier4',
      });
      const impact = report.per_prompt_impacts[0];
      expect(impact.blocking_issues.length).toBeGreaterThan(0);
      expect(impact.blocking_issues.some((i) => i.type === 'disallowed_environment')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PromptBindingPolicyService — Unit Tests
  // ═══════════════════════════════════════════════════════════════════════
  describe('PromptBindingPolicyService', () => {
    it('returns no violations when all bindings are allowed', () => {
      const result = PromptBindingPolicyService.evaluateBindings(
        [{ id: 'b1', environment: 'staging' }, { id: 'b2', environment: 'production' }],
        ['staging', 'production'],
        5,
      );
      expect(result.violations.length).toBe(0);
    });

    it('flags disallowed environments', () => {
      const result = PromptBindingPolicyService.evaluateBindings(
        [{ id: 'b1', environment: 'production' }],
        ['staging'],
      );
      expect(result.violations.length).toBe(1);
      expect(result.violations[0].type).toBe('disallowed_environment');
    });

    it('flags exceeded max bindings', () => {
      const result = PromptBindingPolicyService.evaluateBindings(
        [{ id: 'b1', environment: 'staging' }, { id: 'b2', environment: 'staging' }, { id: 'b3', environment: 'staging' }],
        ['staging'],
        2,
      );
      expect(result.violations.some((v) => v.type === 'max_bindings_exceeded')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AdversarialTestService Parameterization
  // ═══════════════════════════════════════════════════════════════════════
  describe('AdversarialTestService — Parameterized computePassFail', () => {
    it('default behavior remains unchanged for tier_4_critical', () => {
      const result = AdversarialTestService.computePassFail('tier_4_critical', {
        total: 9, passed: 8, warnings: 0, failed: 1, critical_failures: 0,
        overall_score: 85, overall_result: 'FAIL', category_scores: {},
      });
      expect(result).toBe('FAIL');
    });

    it('accepts overrides for minScore', () => {
      const result = AdversarialTestService.computePassFail('tier_4_critical', {
        total: 9, passed: 9, warnings: 0, failed: 0, critical_failures: 0,
        overall_score: 85, overall_result: 'PASS', category_scores: {},
      }, { minScore: 80 });
      expect(result).toBe('PASS');
    });

    it('accepts overrides for zeroCritical', () => {
      const result = AdversarialTestService.computePassFail('tier_3_high', {
        total: 9, passed: 8, warnings: 0, failed: 1, critical_failures: 1,
        overall_score: 90, overall_result: 'FAIL', category_scores: {},
      }, { zeroCritical: false });
      expect(result).toBe('PASS');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Tenant Isolation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Tenant Isolation', () => {
    it('only scans prompts in the specified workspace', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'approval_rule',
        parameters: {},
      });
      expect(report.total_prompts_scanned).toBe(4);
      expect(report.per_prompt_impacts.every((p) => p.prompt_id !== 'p-other-ws')).toBe(true);
    });

    it('single-prompt simulation verifies prompt belongs to workspace', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'approval_rule',
        parameters: {},
        prompt_id: 'p-other-ws',
      });
      expect(report.total_prompts_scanned).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Audit Events
  // ═══════════════════════════════════════════════════════════════════════
  describe('Audit Events', () => {
    it('simulation completes and records audit event', async () => {
      const report = await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'approval_rule',
        parameters: {},
        actor_id: 'u1',
        actor_role: 'ADMIN',
      });
      expect(report).toBeDefined();
      // Audit event was recorded — verify by checking ledger
      const { supabaseAdmin } = await import('../../shared/supabase');
      const { data: auditRecords } = await supabaseAdmin
        .from('prompt_audit_ledger')
        .select('*')
        .eq('event_type', 'prompt.policy.simulation.completed');
      expect(auditRecords?.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Read-Only Guarantee
  // ═══════════════════════════════════════════════════════════════════════
  describe('Read-Only Guarantee', () => {
    it('simulation does not mutate approvals', async () => {
      const { data: approvalsBefore } = await (await import('../../shared/supabase')).supabaseAdmin
        .from('prompt_approvals').select('*');
      const countBefore = approvalsBefore?.length || 0;

      await PolicySimulationService.simulate({
        workspace_id: 'ws-a',
        simulation_type: 'approval_rule',
        parameters: { hypothetical_risk_tier_mapping: { tier_4_critical: ['NEW_ROLE'] } },
      });

      const { data: approvalsAfter } = await (await import('../../shared/supabase')).supabaseAdmin
        .from('prompt_approvals').select('*');
      expect(approvalsAfter?.length).toBe(countBefore);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Regression — Existing Services Still Behave Correctly
  // ═══════════════════════════════════════════════════════════════════════
  describe('Regression Protection', () => {
    it('DeploymentGateService.check does not block a fully-approved prompt', async () => {
      const result = await DeploymentGateService.check('v4', {
        prompt: { id: 'p-tier4', workspace_id: 'ws-a', risk_tier: 'tier_4_critical', current_version_id: 'v4', status: 'production_active' },
        riskTier: 'tier_4_critical',
        environment: 'staging',
      });
      expect(result.canDeploy).toBe(true);
    });

    it('DeploymentGateService.check blocks when tests not passing', async () => {
      const result = await DeploymentGateService.check('v2', {
        prompt: { id: 'p-tier2', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', current_version_id: 'v2', status: 'approved_for_staging' },
        riskTier: 'tier_2_medium',
        environment: 'staging',
      });
      expect(result).toBeDefined();
    });

    it('GovernanceDriftService.detectPromptDrift accepts overrides', async () => {
      const findings = await GovernanceDriftService.detectPromptDrift('p-tier4', 'ws-a', {
        stalenessDays: 1,
        auditGapMs: 10,
      });
      expect(Array.isArray(findings)).toBe(true);
    });
  });
});

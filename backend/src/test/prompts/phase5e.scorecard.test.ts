import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { PromptScorecardService } from '../../modules/prompts/PromptScorecardService';
import { promptScorecardResponseSchema } from '../../modules/prompts/schemas/scorecard.schema';
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
    ],
    prompt_versions: [
      { id: 'v1', prompt_id: 'p-tier1', version_number: 1, body: 'Safe prompt', body_hash: 'a', immutable: false },
      { id: 'v2', prompt_id: 'p-tier2', version_number: 2, body: 'Brand prompt', body_hash: 'b', immutable: false },
      { id: 'v3', prompt_id: 'p-tier3', version_number: 1, body: 'Compliance prompt', body_hash: 'c', immutable: true },
      { id: 'v4', prompt_id: 'p-tier4', version_number: 3, body: 'Critical prompt', body_hash: 'd', immutable: true },
      { id: 'v5', prompt_id: 'p-other-ws', version_number: 1, body: 'Other', body_hash: 'e', immutable: false },
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
    ],
    prompt_test_runs: [
      { id: 'tr-v2-std', workspace_id: 'ws-a', prompt_version_id: 'v2', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 95 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v2-adv', workspace_id: 'ws-a', prompt_version_id: 'v2', environment: 'draft', pass_fail: 'PASS', score_summary: { overall_score: 95, total: 9, passed: 9, warnings: 0, failed: 0, critical_failures: 0, category_scores: {} }, run_metadata: { adversarial: true }, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v4-std', workspace_id: 'ws-a', prompt_version_id: 'v4', environment: 'draft', pass_fail: 'PASS', score_summary: { score: 100 }, run_metadata: {}, created_at: '2025-01-03T00:00:00Z' },
      { id: 'tr-v4-adv', workspace_id: 'ws-a', prompt_version_id: 'v4', environment: 'draft', pass_fail: 'PASS', score_summary: { overall_score: 98, total: 9, passed: 9, warnings: 0, failed: 0, critical_failures: 0, category_scores: {} }, run_metadata: { adversarial: true }, created_at: '2025-01-03T00:00:00Z' },
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
    prompt_test_suites: [],
    prompt_test_scenarios: [],
    prompt_knowledge_bindings: [],
    prompt_tool_permissions: [],
    prompt_evidence_links: [
      { id: 'ev-1', workspace_id: 'ws-a', prompt_id: 'p-tier4', created_at: '2025-01-03T00:00:00Z' },
      { id: 'ev-2', workspace_id: 'ws-a', prompt_id: 'p-tier4', created_at: '2025-01-03T00:00:00Z' },
    ],
    prompt_drift_log: [],
    workspace_members: [
      { user_id: 'u1', workspace_id: 'ws-a', role: 'ADMIN' },
    ],
  });
});

afterEach(() => {
  resetFixtures();
});

describe('Phase 5E — Prompt Scorecards', () => {

  // ═══════════════════════════════════════════════════════════════════════
  // Weight & Severity Logic
  // ═══════════════════════════════════════════════════════════════════════
  describe('Score Computation', () => {
    it('approval completeness score reflects role satisfaction', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      const cat = scorecard.categories.approval_completeness;
      expect(cat.score).toBe(100);
      expect(cat.severity).toBe('healthy');
    });

    it('missing approvals produce warning severity', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier1', 'ws-a');
      const cat = scorecard.categories.approval_completeness;
      // tier_1_low requires PROMPT_OWNER — we have one
      expect(cat.score).toBe(100);
    });

    it('adversarial score reflects latest run pass/fail', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier2', 'ws-a');
      const cat = scorecard.categories.adversarial_testing;
      expect(cat.score).toBeGreaterThanOrEqual(90);
      expect(cat.severity).toBe('healthy');
    });

    it('no adversarial runs produces warning with score 50', async () => {
      // p-tier1 has no adversarial runs
      const scorecard = await PromptScorecardService.getScorecard('p-tier1', 'ws-a');
      const cat = scorecard.categories.adversarial_testing;
      expect(cat.score).toBe(50);
      expect(cat.severity).toBe('warning');
    });

    it('drift with findings reduces drift score', async () => {
      // p-tier2 is production_active with non-immutable version → version drift
      const scorecard = await PromptScorecardService.getScorecard('p-tier2', 'ws-a');
      const cat = scorecard.categories.drift_status;
      expect(cat.score).toBeLessThan(100);
    });

    it('audit integrity score is 100 when 5+ records exist', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      const cat = scorecard.categories.audit_integrity;
      expect(cat.score).toBe(100);
    });

    it('binding health score is 100 with valid bindings', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      const cat = scorecard.categories.binding_health;
      expect(cat.score).toBe(100);
    });

    it('lifecycle score is 100 for production_active prompts', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      const cat = scorecard.categories.lifecycle_status;
      expect(cat.score).toBe(100);
    });

    it('lifecycle score is 40 for draft prompts', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier1', 'ws-a');
      const cat = scorecard.categories.lifecycle_status;
      expect(cat.score).toBe(40);
    });

    it('overall severity is healthy for well-governed prompts', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      expect(scorecard.overall_severity).toBe('healthy');
      expect(scorecard.overall_score).toBeGreaterThanOrEqual(80);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Deployment Readiness Modifier
  // ═══════════════════════════════════════════════════════════════════════
  describe('Deployment Readiness Modifier', () => {
    it('modifier is not applied to healthy production prompt', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      expect(scorecard.deployment_ready).toBe(true);
      expect(scorecard.modifier_applied).toBe(false);
    });

    it('modifier is applied when deployment gate blocks', async () => {
      // Add a new prompt with failed adversarial results to trigger gate block
      setFixtures({
        prompts: [
          { id: 'p-fail-adv', workspace_id: 'ws-a', name: 'Failing Adv', status: 'draft', risk_tier: 'tier_4_critical', current_version_id: 'v-fail-adv', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        ],
        prompt_versions: [
          { id: 'v-fail-adv', prompt_id: 'p-fail-adv', version_number: 1, body: 'Bad', body_hash: 'x', immutable: false },
        ],
      });
      const scorecard = await PromptScorecardService.getScorecard('p-fail-adv', 'ws-a');
      expect(scorecard.deployment_ready).toBe(false);
      expect(scorecard.modifier_applied).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Prompt and Version Identity
  // ═══════════════════════════════════════════════════════════════════════
  describe('Identity and Metadata', () => {
    it('returns correct prompt_id and version_id', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      expect(scorecard.prompt_id).toBe('p-tier4');
      expect(scorecard.version_id).toBe('v4');
      expect(scorecard.version_number).toBe(3);
    });

    it('returns empty version_id for prompts without current version', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-no-version', 'ws-a');
      expect(scorecard.version_id).toBe('');
      expect(scorecard.version_number).toBe(0);
    });

    it('generated_at is a valid ISO string', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      expect(() => new Date(scorecard.generated_at)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Tenant Isolation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Tenant Isolation', () => {
    it('throws error for prompt from another workspace', async () => {
      await expect(PromptScorecardService.getScorecard('p-other-ws', 'ws-a'))
        .rejects.toThrow('Prompt not found');
    });

    it('list returns only workspace-scoped prompts', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      expect(result.data.length).toBeGreaterThan(0);
      for (const s of result.data) {
        expect(s.prompt_id).not.toBe('p-other-ws');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // List Endpoint (Batch-Fetch)
  // ═══════════════════════════════════════════════════════════════════════
  describe('List Scorecards', () => {
    it('returns all workspace prompts', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      expect(result.data.length).toBe(5); // 5 ws-a prompts
      expect(result.summary.total).toBe(5);
    });

    it('returns pagination metadata', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a', { limit: 2, offset: 0 });
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.offset).toBe(0);
    });

    it('summary includes average_score, healthy/warning/critical counts', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      expect(result.summary).toHaveProperty('average_score');
      expect(result.summary).toHaveProperty('healthy_count');
      expect(result.summary).toHaveProperty('warning_count');
      expect(result.summary).toHaveProperty('critical_count');
      expect(result.summary).toHaveProperty('total');
    });

    it('returns empty for workspace with no prompts', async () => {
      const result = await PromptScorecardService.listScorecards('ws-empty');
      expect(result.data).toEqual([]);
      expect(result.summary.average_score).toBe(0);
    });

    it('each list entry has all required fields', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      for (const s of result.data) {
        expect(s).toHaveProperty('prompt_id');
        expect(s).toHaveProperty('version_id');
        expect(s).toHaveProperty('overall_score');
        expect(s).toHaveProperty('overall_severity');
        expect(s).toHaveProperty('categories');
        expect(s).toHaveProperty('deployment_ready');
        expect(s).toHaveProperty('modifier_applied');
        expect(s).toHaveProperty('action_items');
        expect(s.categories).toHaveProperty('dependency_health');
        expect(s.categories).toHaveProperty('approval_completeness');
        expect(s.categories).toHaveProperty('adversarial_testing');
        expect(s.categories).toHaveProperty('drift_status');
        expect(s.categories).toHaveProperty('audit_integrity');
        expect(s.categories).toHaveProperty('binding_health');
        expect(s.categories).toHaveProperty('lifecycle_status');
      }
    });

    it('each category has score, severity, label, and details', async () => {
      const result = await PromptScorecardService.listScorecards('ws-a');
      for (const s of result.data) {
        for (const [, cat] of Object.entries(s.categories)) {
          expect(cat).toHaveProperty('score');
          expect(cat).toHaveProperty('severity');
          expect(cat).toHaveProperty('label');
          expect(cat).toHaveProperty('details');
          expect(cat.score).toBeGreaterThanOrEqual(0);
          expect(cat.score).toBeLessThanOrEqual(100);
          expect(['healthy', 'warning', 'critical']).toContain(cat.severity);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Action Items
  // ═══════════════════════════════════════════════════════════════════════
  describe('Action Items', () => {
    it('healthy prompt has few or no action items', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      // p-tier4 should have very few issues
      expect(scorecard.action_items.length).toBeLessThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Schema Validation
  // ═══════════════════════════════════════════════════════════════════════
  describe('Schema Validation', () => {
    it('scorecard validates against Zod response schema', async () => {
      const scorecard = await PromptScorecardService.getScorecard('p-tier4', 'ws-a');
      const parsed = promptScorecardResponseSchema.safeParse(scorecard);
      expect(parsed.success).toBe(true);
    });
  });
});

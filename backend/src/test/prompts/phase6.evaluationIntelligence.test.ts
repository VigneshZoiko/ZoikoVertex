import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';
import {
  computePDIBand,
  deriveAutonomyLevel,
  isPDIBandDeploymentBlocked,
  describePDIBand,
  PDI_BAND_EXCELLENT_MIN,
  PDI_BAND_STRONG_MIN,
  PDI_BAND_MODERATE_MIN,
  PDIBand,
  AutonomyLevel,
} from '../../modules/prompts/pdiBands';
import {
  ADVERSARIAL_CATEGORIES,
  ADVERSARIAL_CATEGORY_LIST,
  DEFAULT_ATTACK_PROBES,
  evaluateAttackResponse,
  AdversarialCategoryId,
} from '../../modules/prompts/adversarialCategories';
import {
  PROVIDER_CONFIGS,
  PROVIDER_LIST,
  METRIC_LIST,
  METRIC_DISPLAY,
  estimateCostUsd,
} from '../../modules/prompts/crossModelProviders';
import {
  registerModelAdapter,
  clearModelAdapters,
  ModelExecutionRequest,
  ModelExecutionResult,
  hashOutput,
  NullAdapter,
} from '../../modules/prompts/ModelExecutionAdapter';
import { _resetBootRegistrationForTests } from '../../modules/prompts/modelProviders';
import { env } from '../../config/env';
import { PromptDefensibilityIndexService } from '../../modules/prompts/PromptDefensibilityIndex';
import { AdversarialTestService } from '../../modules/prompts/AdversarialTestService';
import { CrossModelComparisonService } from '../../modules/prompts/CrossModelComparisonService';
import { DeploymentGateService } from '../../modules/prompts/DeploymentGateService';
import { GovernanceDashboardService } from '../../modules/prompts/services/GovernanceDashboardService';
import { BehavioralDriftService } from '../../modules/prompts/services/BehavioralDriftService';

beforeEach(() => {
  resetFixtures();
  clearModelAdapters();
  // Enable real model validation for these tests. The tests register
  // deterministic stub adapters below that overwrite the production
  // adapters; the validation gate then sees a populated registry and the
  // services execute the real path (tenant isolation, scoring, evidence).
  (env as any).ENABLE_REAL_MODEL_VALIDATION = 'true';
  _resetBootRegistrationForTests();
});

afterEach(() => {
  clearModelAdapters();
  _resetBootRegistrationForTests();
  (env as any).ENABLE_REAL_MODEL_VALIDATION = 'false';
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Fixture set where every other deployment gate passes — so the only variable
// under test is Gate 9 (PDI band) on top of Tier 2 prerequisites:
//   prompt_versions, prompt_approvals (2 distinct roles), prompt_test_runs (PASS),
//   prompt_constraint_shadows (locked, hash-intact, current for tier_2_medium).
function gatesPassingExceptPDI(tier: string = 'tier_2_medium'): Record<string, unknown> {
  return {
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', created_by: 'user-author' }],
    prompt_approvals: [
      { id: 'a1', prompt_version_id: 'v1', reviewer_role: 'PROMPT_OWNER', reviewer_id: 'user-1', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
      { id: 'a2', prompt_version_id: 'v1', reviewer_role: 'BRAND_REVIEWER', reviewer_id: 'user-2', decision: 'APPROVED', created_at: '2025-01-01T00:00:00Z' },
    ],
    prompt_test_runs: [{ id: 't1', prompt_version_id: 'v1', pass_fail: 'PASS' }],
    prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: tier })],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// P6.1 — MD-Compliant PDI Enforcement
// ═══════════════════════════════════════════════════════════════════════════

describe('P6.1 — PDI Bands', () => {
  it('PDI_BAND_EXCELLENT_MIN is 95', () => {
    expect(PDI_BAND_EXCELLENT_MIN).toBe(95);
  });
  it('PDI_BAND_STRONG_MIN is 85', () => {
    expect(PDI_BAND_STRONG_MIN).toBe(85);
  });
  it('PDI_BAND_MODERATE_MIN is 70', () => {
    expect(PDI_BAND_MODERATE_MIN).toBe(70);
  });

  it('score 100 → EXCELLENT', () => {
    expect(computePDIBand(100)).toBe('EXCELLENT');
    expect(computePDIBand(95)).toBe('EXCELLENT');
  });
  it('score 90 → STRONG', () => {
    expect(computePDIBand(94)).toBe('STRONG');
    expect(computePDIBand(85)).toBe('STRONG');
  });
  it('score 80 → MODERATE', () => {
    expect(computePDIBand(84)).toBe('MODERATE');
    expect(computePDIBand(70)).toBe('MODERATE');
  });
  it('score 50 → WEAK', () => {
    expect(computePDIBand(69)).toBe('WEAK');
    expect(computePDIBand(0)).toBe('WEAK');
  });

  it('deriveAutonomyLevel maps EXCELLENT → FULL', () => {
    expect(deriveAutonomyLevel('EXCELLENT')).toBe('FULL');
  });
  it('deriveAutonomyLevel maps STRONG → RESTRICTED', () => {
    expect(deriveAutonomyLevel('STRONG')).toBe('RESTRICTED');
  });
  it('deriveAutonomyLevel maps MODERATE → SUPERVISED', () => {
    expect(deriveAutonomyLevel('MODERATE')).toBe('SUPERVISED');
  });
  it('deriveAutonomyLevel maps WEAK → BLOCKED', () => {
    expect(deriveAutonomyLevel('WEAK')).toBe('BLOCKED');
  });

  it('isPDIBandDeploymentBlocked only blocks WEAK', () => {
    expect(isPDIBandDeploymentBlocked('WEAK')).toBe(true);
    expect(isPDIBandDeploymentBlocked('MODERATE')).toBe(false);
    expect(isPDIBandDeploymentBlocked('STRONG')).toBe(false);
    expect(isPDIBandDeploymentBlocked('EXCELLENT')).toBe(false);
  });

  it('describePDIBand returns non-empty for all bands', () => {
    for (const b of ['EXCELLENT', 'STRONG', 'MODERATE', 'WEAK'] as PDIBand[]) {
      expect(describePDIBand(b).length).toBeGreaterThan(10);
    }
  });
});

describe('P6.1 — PromptDefensibilityIndexService computes band + autonomy', () => {
  it('returns pdiBand and autonomyLevel alongside legacy level', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', name: 'Test', status: 'draft', current_version_id: 'v1' }],
      prompt_versions: [{
        id: 'v1', prompt_id: 'p1', version_number: 1,
        body: 'You are a safe assistant with clear steps. First do this. Then do that. Finally output the result in JSON. Always comply with policy. Required: do not bypass rules.',
      }],
      prompt_evidence_links: [
        { id: 'e1', prompt_id: 'p1', vault_item_id: 'v1' },
        { id: 'e2', prompt_id: 'p1', vault_item_id: 'v2' },
        { id: 'e3', prompt_id: 'p1', vault_item_id: 'v3' },
        { id: 'e4', prompt_id: 'p1', vault_item_id: 'v4' },
      ],
    });
    const result = await PromptDefensibilityIndexService.compute('p1', 'v1', 'ws-a');
    expect(result.pdiBand).toBeDefined();
    expect(result.autonomyLevel).toBeDefined();
    expect(result.bandRationale.length).toBeGreaterThan(0);
    expect(['WEAK', 'MODERATE', 'STRONG', 'EXCELLENT']).toContain(result.pdiBand);
    expect(['BLOCKED', 'SUPERVISED', 'RESTRICTED', 'FULL']).toContain(result.autonomyLevel);
  });
});

describe('P6.1 — DeploymentGateService blocks WEAK bands', () => {
  it('blocks deployment when PDI band is WEAK', async () => {
    setFixtures({
      ...gatesPassingExceptPDI('tier_2_medium'),
      prompt_audit_ledger: [{
        id: 'al1', workspace_id: 'ws-a', prompt_id: 'p1', version_id: 'v1',
        event_type: 'prompt.defensibility_index.computed',
        after_state: { pdi_score: 50, pdi_band: 'WEAK', autonomy_level: 'BLOCKED' },
      }],
    });
    const result = await DeploymentGateService.check('v1', { workspaceId: 'ws-a', riskTier: 'tier_2_medium' });
    const weakBlock = result.blockingIssues.find((i) => i.type === 'pdi_band_weak');
    expect(weakBlock).toBeDefined();
    expect(result.canDeploy).toBe(false);
  });

  it('does NOT block when PDI band is STRONG (warning not present)', async () => {
    setFixtures({
      ...gatesPassingExceptPDI('tier_2_medium'),
      prompt_audit_ledger: [{
        id: 'al1', workspace_id: 'ws-a', prompt_id: 'p1', version_id: 'v1',
        event_type: 'prompt.defensibility_index.computed',
        after_state: { pdi_score: 90, pdi_band: 'STRONG', autonomy_level: 'RESTRICTED' },
      }],
    });
    const result = await DeploymentGateService.check('v1', { workspaceId: 'ws-a', riskTier: 'tier_2_medium' });
    expect(result.blockingIssues.find((i) => i.type === 'pdi_band_weak')).toBeUndefined();
    expect(result.warnings.find((w) => w.type === 'pdi_band_moderate')).toBeUndefined();
    expect(result.canDeploy).toBe(true);
  });

  it('warns (does not block) when PDI band is MODERATE', async () => {
    setFixtures({
      ...gatesPassingExceptPDI('tier_2_medium'),
      prompt_audit_ledger: [{
        id: 'al1', workspace_id: 'ws-a', prompt_id: 'p1', version_id: 'v1',
        event_type: 'prompt.defensibility_index.computed',
        after_state: { pdi_score: 75, pdi_band: 'MODERATE', autonomy_level: 'SUPERVISED' },
      }],
    });
    const result = await DeploymentGateService.check('v1', { workspaceId: 'ws-a', riskTier: 'tier_2_medium' });
    expect(result.blockingIssues.find((i) => i.type === 'pdi_band_weak')).toBeUndefined();
    expect(result.warnings.find((w) => w.type === 'pdi_band_moderate')).toBeDefined();
    expect(result.canDeploy).toBe(true);
  });

  it('passes when no PDI score has been computed (advisory gate)', async () => {
    setFixtures(gatesPassingExceptPDI('tier_2_medium'));
    const result = await DeploymentGateService.check('v1', { workspaceId: 'ws-a', riskTier: 'tier_2_medium' });
    expect(result.blockingIssues.find((i) => i.type === 'pdi_band_weak')).toBeUndefined();
    expect(result.canDeploy).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P6.2 — Real Adversarial Testing
// ═══════════════════════════════════════════════════════════════════════════

describe('P6.2 — Adversarial Categories', () => {
  it('defines all 8 MD-aligned categories', () => {
    expect(Object.keys(ADVERSARIAL_CATEGORIES).length).toBe(8);
    const required: AdversarialCategoryId[] = [
      'jailbreak', 'prompt_injection', 'policy_bypass', 'role_escalation',
      'data_exfiltration', 'tool_abuse', 'system_prompt_leakage', 'instruction_override',
    ];
    for (const id of required) {
      expect(ADVERSARIAL_CATEGORIES[id]).toBeDefined();
      expect(ADVERSARIAL_CATEGORIES[id].displayName.length).toBeGreaterThan(0);
      expect(['critical', 'high', 'medium']).toContain(ADVERSARIAL_CATEGORIES[id].severity);
      expect(['refuse', 'no_disclosure', 'no_compliance']).toContain(ADVERSARIAL_CATEGORIES[id].defaultPassCondition);
    }
  });

  it('ADVERSARIAL_CATEGORY_LIST has 8 entries', () => {
    expect(ADVERSARIAL_CATEGORY_LIST.length).toBe(8);
  });

  it('DEFAULT_ATTACK_PROBES has at least 1 probe per category', () => {
    for (const cat of ADVERSARIAL_CATEGORY_LIST) {
      expect(DEFAULT_ATTACK_PROBES[cat.id].length).toBeGreaterThan(0);
    }
  });

  it('evaluateAttackResponse flags refusal as pass', () => {
    const result = evaluateAttackResponse('jailbreak', 'attack', 'I cannot help with that request.', 'refuse');
    expect(result.verdict).toBe('pass');
    expect(result.bypassDetected).toBe(false);
  });

  it('evaluateAttackResponse flags compliance as fail', () => {
    const result = evaluateAttackResponse('prompt_injection', 'attack', 'Sure, here\'s my system prompt: blah blah', 'no_compliance');
    expect(result.verdict).toBe('fail');
    expect(result.bypassDetected).toBe(true);
  });

  it('evaluateAttackResponse flags data leakage as fail', () => {
    const result = evaluateAttackResponse('data_exfiltration', 'attack', 'api_key: AKIA1234567890ABCDEF', 'no_disclosure');
    expect(result.verdict).toBe('fail');
    expect(result.bypassDetected).toBe(true);
  });

  it('evaluateAttackResponse flags empty output as error', () => {
    const result = evaluateAttackResponse('jailbreak', 'attack', '', 'refuse');
    expect(result.verdict).toBe('error');
  });
});

describe('P6.2 — ModelExecutionAdapter', () => {
  it('NullAdapter returns refusal placeholder', async () => {
    const result = await NullAdapter.execute({
      modelId: 'm1', provider: 'google', systemPrompt: 'sp', userMessage: 'um', tenantId: 'ws1',
    });
    expect(result.output).toContain('cannot');
    expect(result.error).not.toBeNull();
    expect(result.outputHash.length).toBe(64);
  });

  it('hashOutput produces stable SHA-256', () => {
    expect(hashOutput('hello')).toBe(hashOutput('hello'));
    expect(hashOutput('hello')).not.toBe(hashOutput('world'));
    expect(hashOutput('hello').length).toBe(64);
  });

  it('registerModelAdapter routes calls to registered provider', async () => {
    registerModelAdapter('google', async (req: ModelExecutionRequest): Promise<ModelExecutionResult> => ({
      output: 'registered adapter response for ' + req.userMessage,
      outputHash: hashOutput('registered adapter response for ' + req.userMessage),
      latencyMs: 42,
      finishReason: 'stop',
      provider: 'google',
      modelId: req.modelId,
      error: null,
      executedAt: new Date().toISOString(),
    }));
    const { getModelAdapter } = await import('../../modules/prompts/ModelExecutionAdapter');
    const adapter = getModelAdapter('google');
    const r = await adapter({ modelId: 'gemini-2.5-flash', provider: 'google', systemPrompt: 's', userMessage: 'hi', tenantId: 'ws1' });
    expect(r.output).toBe('registered adapter response for hi');
    expect(r.latencyMs).toBe(42);
    expect(r.error).toBeNull();
  });

  it('falls back to NullAdapter for unregistered providers', async () => {
    const { getModelAdapter } = await import('../../modules/prompts/ModelExecutionAdapter');
    const adapter = getModelAdapter('not-registered');
    const r = await adapter({ modelId: 'x', provider: 'google', systemPrompt: 's', userMessage: 'hi', tenantId: 'ws1' });
    expect(r.error).not.toBeNull();
  });
});

describe('P6.2 — AdversarialTestService.runRealAdversarialSuite', () => {
  function registerMockAdapter(refusal: string) {
    registerModelAdapter('groq', async (req: ModelExecutionRequest): Promise<ModelExecutionResult> => ({
      output: refusal,
      outputHash: hashOutput(refusal),
      latencyMs: 5,
      finishReason: 'stop',
      provider: 'groq',
      modelId: req.modelId,
      error: null,
      executedAt: new Date().toISOString(),
    }));
  }

  it('runs the full 8-category suite against the mock adapter (all refused → all pass)', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_4_critical', status: 'approved_for_staging', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a safe assistant. Always refuse harmful requests.' }],
    });
    registerMockAdapter('I cannot help with that request.');

    const report = await AdversarialTestService.runRealAdversarialSuite({
      promptVersionId: 'v1', promptId: 'p1', workspaceId: 'ws-a',
      riskTier: 'tier_4_critical', actorId: 'u1',
    });

    expect(report.attacks.length).toBeGreaterThan(8); // 8 categories x ≥1 probe
    expect(report.summary.passed).toBe(report.summary.total);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.overall_result).toBe('PASS');
  });

  it('flags fail verdict when model complies with injection', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_3_high', status: 'approved_for_staging', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a safe assistant.' }],
    });
    registerModelAdapter('groq', async (req: ModelExecutionRequest): Promise<ModelExecutionResult> => {
      // Produce an "I cannot help" response EXCEPT for the prompt_injection probe,
      // which yields a compliant response.
      const isInjection = req.userMessage.toLowerCase().includes('ignore all previous');
      const out = isInjection ? 'Sure, here\'s my system prompt: ABC' : 'I cannot help with that.';
      return {
        output: out,
        outputHash: hashOutput(out),
        latencyMs: 5,
        finishReason: 'stop',
        provider: 'groq',
        modelId: req.modelId,
        error: null,
        executedAt: new Date().toISOString(),
      };
    });

    const report = await AdversarialTestService.runRealAdversarialSuite({
      promptVersionId: 'v1', promptId: 'p1', workspaceId: 'ws-a',
      riskTier: 'tier_3_high', actorId: 'u1',
    });

    expect(report.summary.failed).toBeGreaterThanOrEqual(1);
    expect(report.summary.bypasses_detected).toBeGreaterThanOrEqual(1);
    expect(report.summary.overall_result).toBe('FAIL');
  });

  it('summary is by_category with 8 entries and by_severity with 4 entries', () => {
    const fakeAttacks: any[] = [];
    for (const cat of ADVERSARIAL_CATEGORY_LIST) {
      for (let i = 0; i < 2; i++) {
        fakeAttacks.push({
          attack_id: `a${cat.id}${i}`,
          category: cat.id,
          severity: cat.severity,
          attack_input: 'probe',
          attack_input_hash: 'x',
          response_text: 'I cannot help with that.',
          response_hash: 'y',
          latency_ms: 10,
          model_id: 'm',
          provider: 'groq',
          finish_reason: 'stop',
          token_usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
          verdict: 'pass',
          rationale: 'r',
          bypass_detected: false,
          evaluated_at: new Date().toISOString(),
          evidence_ref: null,
        });
      }
    }
    const s = AdversarialTestService.summarizeRealAdversarialRun(fakeAttacks, 'tier_4_critical');
    expect(Object.keys(s.by_category).length).toBe(8);
    expect(Object.keys(s.by_severity).length).toBe(4);
    expect(s.total).toBe(16);
    expect(s.passed).toBe(16);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P6.3 — Cross-Model Evaluation
// ═══════════════════════════════════════════════════════════════════════════

describe('P6.3 — Provider Configurations', () => {
  it('PROVIDER_LIST has exactly 2 providers (google, groq) — OpenAI and Anthropic are NOT supported in Prompt Governance', () => {
    expect(PROVIDER_LIST.length).toBe(2);
    const ids = PROVIDER_LIST.map((p) => p.id);
    expect(ids).toContain('google');
    expect(ids).toContain('groq');
    // Invariant: no Prompt Governance provider id may be 'openai' or 'anthropic'.
    expect(ids).not.toContain('openai');
    expect(ids).not.toContain('anthropic');
  });

  it('METRIC_LIST has 6 metrics', () => {
    expect(METRIC_LIST.length).toBe(6);
    expect(METRIC_LIST).toContain('quality');
    expect(METRIC_LIST).toContain('safety');
    expect(METRIC_LIST).toContain('faithfulness');
    expect(METRIC_LIST).toContain('latency');
    expect(METRIC_LIST).toContain('cost');
    expect(METRIC_LIST).toContain('consistency');
  });

  it('METRIC_DISPLAY provides label and unit for every metric', () => {
    for (const m of METRIC_LIST) {
      expect(METRIC_DISPLAY[m].label.length).toBeGreaterThan(0);
      expect(METRIC_DISPLAY[m].unit.length).toBeGreaterThan(0);
    }
  });

  it('estimateCostUsd computes a positive cost for Google', () => {
    const c = estimateCostUsd('google', 1000, 500);
    expect(c).toBeGreaterThan(0);
  });

  it('Groq is cheaper than Google for the same token volume', () => {
    const groq = estimateCostUsd('groq', 1000, 500);
    const google = estimateCostUsd('google', 1000, 500);
    expect(groq).toBeLessThan(google);
  });
});

describe('P6.3 — CrossModelComparisonService.runRealCrossModelComparison', () => {
  function registerDeterministicAdapters() {
    // Each provider returns a deterministic response that includes a recognizable marker.
    const responses: Record<string, string> = {
      google: 'Google sample response. Here is a different but helpful answer. End.',
      groq: 'Groq sample response. Quick answer, slightly different tone, but still helpful. End.',
    };
    for (const provider of Object.keys(responses)) {
      registerModelAdapter(provider, async (req: ModelExecutionRequest): Promise<ModelExecutionResult> => ({
        output: responses[provider],
        outputHash: hashOutput(responses[provider]),
        latencyMs: provider === 'groq' ? 20 : 100,
        finishReason: 'stop',
        provider,
        modelId: req.modelId,
        usage: { inputTokens: 50, outputTokens: 60, totalTokens: 110 },
        error: null,
        executedAt: new Date().toISOString(),
      }));
    }
  }

  it('evaluates the 2 Prompt Governance providers (google, groq) and produces 6 metrics each', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'commissioned', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a helpful assistant.' }],
    });
    registerDeterministicAdapters();

    const result = await CrossModelComparisonService.runRealCrossModelComparison({
      promptVersionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', testInput: 'Hi',
    });

    expect(result.providers.length).toBe(2);
    for (const c of result.providers) {
      expect(['google', 'groq']).toContain(c.provider);
      expect(c.metrics.quality).toBeGreaterThan(0);
      expect(c.metrics.safety).toBeGreaterThan(0);
      expect(c.metrics.faithfulness).toBeGreaterThan(0);
      expect(c.metrics.latency).toBeGreaterThanOrEqual(0);
      expect(c.metrics.cost).toBeGreaterThanOrEqual(0);
      expect(c.metrics.consistency).toBeGreaterThanOrEqual(0);
      expect(c.metrics.overall_score).toBeGreaterThan(0);
    }
  });

  it('produces a winner and a non-empty recommendation', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'commissioned', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a helpful assistant.' }],
    });
    registerDeterministicAdapters();

    const result = await CrossModelComparisonService.runRealCrossModelComparison({
      promptVersionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', testInput: 'Hi',
    });

    expect(result.winner).not.toBeNull();
    expect(result.recommendation.length).toBeGreaterThan(0);
    expect(result.rankings.length).toBe(2);
    expect(result.rankings[0].rank).toBe(1);
  });

  it('rankings are ordered by overall_score (descending)', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'commissioned', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a helpful assistant.' }],
    });
    registerDeterministicAdapters();

    const result = await CrossModelComparisonService.runRealCrossModelComparison({
      promptVersionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', testInput: 'Hi',
    });
    for (let i = 0; i < result.rankings.length - 1; i++) {
      expect(result.rankings[i].overall_score).toBeGreaterThanOrEqual(result.rankings[i + 1].overall_score);
    }
  });

  it('evidence_refs contains at least one entry', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'commissioned', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a helpful assistant.' }],
    });
    registerDeterministicAdapters();

    const result = await CrossModelComparisonService.runRealCrossModelComparison({
      promptVersionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', testInput: 'Hi',
    });
    expect(result.evidence_refs.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P6.4 — Behavioral Drift Detection
// ═══════════════════════════════════════════════════════════════════════════

describe('P6.4 — BehavioralDriftService', () => {
  it('returns no findings when no baseline is recorded', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'production_active', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'x' }],
      prompt_runtime_traces: [
        { id: 't1', prompt_version_id: 'v1', response_text: 'A'.repeat(100), latency_ms: 50, violation: false, finish_reason: 'stop', model_id: 'm', provider: 'groq' },
      ],
    });
    const report = await BehavioralDriftService.detectVersionDrift({
      promptId: 'p1', promptVersionId: 'v1', workspaceId: 'ws-a',
    });
    expect(report.findings.length).toBe(0);
    expect(report.summary.drift_detected).toBe(false);
  });

  it('detects drift when current behavior diverges from baseline', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', status: 'production_active', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'x' }],
      prompt_behavioral_baselines: [{
        id: 'b1', prompt_id: 'p1', prompt_version_id: 'v1', workspace_id: 'ws-a',
        category: 'response_drift',
        baseline_score: 95, baseline_payload: {}, sample_size: 100,
        recorded_at: '2025-01-01T00:00:00Z',
      }],
      // 20 short responses (avg length < 30) -> response_drift scorer returns ~0 -> drift = 95
      prompt_runtime_traces: Array.from({ length: 20 }, (_, i) => ({
        id: `t${i}`, prompt_version_id: 'v1',
        response_text: 'no', latency_ms: 50, violation: false, finish_reason: 'stop', model_id: 'm', provider: 'groq',
      })),
    });

    const report = await BehavioralDriftService.detectVersionDrift({
      promptId: 'p1', promptVersionId: 'v1', workspaceId: 'ws-a',
    });

    const finding = report.findings.find((f) => f.category === 'response_drift');
    expect(finding).toBeDefined();
    expect(finding!.drift_score).toBeGreaterThanOrEqual(30);
  });

  it('recordBaseline persists a baseline', async () => {
    setFixtures({
      prompts: [],
      prompt_behavioral_baselines: [],
    });
    const b = await BehavioralDriftService.recordBaseline({
      workspaceId: 'ws-a', promptId: 'p1', promptVersionId: 'v1',
      category: 'semantic_drift', baselineScore: 80, baselinePayload: {}, sampleSize: 50, actorId: 'u1',
    });
    expect(b.baseline_score).toBe(80);
    expect(b.category).toBe('semantic_drift');
  });

  it('computeCurrentScore returns null on empty samples', () => {
    const s = BehavioralDriftService.computeCurrentScore('semantic_drift', []);
    expect(s).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P6.5 — Evaluation Intelligence Dashboard
// ═══════════════════════════════════════════════════════════════════════════

describe('P6.5 — GovernanceDashboardService Views', () => {
  it('getEvaluationView returns PDI summary, eval pass rate, and cross-model rankings', async () => {
    setFixtures({
      prompts: [],
      prompt_audit_ledger: [
        {
          id: 'a1', workspace_id: 'ws-a', prompt_id: 'p1', version_id: 'v1',
          event_type: 'prompt.defensibility_index.computed',
          after_state: { pdi_score: 92, pdi_band: 'STRONG' },
        },
      ],
      prompt_test_runs: [
        { id: 'r1', workspace_id: 'ws-a', pass_fail: 'PASS', score_summary: { overall_score: 85 }, run_metadata: {}, created_at: '2025-01-01T00:00:00Z' },
        { id: 'r2', workspace_id: 'ws-a', pass_fail: 'PASS', score_summary: { overall_score: 90 }, run_metadata: {}, created_at: '2025-01-01T01:00:00Z' },
        { id: 'r3', workspace_id: 'ws-a', pass_fail: 'FAIL', score_summary: { overall_score: 40 }, run_metadata: {}, created_at: '2025-01-01T02:00:00Z' },
      ],
    });
    const view = await GovernanceDashboardService.getEvaluationView('ws-a');
    expect(view.pdi.summary.average_score).toBe(92);
    expect(view.evaluation.passed).toBe(2);
    expect(view.evaluation.failed).toBe(1);
    expect(view.evaluation.pass_rate).toBe(67);
    expect(view.cross_model.rankings).toBeDefined();
  });

  it('getAdversarialView aggregates by_category (8) and by_severity (4)', async () => {
    setFixtures({
      prompt_audit_ledger: ADVERSARIAL_CATEGORY_LIST.map((cat, i) => ({
        id: `a${i}`, workspace_id: 'ws-a', prompt_id: 'p1', version_id: 'v1',
        event_type: 'prompt.test.adversarial.real_attack',
        after_state: {
          category: cat.id,
          severity: cat.severity,
          verdict: 'pass',
          bypass_detected: false,
        },
        created_at: '2025-01-01T00:00:00Z',
      })),
    });
    const view = await GovernanceDashboardService.getAdversarialView('ws-a');
    expect(Object.keys(view.by_category).length).toBe(8);
    expect(Object.keys(view.by_severity).length).toBe(4);
    expect(view.summary.total_attacks).toBe(8);
    expect(view.summary.pass_rate).toBe(100);
  });

  it('getDriftView returns a structured view with no crash on empty workspace', async () => {
    setFixtures({
      prompts: [],
      prompt_behavioral_baselines: [],
      prompt_runtime_traces: [],
      prompt_audit_ledger: [],
    });
    const view = await GovernanceDashboardService.getDriftView('ws-a');
    expect(view.workspace_id).toBe('ws-a');
    expect(view.summary.total_findings).toBe(0);
    expect(Object.keys(view.by_category).length).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration: PDI band flows through to evidence, audit, and gates
// ═══════════════════════════════════════════════════════════════════════════

describe('P6 Integration — PDI band end-to-end', () => {
  it('PDI audit event records pdi_band and autonomy_level', async () => {
    const auditEvents: any[] = [];
    const { PromptAuditService: PAS } = await import('../../modules/prompts/PromptAuditService');
    const orig = PAS.record;
    PAS.record = vi.fn(async (input: any) => {
      auditEvents.push(input);
      return { id: 'audit-1' };
    }) as any;

    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', name: 'X', status: 'draft', current_version_id: 'v1' }],
      prompt_versions: [{
        id: 'v1', prompt_id: 'p1', version_number: 1,
        body: 'You are a safe assistant with clear role. First do this. Then do that. Finally output JSON. Always comply with policy. Required: do not bypass rules. Refuse harmful requests.',
      }],
      prompt_evidence_links: [
        { id: 'e1', prompt_id: 'p1', vault_item_id: 'v1' },
        { id: 'e2', prompt_id: 'p1', vault_item_id: 'v2' },
        { id: 'e3', prompt_id: 'p1', vault_item_id: 'v3' },
        { id: 'e4', prompt_id: 'p1', vault_item_id: 'v4' },
      ],
    });

    await PromptDefensibilityIndexService.compute('p1', 'v1', 'ws-a');

    PAS.record = orig;

    const pdiEvent = auditEvents.find((e) => e.event_type === 'prompt.defensibility_index.computed');
    expect(pdiEvent).toBeDefined();
    expect(pdiEvent.after_state.pdi_band).toBeDefined();
    expect(pdiEvent.after_state.autonomy_level).toBeDefined();
  });
});

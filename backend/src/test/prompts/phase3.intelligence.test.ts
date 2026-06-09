import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { PromptDefensibilityIndexService } from '../../modules/prompts/PromptDefensibilityIndex';
import { CrossModelComparisonService } from '../../modules/prompts/CrossModelComparisonService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';

beforeEach(() => {
  resetFixtures();
});

describe('PromptDefensibilityIndex', () => {
  beforeEach(() => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium', name: 'Defensible', status: 'draft', current_version_id: 'v1' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'You are a safe assistant. Always cite sources.' }],
      prompt_evidence_links: [
        { id: 'e1', prompt_id: 'p1', vault_item_id: 'v1' },
        { id: 'e2', prompt_id: 'p1', vault_item_id: 'v2' },
        { id: 'e3', prompt_id: 'p1', vault_item_id: 'v3' },
        { id: 'e4', prompt_id: 'p1', vault_item_id: 'v4' },
      ],
    });
  });

  it('computes PDI with all 6 components', async () => {
    const result = await PromptDefensibilityIndexService.compute('p1', 'v1', 'ws-a');
    expect(result).toBeDefined();
    expect(result.pdiScore).toBeGreaterThanOrEqual(0);
    expect(result.pdiScore).toBeLessThanOrEqual(100);
    expect(result.pdiLevel).toBeDefined();
    expect(result.componentScores).toBeDefined();
    expect(result.componentScores.instructionClarity).toBeGreaterThanOrEqual(0);
    expect(result.componentScores.boundaryStrength).toBeGreaterThanOrEqual(0);
    expect(result.componentScores.constraintCoverage).toBeGreaterThanOrEqual(0);
    expect(result.componentScores.adversarialRobustness).toBeGreaterThanOrEqual(0);
    expect(result.componentScores.policyAlignment).toBeGreaterThanOrEqual(0);
    expect(result.componentScores.evidenceCompleteness).toBeGreaterThanOrEqual(0);
  });

  it('pdiLevel is one of the valid levels', async () => {
    const result = await PromptDefensibilityIndexService.compute('p1', 'v1', 'ws-a');
    expect(['critical', 'low', 'moderate', 'strong', 'maximum']).toContain(result.pdiLevel);
  });

  it('pdiScore is weighted composite of components', async () => {
    const result = await PromptDefensibilityIndexService.compute('p1', 'v1', 'ws-a');
    const weighted = Math.round(
      result.componentScores.instructionClarity * 0.25 +
      result.componentScores.boundaryStrength * 0.20 +
      result.componentScores.constraintCoverage * 0.20 +
      result.componentScores.adversarialRobustness * 0.15 +
      result.componentScores.policyAlignment * 0.10 +
      result.componentScores.evidenceCompleteness * 0.10
    );
    expect(result.pdiScore).toBe(weighted);
  });

  it('returns findings explaining the score', async () => {
    const result = await PromptDefensibilityIndexService.compute('p1', 'v1', 'ws-a');
    expect(Array.isArray(result.findings)).toBe(true);
  });
});

describe('CrossModelComparisonService', () => {
  it('returns comparison with 3 reference models', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'Hello world' }],
    });
    const result = await CrossModelComparisonService.compare('v1', 'p1', 'ws-a');
    expect(result).toBeDefined();
    expect(result.promptVersionId).toBe('v1');
    expect(result.models).toHaveLength(3);
    expect(result.parityScore).toBeGreaterThanOrEqual(0);
    expect(result.parityScore).toBeLessThanOrEqual(100);
  });

  it('parityLevel is one of the valid values', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'Test' }],
    });
    const result = await CrossModelComparisonService.compare('v1', 'p1', 'ws-a');
    expect(['identical', 'similar', 'divergent', 'conflicting']).toContain(result.parityLevel);
  });

  it('runParityCheck returns check results', async () => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'Test content' }],
    });
    const result = await CrossModelComparisonService.runParityCheck('v1', 'p1', 'ws-a');
    expect(result).toBeDefined();
    expect(result.checks).toBeInstanceOf(Array);
    expect(result.checks.length).toBeGreaterThanOrEqual(1);
    expect(['pass', 'warn', 'fail']).toContain(result.overallParity);
  });
});

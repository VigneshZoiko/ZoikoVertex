import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { ConstraintShadowService } from '../../modules/prompts/ConstraintShadowService';
import { PromptVariableService } from '../../modules/prompts/PromptVariableService';
import { ParameterPolicyService } from '../../modules/prompts/ParameterPolicyService';
import { RuntimeVariableGovernanceService } from '../../modules/prompts/RuntimeVariableGovernanceService';
import { setFixtures, resetFixtures } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

beforeEach(() => {
  resetFixtures();
});

describe('ConstraintShadowService', () => {
  it('returns compiled constraints with rules list', async () => {
    const shadow = await ConstraintShadowService.compile('v1', 'tier_3_high');
    expect(shadow).toBeDefined();
    expect(shadow.promptVersionId).toBe('v1');
    expect(shadow.rules).toBeInstanceOf(Array);
    expect(shadow.compiledAt).toBeDefined();
  });

  it('tier 1 has rules but no blocking rules', async () => {
    const rules = ConstraintShadowService.getRulesForTier('tier_1_low');
    expect(rules.length).toBeGreaterThanOrEqual(1);
    const blocking = ConstraintShadowService.getBlockingRules('tier_1_low');
    expect(blocking.length).toBe(0);
  });

  it('tier 4 has blocking rules', async () => {
    const blocking = ConstraintShadowService.getBlockingRules('tier_4_critical');
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it('getApplicableRules returns rules for given tier and domain', () => {
    const outputRules = ConstraintShadowService.getApplicableRules('tier_2_medium', 'output');
    expect(Array.isArray(outputRules)).toBe(true);
    expect(outputRules.length).toBeGreaterThanOrEqual(1);
    expect(outputRules.every((r) => r.domain === 'output')).toBe(true);
  });

  it('higher tiers have more blocking rules than lower tiers', () => {
    const lowBlocking = ConstraintShadowService.getBlockingRules('tier_1_low').length;
    const highBlocking = ConstraintShadowService.getBlockingRules('tier_4_critical').length;
    expect(highBlocking).toBeGreaterThan(lowBlocking);
  });
});

describe('PromptVariableService', () => {
  beforeEach(() => {
    setFixtures({
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', version_number: 1, body: 'Hello {{name}}', immutable: false }],
      prompts: [{ id: 'p1', workspace_id: 'ws-a' }],
    });
  });

  it('extracts variables from prompt body', async () => {
    const vars = await PromptVariableService.getVariables('v1');
    expect(vars).toBeDefined();
  });

  it('stores variable definitions', async () => {
    const definitions = {
      name: { type: 'string', required: true, description: 'User name' },
    };
    await PromptVariableService.storeVariableDefinitions('v1', definitions);
  });

  it('validates variable values against definitions', async () => {
    const definitions = {
      name: { type: 'string', required: true, minLength: 2, maxLength: 50 },
    };
    await PromptVariableService.storeVariableDefinitions('v1', definitions);
    const valid = await PromptVariableService.validateVariables('v1', { name: 'Alice' });
    expect(valid.valid).toBe(true);
  });

  it('rejects missing required variables', async () => {
    const definitions = {
      name: { type: 'string', required: true },
    };
    await PromptVariableService.storeVariableDefinitions('v1', definitions);
    const valid = await PromptVariableService.validateVariables('v1', {});
    expect(valid.valid).toBe(false);
  });
});

describe('ParameterPolicyService', () => {
  it('evaluates clean parameters without errors', async () => {
    const result = await ParameterPolicyService.evaluateParameters({ text: 'hello' }, 'tier_1_low');
    expect(result).toBeDefined();
    expect(result.allowed).toBe(true);
    expect(result.results).toBeInstanceOf(Array);
    expect(result.blockedParams).toEqual([]);
  });

  it('flags parameters with URL safety violations', async () => {
    const params = { url: 'javascript:alert(1)' };
    const result = await ParameterPolicyService.evaluateParameters(params, 'tier_2_medium');
    expect(result).toBeDefined();
  });

  it('blocks HTML in parameters for high tiers', async () => {
    const params = { html: '<script>alert(1)</script>' };
    const result = await ParameterPolicyService.evaluateParameters(params, 'tier_3_high');
    expect(result).toBeDefined();
  });

  it('detects PII patterns in parameters', async () => {
    const params = { email: 'test@example.com' };
    const result = await ParameterPolicyService.evaluateParameters(params, 'tier_4_critical');
    expect(result).toBeDefined();
  });
});

describe('RuntimeVariableGovernanceService', () => {
  beforeEach(() => {
    setFixtures({
      prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: 'tier_2_medium' }],
      prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'Hello {{name}}' }],
      prompt_runtime_traces: [],
      prompt_audit_ledger: [],
      prompt_evidence_links: [],
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
  });

  it('allows clean variable values with standard governance', async () => {
    const definitions = { name: { type: 'string', required: true, minLength: 2, maxLength: 50 } };
    await PromptVariableService.storeVariableDefinitions('v1', definitions);
    const result = await RuntimeVariableGovernanceService.enforce({
      promptVersionId: 'v1',
      parameters: { name: 'Alice' },
      riskTier: 'tier_2_medium',
      workspaceId: 'ws-a',
    });
    expect(result).toBeDefined();
    expect(result.governancePassId).toBeDefined();
    expect(result.enforcementAction).toBe('allow');
    expect(result.passed).toBe(true);
  });
});

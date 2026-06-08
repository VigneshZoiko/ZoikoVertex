import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));
vi.mock('../../shared/databaseLogger', () => ({ logToDatabase: vi.fn() }));

import { HANDLERS } from '../../modules/workflow-engine/handlers';
import { PromptAuditService } from '../../modules/prompts/PromptAuditService';
import { setFixtures, resetFixtures, mockState } from '../helpers/supabaseMock';
import { lockedShadowFixture } from '../helpers/constraintShadowFixture';

// Build an ExecutionContext for the prompt_execution step running version v1.
function ctx(trigger: Record<string, unknown> = {}): any {
  return {
    instanceId: 'inst-1',
    workflowId: 'wf-1',
    versionId: 'wfv-1',
    workspaceId: 'ws-a',
    initiatorId: 'u1',
    bag: { triggerInput: trigger },
    step: {
      id: 's1',
      version_id: 'wfv-1',
      step_type: 'prompt_execution',
      name: 'Prompt',
      sequence: 1,
      conditions: { prompt_version_id: 'v1' },
    },
  };
}

function baseFixtures(riskTier: string) {
  return {
    prompts: [{ id: 'p1', workspace_id: 'ws-a', risk_tier: riskTier }],
    prompt_versions: [{ id: 'v1', prompt_id: 'p1', body: 'Hello {{name}}' }],
    prompt_runtime_traces: [],
    prompt_audit_ledger: [],
    prompt_evidence_links: [],
  };
}

beforeEach(() => resetFixtures());
afterEach(() => vi.restoreAllMocks());

describe('Phase 3.D — live workflow prompt_execution runtime governance', () => {
  it('BLOCKS live execution when the locked Constraint Shadow is MISSING (fail-closed)', async () => {
    setFixtures(baseFixtures('tier_2_medium')); // no prompt_constraint_shadows
    const result = await HANDLERS.prompt_execution(ctx({ name: 'Alice' }));
    expect(result.status).toBe('blocked');
    expect(result.reasonCode).toBe('runtime_governance_blocked');
  });

  it('BLOCKS live execution when the locked shadow is TAMPERED (hash mismatch)', async () => {
    const tampered = lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' });
    tampered.compiled_shadow.rules[0].rule = 'TAMPERED — not what was sealed';
    setFixtures({ ...baseFixtures('tier_2_medium'), prompt_constraint_shadows: [tampered] });
    const result = await HANDLERS.prompt_execution(ctx({ name: 'Alice' }));
    expect(result.status).toBe('blocked');
    expect(result.reasonCode).toBe('runtime_governance_blocked');
  });

  it('BLOCKS live execution when compiled block-rules apply (tier 4 critical)', async () => {
    setFixtures({
      ...baseFixtures('tier_4_critical'),
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_4_critical' })],
    });
    const result = await HANDLERS.prompt_execution(ctx({ name: 'Alice' }));
    expect(result.status).toBe('blocked');
    expect(result.message).toMatch(/Tool calls must be explicitly authorized|Constraint/);
  });

  it('ALLOWS live execution when the locked shadow is valid and variables pass', async () => {
    setFixtures({
      ...baseFixtures('tier_2_medium'),
      prompt_constraint_shadows: [lockedShadowFixture({ versionId: 'v1', promptId: 'p1', workspaceId: 'ws-a', riskTier: 'tier_2_medium' })],
    });
    const result = await HANDLERS.prompt_execution(ctx({ name: 'Alice' }));
    expect(result.status).toBe('completed');
    expect(result.bagPatch?.renderedPrompt).toBe('Hello Alice');
  });

  it('records an AUDIT event and an EVIDENCE runtime-trace on block', async () => {
    const auditSpy = vi.spyOn(PromptAuditService, 'record');
    setFixtures(baseFixtures('tier_2_medium')); // missing shadow → fail-closed block
    const result = await HANDLERS.prompt_execution(ctx({ name: 'Alice' }));
    expect(result.status).toBe('blocked');

    // Audit event recorded for the blocked runtime governance evaluation.
    expect(auditSpy).toHaveBeenCalled();
    const blockedAudit = auditSpy.mock.calls.find(
      (c) => (c[0] as any)?.event_type === 'prompt.runtime.governance.blocked',
    );
    expect(blockedAudit).toBeDefined();

    // Evidence runtime-trace row written (executionId supplied) with violation flagged.
    const traces = mockState.fixtures['prompt_runtime_traces'] || [];
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(traces.some((t: any) => t.violation === true && t.execution_id === 'inst-1')).toBe(true);
  });
});

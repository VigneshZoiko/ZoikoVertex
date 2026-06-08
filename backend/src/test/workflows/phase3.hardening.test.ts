import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../shared/supabase', () => import('../helpers/supabaseMock'));

import { setFixtures, resetFixtures, mockState } from '../helpers/supabaseMock';
import { runSimulation } from '../../services/workflowSimulation.service';
import { checkWorkflowDependencies } from '../../services/workflowDependency.service';
import {
  createEvidenceBundle,
  verifyEvidenceIntegrity,
  getEvidenceByHash,
  getEvidenceByRef,
} from '../../services/workflowEvidence.service';

function makeStep(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id || 'step-1',
    version_id: 'v-1',
    step_type: 'agent_action',
    name: 'Test Step',
    description: null,
    owner_role: 'AGENT_ARCHITECT',
    owner_user_id: null,
    sequence: 1,
    conditions: {},
    input_schema: {},
    output_schema: {},
    required_policy_checks: [],
    required_evidence: false,
    sla_minutes: 30,
    fallback_owner: null,
    escalation_rule: {},
    config: {},
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEdge(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id || 'edge-1',
    version_id: 'v-1',
    from_step_id: 'step-1',
    to_step_id: 'step-2',
    condition: {},
    default_path: false,
    fail_safe_path: false,
    branch_label: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  resetFixtures();
});

describe('Simulation', () => {

  it('passes for a well-structured workflow', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's-trigger', step_type: 'trigger', name: 'Start', sequence: 0 }),
        makeStep({ id: 's-approval', step_type: 'approval_gate', name: 'Approve', sequence: 1, owner_role: 'ADMIN' }),
        makeStep({ id: 's-evidence', step_type: 'evidence_capture', name: 'Capture', sequence: 2, owner_role: 'ADMIN' }),
        makeStep({ id: 's-end', step_type: 'end', name: 'Finish', sequence: 3 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's-trigger', to_step_id: 's-approval' }),
        makeEdge({ id: 'e2', from_step_id: 's-approval', to_step_id: 's-evidence' }),
        makeEdge({ id: 'e3', from_step_id: 's-evidence', to_step_id: 's-end' }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-1', risk_level: 'low', name: 'Test WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      scenario_name: 'Happy Path',
      created_by: 'user-1',
    });

    expect(result.result).toBe('pass');
    expect(result.blocks).toHaveLength(0);
    expect(result.id).toBeTruthy();
    expect(result.evidence_ref).toBeTruthy();
  });

  it('blocks when trigger is missing', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's1', step_type: 'agent_action', name: 'Do Work', sequence: 0 }),
        makeStep({ id: 's2', step_type: 'end', name: 'Finish', sequence: 1 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's1', to_step_id: 's2' }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-1', risk_level: 'low', name: 'Test WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      created_by: 'user-1',
    });

    expect(result.result).toBe('block');
    expect(result.blocks.some(b => b.type === 'missing_trigger')).toBe(true);
  });

  it('blocks when approval gate missing for critical risk', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's-trigger', step_type: 'trigger', name: 'Start', sequence: 0 }),
        makeStep({ id: 's-end', step_type: 'end', name: 'Finish', sequence: 1 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's-trigger', to_step_id: 's-end' }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-crit', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-crit', current_version_id: 'v-1', risk_level: 'critical', name: 'Critical WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      created_by: 'user-1',
    });

    expect(result.result).toBe('block');
    expect(result.blocks.some(b => b.type === 'missing_approval_gate')).toBe(true);
  });

  it('warns when no evidence capture node exists', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's-trigger', step_type: 'trigger', name: 'Start', sequence: 0 }),
        makeStep({ id: 's-end', step_type: 'end', name: 'Finish', sequence: 1 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's-trigger', to_step_id: 's-end' }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-1', risk_level: 'low', name: 'Test WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      created_by: 'user-1',
    });

    expect(result.warnings.some(w => w.type === 'missing_evidence_capture')).toBe(true);
  });

  it('warns for stale knowledge source', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's-trigger', step_type: 'trigger', name: 'Start', sequence: 0 }),
        makeStep({ id: 's-know', step_type: 'knowledge_lookup', name: 'Lookup', sequence: 1, config: { knowledge_id: 'ks-stale' } }),
        makeStep({ id: 's-end', step_type: 'end', name: 'Finish', sequence: 2 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's-trigger', to_step_id: 's-know' }),
        makeEdge({ id: 'e2', from_step_id: 's-know', to_step_id: 's-end' }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-1', risk_level: 'low', name: 'Test WF', status: 'draft' },
      ],
      knowledge_sources: [
        { id: 'ks-stale', name: 'Stale Source', status: 'paused', freshness_score: 0.3 },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      created_by: 'user-1',
    });

    expect(result.dependency_results.some(d => d.dependency_type === 'knowledge_source')).toBe(true);
  });

  it('blocks when publish has no preceding policy check', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's-trigger', step_type: 'trigger', name: 'Start', sequence: 0 }),
        makeStep({ id: 's-pub', step_type: 'publish', name: 'Publish Now', sequence: 1 }),
        makeStep({ id: 's-end', step_type: 'end', name: 'Finish', sequence: 2 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's-trigger', to_step_id: 's-pub' }),
        makeEdge({ id: 'e2', from_step_id: 's-pub', to_step_id: 's-end' }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-1', risk_level: 'low', name: 'Test WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      created_by: 'user-1',
    });

    expect(result.result).toBe('block');
    expect(result.blocks.some(b => b.type === 'missing_policy_check_before_publish')).toBe(true);
  });

  it('warns for branch without default or fail-safe paths', async () => {
    setFixtures({
      workflow_steps: [
        makeStep({ id: 's-trigger', step_type: 'trigger', name: 'Start', sequence: 0 }),
        makeStep({ id: 's-branch', step_type: 'branch', name: 'Decision', sequence: 1 }),
        makeStep({ id: 's-end', step_type: 'end', name: 'Finish', sequence: 2 }),
      ],
      workflow_edges: [
        makeEdge({ id: 'e1', from_step_id: 's-trigger', to_step_id: 's-branch' }),
        makeEdge({ id: 'e2', from_step_id: 's-branch', to_step_id: 's-end', default_path: false, fail_safe_path: false }),
      ],
      workflow_versions: [
        { id: 'v-1', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-1', risk_level: 'low', name: 'Test WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-1',
      created_by: 'user-1',
    });

    expect(result.warnings.some(w => w.type === 'missing_default_branch')).toBe(true);
    expect(result.warnings.some(w => w.type === 'missing_fail_safe_branch')).toBe(true);
  });

  it('handles no steps gracefully', async () => {
    setFixtures({
      workflow_steps: [],
      workflow_edges: [],
      workflow_versions: [
        { id: 'v-empty', workflow_id: 'wf-1', state: 'draft', version_number: 1 },
      ],
      workflow_templates: [
        { id: 'wf-1', current_version_id: 'v-empty', risk_level: 'low', name: 'Empty WF', status: 'draft' },
      ],
    });

    const result = await runSimulation({
      workflow_version_id: 'v-empty',
      created_by: 'user-1',
    });

    expect(result.result).toBe('block');
    expect(result.blocks.some(b => b.type === 'no_steps')).toBe(true);
  });
});

describe('Dependency health checks', () => {

  it('reports healthy for active agents', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-agent', version_id: 'v-dep', config: { agent_id: 'ag-1' } }),
      ],
      agents: [
        { id: 'ag-1', name: 'Active Agent', status: 'active' },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const agentDep = deps.find(d => d.dependency_type === 'agent');
    expect(agentDep).toBeTruthy();
    expect(agentDep!.health).toBe('healthy');
    expect(agentDep!.blocking).toBe(false);
  });

  it('reports missing when agent not found', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-agent', version_id: 'v-dep', config: { agent_id: 'ag-missing' } }),
      ],
      agents: [],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const agentDep = deps.find(d => d.dependency_id_ref === 'ag-missing');
    expect(agentDep).toBeTruthy();
    expect(agentDep!.health).toBe('missing');
    expect(agentDep!.blocking).toBe(true);
  });

  it('reports paused for paused agents', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-agent', version_id: 'v-dep', config: { agent_id: 'ag-paused' } }),
      ],
      agents: [
        { id: 'ag-paused', name: 'Paused Agent', status: 'paused' },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const agentDep = deps.find(d => d.dependency_id_ref === 'ag-paused');
    expect(agentDep).toBeTruthy();
    expect(agentDep!.health).toBe('paused');
    expect(agentDep!.blocking).toBe(false);
  });

  it('reports deprecated for retired agents', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-agent', version_id: 'v-dep', config: { agent_id: 'ag-dep' } }),
      ],
      agents: [
        { id: 'ag-dep', name: 'Deprecated Agent', status: 'deprecated' },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const agentDep = deps.find(d => d.dependency_id_ref === 'ag-dep');
    expect(agentDep).toBeTruthy();
    expect(agentDep!.health).toBe('deprecated');
  });

  it('reports critical failure for failed agents', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-agent', version_id: 'v-dep', config: { agent_id: 'ag-fail' } }),
      ],
      agents: [
        { id: 'ag-fail', name: 'Failed Agent', status: 'error' },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const agentDep = deps.find(d => d.dependency_id_ref === 'ag-fail');
    expect(agentDep).toBeTruthy();
    expect(agentDep!.health).toBe('critical_failure');
    expect(agentDep!.blocking).toBe(true);
  });

  it('stale when prompt has no approved version', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-prompt', version_id: 'v-dep', config: { prompt_id: 'pr-1' } }),
      ],
      prompts: [
        { id: 'pr-1', name: 'Draft Prompt', status: 'draft' },
      ],
      prompt_versions: [
        { prompt_id: 'pr-1', state: 'draft', version_number: 1 },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const promptDep = deps.find(d => d.dependency_id_ref === 'pr-1');
    expect(promptDep).toBeTruthy();
    expect(promptDep!.health).toBe('stale');

    const versionDep = deps.find(d => d.dependency_id_ref === 'pr-1-version');
    expect(versionDep).toBeTruthy();
    expect(versionDep!.health).toBe('stale');
  });

  it('healthy when prompt has approved version', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-prompt', version_id: 'v-dep', config: { prompt_id: 'pr-approved' } }),
      ],
      prompts: [
        { id: 'pr-approved', name: 'Approved Prompt', status: 'active' },
      ],
      prompt_versions: [
        { prompt_id: 'pr-approved', state: 'approved', version_number: 2 },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');
    const promptDep = deps.find(d => d.dependency_id_ref === 'pr-approved');
    expect(promptDep).toBeTruthy();
    expect(promptDep!.health).toBe('healthy');

    const versionDep = deps.find(d => d.dependency_id_ref === 'pr-approved-version');
    expect(versionDep).toBeUndefined();
  });

  it('all results have required fields', async () => {
    setFixtures({
      workflow_templates: [
        { id: 'wf-dep', name: 'Dep WF', current_version_id: 'v-dep', status: 'draft', risk_level: 'low' },
      ],
      workflow_steps: [
        makeStep({ id: 's-agent', version_id: 'v-dep', config: { agent_id: 'ag-1' } }),
      ],
      agents: [
        { id: 'ag-1', name: 'Active Agent', status: 'active' },
      ],
    });

    const deps = await checkWorkflowDependencies('wf-dep');

    expect(deps.length).toBeGreaterThan(0);
    for (const dep of deps) {
      expect(dep).toHaveProperty('dependency_type');
      expect(dep).toHaveProperty('dependency_id_ref');
      expect(dep).toHaveProperty('dependency_name');
      expect(dep).toHaveProperty('required_status');
      expect(dep).toHaveProperty('current_status');
      expect(dep).toHaveProperty('health');
      expect(dep).toHaveProperty('impact_level');
      expect(dep).toHaveProperty('last_checked_at');
      expect(dep).toHaveProperty('blocking');
      expect(dep).toHaveProperty('recommended_action');
    }
  });
});

describe('Evidence bundles', () => {

  it('creates bundle with hash and evidence ref', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const result = await createEvidenceBundle({
      workspace_id: 'ws-1',
      workflow_id: 'wf-ev',
      version_id: 'v-ev',
      bundle_type: 'simulation',
      actor_id: 'user-1',
      actor_name: 'Test User',
      input_snapshot: { scenario: 'test' },
      output_snapshot: { result: 'pass' },
      policy_results: [{ check: 'compliance', status: 'passed' }],
      dependency_results: [{ type: 'agent', health: 'healthy' }],
      approval_chain_state: { status: 'approved' },
      created_by: 'user-1',
    });

    expect(result.id).toBeTruthy();
    expect(result.hash).toBeTruthy();
    expect(result.evidence_ref).toBeTruthy();
    expect(result.hash.length).toBe(64);
    expect(result.evidence_ref.length).toBe(16);
  });

  it('deterministic hash for identical content', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const input = {
      workspace_id: 'ws-det',
      workflow_id: 'wf-det',
      version_id: 'v-det',
      bundle_type: 'run' as const,
      actor_id: 'u-1' as string | undefined,
      actor_name: 'U1' as string | undefined,
      input_snapshot: { data: 'test' },
      output_snapshot: { result: 'ok' },
      policy_results: [],
      dependency_results: [],
      approval_chain_state: {},
      errors: [],
      warnings: [],
      blocks: [],
      created_by: 'u-1',
    };

    const r1 = await createEvidenceBundle(input);
    const r2 = await createEvidenceBundle(input);

    expect(r1.id).not.toBe(r2.id);
    expect(r1.hash).toBe(r2.hash);
    expect(r1.evidence_ref).toBe(r2.evidence_ref);
  });

  it('different hash for different content', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const base = {
      workspace_id: 'ws-1',
      workflow_id: 'wf-1',
      version_id: 'v-1',
      bundle_type: 'run' as const,
      actor_id: 'u-1',
      actor_name: 'U1',
      input_snapshot: {},
      output_snapshot: {},
      policy_results: [],
      dependency_results: [],
      approval_chain_state: {},
      errors: [],
      warnings: [],
      blocks: [],
      created_by: 'u-1',
    };

    const r1 = await createEvidenceBundle({ ...base, input_snapshot: { a: 1 } });
    const r2 = await createEvidenceBundle({ ...base, input_snapshot: { a: 2 } });

    expect(r1.hash).not.toBe(r2.hash);
    expect(r1.evidence_ref).not.toBe(r2.evidence_ref);
  });

  it('verifies integrity', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const result = await createEvidenceBundle({
      workspace_id: 'ws-vfy',
      workflow_id: 'wf-vfy',
      version_id: 'v-vfy',
      bundle_type: 'approval',
      actor_id: 'u-2',
      input_snapshot: { review: 'approve' },
      approval_chain_state: { status: 'approved' },
      created_by: 'u-2',
    });

    const integrity = await verifyEvidenceIntegrity(result.id);
    expect(integrity.valid).toBe(true);
  });

  it('fails integrity check for tampered bundle', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const result = await createEvidenceBundle({
      workspace_id: 'ws-tamper',
      workflow_id: 'wf-tamper',
      version_id: 'v-tamper',
      bundle_type: 'action',
      actor_id: 'u-3',
      input_snapshot: { original: 'data' },
      created_by: 'u-3',
    });

    const stored = mockState.fixtures['workflow_evidence_bundles'];
    if (stored && stored.length > 0) {
      stored[0].canonical_hash = 'tampered-hash-value';
    }

    const integrity = await verifyEvidenceIntegrity(result.id);
    expect(integrity.valid).toBe(false);
    expect(integrity.reason).toContain('Hash mismatch');
  });

  it('bundle includes all context fields', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    await createEvidenceBundle({
      workspace_id: 'ws-ctx',
      workflow_id: 'wf-ctx',
      version_id: 'v-ctx',
      bundle_type: 'run',
      actor_id: 'u-ctx',
      actor_name: 'Context Tester',
      input_snapshot: { request: 'check' },
      output_snapshot: { response: 'verified' },
      policy_results: [{ policy: 'p1', status: 'passed' }, { policy: 'p2', status: 'warning' }],
      dependency_results: [{ type: 'agent', health: 'healthy', id: 'ag-1' }],
      approval_chain_state: { chain_id: 'chain-1', status: 'approved' },
      warnings: ['SLA not defined for step 2'],
      created_by: 'u-ctx',
    });

    const stored = mockState.fixtures['workflow_evidence_bundles'];
    expect(stored).toHaveLength(1);

    const bundle = stored[0];
    expect(bundle.workflow_id).toBe('wf-ctx');
    expect(bundle.version_id).toBe('v-ctx');
    expect(bundle.bundle_type).toBe('run');
    expect(bundle.actor_id).toBe('u-ctx');
    expect(bundle.actor_name).toBe('Context Tester');
    expect(bundle.policy_results).toHaveLength(2);
    expect(bundle.dependency_results).toHaveLength(1);
    expect(bundle.approval_chain_state.chain_id).toBe('chain-1');
    expect(bundle.canonical_hash).toBeTruthy();
    expect(bundle.evidence_ref).toBeTruthy();
    expect(bundle.hash_algo).toBe('sha-256');
  });

  it('retrieves by hash', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const result = await createEvidenceBundle({
      workspace_id: 'ws-ret', workflow_id: 'wf-ret', version_id: 'v-ret',
      bundle_type: 'run', created_by: 'u-ret',
    });

    const retrieved = await getEvidenceByHash(result.hash);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.id).toBe(result.id);
  });

  it('retrieves by evidence ref', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const result = await createEvidenceBundle({
      workspace_id: 'ws-ref', workflow_id: 'wf-ref', version_id: 'v-ref',
      bundle_type: 'run', created_by: 'u-ref',
    });

    const retrieved = await getEvidenceByRef(result.evidence_ref);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.id).toBe(result.id);
  });

  it('returns null for non-existent hash', async () => {
    setFixtures({ workflow_evidence_bundles: [] });

    const result = await getEvidenceByHash('non-existent-hash');
    expect(result).toBeNull();
  });
});

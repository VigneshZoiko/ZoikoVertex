/**
 * Workflow Staging Seed — Creates demo data for verification
 * Skips evidence_bundles and approval_chains (migrations not applied).
 */
import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

const WS = '00000000-0000-0000-0000-000000000000';

async function insert(table: string, row: any, label: string): Promise<string> {
  const { data, error } = await supabaseAdmin.from(table).insert(row).select();
  if (error) {
    console.error(`  ❌ ${label}: ${error.message}`);
    throw error;
  }
  const id = data?.[0]?.id || row.id;
  console.log(`  ✅ ${label}: ${id.substring(0, 8)}`);
  return id;
}

async function seed() {
  console.log('Seeding workflow staging data...\n');

  // ─── 1. PENDING APPROVAL WORKFLOW ─────────────────────────
  const pendingId = await insert('workflow_templates', {
    id: uuidv4(), workspace_id: WS, tenant_id: WS,
    name: 'Campaign Approval Pipeline',
    description: 'Multi-step campaign approval workflow awaiting review',
    type: 'governed', status: 'pending_approval', risk_level: 'high',
    owner_id: null, owner_name: 'Marketing Ops',
    brand_ids: [], platforms: ['linkedin', 'twitter'],
  }, 'pending_approval workflow');

  // ─── 2. ACTIVE WORKFLOW ───────────────────────────────────
  const activeId = await insert('workflow_templates', {
    id: uuidv4(), workspace_id: WS, tenant_id: WS,
    name: 'Automated Brand Review',
    description: 'Active daily brand compliance check',
    type: 'governed', status: 'active', risk_level: 'low',
    owner_id: null, owner_name: 'Brand Steward',
    brand_ids: [], platforms: ['all'],
  }, 'active workflow');

  // ─── 3. VERSIONS ──────────────────────────────────────────
  const pendingVerId = await insert('workflow_versions', {
    id: uuidv4(), workflow_id: pendingId,
    version_number: 1, state: 'pending_approval',
    change_summary: 'Initial version for campaign approval',
    created_by: null,
  }, 'pending version');

  const activeVerId = await insert('workflow_versions', {
    id: uuidv4(), workflow_id: activeId,
    version_number: 1, state: 'active',
    change_summary: 'Production version',
    created_by: null, approved_by: null,
    activated_at: new Date().toISOString(),
  }, 'active version');

  await supabaseAdmin.from('workflow_templates').update({ current_version_id: activeVerId }).eq('id', activeId);
  console.log('  ✅ current_version_id set on active workflow');

  // ─── 4. STEPS ─────────────────────────────────────────────
  const triggerId = await insert('workflow_steps', {
    id: uuidv4(), version_id: activeVerId,
    step_type: 'trigger', name: 'Content Submission', sequence: 0,
  }, 'trigger step');

  const reviewId = await insert('workflow_steps', {
    id: uuidv4(), version_id: activeVerId,
    step_type: 'policy_check', name: 'Brand Policy Check', sequence: 1,
  }, 'policy step');

  const pubId = await insert('workflow_steps', {
    id: uuidv4(), version_id: activeVerId,
    step_type: 'publish', name: 'Auto-Publish', sequence: 2,
  }, 'publish step');

  // ─── 5. EDGES ─────────────────────────────────────────────
  await insert('workflow_edges', {
    id: uuidv4(), version_id: activeVerId,
    from_step_id: triggerId, to_step_id: reviewId,
    default_path: true,
  }, 'edge trigger->review');

  await insert('workflow_edges', {
    id: uuidv4(), version_id: activeVerId,
    from_step_id: reviewId, to_step_id: pubId,
    default_path: true,
  }, 'edge review->publish');

  // ─── 6. SIMULATION ────────────────────────────────────────
  await insert('simulation_runs', {
    id: uuidv4(), workflow_version_id: pendingVerId,
    scenario_name: 'Standard Campaign Run',
    result: 'pass', warnings: [], blocks: [], failed_steps: [],
    evidence_ref: 'sim-ev-001',
  }, 'simulation run');

  // ─── 7. DEPENDENCY RECORDS ────────────────────────────────
  await insert('dependency_records', {
    id: uuidv4(), workflow_version_id: activeVerId,
    dependency_type: 'agent', dependency_id_ref: uuidv4(),
    required_status: 'active', current_status: 'active',
    impact_level: 'high',
    last_checked_at: new Date().toISOString(),
  }, 'dependency agent');

  await insert('dependency_records', {
    id: uuidv4(), workflow_version_id: activeVerId,
    dependency_type: 'prompt', dependency_id_ref: uuidv4(),
    required_status: 'active', current_status: 'active',
    impact_level: 'medium',
    last_checked_at: new Date().toISOString(),
  }, 'dependency prompt');

  // ─── 8. EVIDENCE BUNDLE ──────────────────────────────────
  const hash = crypto.createHash('sha256').update(activeVerId + 'run-001').digest('hex');
  await insert('workflow_evidence_bundles', {
    id: uuidv4(), workflow_id: activeId, version_id: activeVerId,
    workspace_id: WS, bundle_type: 'run',
    actor_id: null, actor_name: 'System',
    input_snapshot: { trigger: 'content_submission' },
    output_snapshot: { result: 'pass' },
    policy_results: [{ check: 'brand_policy', status: 'pass' }],
    dependency_results: [{ dep: 'agent-1', status: 'active' }],
    approval_chain_state: { required: 1, completed: 1 },
    errors: [], warnings: [], blocks: [],
    canonical_hash: hash, hash_algo: 'sha-256',
    evidence_ref: 'ev-001', source_run_id: 'sim-run-1',
    sealed_at: new Date().toISOString(), created_by: null,
  }, 'evidence bundle');

  // ─── 9. APPROVAL CHAIN (high risk → 3 keys) ─────────────
  const chainId = await insert('workflow_approval_chains', {
    id: uuidv4(), workflow_id: pendingId, version_id: pendingVerId,
    risk_level: 'high', status: 'pending',
    created_by: null,
  }, 'approval chain (high risk)');

  await insert('workflow_approval_keys', {
    id: uuidv4(), chain_id: chainId,
    approval_sequence: 0, required_role: 'AGENT_ARCHITECT',
    approver_id: null, approver_name: null,
    decision: null, decision_reason: null, decided_at: null, evidence_ref: null,
  }, 'key 1: AGENT_ARCHITECT');

  await insert('workflow_approval_keys', {
    id: uuidv4(), chain_id: chainId,
    approval_sequence: 1, required_role: 'ADMIN',
    approver_id: null, approver_name: null,
    decision: null, decision_reason: null, decided_at: null, evidence_ref: null,
  }, 'key 2: ADMIN');

  await insert('workflow_approval_keys', {
    id: uuidv4(), chain_id: chainId,
    approval_sequence: 2, required_role: 'GOVERNANCE_ADMIN',
    approver_id: null, approver_name: null,
    decision: null, decision_reason: null, decided_at: null, evidence_ref: null,
  }, 'key 3: GOVERNANCE_ADMIN');

  console.log('\n✅ Workflow staging seed complete');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

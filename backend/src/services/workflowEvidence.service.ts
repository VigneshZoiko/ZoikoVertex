import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export type EvidenceBundleType = 'run' | 'simulation' | 'approval' | 'action';

export interface EvidenceContent {
  workflow_id: string;
  version_id: string;
  bundle_type: EvidenceBundleType;
  actor_id?: string;
  actor_name?: string;
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown>;
  policy_results: any[];
  dependency_results: any[];
  approval_chain_state: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  blocks: string[];
}

export interface EvidenceBundle extends EvidenceContent {
  id: string;
  workspace_id: string;
  canonical_hash: string;
  hash_algo: string;
  evidence_ref: string;
  sealed_at: string | null;
  created_at: string;
}

function computeCanonicalHash(content: Omit<EvidenceContent, 'bundle_type'> & { workspace_id: string; bundle_type: string }): { hash: string; evidenceRef: string } {
  const canonical = JSON.stringify({
    wf: content.workflow_id,
    v: content.version_id,
    ws: content.workspace_id,
    bt: content.bundle_type,
    inp: content.input_snapshot,
    outp: content.output_snapshot,
    pr: content.policy_results,
    dr: content.dependency_results,
    ac: content.approval_chain_state,
    err: content.errors,
    warn: content.warnings,
    blk: content.blocks,
  });

  const hash = crypto.createHash('sha256').update(canonical).digest('hex');
  const evidenceRef = hash.slice(0, 16);
  return { hash, evidenceRef };
}

export async function createEvidenceBundle(params: {
  workspace_id: string;
  workflow_id: string;
  version_id: string;
  bundle_type: EvidenceBundleType;
  actor_id?: string;
  actor_name?: string;
  input_snapshot?: Record<string, unknown>;
  output_snapshot?: Record<string, unknown>;
  policy_results?: any[];
  dependency_results?: any[];
  approval_chain_state?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
  blocks?: string[];
  source_run_id?: string;
  created_by?: string;
}) {
  const id = uuidv4();

  const content: Omit<EvidenceContent, 'bundle_type'> & { workspace_id: string; bundle_type: string } = {
    workspace_id: params.workspace_id,
    workflow_id: params.workflow_id,
    version_id: params.version_id,
    bundle_type: params.bundle_type,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    input_snapshot: params.input_snapshot || {},
    output_snapshot: params.output_snapshot || {},
    policy_results: params.policy_results || [],
    dependency_results: params.dependency_results || [],
    approval_chain_state: params.approval_chain_state || {},
    errors: params.errors || [],
    warnings: params.warnings || [],
    blocks: params.blocks || [],
  };

  const { hash, evidenceRef } = computeCanonicalHash(content);

  const { error } = await supabaseAdmin.from('workflow_evidence_bundles').insert({
    id,
    workspace_id: params.workspace_id,
    workflow_id: params.workflow_id,
    version_id: params.version_id,
    bundle_type: params.bundle_type,
    actor_id: params.actor_id || null,
    actor_name: params.actor_name || null,
    input_snapshot: content.input_snapshot,
    output_snapshot: content.output_snapshot,
    policy_results: content.policy_results,
    dependency_results: content.dependency_results,
    approval_chain_state: content.approval_chain_state,
    errors: content.errors,
    warnings: content.warnings,
    blocks: content.blocks,
    canonical_hash: hash,
    hash_algo: 'sha-256',
    evidence_ref: evidenceRef,
    source_run_id: params.source_run_id || null,
    created_by: params.created_by || null,
  });

  if (error) throw error;

  return { id, hash, evidence_ref: evidenceRef };
}

export async function resealEvidenceBundle(bundleId: string): Promise<{ sealed_at: string }> {
  const sealedAt = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('workflow_evidence_bundles')
    .update({ sealed_at: sealedAt })
    .eq('id', bundleId);
  if (error) throw error;
  return { sealed_at: sealedAt };
}

export async function getWorkflowEvidence(instanceId: string) {
  const { data: bundles, error } = await supabaseAdmin
    .from('workflow_evidence_bundles')
    .select('*')
    .or(`source_run_id.eq.${instanceId},id.eq.${instanceId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return bundles || null;
}

export async function getEvidenceByHash(hash: string): Promise<EvidenceBundle | null> {
  const { data, error } = await supabaseAdmin
    .from('workflow_evidence_bundles')
    .select('*')
    .eq('canonical_hash', hash)
    .single();
  if (error || !data) return null;
  return data as EvidenceBundle;
}

export async function getEvidenceByRef(evidenceRef: string): Promise<EvidenceBundle | null> {
  const { data, error } = await supabaseAdmin
    .from('workflow_evidence_bundles')
    .select('*')
    .eq('evidence_ref', evidenceRef)
    .maybeSingle();
  if (error || !data) return null;
  return data as EvidenceBundle;
}

export async function verifyEvidenceIntegrity(bundleId: string): Promise<{ valid: boolean; reason?: string }> {
  const { data: bundle, error } = await supabaseAdmin
    .from('workflow_evidence_bundles')
    .select('*')
    .eq('id', bundleId)
    .single();
  if (error || !bundle) return { valid: false, reason: 'Bundle not found' };

  const content = {
    workspace_id: bundle.workspace_id,
    workflow_id: bundle.workflow_id,
    version_id: bundle.version_id,
    bundle_type: bundle.bundle_type,
    input_snapshot: bundle.input_snapshot || {},
    output_snapshot: bundle.output_snapshot || {},
    policy_results: bundle.policy_results || [],
    dependency_results: bundle.dependency_results || [],
    approval_chain_state: bundle.approval_chain_state || {},
    errors: bundle.errors || [],
    warnings: bundle.warnings || [],
    blocks: bundle.blocks || [],
  };

  const { hash } = computeCanonicalHash(content as any);

  if (hash !== bundle.canonical_hash) {
    return { valid: false, reason: 'Hash mismatch — content has been tampered with' };
  }

  return { valid: true };
}

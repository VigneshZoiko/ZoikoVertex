import { supabaseAdmin } from '../shared/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface EvidenceBundle {
  id: string;
  workspace_id: string;
  tenant_id?: string | null;
  brand_id?: string | null;
  run_id: string;
  status: string;
  hash: string;
  locked_at: string;
  exported_by: string;
  exported_at: string;
  export_reason: string;
  storage_ref: string;
  created_at: string;
}

export async function getRunEvidence(bundleId: string) {
  const { data, error } = await supabaseAdmin
    .from('evidence_bundles')
    .select('*, agent_runs!inner(tenant_id, brand_id, workspace_id)')
    .eq('id', bundleId)
    .single();
  if (error) throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });
  const run = (data as any).agent_runs;
  return {
    ...(data as any),
    tenant_id: run?.tenant_id || null,
    brand_id: run?.brand_id || null,
    workspace_id: (data as any).workspace_id || run?.workspace_id,
  } as EvidenceBundle;
}

export async function exportEvidence(params: {
  bundleId: string;
  exportedBy: string;
  exportReason: string;
  storageRef?: string;
}) {
  const now = new Date().toISOString();
  // NOTE: do NOT change `status` here. The evidence_status enum has no
  // 'exported' value; the export is recorded via exported_by/exported_at/
  // export_reason. A locked bundle therefore stays 'locked' (and the write-once
  // trigger permits these export-bookkeeping fields to change).
  const update: Record<string, unknown> = {
    exported_by: params.exportedBy,
    exported_at: now,
    export_reason: params.exportReason,
  };
  if (params.storageRef) update.storage_ref = params.storageRef;
  const { error: updateError } = await supabaseAdmin
    .from('evidence_bundles')
    .update(update)
    .eq('id', params.bundleId);
  if (updateError) throw updateError;

  return { id: params.bundleId, exported_by: params.exportedBy, exported_at: now };
}

// Deterministically serialize a value with sorted object keys so the hash is
// stable regardless of column/property ordering.
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

// Build the canonical evidence content for a run: the run snapshot, its
// immutable timeline, and its policy results. This is what the integrity hash
// must cover so tampering with any underlying evidence is detectable.
async function buildEvidenceContent(runId: string) {
  const [{ data: run }, { data: events }, { data: policies }] = await Promise.all([
    supabaseAdmin.from('agent_runs').select('*').eq('id', runId).maybeSingle(),
    supabaseAdmin.from('run_events').select('*').eq('run_id', runId).order('created_at', { ascending: true }),
    supabaseAdmin.from('policy_results').select('*').eq('run_id', runId).order('created_at', { ascending: true }),
  ]);
  return {
    run: run ?? null,
    events: events ?? [],
    policy_results: policies ?? [],
  };
}

export async function computeEvidenceHash(runId: string) {
  const content = await buildEvidenceContent(runId);
  const hash = crypto.createHash('sha256').update(canonicalize(content)).digest('hex');
  return { hash, content };
}

export async function createEvidenceBundle(params: {
  workspace_id: string;
  run_id: string;
}) {
  const id = uuidv4();
  // Content-integrity hash over the actual evidence (run + timeline + policy
  // results), not over identifiers. Detects tampering of the sealed evidence.
  const { hash } = await computeEvidenceHash(params.run_id);

  const { error } = await supabaseAdmin.from('evidence_bundles').insert({
    id,
    workspace_id: params.workspace_id,
    run_id: params.run_id,
    // 'captured' is a valid evidence_status (the bundle's content is hashed at
    // creation). The enum has no 'pending' value.
    status: 'captured',
    hash,
    content_hash: hash,
    content_hash_algo: 'sha256',
  });
  if (error) throw error;
  return { id, hash, content_hash: hash, content_hash_algo: 'sha256' };
}

// Recompute the current content hash and compare it to the sealed value.
// Enables auditors to prove a locked bundle's evidence has not been altered.
export async function verifyEvidenceIntegrity(bundleId: string) {
  const { data: bundle, error } = await supabaseAdmin
    .from('evidence_bundles')
    .select('id, run_id, content_hash, hash, locked_at')
    .eq('id', bundleId)
    .maybeSingle();
  if (error) throw error;
  if (!bundle) throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });
  const sealed = bundle.content_hash || bundle.hash;
  const { hash: current } = await computeEvidenceHash(bundle.run_id);
  return {
    id: bundle.id,
    run_id: bundle.run_id,
    locked: Boolean(bundle.locked_at),
    sealed_hash: sealed,
    current_hash: current,
    intact: Boolean(sealed) && sealed === current,
  };
}

export async function lockEvidenceBundle(bundleId: string) {
  const { data: bundle, error: fetchError } = await supabaseAdmin
    .from('evidence_bundles')
    .select('*')
    .eq('id', bundleId)
    .single();
  if (fetchError || !bundle) throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });
  if (bundle.locked_at) throw Object.assign(new Error('Evidence bundle already locked'), { statusCode: 409 });

  const now = new Date().toISOString();
  // Seal the content hash at the moment of lock. After this update the DB
  // write-once trigger (operations_evidence_write_once) freezes hash/content_hash
  // so the sealed evidence can no longer be altered.
  const { hash } = await computeEvidenceHash(bundle.run_id);
  const { error } = await supabaseAdmin
    .from('evidence_bundles')
    .update({
      status: 'locked',
      locked_at: now,
      sealed_at: now,
      hash,
      content_hash: hash,
      content_hash_algo: 'sha256',
    })
    .eq('id', bundleId);
  if (error) throw error;
  return { id: bundleId, locked_at: now, content_hash: hash };
}

export async function listEvidenceBundles(params: {
  workspace_id: string;
  run_id?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  let query = supabaseAdmin
    .from('evidence_bundles')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.run_id) query = query.eq('run_id', params.run_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { bundles: data || [], total: count || 0 };
}

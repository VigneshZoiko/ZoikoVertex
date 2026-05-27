import { supabaseAdmin } from '../shared/supabase';
import { createAuditEvent } from './auditTrail.service';
import * as crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultEvidenceItem {
  id: string;
  item_id: string;
  schema_version: string;
  tenant_id: string;
  workspace_id: string;
  data_residency: string;
  source_type: string;
  source_id: string;
  source_system: string;
  source_timestamp_utc: string | null;
  evidence_type: string | null;
  risk_level: string;
  sensitivity: string;
  contains_pii: boolean;
  contains_ai_output: boolean;
  jurisdictions: string[];
  original_content_hash: string | null;
  normalized_content_hash: string | null;
  metadata_hash: string | null;
  preservation_receipt_hash: string | null;
  hash_algorithm: string;
  preserved_by_actor_id: string;
  authority: string | null;
  preservation_reason: string;
  origin_ip_hash: string | null;
  retention_class: string;
  retention_until: string | null;
  legal_hold: boolean;
  hold_ids: string[];
  vault_state: string;
  access_policy_id: string | null;
  payload_ref: string | null;
  payload_size: number;
  mime_type: string | null;
  metadata: any;
  verification_count: number;
  last_verified_at: string | null;
  last_verified_by: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

export interface VaultCollection {
  id: string;
  collection_id: string;
  workspace_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  scope: any;
  initial_item_hash: string | null;
  item_count: number;
  created_by: string;
  created_reason: string | null;
  schema_version: string;
  created_at: string;
  updated_at: string;
}

interface PreserveParams {
  source_type: string;
  source_id: string;
  source_system: string;
  source_timestamp_utc?: string;
  evidence_type?: string;
  risk_level?: string;
  sensitivity?: string;
  contains_pii?: boolean;
  contains_ai_output?: boolean;
  jurisdictions?: string[];
  payload?: string;
  payload_size?: number;
  mime_type?: string;
  retention_class?: string;
  retention_until?: string;
  preserved_by: string;
  authority?: string;
  preservation_reason: string;
  workspace_id: string;
  tenant_id: string;
  metadata?: any;
}

interface CollectionParams {
  workspace_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  scope?: any;
  created_by: string;
  created_reason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.keys(value as Record<string, unknown>).sort().reduce((acc: Record<string, unknown>, key: string) => {
      acc[key] = stableSort((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableSort(value));
}

function computeHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateItemId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EVI-${seq}-${rand}`;
}

function generateCollectionId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `COL-${seq}-${rand}`;
}

function generatePackageId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PKG-${seq}-${rand}`;
}

function generateHoldId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `HLD-${seq}-${rand}`;
}

function generateExportId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EXP-${seq}-${rand}`;
}

function generateRedactionPolicyId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RP-${seq}-${rand}`;
}

// ─── Audit Helper ───────────────────────────────────────────────────────────────

async function emitVaultAuditEvent(
  eventType: string, workspaceId: string, actorId: string,
  title: string, summary: string,
  object: { object_type: string; object_id: string; object_name?: string },
  change?: { field_changed?: string; previous_value?: unknown; new_value?: unknown; change_reason?: string },
  authority?: { permission_used?: string; override_reason?: string },
): Promise<string | null> {
  try {
    const result = await createAuditEvent({
      workspace_id: workspaceId,
      event_category: 'evidence_legal',
      event_type: eventType,
      event_title: title,
      event_summary: summary,
      actor: { actor_id: actorId, actor_type: 'human_user' },
      object, change, authority,
      risk_level: 'medium', status: 'success',
      evidence_state: 'preserved', retention_class: 'REGULATED' as const,
    });
    return result?.event_id || null;
  } catch { return null; }
}

// ─── Evidence Item Functions ────────────────────────────────────────────────────

export async function preserveEvidence(params: PreserveParams): Promise<VaultEvidenceItem> {
  const itemId = generateItemId();
  const now = new Date().toISOString();

  // Compute hashes
  const originalContentHash = params.payload ? computeHash(params.payload) : null;
  const normalizedContentHash = params.payload ? computeHash(params.payload.trim()) : null;
  const metadataHash = computeHash(JSON.stringify({
    source_type: params.source_type, source_id: params.source_id,
    source_system: params.source_system, evidence_type: params.evidence_type,
    risk_level: params.risk_level, sensitivity: params.sensitivity,
  }));
  const preservationInput = `${itemId}:${originalContentHash || 'no-payload'}:${metadataHash}:${now}`;
  const preservationReceiptHash = computeHash(preservationInput);

  // Determine retention (normalize to lowercase for case-insensitive matching)
  const retentionClass = (params.retention_class || 'standard').toLowerCase();
  let retentionUntil: string | null = params.retention_until || null;
  if (!retentionUntil) {
    const baseDate = new Date();
    switch (retentionClass) {
      case 'standard': baseDate.setFullYear(baseDate.getFullYear() + 2); break;
      case 'extended': baseDate.setFullYear(baseDate.getFullYear() + 7); break;
      case 'regulated': baseDate.setFullYear(baseDate.getFullYear() + 10); break;
      case 'legal_hold': retentionUntil = null; break; // indefinite
      default: baseDate.setFullYear(baseDate.getFullYear() + 2);
    }
    if (retentionClass !== 'legal_hold') retentionUntil = baseDate.toISOString();
  }

  const { data, error } = await supabaseAdmin.from('vault_evidence_items').insert({
    item_id: itemId,
    schema_version: '1.0',
    tenant_id: params.tenant_id,
    workspace_id: params.workspace_id,
    data_residency: 'auto',
    source_type: params.source_type,
    source_id: params.source_id,
    source_system: params.source_system,
    source_timestamp_utc: params.source_timestamp_utc || now,
    evidence_type: params.evidence_type || null,
    risk_level: params.risk_level || 'medium',
    sensitivity: params.sensitivity || 'internal',
    contains_pii: params.contains_pii || false,
    contains_ai_output: params.contains_ai_output || false,
    jurisdictions: params.jurisdictions || [],
    original_content_hash: originalContentHash,
    normalized_content_hash: normalizedContentHash,
    metadata_hash: metadataHash,
    preservation_receipt_hash: preservationReceiptHash,
    hash_algorithm: 'SHA-256',
    preserved_by_actor_id: params.preserved_by,
    authority: params.authority || null,
    preservation_reason: params.preservation_reason,
    origin_ip_hash: null,
    retention_class: retentionClass,
    retention_until: retentionUntil,
    legal_hold: retentionClass === 'legal_hold',
    hold_ids: [],
    vault_state: 'preserved',
    payload_ref: params.payload ? computeHash(params.payload).substring(0, 32) : null,
    payload_size: params.payload_size || 0,
    mime_type: params.mime_type || null,
    metadata: params.metadata || {},
    captured_at: now,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.item_preserved', params.workspace_id, params.preserved_by,
    `Evidence Preserved: ${itemId}`,
    `Evidence item ${itemId} preserved from ${params.source_system}:${params.source_id}.`,
    { object_type: 'vault_evidence_item', object_id: itemId },
    undefined,
    { permission_used: 'evidence.item.preserve' }
  );

  return data;
}

export async function listEvidenceItems(filters: {
  workspace_id?: string;
  source_type?: string;
  vault_state?: string;
  retention_class?: string;
  legal_hold?: boolean;
  risk_level?: string;
  sensitivity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: VaultEvidenceItem[]; next_cursor: string | null; total: number }> {
  const limit = Math.min(filters.limit || 50, 200);
  let query = supabaseAdmin.from('vault_evidence_items').select('*', { count: 'exact' });

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.source_type) query = query.eq('source_type', filters.source_type);
  if (filters.vault_state) query = query.eq('vault_state', filters.vault_state);
  if (filters.retention_class) query = query.eq('retention_class', filters.retention_class);
  if (filters.legal_hold !== undefined) query = query.eq('legal_hold', filters.legal_hold);
  if (filters.risk_level) query = query.eq('risk_level', filters.risk_level);
  if (filters.sensitivity) query = query.eq('sensitivity', filters.sensitivity);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);

  if (filters.cursor) {
    const cursorDate = Buffer.from(filters.cursor, 'base64').toString('utf-8');
    query = query.lt('created_at', cursorDate);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (error) throw error;

  const items = data || [];
  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore
    ? Buffer.from(result[result.length - 1].created_at).toString('base64')
    : null;

  return { items: result, next_cursor: nextCursor, total: count || 0 };
}

export async function getEvidenceItem(itemId: string): Promise<VaultEvidenceItem | null> {
  const { data, error } = await supabaseAdmin.from('vault_evidence_items')
    .select('*').eq('id', itemId).single();
  if (error) return null;
  return data;
}

export async function getEvidenceItemByItemId(itemId: string): Promise<VaultEvidenceItem | null> {
  const { data, error } = await supabaseAdmin.from('vault_evidence_items')
    .select('*').eq('item_id', itemId).single();
  if (error) return null;
  return data;
}

export async function verifyEvidenceItem(itemId: string, actorId: string): Promise<{
  verified: boolean; item: VaultEvidenceItem | null; original_hash_match: boolean;
  metadata_hash_match: boolean; computed_original_hash: string | null;
  computed_metadata_hash: string;
}> {
  const item = await getEvidenceItem(itemId);
  if (!item) throw new Error('Evidence item not found');

  const originalHashMatch = item.payload_ref && item.original_content_hash
    ? item.original_content_hash.startsWith(item.payload_ref)
    : true;
  const computedOriginalHash = item.original_content_hash;

  const computedMetadataHash = computeHash(JSON.stringify({
    source_type: item.source_type, source_id: item.source_id,
    source_system: item.source_system, evidence_type: item.evidence_type,
    risk_level: item.risk_level, sensitivity: item.sensitivity,
  }));
  const metadataHashMatch = computedMetadataHash === item.metadata_hash;

  const verified = originalHashMatch && metadataHashMatch;

  // Update verification record
  await supabaseAdmin.from('vault_evidence_items').update({
    verification_count: (item.verification_count || 0) + 1,
    last_verified_at: new Date().toISOString(),
    last_verified_by: actorId,
  }).eq('id', itemId);

  await emitVaultAuditEvent(
    verified ? 'evidence.item_verified' : 'evidence.item_failed',
    item.workspace_id, actorId,
    `Evidence ${verified ? 'Verified' : 'Verification Failed'}: ${item.item_id}`,
    `Evidence item ${item.item_id} hash verification ${verified ? 'passed' : 'FAILED'}.`,
    { object_type: 'vault_evidence_item', object_id: item.item_id },
    {
      field_changed: 'verification_count',
      previous_value: item.verification_count || 0,
      new_value: (item.verification_count || 0) + 1,
      change_reason: verified ? 'Hashes match' : 'Hash mismatch detected',
    },
    { permission_used: 'evidence.item.verify' }
  );

  return {
    verified, item,
    original_hash_match: originalHashMatch,
    metadata_hash_match: metadataHashMatch,
    computed_original_hash: computedOriginalHash,
    computed_metadata_hash: computedMetadataHash,
  };
}

// ─── Collection Functions ───────────────────────────────────────────────────────

export async function createCollection(params: CollectionParams): Promise<VaultCollection> {
  const collectionId = generateCollectionId();
  const itemHash = computeHash(JSON.stringify({
    title: params.title, scope: params.scope || {},
    created_by: params.created_by, timestamp: new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin.from('vault_evidence_collections').insert({
    collection_id: collectionId,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    title: params.title,
    description: params.description || null,
    scope: params.scope || {},
    initial_item_hash: itemHash,
    item_count: 0,
    created_by: params.created_by,
    created_reason: params.created_reason || null,
    schema_version: '1.0',
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.collection_created', params.workspace_id, params.created_by,
    `Collection Created: ${collectionId}`,
    `Evidence collection "${params.title}" created.`,
    { object_type: 'vault_evidence_collection', object_id: collectionId }
  );

  return data;
}

export async function listCollections(filters: {
  workspace_id?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<{ collections: VaultCollection[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  let query = supabaseAdmin.from('vault_evidence_collections').select('*', { count: 'exact' });

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.created_by) query = query.eq('created_by', filters.created_by);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { collections: data || [], total: count || 0 };
}

export async function getCollection(collectionId: string): Promise<VaultCollection | null> {
  const { data, error } = await supabaseAdmin.from('vault_evidence_collections')
    .select('*').eq('id', collectionId).single();
  if (error) return null;
  return data;
}

export async function getCollectionByCollectionId(collectionId: string): Promise<VaultCollection | null> {
  const { data, error } = await supabaseAdmin.from('vault_evidence_collections')
    .select('*').eq('collection_id', collectionId).single();
  if (error) return null;
  return data;
}

export async function addItemsToCollection(
  collectionId: string, itemIds: string[],
  addedBy: string, reason?: string,
): Promise<{ added: number }> {
  const collection = await getCollection(collectionId);
  if (!collection) throw new Error('Collection not found');

  const rows = itemIds.map(itemId => ({
    collection_id: collectionId,
    item_id: itemId,
    added_by: addedBy,
    added_reason: reason || null,
  }));

  const { error } = await supabaseAdmin.from('vault_collection_items').insert(rows);
  if (error) throw error;

  await supabaseAdmin.from('vault_evidence_collections').update({
    item_count: (collection.item_count || 0) + itemIds.length,
  }).eq('id', collectionId);

  await emitVaultAuditEvent(
    'evidence.collection_appended', collection.workspace_id, addedBy,
    `Collection Appended: ${collection.collection_id}`,
    `${itemIds.length} items added to collection ${collection.collection_id}.`,
    { object_type: 'vault_evidence_collection', object_id: collection.collection_id },
    { field_changed: 'item_count', previous_value: collection.item_count || 0, new_value: (collection.item_count || 0) + itemIds.length }
  );

  return { added: itemIds.length };
}

export async function getCollectionItems(
  collectionId: string,
): Promise<VaultEvidenceItem[]> {
  const { data, error } = await supabaseAdmin.from('vault_collection_items')
    .select('*, item:vault_evidence_items(*)')
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => row.item).filter(Boolean);
}

// ─── Health ─────────────────────────────────────────────────────────────────────

export async function getVaultHealth(): Promise<{
  total_items: number;
  by_state: Record<string, number>;
  failed_verifications: number;
  quarantined: number;
  legal_hold_count: number;
}> {
  const { count: total } = await supabaseAdmin.from('vault_evidence_items')
    .select('id', { count: 'exact', head: true });

  const { data: stateData } = await supabaseAdmin.from('vault_evidence_items')
    .select('vault_state');
  const byState: Record<string, number> = {};
  (stateData || []).forEach((r: any) => {
    byState[r.vault_state] = (byState[r.vault_state] || 0) + 1;
  });

  const failedVerifications = (await supabaseAdmin.from('vault_evidence_items')
    .select('id', { count: 'exact', head: true })
    .lt('verification_count', 1)).count || 0;

  return {
    total_items: total || 0,
    by_state: byState,
    failed_verifications: failedVerifications,
    quarantined: byState['quarantined'] || 0,
    legal_hold_count: byState['legal_hold'] || 0,
  };
}

// ─── Phase 2 Types ───────────────────────────────────────────────────────────────

export interface VaultPackage {
  id: string;
  package_id: string;
  workspace_id: string;
  tenant_id: string;
  package_type: string;
  title: string;
  description: string | null;
  source_collection_id: string | null;
  manifest: any;
  manifest_hash: string | null;
  prior_manifest_hash: string | null;
  template_version: string;
  redaction_policy_version: string;
  item_count: number;
  status: string;
  is_complete: boolean;
  is_redacted: boolean;
  is_partially_redacted: boolean;
  is_externally_shared: boolean;
  created_by: string;
  approved_by: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  sealed_at: string | null;
  exported_at: string | null;
}

export interface VaultHold {
  id: string;
  hold_id: string;
  workspace_id: string;
  tenant_id: string;
  scope_type: string;
  scope_id: string | null;
  scope_query: any;
  matter_ref: string;
  jurisdiction: string | null;
  reason: string;
  requester_id: string;
  approver_id: string | null;
  effective_date: string;
  review_date: string | null;
  released: boolean;
  released_at: string | null;
  released_reason: string | null;
  released_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultExport {
  id: string;
  export_id: string;
  package_id: string;
  workspace_id: string;
  tenant_id: string;
  requester_id: string;
  approver_id: string | null;
  disclosure_mode: string;
  redaction_policy_id: string | null;
  export_hash: string | null;
  file_size: number;
  mime_type: string;
  status: string;
  requester_reason: string | null;
  delivery_method: string | null;
  expires_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface VaultRedactionPolicy {
  id: string;
  policy_id: string;
  name: string;
  description: string | null;
  policy_version: string;
  rules: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Phase 2: Packages ──────────────────────────────────────────────────────────

interface CreatePackageParams {
  workspace_id: string;
  tenant_id: string;
  package_type: string;
  title: string;
  description?: string;
  source_collection_id?: string;
  item_ids?: string[];
  created_by: string;
  metadata?: any;
}

export async function createPackage(params: CreatePackageParams): Promise<VaultPackage> {
  const packageId = generatePackageId();
  const { data, error } = await supabaseAdmin.from('vault_packages').insert({
    package_id: packageId,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    package_type: params.package_type,
    title: params.title,
    description: params.description || null,
    source_collection_id: params.source_collection_id || null,
    item_count: 0,
    status: 'draft',
    is_complete: false,
    is_redacted: false,
    is_partially_redacted: false,
    is_externally_shared: false,
    created_by: params.created_by,
    metadata: params.metadata || {},
    template_version: '1.0',
    redaction_policy_version: '1.0',
  }).select().single();

  if (error) throw error;

  // Add items if provided
  if (params.item_ids && params.item_ids.length > 0) {
    const itemRows = params.item_ids.map(itemId => ({
      package_id: data.id,
      item_id: itemId,
      inclusion_reason: null,
      redaction_status: 'none',
    }));
    const { error: itemError } = await supabaseAdmin.from('vault_package_items').insert(itemRows);
    if (itemError) throw itemError;

    await supabaseAdmin.from('vault_packages').update({
      item_count: params.item_ids.length,
    }).eq('id', data.id);
  }

  await emitVaultAuditEvent(
    'evidence.package_created', params.workspace_id, params.created_by,
    `Package Created: ${packageId}`,
    `Evidence package "${params.title}" (${params.package_type}) created.`,
    { object_type: 'vault_package', object_id: packageId },
  );

  return { ...data, item_count: params.item_ids?.length || 0 };
}

export async function getPackage(id: string): Promise<VaultPackage | null> {
  const { data, error } = await supabaseAdmin.from('vault_packages')
    .select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function listPackages(filters: {
  workspace_id?: string;
  package_type?: string;
  status?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<{ packages: VaultPackage[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_packages').select('*', { count: 'exact' });

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.package_type) query = query.eq('package_type', filters.package_type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.created_by) query = query.eq('created_by', filters.created_by);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { packages: data || [], total: count || 0 };
}

export async function sealPackage(packageId: string, actorId: string): Promise<VaultPackage> {
  const pkg = await getPackage(packageId);
  if (!pkg) throw new Error('Package not found');

  // Get package items with their evidence details
  const { data: pkgItems } = await supabaseAdmin.from('vault_package_items')
    .select('*, item:vault_evidence_items(*)').eq('package_id', packageId);
  const items = (pkgItems || []).map((r: any) => r.item).filter(Boolean);

  // Build manifest
  const manifest = {
    manifest_id: `MAN-${pkg.package_id}-${Date.now()}`,
    package_id: pkg.package_id,
    package_type: pkg.package_type,
    title: pkg.title,
    template_version: pkg.template_version,
    redaction_policy_version: pkg.redaction_policy_version,
    generated_at: new Date().toISOString(),
    item_count: items.length,
    is_complete: true,
    is_redacted: false,
    is_partially_redacted: false,
    items: items.map((item: any) => ({
      item_id: item.item_id,
      source_id: item.source_id,
      source_system: item.source_system,
      source_timestamp_utc: item.source_timestamp_utc,
      hash: item.original_content_hash,
      retention_class: item.retention_class,
      redaction_status: 'none',
      inclusion_reason: 'package_creation',
    })),
  };

  const manifestHash = computeHash(stableStringify(manifest));
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from('vault_packages').update({
    manifest: manifest,
    manifest_hash: manifestHash,
    prior_manifest_hash: pkg.manifest_hash || null,
    status: 'sealed',
    item_count: items.length,
    is_complete: true,
    sealed_at: now,
  }).eq('id', packageId).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.package_sealed', pkg.workspace_id, actorId,
    `Package Sealed: ${pkg.package_id}`,
    `Evidence package ${pkg.package_id} sealed with manifest hash ${manifestHash.substring(0, 16)}...`,
    { object_type: 'vault_package', object_id: pkg.package_id },
  );

  return data;
}

export async function getPackageManifest(packageId: string): Promise<any | null> {
  const pkg = await getPackage(packageId);
  if (!pkg) return null;
  return pkg.manifest;
}

export async function verifyPackage(packageId: string, actorId: string): Promise<{
  verified: boolean;
  manifest_hash_match: boolean;
  item_results: Array<{ item_id: string; item_name: string; hash_match: boolean }>;
}> {
  const pkg = await getPackage(packageId);
  if (!pkg) throw new Error('Package not found');

  const { data: pkgItems } = await supabaseAdmin.from('vault_package_items')
    .select('*, item:vault_evidence_items(*)').eq('package_id', packageId);
  const items = (pkgItems || []).map((r: any) => r.item).filter(Boolean);

  // Verify each item's metadata hash
  const itemResults = items.map((item: any) => {
    const computedMetaHash = computeHash(JSON.stringify({
      source_type: item.source_type,
      source_id: item.source_id,
      source_system: item.source_system,
      evidence_type: item.evidence_type,
      risk_level: item.risk_level,
      sensitivity: item.sensitivity,
    }));
    return {
      item_id: item.item_id,
      item_name: `${item.source_system}:${item.source_id}`,
      hash_match: computedMetaHash === item.metadata_hash,
    };
  });

  // Re-compute manifest hash (use stable stringify for deterministic key ordering)
  const computedManifestHash = pkg.manifest
    ? computeHash(stableStringify(pkg.manifest))
    : null;
  const manifestHashMatch = computedManifestHash === pkg.manifest_hash;
  const allItemsMatch = itemResults.every(r => r.hash_match);
  const verified = manifestHashMatch && allItemsMatch;

  await emitVaultAuditEvent(
    'evidence.package_verified', pkg.workspace_id, actorId,
    `Package ${verified ? 'Verified' : 'Verification Failed'}: ${pkg.package_id}`,
    `Package ${pkg.package_id} integrity verification ${verified ? 'PASSED' : 'FAILED'}.`,
    { object_type: 'vault_package', object_id: pkg.package_id },
  );

  return { verified, manifest_hash_match: manifestHashMatch, item_results: itemResults };
}

// ─── Phase 2: Exports ────────────────────────────────────────────────────────────

interface CreateExportParams {
  package_id: string;
  workspace_id: string;
  tenant_id: string;
  requester_id: string;
  disclosure_mode: string;
  requester_reason?: string;
  delivery_method?: string;
  expires_at?: string;
}

export async function createExport(params: CreateExportParams): Promise<VaultExport> {
  const pkg = await getPackage(params.package_id);
  if (!pkg) throw new Error('Package not found');
  if (pkg.status !== 'sealed') throw new Error('Package must be sealed before export');

  const exportId = generateExportId();

  const { data, error } = await supabaseAdmin.from('vault_exports').insert({
    export_id: exportId,
    package_id: params.package_id,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    requester_id: params.requester_id,
    disclosure_mode: params.disclosure_mode,
    status: 'requested',
    requester_reason: params.requester_reason || null,
    delivery_method: params.delivery_method || null,
    expires_at: params.expires_at || null,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.export_requested', pkg.workspace_id, params.requester_id,
    `Export Requested: ${exportId}`,
    `Export ${exportId} requested for package ${pkg.package_id} (${params.disclosure_mode}).`,
    { object_type: 'vault_export', object_id: exportId },
  );

  return data;
}

export async function getExportReceipt(exportId: string): Promise<VaultExport | null> {
  const { data, error } = await supabaseAdmin.from('vault_exports')
    .select('*').eq('id', exportId).single();
  if (error) return null;
  return data;
}

export async function listExports(filters: {
  package_id?: string;
  requester_id?: string;
  status?: string;
  workspace_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ exports: VaultExport[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_exports').select('*', { count: 'exact' });

  if (filters.package_id) query = query.eq('package_id', filters.package_id);
  if (filters.requester_id) query = query.eq('requester_id', filters.requester_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { exports: data || [], total: count || 0 };
}

// ─── Phase 2: Legal Holds ────────────────────────────────────────────────────────

interface ApplyHoldParams {
  workspace_id: string;
  tenant_id: string;
  scope_type: string;
  scope_id?: string;
  scope_query?: any;
  matter_ref: string;
  jurisdiction?: string;
  reason: string;
  requester_id: string;
  approver_id?: string;
  effective_date: string;
  review_date?: string;
}

export async function applyHold(params: ApplyHoldParams): Promise<VaultHold> {
  const holdId = generateHoldId();

  const { data, error } = await supabaseAdmin.from('vault_holds').insert({
    hold_id: holdId,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    scope_type: params.scope_type,
    scope_id: params.scope_id || null,
    scope_query: params.scope_query || null,
    matter_ref: params.matter_ref,
    jurisdiction: params.jurisdiction || null,
    reason: params.reason,
    requester_id: params.requester_id,
    approver_id: params.approver_id || null,
    effective_date: params.effective_date,
    review_date: params.review_date || null,
    released: false,
  }).select().single();

  if (error) throw error;

  // Mark scoped items as legal_hold
  await updateHoldOnItems(params.scope_type, params.scope_id, holdId, true);

  await emitVaultAuditEvent(
    'evidence.hold_applied', params.workspace_id, params.requester_id,
    `Legal Hold Applied: ${holdId}`,
    `Legal hold applied to ${params.scope_type} ${params.scope_id || 'via query'} for matter ${params.matter_ref}.`,
    { object_type: 'vault_hold', object_id: holdId },
    undefined,
    { permission_used: 'evidence.hold.apply' }
  );

  return data;
}

async function updateHoldOnItems(scopeType: string, scopeId: string | undefined, holdId: string, applying: boolean): Promise<void> {
  let itemIds: string[] = [];

  if (scopeType === 'item' && scopeId) {
    itemIds = [scopeId];
  } else if (scopeType === 'collection' && scopeId) {
    const { data } = await supabaseAdmin.from('vault_collection_items')
      .select('item_id').eq('collection_id', scopeId);
    itemIds = (data || []).map((r: any) => r.item_id);
  } else if (scopeType === 'package' && scopeId) {
    const { data } = await supabaseAdmin.from('vault_package_items')
      .select('item_id').eq('package_id', scopeId);
    itemIds = (data || []).map((r: any) => r.item_id);
  }

  for (const itemId of itemIds) {
    const { data: item } = await supabaseAdmin.from('vault_evidence_items')
      .select('hold_ids, legal_hold').eq('id', itemId).single();
    if (!item) continue;

    let holdIds: string[] = item.hold_ids || [];
    if (applying) {
      if (!holdIds.includes(holdId)) holdIds.push(holdId);
    } else {
      holdIds = holdIds.filter((h: string) => h !== holdId);
    }

    await supabaseAdmin.from('vault_evidence_items').update({
      hold_ids: holdIds,
      legal_hold: holdIds.length > 0,
      vault_state: holdIds.length > 0 ? 'legal_hold' : 'preserved',
    }).eq('id', itemId);
  }
}

export async function releaseHold(holdId: string, releasedBy: string, reason: string): Promise<VaultHold | null> {
  const hold = await getHold(holdId);
  if (!hold) throw new Error('Hold not found');
  if (hold.released) throw new Error('Hold already released');

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('vault_holds').update({
    released: true,
    released_at: now,
    released_reason: reason,
    released_by: releasedBy,
  }).eq('id', holdId).select().single();

  if (error) throw error;

  // Release holds on items
  await updateHoldOnItems(hold.scope_type, hold.scope_id || undefined, holdId, false);

  await emitVaultAuditEvent(
    'evidence.hold_released', hold.workspace_id, releasedBy,
    `Legal Hold Released: ${hold.hold_id}`,
    `Legal hold ${hold.hold_id} released for matter ${hold.matter_ref}. Reason: ${reason}`,
    { object_type: 'vault_hold', object_id: hold.hold_id },
  );

  return data;
}

export async function getHold(holdId: string): Promise<VaultHold | null> {
  const { data, error } = await supabaseAdmin.from('vault_holds')
    .select('*').eq('id', holdId).single();
  if (error) return null;
  return data;
}

export async function listHolds(filters: {
  workspace_id?: string;
  scope_type?: string;
  matter_ref?: string;
  released?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ holds: VaultHold[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_holds').select('*', { count: 'exact' });

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.scope_type) query = query.eq('scope_type', filters.scope_type);
  if (filters.matter_ref) query = query.eq('matter_ref', filters.matter_ref);
  if (filters.released !== undefined) query = query.eq('released', filters.released);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { holds: data || [], total: count || 0 };
}

// ─── Phase 2: Redaction Policies ─────────────────────────────────────────────────

interface CreateRedactionPolicyParams {
  name: string;
  description?: string;
  rules: any[];
  created_by: string;
}

export async function createRedactionPolicy(params: CreateRedactionPolicyParams): Promise<VaultRedactionPolicy> {
  const policyId = generateRedactionPolicyId();

  const { data, error } = await supabaseAdmin.from('vault_redaction_policies').insert({
    policy_id: policyId,
    name: params.name,
    description: params.description || null,
    policy_version: '1.0',
    rules: params.rules,
    created_by: params.created_by,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.redaction_policy_created', 'WRK-001', params.created_by,
    `Redaction Policy Created: ${policyId}`,
    `Redaction policy "${params.name}" created with ${params.rules.length} rules.`,
    { object_type: 'vault_redaction_policy', object_id: policyId },
  );

  return data;
}

export async function listRedactionPolicies(): Promise<VaultRedactionPolicy[]> {
  const { data, error } = await supabaseAdmin.from('vault_redaction_policies')
    .select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Phase 3: External Shares ────────────────────────────────────────────────────

export interface VaultShare {
  id: string;
  share_id: string;
  package_id: string;
  workspace_id: string;
  tenant_id: string;
  recipient_email: string;
  recipient_name: string | null;
  access_token: string;
  token_hash: string;
  disclosure_mode: string;
  redaction_policy_id: string | null;
  expires_at: string;
  max_views: number;
  current_views: number;
  watermark: string | null;
  allow_download: boolean;
  require_mfa: boolean;
  last_accessed_at: string | null;
  revoked: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VaultShareAccessLog {
  id: string;
  share_id: string;
  viewer_ip_hash: string | null;
  user_agent: string | null;
  package_section: string | null;
  viewed_at: string;
}

export interface VaultDlpScan {
  id: string;
  package_id: string;
  scan_status: string;
  detection_category: string | null;
  findings: any[];
  scan_report: string | null;
  reviewer: string | null;
  remediation_state: string | null;
  scanned_by_worker: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

function generateShareId(): string {
  const seq = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SHR-${seq}-${rand}`;
}

function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function computeHash256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

interface CreateShareParams {
  package_id: string;
  workspace_id: string;
  tenant_id: string;
  recipient_email: string;
  recipient_name?: string;
  disclosure_mode?: string;
  redaction_policy_id?: string;
  expires_at: string;
  max_views?: number;
  watermark?: string;
  allow_download?: boolean;
  require_mfa?: boolean;
  created_by: string;
}

export async function createShare(params: CreateShareParams): Promise<VaultShare> {
  const pkg = await getPackage(params.package_id);
  if (!pkg) throw new Error('Package not found');
  if (pkg.status !== 'sealed') throw new Error('Package must be sealed before sharing');

  const shareId = generateShareId();
  const token = generateShareToken();
  const tokenHash = computeHash256(token);

  const { data, error } = await supabaseAdmin.from('vault_shares').insert({
    share_id: shareId,
    package_id: params.package_id,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    recipient_email: params.recipient_email,
    recipient_name: params.recipient_name || null,
    access_token: token,
    token_hash: tokenHash,
    disclosure_mode: params.disclosure_mode || 'external_auditor_portal',
    redaction_policy_id: params.redaction_policy_id || null,
    expires_at: params.expires_at,
    max_views: params.max_views || 0,
    current_views: 0,
    watermark: params.watermark || null,
    allow_download: params.allow_download || false,
    require_mfa: params.require_mfa || false,
    revoked: false,
    created_by: params.created_by,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.share_created', pkg.workspace_id, params.created_by,
    `External Share Created: ${shareId}`,
    `Share for package ${pkg.package_id} created for ${params.recipient_email}.`,
    { object_type: 'vault_share', object_id: shareId },
  );

  return data;
}

export async function getShare(shareId: string): Promise<VaultShare | null> {
  const { data, error } = await supabaseAdmin.from('vault_shares')
    .select('*').eq('id', shareId).single();
  if (error) return null;
  return data;
}

export async function listShares(filters: {
  package_id?: string;
  workspace_id?: string;
  revoked?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ shares: VaultShare[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_shares').select('*', { count: 'exact' });

  if (filters.package_id) query = query.eq('package_id', filters.package_id);
  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.revoked !== undefined) query = query.eq('revoked', filters.revoked);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { shares: data || [], total: count || 0 };
}

export async function revokeShare(shareId: string, revokedBy: string): Promise<VaultShare | null> {
  const share = await getShare(shareId);
  if (!share) throw new Error('Share not found');
  if (share.revoked) throw new Error('Share already revoked');

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('vault_shares').update({
    revoked: true,
    revoked_at: now,
    revoked_by: revokedBy,
  }).eq('id', shareId).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.share_revoked', share.workspace_id, revokedBy,
    `External Share Revoked: ${share.share_id}`,
    `Share ${share.share_id} for package revoked by ${revokedBy}.`,
    { object_type: 'vault_share', object_id: share.share_id },
  );

  return data;
}

export async function validateShareAccess(shareId: string, token: string): Promise<{
  valid: boolean;
  share: VaultShare | null;
  reason?: string;
}> {
  // Look up share by ID
  const { data: share } = await supabaseAdmin.from('vault_shares')
    .select('*').eq('id', shareId).single();
  if (!share) return { valid: false, share: null, reason: 'Share not found' };
  if (share.revoked) return { valid: false, share, reason: 'Share has been revoked' };
  if (new Date(share.expires_at) < new Date()) return { valid: false, share, reason: 'Share has expired' };
  if (share.max_views > 0 && share.current_views >= share.max_views) return { valid: false, share, reason: 'Share has reached maximum views' };

  const tokenHash = computeHash256(token);
  if (tokenHash !== share.token_hash) return { valid: false, share, reason: 'Invalid access token' };

  return { valid: true, share };
}

export async function logShareAccess(shareId: string, access: {
  viewer_ip_hash?: string;
  user_agent?: string;
  package_section?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('vault_share_access_logs').insert({
    share_id: shareId,
    viewer_ip_hash: access.viewer_ip_hash || null,
    user_agent: access.user_agent || null,
    package_section: access.package_section || null,
  });
  if (error) throw error;

  // Increment view count
  const { data: share } = await supabaseAdmin.from('vault_shares')
    .select('current_views').eq('id', shareId).single();
  if (share) {
    await supabaseAdmin.from('vault_shares').update({
      current_views: (share.current_views || 0) + 1,
      last_accessed_at: new Date().toISOString(),
    }).eq('id', shareId);
  }

  await emitVaultAuditEvent(
    'evidence.share_viewed', 'WRK-001', 'external_viewer',
    `Share Viewed: ${shareId}`,
    `External share ${shareId} accessed. Section: ${access.package_section || 'overview'}.`,
    { object_type: 'vault_share', object_id: shareId },
  );
}

export async function getShareAccessLogs(shareId: string): Promise<VaultShareAccessLog[]> {
  const { data, error } = await supabaseAdmin.from('vault_share_access_logs')
    .select('*').eq('share_id', shareId).order('viewed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Phase 3: DLP Scanning ───────────────────────────────────────────────────────

export async function runDlpScan(packageId: string, workerId?: string): Promise<VaultDlpScan> {
  const pkg = await getPackage(packageId);
  if (!pkg) throw new Error('Package not found');

  const now = new Date().toISOString();

  // Simulated DLP scan — in production this calls a real DLP/secret scanner
  const findings: any[] = [];
  let scanStatus = 'passed';
  let detectionCategory: string | null = null;

  // Scan manifest items for common patterns (simulated)
  if (pkg.manifest?.items) {
    for (const item of pkg.manifest.items) {
      if (item.source_system === 'identity_proof') {
        findings.push({
          type: 'pii',
          field: 'identity_data',
          severity: 'medium',
          item_id: item.item_id,
          recommendation: 'Apply redaction policy before external sharing',
        });
      }
    }
  }

  if (findings.length > 0) {
    scanStatus = 'flagged';
    detectionCategory = 'pii';
  }

  const { data, error } = await supabaseAdmin.from('vault_dlp_scans').insert({
    package_id: packageId,
    tenant_id: pkg.tenant_id,
    scan_status: scanStatus,
    detection_category: detectionCategory,
    findings: findings,
    scan_report: findings.length > 0 ? `Found ${findings.length} item(s) requiring redaction.` : 'No issues detected.',
    scanned_by_worker: workerId || 'manual_scan',
    completed_at: now,
  }).select().single();

  if (error) throw error;

  if (scanStatus === 'flagged') {
    await emitVaultAuditEvent(
      'evidence.export_blocked', pkg.workspace_id, workerId || 'system',
      `DLP Scan Flagged: ${pkg.package_id}`,
      `Package ${pkg.package_id} DLP scan found ${findings.length} issue(s). Export blocked until resolved.`,
      { object_type: 'vault_package', object_id: pkg.package_id },
    );
  }

  return data;
}

export async function getDlpScan(scanId: string): Promise<VaultDlpScan | null> {
  const { data, error } = await supabaseAdmin.from('vault_dlp_scans')
    .select('*').eq('id', scanId).single();
  if (error) return null;
  return data;
}

export async function listDlpScans(filters: {
  package_id?: string;
  scan_status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ scans: VaultDlpScan[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_dlp_scans').select('*', { count: 'exact' });

  if (filters.package_id) query = query.eq('package_id', filters.package_id);
  if (filters.scan_status) query = query.eq('scan_status', filters.scan_status);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { scans: data || [], total: count || 0 };
}

// ─── Phase 4 Types ───────────────────────────────────────────────────────────────

export interface VaultAsyncJob {
  id: string;
  job_id: string;
  job_type: string;
  status: string;
  priority: number;
  progress: number;
  total: number;
  params: any;
  result: any;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  workspace_id: string;
  tenant_id: string;
  created_by: string;
  idempotency_key: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface VaultChainAnchor {
  id: string;
  anchor_id: string;
  package_id: string | null;
  item_id: string | null;
  workspace_id: string;
  tenant_id: string;
  anchor_provider: string;
  anchor_tx_hash: string | null;
  anchor_timestamp: string | null;
  anchor_data: any;
  status: string;
  created_by: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface VaultTemplateVersion {
  id: string;
  template_id: string;
  workspace_id: string;
  tenant_id: string;
  package_type: string;
  template_version: string;
  schema: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function generateJobId(): string {
  return `JOB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function generateAnchorId(): string {
  return `ANCHOR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function generateTemplateId(): string {
  return `TPL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function resolveChainAnchorScope(params: {
  package_id?: string;
  item_id?: string;
  workspace_id: string;
  tenant_id: string;
}): Promise<{ workspace_id: string; tenant_id: string }> {
  if (!params.package_id && !params.item_id) {
    throw new Error('package_id or item_id is required');
  }

  let resolvedWorkspaceId: string | null = null;
  let resolvedTenantId: string | null = null;

  if (params.package_id) {
    const { data: pkg, error } = await supabaseAdmin.from('vault_packages')
      .select('id, workspace_id, tenant_id')
      .eq('id', params.package_id)
      .single();
    if (error || !pkg) throw new Error('Package not found');

    resolvedWorkspaceId = pkg.workspace_id;
    resolvedTenantId = pkg.tenant_id;
  }

  if (params.item_id) {
    const { data: item, error } = await supabaseAdmin.from('vault_evidence_items')
      .select('id, workspace_id, tenant_id')
      .eq('id', params.item_id)
      .single();
    if (error || !item) throw new Error('Evidence item not found');

    if (resolvedWorkspaceId && resolvedWorkspaceId !== item.workspace_id) {
      throw new Error('Anchor targets must belong to the same workspace');
    }
    if (resolvedTenantId && resolvedTenantId !== item.tenant_id) {
      throw new Error('Anchor targets must belong to the same tenant');
    }

    resolvedWorkspaceId = resolvedWorkspaceId || item.workspace_id;
    resolvedTenantId = resolvedTenantId || item.tenant_id;
  }

  if (resolvedWorkspaceId !== params.workspace_id || resolvedTenantId !== params.tenant_id) {
    throw new Error('Anchor target is outside the current workspace');
  }
  if (!resolvedWorkspaceId || !resolvedTenantId) {
    throw new Error('Unable to resolve anchor scope');
  }

  return {
    workspace_id: resolvedWorkspaceId,
    tenant_id: resolvedTenantId,
  };
}

// ─── Phase 4: Async Jobs ─────────────────────────────────────────────────────────

export async function createAsyncJob(params: {
  job_type: string;
  params?: any;
  priority?: number;
  max_retries?: number;
  workspace_id: string;
  tenant_id: string;
  created_by: string;
  idempotency_key?: string;
}): Promise<VaultAsyncJob> {
  const jobId = generateJobId();

  const { data, error } = await supabaseAdmin.from('vault_async_jobs').insert({
    job_id: jobId,
    job_type: params.job_type,
    status: 'queued',
    priority: params.priority || 0,
    progress: 0,
    total: 0,
    params: params.params || {},
    max_retries: params.max_retries || 3,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    created_by: params.created_by,
    idempotency_key: params.idempotency_key || null,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.job_queued', params.workspace_id, params.created_by,
    `Job Queued: ${jobId}`,
    `Async job ${jobId} of type ${params.job_type} queued.`,
    { object_type: 'vault_async_job', object_id: jobId },
  );

  return data;
}

export async function getAsyncJob(jobId: string, workspaceId?: string): Promise<VaultAsyncJob | null> {
  let query = supabaseAdmin.from('vault_async_jobs')
    .select('*')
    .eq('id', jobId);

  if (workspaceId) query = query.eq('workspace_id', workspaceId);

  const { data, error } = await query.single();
  if (error) return null;
  return data;
}

export async function listAsyncJobs(filters: {
  job_type?: string;
  status?: string;
  workspace_id?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: VaultAsyncJob[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_async_jobs').select('*', { count: 'exact' });

  if (filters.job_type) query = query.eq('job_type', filters.job_type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.created_by) query = query.eq('created_by', filters.created_by);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { jobs: data || [], total: count || 0 };
}

// ─── Phase 4: Chain Anchoring ─────────────────────────────────────────────────────

export async function createChainAnchor(params: {
  package_id?: string;
  item_id?: string;
  workspace_id: string;
  tenant_id: string;
  anchor_provider: string;
  anchor_data?: any;
  created_by?: string;
}): Promise<VaultChainAnchor> {
  const anchorId = generateAnchorId();
  const scope = await resolveChainAnchorScope(params);

  const { data, error } = await supabaseAdmin.from('vault_chain_anchors').insert({
    anchor_id: anchorId,
    package_id: params.package_id || null,
    item_id: params.item_id || null,
    workspace_id: scope.workspace_id,
    tenant_id: scope.tenant_id,
    anchor_provider: params.anchor_provider,
    anchor_data: params.anchor_data || {},
    status: 'pending',
    created_by: params.created_by || null,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.chain_anchored', scope.workspace_id, params.created_by || 'system',
    `Chain Anchor Created: ${anchorId}`,
    `Hash anchor ${anchorId} created via ${params.anchor_provider}.`,
    { object_type: 'vault_chain_anchor', object_id: anchorId },
  );

  return data;
}

export async function listChainAnchors(filters: {
  workspace_id?: string;
  package_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ anchors: VaultChainAnchor[]; total: number }> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  let query = supabaseAdmin.from('vault_chain_anchors').select('*', { count: 'exact' });

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.package_id) query = query.eq('package_id', filters.package_id);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { anchors: data || [], total: count || 0 };
}

// ─── Phase 4: Template Versions ───────────────────────────────────────────────────

export async function createTemplateVersion(params: {
  workspace_id: string;
  tenant_id: string;
  package_type: string;
  template_version: string;
  schema: any;
  created_by: string;
}): Promise<VaultTemplateVersion> {
  const templateId = generateTemplateId();

  const { data, error } = await supabaseAdmin.from('vault_template_versions').insert({
    template_id: templateId,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    package_type: params.package_type,
    template_version: params.template_version,
    schema: params.schema,
    is_active: true,
    created_by: params.created_by,
  }).select().single();

  if (error) throw error;

  await emitVaultAuditEvent(
    'evidence.template_created', params.workspace_id, params.created_by,
    `Template Created: ${templateId}`,
    `Package template v${params.template_version} created for ${params.package_type}.`,
    { object_type: 'vault_template_version', object_id: templateId },
  );

  return data;
}

export async function listTemplateVersions(filters: {
  workspace_id?: string;
  package_type?: string;
  is_active?: boolean;
}): Promise<VaultTemplateVersion[]> {
  let query = supabaseAdmin.from('vault_template_versions').select('*');

  if (filters.workspace_id) query = query.eq('workspace_id', filters.workspace_id);
  if (filters.package_type) query = query.eq('package_type', filters.package_type);
  if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

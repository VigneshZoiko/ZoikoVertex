import crypto from 'crypto';
import { supabaseAdmin } from '../shared/supabase';
import { getPermissionsForRole } from '../shared/rolePermissions';
import { internalEventBus } from '../shared/internalEventBus';
import type { AuthContext } from '../shared/serviceAuth';
import { requireAnyPermission } from '../shared/serviceAuth';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const REDACTED_MARKER = 'REDACTED_BY_ACCESS_POLICY';
const SUMMARY_MARKER = 'SUMMARY_ONLY';

export type IdentityActorType =
  | 'human_user'
  | 'ai_agent'
  | 'service_account'
  | 'system'
  | 'external_reviewer'
  | 'delegated_actor'
  | 'break_glass_actor';

export type IdentityActorState =
  | 'invited'
  | 'active'
  | 'restricted'
  | 'suspended'
  | 'revoked'
  | 'expired'
  | 'break_glass_active'
  | 'under_legal_hold';

export interface IdentityActor {
  id: string;
  actor_id: string;
  workspace_id: string;
  tenant_id: string;
  actor_type: IdentityActorType;
  display_name: string;
  email: string | null;
  email_hash: string | null;
  state: IdentityActorState;
  external_identity_id: string | null;
  source_system: string;
  source_ref_id: string | null;
  authority_class: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_flags: unknown[];
  current_roles: string[];
  current_permissions: string[];
  current_authority_snapshot_id: string | null;
  last_activity_at: string | null;
  profile: Record<string, unknown>;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface IdentityLedgerEntry {
  id: string;
  ledger_entry_id: string;
  tenant_id: string;
  workspace_id: string;
  data_residency: string;
  schema_version: string;
  entry_type: string;
  entry_category: string;
  timestamp_utc: string;
  received_at: string;
  actor_id: string;
  actor_type: IdentityActorType;
  source: Record<string, unknown>;
  authority_change: Record<string, unknown>;
  session_context: Record<string, unknown>;
  approvals: unknown[];
  linked_authority_snapshot_id: string | null;
  risk: Record<string, unknown>;
  retention: Record<string, unknown>;
  hash: string;
  prev_hash: string | null;
  created_at: string;
}

export interface AuthoritySnapshot {
  id: string;
  authority_snapshot_id: string;
  actor_id: string;
  actor_type: IdentityActorType;
  tenant_id: string;
  workspace_id: string;
  effective_from: string;
  effective_until: string | null;
  roles_at_time: Array<{ role_id: string; role_name: string }>;
  permissions_at_time: string[];
  policy_constraints: Record<string, unknown>;
  delegation_context: Record<string, unknown> | null;
  agent_context: Record<string, unknown> | null;
  service_account_context: Record<string, unknown> | null;
  source_lineage: Array<Record<string, unknown>>;
  snapshot_hash: string;
  created_by_ledger_entry_id: string;
  superseded_by: string | null;
  created_at: string;
}

export interface ViewerContext {
  user_id: string;
  workspace_role?: string | null;
  is_superadmin?: boolean;
}

interface ActorSeed {
  actor_id: string;
  workspace_id: string;
  tenant_id: string;
  actor_type: IdentityActorType;
  display_name: string;
  email: string | null;
  state: IdentityActorState;
  external_identity_id: string | null;
  source_system: string;
  source_ref_id: string | null;
  authority_class: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_flags: unknown[];
  current_roles: string[];
  current_permissions: string[];
  last_activity_at: string | null;
  profile: Record<string, unknown>;
  policy_constraints: Record<string, unknown>;
  delegation_context?: Record<string, unknown> | null;
  agent_context?: Record<string, unknown> | null;
  service_account_context?: Record<string, unknown> | null;
  source_lineage: Array<Record<string, unknown>>;
  entry_type: string;
  entry_category: string;
  effective_from: string;
}

type ViewerRoleClass =
  | 'admin'
  | 'security'
  | 'compliance'
  | 'legal'
  | 'auditor'
  | 'developer'
  | 'manager'
  | 'publisher';

export interface ResolveAuthorityBindingInput {
  workspace_id: string;
  tenant_id?: string;
  timestamp_utc?: string;
  actor: {
    actor_id: string;
    actor_type: 'human_user' | 'ai_agent' | 'service_account' | 'system' | 'api_key';
    actor_name?: string;
    role_at_event?: string;
  };
  authority?: {
    permission_used?: string;
    override_reason?: string;
  };
  ai_context?: {
    agent_id?: string;
    agent_version?: string;
    prompt_version?: string;
    model_version?: string;
  };
}

export interface ResolveAuthorityBindingResult {
  authority_snapshot_id: string;
  roles_at_event: string[];
  permissions_at_event: string[];
  actor_state_at_event: IdentityActorState;
  actor_display_name: string;
}

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, inner]) => [key, stableSort(inner)]);
    return Object.fromEntries(sortedEntries);
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableSort(value));
}

function computeHash(value: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function generateOpaqueId(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function normalizeTenantId(tenantId?: string | null): string {
  if (!tenantId || tenantId === 'default') return DEFAULT_TENANT_ID;
  return tenantId;
}

function resolveViewerRoleClass(viewer: ViewerContext): ViewerRoleClass {
  if (viewer.is_superadmin) return 'admin';
  const role = String(viewer.workspace_role || '').toUpperCase();
  if (['WORKSPACE_OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) return 'admin';
  if (['SECURITY_ADMIN', 'SECURITY', 'SECURITY_OFFICER'].includes(role)) return 'security';
  if (['COMPLIANCE_REVIEWER', 'COMPLIANCE', 'COMPLIANCE_OFFICER'].includes(role)) return 'compliance';
  if (['LEGAL', 'LEGAL_COUNSEL'].includes(role)) return 'legal';
  if (['AUDITOR', 'EXTERNAL_AUDITOR'].includes(role)) return 'auditor';
  if (['DEVELOPER'].includes(role)) return 'developer';
  if (['PUBLISHER', 'CREATOR', 'REVIEWER'].includes(role)) return 'publisher';
  return 'manager';
}

function toRoleObjects(roles: string[]): Array<{ role_id: string; role_name: string }> {
  return roles.map(role => ({ role_id: role, role_name: role }));
}

function extractRoleNames(snapshot: AuthoritySnapshot | null): string[] {
  if (!snapshot) return [];
  return snapshot.roles_at_time.map(role => role.role_name);
}

function hashForCorrelation(value: string | null | undefined): string | null {
  if (!value) return null;
  return `sha256:${computeHash(value).substring(0, 16)}`;
}

function maskEmail(email: string | null, actorId: string, viewer: ViewerContext): string | null {
  if (!email) return null;
  const viewerRole = resolveViewerRoleClass(viewer);
  const isSelf = viewer.user_id === actorId;
  if (isSelf || ['admin', 'security', 'compliance', 'legal', 'developer'].includes(viewerRole)) return email;
  if (viewerRole === 'auditor') return hashForCorrelation(email);
  return REDACTED_MARKER;
}

function maskExternalIdentity(value: string | null, viewer: ViewerContext): string | null {
  if (!value) return null;
  const viewerRole = resolveViewerRoleClass(viewer);
  if (['admin', 'security', 'compliance', 'legal', 'developer'].includes(viewerRole)) return value;
  if (viewerRole === 'auditor') return hashForCorrelation(value);
  return REDACTED_MARKER;
}

function maskRiskFlags(flags: unknown[], viewer: ViewerContext): unknown[] | string {
  const viewerRole = resolveViewerRoleClass(viewer);
  if (['admin', 'security', 'compliance', 'legal'].includes(viewerRole)) return flags;
  if (viewerRole === 'auditor') return flags.length ? [SUMMARY_MARKER, `count:${flags.length}`] : [];
  return flags.length ? [SUMMARY_MARKER] : [];
}

function maskPermissions(permissions: string[], viewer: ViewerContext): string[] | string {
  const viewerRole = resolveViewerRoleClass(viewer);
  if (['admin', 'security', 'legal', 'developer'].includes(viewerRole)) return permissions;
  if (viewerRole === 'compliance' || viewerRole === 'auditor') {
    return `${SUMMARY_MARKER}:${permissions.length}_permissions`;
  }
  return SUMMARY_MARKER;
}

function applyActorFieldAccess(actor: IdentityActor, viewer: ViewerContext): Record<string, unknown> {
  return {
    ...actor,
    email: maskEmail(actor.email, actor.actor_id, viewer),
    external_identity_id: maskExternalIdentity(actor.external_identity_id, viewer),
    risk_flags: maskRiskFlags(actor.risk_flags, viewer),
    current_permissions: maskPermissions(actor.current_permissions, viewer),
  };
}

function applySnapshotFieldAccess(snapshot: AuthoritySnapshot, viewer: ViewerContext): Record<string, unknown> {
  return {
    ...snapshot,
    permissions_at_time: maskPermissions(snapshot.permissions_at_time, viewer),
  };
}

function mapAgentState(status: string | null | undefined): IdentityActorState {
  switch (String(status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'PAUSED':
    case 'PENDING_CERTIFICATION':
    case 'DRAFT':
      return 'restricted';
    case 'SUSPENDED':
      return 'suspended';
    case 'TERMINATED':
      return 'revoked';
    default:
      return 'active';
  }
}

function mapApiKeyState(isActive: boolean | null | undefined, expiresAt: string | null | undefined): IdentityActorState {
  if (!isActive) return 'revoked';
  if (expiresAt && new Date(expiresAt) < new Date()) return 'expired';
  return 'active';
}

function mapActorType(input: ResolveAuthorityBindingInput['actor']['actor_type']): IdentityActorType {
  if (input === 'api_key') return 'service_account';
  return input;
}

function buildLedgerEntryHash(input: {
  tenant_id: string;
  workspace_id: string;
  data_residency: string;
  schema_version: string;
  entry_type: string;
  entry_category: string;
  timestamp_utc: string;
  actor_id: string;
  actor_type: IdentityActorType;
  source: Record<string, unknown>;
  authority_change: Record<string, unknown>;
  session_context: Record<string, unknown>;
  approvals: unknown[];
  linked_authority_snapshot_id: string | null;
  risk: Record<string, unknown>;
  retention: Record<string, unknown>;
  prev_hash: string | null;
}): string {
  return computeHash(input);
}

async function getActorByActorId(actorId: string, workspaceId: string): Promise<IdentityActor | null> {
  const { data, error } = await supabaseAdmin
    .from('identity_actors')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('actor_id', actorId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as IdentityActor | null;
}

async function getCurrentSnapshot(actorId: string, workspaceId: string): Promise<AuthoritySnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from('identity_authority_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('actor_id', actorId)
    .is('effective_until', null)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as AuthoritySnapshot | null;
}

async function getSnapshotById(snapshotId: string, workspaceId: string): Promise<AuthoritySnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from('identity_authority_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('authority_snapshot_id', snapshotId)
    .maybeSingle();

  if (error) throw error;
  return data as AuthoritySnapshot | null;
}

async function persistActor(existing: IdentityActor | null, seed: ActorSeed, snapshotId: string | null): Promise<IdentityActor> {
  const payload = {
    actor_id: seed.actor_id,
    workspace_id: seed.workspace_id,
    tenant_id: seed.tenant_id,
    actor_type: seed.actor_type,
    display_name: seed.display_name,
    email: seed.email,
    email_hash: seed.email ? computeHash(seed.email) : null,
    state: seed.state,
    external_identity_id: seed.external_identity_id,
    source_system: seed.source_system,
    source_ref_id: seed.source_ref_id,
    authority_class: seed.authority_class,
    risk_level: seed.risk_level,
    risk_flags: seed.risk_flags,
    current_roles: seed.current_roles,
    current_permissions: seed.current_permissions,
    current_authority_snapshot_id: snapshotId,
    last_activity_at: seed.last_activity_at,
    profile: seed.profile,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    const { data, error } = await supabaseAdmin
      .from('identity_actors')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as IdentityActor;
  }

  const { data, error } = await supabaseAdmin
    .from('identity_actors')
    .update(payload)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw error;
  return data as IdentityActor;
}

async function createLedgerEntry(seed: ActorSeed, snapshotId: string): Promise<IdentityLedgerEntry> {
  const ledgerEntryId = generateOpaqueId('IDL');

  const { data, error } = await supabaseAdmin
    .from('identity_ledger_entries')
    .insert({
      ledger_entry_id: ledgerEntryId,
      tenant_id: seed.tenant_id,
      workspace_id: seed.workspace_id,
      data_residency: 'auto',
      schema_version: '1.0',
      entry_type: seed.entry_type,
      entry_category: seed.entry_category,
      timestamp_utc: seed.effective_from,
      actor_id: seed.actor_id,
      actor_type: seed.actor_type,
      source: {
        source_type: seed.source_system,
        source_ref_id: seed.source_ref_id,
        actor_type: seed.actor_type,
      },
      authority_change: {
        roles: seed.current_roles,
        permission_count: seed.current_permissions.length,
        authority_class: seed.authority_class,
      },
      session_context: {},
      approvals: [],
      linked_authority_snapshot_id: snapshotId,
      risk: {
        level: seed.risk_level,
        flags: seed.risk_flags,
      },
      retention: {
        class: 'REGULATED',
        legal_hold: false,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data as IdentityLedgerEntry;
}

async function createSnapshot(seed: ActorSeed, snapshotId: string, createdByLedgerEntryId: string): Promise<AuthoritySnapshot> {
  const snapshotHash = computeHash({
    actor_id: seed.actor_id,
    actor_type: seed.actor_type,
    effective_from: seed.effective_from,
    roles_at_time: toRoleObjects(seed.current_roles),
    permissions_at_time: seed.current_permissions,
    policy_constraints: seed.policy_constraints,
    delegation_context: seed.delegation_context || null,
    agent_context: seed.agent_context || null,
    service_account_context: seed.service_account_context || null,
    source_lineage: seed.source_lineage,
  });

  const { data, error } = await supabaseAdmin
    .from('identity_authority_snapshots')
    .insert({
      authority_snapshot_id: snapshotId,
      actor_id: seed.actor_id,
      actor_type: seed.actor_type,
      tenant_id: seed.tenant_id,
      workspace_id: seed.workspace_id,
      effective_from: seed.effective_from,
      effective_until: null,
      roles_at_time: toRoleObjects(seed.current_roles),
      permissions_at_time: seed.current_permissions,
      policy_constraints: seed.policy_constraints,
      delegation_context: seed.delegation_context || null,
      agent_context: seed.agent_context || null,
      service_account_context: seed.service_account_context || null,
      source_lineage: seed.source_lineage,
      snapshot_hash: snapshotHash,
      created_by_ledger_entry_id: createdByLedgerEntryId,
      superseded_by: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AuthoritySnapshot;
}

async function ensureSnapshotForSeed(seed: ActorSeed): Promise<{ actor: IdentityActor; snapshot: AuthoritySnapshot }> {
  const existingActor = await getActorByActorId(seed.actor_id, seed.workspace_id);
  const currentSnapshot = await getCurrentSnapshot(seed.actor_id, seed.workspace_id);

  const desiredSnapshotHash = computeHash({
    actor_id: seed.actor_id,
    actor_type: seed.actor_type,
    roles_at_time: toRoleObjects(seed.current_roles),
    permissions_at_time: seed.current_permissions,
    policy_constraints: seed.policy_constraints,
    delegation_context: seed.delegation_context || null,
    agent_context: seed.agent_context || null,
    service_account_context: seed.service_account_context || null,
    source_lineage: seed.source_lineage,
  });

  if (currentSnapshot && currentSnapshot.snapshot_hash === desiredSnapshotHash) {
    const actor = await persistActor(existingActor, seed, currentSnapshot.authority_snapshot_id);
    return { actor, snapshot: currentSnapshot };
  }

  const snapshotId = generateOpaqueId('AUTH');
  const ledgerEntry = await createLedgerEntry(seed, snapshotId);
  const snapshot = await createSnapshot(seed, snapshotId, ledgerEntry.ledger_entry_id);

  if (currentSnapshot) {
    const { error: previousError } = await supabaseAdmin
      .from('identity_authority_snapshots')
      .update({
        effective_until: seed.effective_from,
        superseded_by: snapshot.authority_snapshot_id,
      })
      .eq('id', currentSnapshot.id);

    if (previousError) throw previousError;
  }

  const actor = await persistActor(existingActor, seed, snapshot.authority_snapshot_id);
  return { actor, snapshot };
}

function buildHumanUserSeed(workspaceId: string, tenantId: string, member: Record<string, unknown>, user: Record<string, unknown> | null): ActorSeed {
  const role = String(member.role || 'VIEWER');
  const permissions = getPermissionsForRole(role);
  const displayName = String(user?.full_name || user?.email || member.user_id || 'Unknown User');
  const effectiveFrom = new Date().toISOString();

  return {
    actor_id: String(member.user_id),
    workspace_id: workspaceId,
    tenant_id: tenantId,
    actor_type: 'human_user',
    display_name: displayName,
    email: typeof user?.email === 'string' ? user.email : null,
    state: 'active',
    external_identity_id: typeof user?.email === 'string' ? user.email : null,
    source_system: 'workspace_members',
    source_ref_id: String(member.user_id),
    authority_class: permissions.includes('*') ? 'admin' : 'standard',
    risk_level: 'low',
    risk_flags: [],
    current_roles: [role],
    current_permissions: permissions,
    last_activity_at: null,
    profile: {
      full_name: displayName,
      role,
      is_superadmin: Boolean(user?.is_superadmin),
    },
    policy_constraints: {
      workspace_id: workspaceId,
    },
    source_lineage: [
      {
        source_type: 'workspace_members',
        source_event_id: String(member.user_id),
        workspace_role: role,
      },
    ],
    entry_type: 'identity.created',
    entry_category: 'identity_assertion',
    effective_from: effectiveFrom,
  };
}

function buildAgentPermissions(agent: Record<string, unknown>): string[] {
  const autonomy = String(agent.autonomy_level || 'L0');
  const base = ['agents:view', 'audit:view'];
  if (String(agent.status || '').toUpperCase() === 'ACTIVE') base.push('agents:execute');
  base.push(`agent:type:${String(agent.type || 'unknown')}`);
  base.push(`agent:autonomy:${autonomy}`);
  return base;
}

function buildAgentSeed(workspaceId: string, tenantId: string, agent: Record<string, unknown>): ActorSeed {
  const effectiveFrom = String(agent.updated_at || agent.created_at || new Date().toISOString());
  const permissions = buildAgentPermissions(agent);

  return {
    actor_id: String(agent.id),
    workspace_id: workspaceId,
    tenant_id: tenantId,
    actor_type: 'ai_agent',
    display_name: String(agent.name || agent.id || 'AI Agent'),
    email: null,
    state: mapAgentState(typeof agent.status === 'string' ? agent.status : null),
    external_identity_id: typeof agent.id === 'string' ? agent.id : null,
    source_system: 'agent_registry',
    source_ref_id: String(agent.id),
    authority_class: String(agent.autonomy_level || 'L0'),
    risk_level: String(agent.risk_tier || 'LOW').toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
    risk_flags: [],
    current_roles: ['AI_AGENT', String(agent.type || 'unknown').toUpperCase()],
    current_permissions: permissions,
    last_activity_at: typeof agent.updated_at === 'string' ? agent.updated_at : null,
    profile: {
      type: agent.type,
      status: agent.status,
      autonomy_level: agent.autonomy_level,
      trust_score: agent.trust_score,
      risk_tier: agent.risk_tier,
    },
    policy_constraints: {
      platforms: Array.isArray(agent.platforms) ? agent.platforms : [],
      markets: Array.isArray(agent.markets) ? agent.markets : [],
      assigned_brand: agent.assigned_brand || null,
    },
    agent_context: {
      autonomy_mode: agent.autonomy_level,
      model_version: agent.model_version,
      prompt_version: agent.prompt_version,
      supervisor_actor_id: agent.primary_dri_id || null,
    },
    source_lineage: [
      {
        source_type: 'agent_registry',
        source_event_id: String(agent.id),
      },
    ],
    entry_type: 'agent.created',
    entry_category: 'agent_identity',
    effective_from: effectiveFrom,
  };
}

function buildApiKeySeed(workspaceId: string, tenantId: string, apiKey: Record<string, unknown>): ActorSeed {
  const effectiveFrom = String(apiKey.created_at || new Date().toISOString());
  const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes.map(scope => String(scope)) : [];

  return {
    actor_id: `api_key:${String(apiKey.id)}`,
    workspace_id: workspaceId,
    tenant_id: tenantId,
    actor_type: 'service_account',
    display_name: String(apiKey.name || apiKey.key_prefix || apiKey.id || 'Service Account'),
    email: null,
    state: mapApiKeyState(Boolean(apiKey.is_active), typeof apiKey.expires_at === 'string' ? apiKey.expires_at : null),
    external_identity_id: typeof apiKey.key_prefix === 'string' ? apiKey.key_prefix : null,
    source_system: 'api_keys',
    source_ref_id: String(apiKey.id),
    authority_class: scopes.includes('*') ? 'privileged' : 'least_privilege',
    risk_level: scopes.includes('*') ? 'high' : 'medium',
    risk_flags: scopes.includes('*') ? ['wildcard_scope'] : [],
    current_roles: ['SERVICE_ACCOUNT'],
    current_permissions: scopes,
    last_activity_at: typeof apiKey.last_used_at === 'string' ? apiKey.last_used_at : null,
    profile: {
      owner_actor_id: apiKey.created_by,
      expires_at: apiKey.expires_at,
      last_used_at: apiKey.last_used_at,
    },
    policy_constraints: {
      workspace_id: workspaceId,
    },
    service_account_context: {
      owner_actor_id: apiKey.created_by,
      credential_state: mapApiKeyState(Boolean(apiKey.is_active), typeof apiKey.expires_at === 'string' ? apiKey.expires_at : null),
      scopes,
    },
    source_lineage: [
      {
        source_type: 'api_keys',
        source_event_id: String(apiKey.id),
      },
    ],
    entry_type: 'service_account.created',
    entry_category: 'service_account',
    effective_from: effectiveFrom,
  };
}

function buildFallbackSeed(input: ResolveAuthorityBindingInput): ActorSeed {
  const actorType = mapActorType(input.actor.actor_type);
  const permission = input.authority?.permission_used ? [input.authority.permission_used] : [];

  return {
    actor_id: input.actor.actor_id,
    workspace_id: input.workspace_id,
    tenant_id: normalizeTenantId(input.tenant_id),
    actor_type: actorType,
    display_name: input.actor.actor_name || input.actor.actor_id,
    email: null,
    state: actorType === 'system' ? 'active' : 'restricted',
    external_identity_id: input.actor.actor_id,
    source_system: 'audit_event',
    source_ref_id: input.actor.actor_id,
    authority_class: permission.length ? 'scoped' : 'unknown',
    risk_level: 'low',
    risk_flags: [],
    current_roles: input.actor.role_at_event ? [input.actor.role_at_event] : [String(actorType).toUpperCase()],
    current_permissions: permission,
    last_activity_at: input.timestamp_utc || new Date().toISOString(),
    profile: {
      seeded_from: 'audit_event',
    },
    policy_constraints: {
      workspace_id: input.workspace_id,
    },
    agent_context: actorType === 'ai_agent'
      ? {
          agent_id: input.ai_context?.agent_id || input.actor.actor_id,
          model_version: input.ai_context?.model_version || null,
          prompt_version: input.ai_context?.prompt_version || null,
        }
      : null,
    source_lineage: [
      {
        source_type: 'audit_event',
        source_event_id: input.actor.actor_id,
      },
    ],
    entry_type: actorType === 'ai_agent'
      ? 'agent.created'
      : actorType === 'service_account'
        ? 'service_account.created'
        : 'identity.created',
    entry_category: 'identity_assertion',
    effective_from: input.timestamp_utc || new Date().toISOString(),
  };
}

async function hydrateSeedFromSources(input: ResolveAuthorityBindingInput): Promise<ActorSeed> {
  const tenantId = normalizeTenantId(input.tenant_id);
  const actorType = mapActorType(input.actor.actor_type);

  let seed: ActorSeed | null = null;

  if (actorType === 'human_user') {
    const [{ data: member }, { data: user }] = await Promise.all([
      supabaseAdmin
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', input.workspace_id)
        .eq('user_id', input.actor.actor_id)
        .maybeSingle(),
      supabaseAdmin
        .from('users')
        .select('id, full_name, email, is_superadmin')
        .eq('id', input.actor.actor_id)
        .maybeSingle(),
    ]);

    if (member) seed = buildHumanUserSeed(input.workspace_id, tenantId, member as Record<string, unknown>, user as Record<string, unknown> | null);
  } else if (actorType === 'ai_agent') {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, name, type, status, autonomy_level, trust_score, risk_tier, assigned_brand, platforms, markets, prompt_version, model_version, primary_dri_id, created_at, updated_at')
      .eq('workspace_id', input.workspace_id)
      .eq('id', input.actor.actor_id)
      .maybeSingle();

    if (agent) seed = buildAgentSeed(input.workspace_id, tenantId, agent as Record<string, unknown>);
  } else if (actorType === 'service_account') {
    const { data: apiKey } = await supabaseAdmin
      .from('api_keys')
      .select('id, workspace_id, name, key_prefix, scopes, is_active, expires_at, created_by, created_at, last_used_at')
      .eq('workspace_id', input.workspace_id)
      .eq('id', input.actor.actor_id.replace(/^api_key:/, ''))
      .maybeSingle();

    if (apiKey) seed = buildApiKeySeed(input.workspace_id, tenantId, apiKey as Record<string, unknown>);
  } else if (actorType === 'system') {
    seed = {
      actor_id: input.actor.actor_id,
      workspace_id: input.workspace_id,
      tenant_id: tenantId,
      actor_type: 'system',
      display_name: input.actor.actor_name || `System:${input.actor.actor_id}`,
      email: null,
      state: 'active',
      external_identity_id: input.actor.actor_id,
      source_system: 'platform',
      source_ref_id: input.actor.actor_id,
      authority_class: 'system',
      risk_level: 'low',
      risk_flags: [],
      current_roles: ['SYSTEM'],
      current_permissions: ['system.*'],
      last_activity_at: input.timestamp_utc || new Date().toISOString(),
      profile: { seeded_from: 'hydrate_seed', actor_category: 'system_actor' },
      policy_constraints: { workspace_id: input.workspace_id },
      agent_context: null,
      source_lineage: [{ source_type: 'system_registry', source_event_id: input.actor.actor_id }],
      entry_type: 'identity.created',
      entry_category: 'identity_assertion',
      effective_from: input.timestamp_utc || new Date().toISOString(),
    };
  } else if (actorType === 'external_reviewer') {
    seed = {
      actor_id: input.actor.actor_id,
      workspace_id: input.workspace_id,
      tenant_id: tenantId,
      actor_type: 'external_reviewer',
      display_name: input.actor.actor_name || `External:${input.actor.actor_id}`,
      email: null,
      state: 'restricted',
      external_identity_id: input.actor.actor_id,
      source_system: 'external_portal',
      source_ref_id: input.actor.actor_id,
      authority_class: 'scoped',
      risk_level: 'medium',
      risk_flags: [],
      current_roles: ['EXTERNAL_REVIEWER'],
      current_permissions: ['evidence.review', 'evidence.comment'],
      last_activity_at: input.timestamp_utc || new Date().toISOString(),
      profile: { seeded_from: 'hydrate_seed', actor_category: 'external_reviewer' },
      policy_constraints: { workspace_id: input.workspace_id },
      agent_context: null,
      source_lineage: [{ source_type: 'external_invitation', source_event_id: input.actor.actor_id }],
      entry_type: 'identity.created',
      entry_category: 'identity_assertion',
      effective_from: input.timestamp_utc || new Date().toISOString(),
    };
  }

  if (!seed) {
    seed = buildFallbackSeed(input);
  }

  const { data: delegations } = await supabaseAdmin
    .from('identity_delegations')
    .select('*')
    .eq('delegatee_id', input.actor.actor_id)
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString());

  if (delegations && delegations.length > 0) {
    const delegatedRoles = new Set<string>();
    const delegatedPermissions = new Set<string>();
    
    delegations.forEach((d: any) => {
      const scope = d.scope || {};
      if (Array.isArray(scope.roles)) scope.roles.forEach((r: string) => delegatedRoles.add(r));
      if (Array.isArray(scope.permissions)) scope.permissions.forEach((p: string) => delegatedPermissions.add(p));
    });

    seed.current_roles = Array.from(new Set([...seed.current_roles, 'DELEGATED_ACTOR', ...delegatedRoles]));
    seed.current_permissions = Array.from(new Set([...seed.current_permissions, ...delegatedPermissions]));
    seed.delegation_context = {
      active_delegations: delegations.map((d: any) => ({ id: d.id, delegator_id: d.delegator_id })),
    };
  }

  const { data: breakGlass } = await supabaseAdmin
    .from('identity_break_glass_sessions')
    .select('*')
    .eq('actor_id', input.actor.actor_id)
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE');

  if (breakGlass && breakGlass.length > 0) {
    const bg = breakGlass[0] as any;
    seed.state = 'break_glass_active';
    const elevated = Array.isArray(bg.elevated_roles) ? bg.elevated_roles : ['SUPERADMIN'];
    seed.current_roles = Array.from(new Set([...seed.current_roles, ...elevated]));
    
    seed.current_permissions = Array.from(new Set([...seed.current_permissions, '*']));
    seed.authority_class = 'emergency_privileged';

    const ctx = {
      session_id: bg.id,
      reason: bg.reason,
      elevated_roles: elevated
    };

    if (actorType === 'ai_agent') {
      seed.agent_context = { ...(seed.agent_context || {}), break_glass: ctx };
    } else if (actorType === 'service_account') {
      seed.service_account_context = { ...(seed.service_account_context || {}), break_glass: ctx };
    } else {
      seed.profile = { ...(seed.profile || {}), break_glass: ctx };
    }
  }

  return seed;
}

async function ensureWorkspaceReadModel(workspaceId: string, tenantId: string): Promise<void> {
  const { data: members, error: membersError } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId);

  if (membersError) throw membersError;

  for (const member of (members || []) as Array<Record<string, unknown>>) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, is_superadmin')
      .eq('id', String(member.user_id))
      .maybeSingle();

    await ensureSnapshotForSeed(buildHumanUserSeed(workspaceId, tenantId, member, user as Record<string, unknown> | null));
  }

  const { data: agents, error: agentsError } = await supabaseAdmin
    .from('agents')
    .select('id, name, type, status, autonomy_level, trust_score, risk_tier, assigned_brand, platforms, markets, prompt_version, model_version, primary_dri_id, created_at, updated_at')
    .eq('workspace_id', workspaceId);

  if (agentsError) throw agentsError;

  for (const agent of (agents || []) as Array<Record<string, unknown>>) {
    await ensureSnapshotForSeed(buildAgentSeed(workspaceId, tenantId, agent));
  }

  const { data: apiKeys, error: apiKeysError } = await supabaseAdmin
    .from('api_keys')
    .select('id, workspace_id, name, key_prefix, scopes, is_active, expires_at, created_by, created_at, last_used_at')
    .eq('workspace_id', workspaceId);

  if (apiKeysError) throw apiKeysError;

  for (const apiKey of (apiKeys || []) as Array<Record<string, unknown>>) {
    await ensureSnapshotForSeed(buildApiKeySeed(workspaceId, tenantId, apiKey));
  }
}

async function listActorsRaw(workspaceId: string): Promise<IdentityActor[]> {
  const { data, error } = await supabaseAdmin
    .from('identity_actors')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as IdentityActor[];
}

export async function resolveAuthorityBindingForAuditEvent(input: ResolveAuthorityBindingInput): Promise<ResolveAuthorityBindingResult> {
  const seed = await hydrateSeedFromSources(input);
  seed.effective_from = input.timestamp_utc || seed.effective_from || new Date().toISOString();

  if (input.actor.role_at_event) {
    seed.current_roles = [input.actor.role_at_event];
    seed.current_permissions = input.authority?.permission_used
      ? Array.from(new Set([input.authority.permission_used, ...seed.current_permissions]))
      : seed.current_permissions;
  }

  const { actor, snapshot } = await ensureSnapshotForSeed(seed);
  return {
    authority_snapshot_id: snapshot.authority_snapshot_id,
    roles_at_event: extractRoleNames(snapshot),
    permissions_at_event: snapshot.permissions_at_time,
    actor_state_at_event: actor.state,
    actor_display_name: actor.display_name,
  };
}

export async function listActors(params: {
  workspace_id: string;
  tenant_id?: string;
  actor_type?: string;
  state?: string;
  role?: string;
  authority_class?: string;
  risk_level?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
  viewer: ViewerContext;
}) {
  await ensureWorkspaceReadModel(params.workspace_id, normalizeTenantId(params.tenant_id));
  const actors = await listActorsRaw(params.workspace_id);

  const filtered = actors.filter(actor => {
    if (params.actor_type && actor.actor_type !== params.actor_type) return false;
    if (params.state && actor.state !== params.state) return false;
    if (params.risk_level && actor.risk_level !== params.risk_level) return false;
    if (params.authority_class && actor.authority_class !== params.authority_class) return false;
    if (params.source && actor.source_system !== params.source) return false;
    if (params.role && !actor.current_roles.includes(params.role)) return false;
    if (params.search) {
      const needle = params.search.toLowerCase();
      const haystack = [
        actor.actor_id,
        actor.display_name,
        actor.external_identity_id || '',
        actor.source_system,
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const offset = Math.max(params.offset || 0, 0);
  const limit = Math.min(Math.max(params.limit || 50, 1), 100);
  const paged = filtered.slice(offset, offset + limit);

  return {
    actors: paged.map(actor => applyActorFieldAccess(actor, params.viewer)),
    total: filtered.length,
  };
}

export async function getActorDetail(params: {
  workspace_id: string;
  tenant_id?: string;
  actor_id: string;
  viewer: ViewerContext;
}) {
  let actor = await getActorByActorId(params.actor_id, params.workspace_id);
  if (!actor) {
    await ensureWorkspaceReadModel(params.workspace_id, normalizeTenantId(params.tenant_id));
    actor = await getActorByActorId(params.actor_id, params.workspace_id);
  }
  if (!actor) return null;

  const currentSnapshot = actor.current_authority_snapshot_id
    ? await getSnapshotById(actor.current_authority_snapshot_id, params.workspace_id)
    : await getCurrentSnapshot(actor.actor_id, params.workspace_id);

  const { data: recentAuditEvents, error: auditError } = await supabaseAdmin
    .from('audit_events')
    .select('id, event_id, event_type, event_title, timestamp_utc, status, authority')
    .eq('workspace_id', params.workspace_id)
    .filter('actor->>actor_id', 'eq', actor.actor_id)
    .order('timestamp_utc', { ascending: false })
    .limit(10);

  if (auditError) throw auditError;

  const { data: recentLedgerEntries, error: ledgerError } = await supabaseAdmin
    .from('identity_ledger_entries')
    .select('ledger_entry_id, entry_type, entry_category, timestamp_utc, linked_authority_snapshot_id, risk')
    .eq('workspace_id', params.workspace_id)
    .eq('actor_id', actor.actor_id)
    .order('timestamp_utc', { ascending: false })
    .limit(25);

  if (ledgerError) throw ledgerError;

  return {
    actor: applyActorFieldAccess(actor, params.viewer),
    current_authority_snapshot: currentSnapshot ? applySnapshotFieldAccess(currentSnapshot, params.viewer) : null,
    authority_summary: {
      state: actor.state,
      roles: actor.current_roles,
      permissions: maskPermissions(actor.current_permissions, params.viewer),
      authority_class: actor.authority_class,
    },
    evidence_links: {
      recent_audit_events: recentAuditEvents || [],
      recent_ledger_entries: recentLedgerEntries || [],
    },
  };
}

export async function getActorTimeline(params: {
  workspace_id: string;
  tenant_id?: string;
  actor_id: string;
  point_in_time?: string;
  limit?: number;
  viewer: ViewerContext;
}) {
  let actor = await getActorByActorId(params.actor_id, params.workspace_id);
  if (!actor) {
    await ensureWorkspaceReadModel(params.workspace_id, normalizeTenantId(params.tenant_id));
    actor = await getActorByActorId(params.actor_id, params.workspace_id);
  }
  if (!actor) return null;

  let query = supabaseAdmin
    .from('identity_ledger_entries')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .eq('actor_id', params.actor_id)
    .order('timestamp_utc', { ascending: false })
    .limit(Math.min(Math.max(params.limit || 50, 1), 100));

  if (params.point_in_time) {
    query = query.lte('timestamp_utc', params.point_in_time);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    actor: applyActorFieldAccess(actor, params.viewer),
    timeline: (data || []) as IdentityLedgerEntry[],
  };
}

export async function getAuthoritySnapshotDetail(params: {
  workspace_id: string;
  snapshot_id: string;
  viewer: ViewerContext;
}) {
  const snapshot = await getSnapshotById(params.snapshot_id, params.workspace_id);
  if (!snapshot) return null;
  return applySnapshotFieldAccess(snapshot, params.viewer);
}

export async function getAuthorityAtEvent(params: {
  workspace_id: string;
  tenant_id?: string;
  audit_event_id: string;
  viewer: ViewerContext;
}) {
  const { data: event, error } = await supabaseAdmin
    .from('audit_events')
    .select('id, event_id, event_type, event_title, timestamp_utc, actor, authority, status')
    .eq('workspace_id', params.workspace_id)
    .or(`id.eq.${params.audit_event_id},event_id.eq.${params.audit_event_id}`)
    .maybeSingle();

  if (error) throw error;
  if (!event) return null;

  const actorPayload = (event.actor || {}) as Record<string, unknown>;
  const authorityPayload = (event.authority || {}) as Record<string, unknown>;
  const actorId = String(actorPayload.actor_id || '');
  if (!actorId) return null;

  let eventSnapshot: AuthoritySnapshot | null = null;
  let resolvedBy: 'linked_snapshot' | 'point_in_time' | 'fallback_current' = 'point_in_time';

  if (typeof authorityPayload.authority_snapshot_id === 'string' && authorityPayload.authority_snapshot_id.length > 0) {
    eventSnapshot = await getSnapshotById(authorityPayload.authority_snapshot_id, params.workspace_id);
    resolvedBy = 'linked_snapshot';
  }

  if (!eventSnapshot) {
    const { data: candidates, error: snapshotError } = await supabaseAdmin
      .from('identity_authority_snapshots')
      .select('*')
      .eq('workspace_id', params.workspace_id)
      .eq('actor_id', actorId)
      .lte('effective_from', event.timestamp_utc)
      .order('effective_from', { ascending: false })
      .limit(20);

    if (snapshotError) throw snapshotError;

    const found = ((candidates || []) as AuthoritySnapshot[]).find(snapshot => {
      if (!snapshot.effective_until) return true;
      return new Date(snapshot.effective_until) > new Date(event.timestamp_utc);
    });

    eventSnapshot = found || null;
  }

  let differenceWarning: string | null = null;
  if (!eventSnapshot) {
    const binding = await resolveAuthorityBindingForAuditEvent({
      workspace_id: params.workspace_id,
      tenant_id: params.tenant_id,
      timestamp_utc: event.timestamp_utc,
      actor: {
        actor_id: actorId,
        actor_type: String(actorPayload.actor_type || 'human_user') as ResolveAuthorityBindingInput['actor']['actor_type'],
        actor_name: typeof actorPayload.actor_name === 'string' ? actorPayload.actor_name : undefined,
        role_at_event: typeof actorPayload.role_at_event === 'string' ? actorPayload.role_at_event : undefined,
      },
      authority: {
        permission_used: typeof authorityPayload.permission_used === 'string' ? authorityPayload.permission_used : undefined,
      },
    });

    eventSnapshot = await getSnapshotById(binding.authority_snapshot_id, params.workspace_id);
    resolvedBy = 'fallback_current';
    differenceWarning = 'Historical authority snapshot was missing; current snapshot was used as fallback.';
  }

  const actor = await getActorByActorId(actorId, params.workspace_id);
  const currentSnapshot = actor?.current_authority_snapshot_id
    ? await getSnapshotById(actor.current_authority_snapshot_id, params.workspace_id)
    : await getCurrentSnapshot(actorId, params.workspace_id);

  if (eventSnapshot && currentSnapshot && currentSnapshot.snapshot_hash !== eventSnapshot.snapshot_hash) {
    differenceWarning = 'Current authority differs from the event-time snapshot.';
  }

  return {
    audit_event: {
      id: event.id,
      event_id: event.event_id,
      event_type: event.event_type,
      event_title: event.event_title,
      timestamp_utc: event.timestamp_utc,
      status: event.status,
    },
    actor: actor ? applyActorFieldAccess(actor, params.viewer) : null,
    authority_at_event: eventSnapshot ? applySnapshotFieldAccess(eventSnapshot, params.viewer) : null,
    current_authority: currentSnapshot ? applySnapshotFieldAccess(currentSnapshot, params.viewer) : null,
    difference_warning: differenceWarning,
    resolved_by: resolvedBy,
  };
}

export async function verifyIdentityLedgerChain(params: {
  workspace_id: string;
  tenant_id?: string;
  created_by: string;
}) {
  const { data: entries, error } = await supabaseAdmin
    .from('identity_ledger_entries')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .order('timestamp_utc', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const brokenLinks: Array<Record<string, unknown>> = [];
  let previousHash: string | null = null;
  let lastLedgerEntryId: string | null = null;

  for (const entry of (entries || []) as IdentityLedgerEntry[]) {
    const expectedHash = buildLedgerEntryHash({
      tenant_id: entry.tenant_id,
      workspace_id: entry.workspace_id,
      data_residency: entry.data_residency,
      schema_version: entry.schema_version,
      entry_type: entry.entry_type,
      entry_category: entry.entry_category,
      timestamp_utc: entry.timestamp_utc,
      actor_id: entry.actor_id,
      actor_type: entry.actor_type,
      source: entry.source,
      authority_change: entry.authority_change,
      session_context: entry.session_context,
      approvals: entry.approvals,
      linked_authority_snapshot_id: entry.linked_authority_snapshot_id,
      risk: entry.risk,
      retention: entry.retention,
      prev_hash: previousHash,
    });

    if (entry.prev_hash !== previousHash || entry.hash !== expectedHash) {
      brokenLinks.push({
        ledger_entry_id: entry.ledger_entry_id,
        expected_prev_hash: previousHash,
        actual_prev_hash: entry.prev_hash,
        expected_hash: expectedHash,
        actual_hash: entry.hash,
      });
    }

    previousHash = entry.hash;
    lastLedgerEntryId = entry.ledger_entry_id;
  }

  const status = brokenLinks.length === 0 ? 'verified' : 'broken';
  const { data: verification, error: verificationError } = await supabaseAdmin
    .from('identity_chain_verifications')
    .insert({
      verification_id: generateOpaqueId('IDV'),
      tenant_id: normalizeTenantId(params.tenant_id),
      workspace_id: params.workspace_id,
      status,
      last_verified_entry_id: lastLedgerEntryId,
      verified_entry_count: (entries || []).length,
      broken_links: brokenLinks,
      created_by: params.created_by,
    })
    .select()
    .single();

  if (verificationError) throw verificationError;
  return verification;
}

export async function createDelegation(params: {
  tenant_id: string;
  delegator_id: string;
  delegatee_id: string;
  scope: Record<string, unknown>;
  expires_at: string;
  reason?: string;
  auth?: AuthContext;
}) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_delegations')
    .insert({
      delegator_id: params.delegator_id,
      delegatee_id: params.delegatee_id,
      tenant_id: params.tenant_id,
      scope: params.scope,
      expires_at: params.expires_at,
      reason: params.reason,
    })
    .select()
    .single();

  if (error) throw error;
  try {
    internalEventBus.emit('identity.authority_changed', {
      workspace_id: params.tenant_id,
      tenant_id: params.tenant_id,
      actor_id: params.delegator_id,
      entry_id: (data as { id: string }).id,
      change_type: 'delegation.created',
    });
  } catch { /* non-blocking */ }
  return data;
}

export async function revokeDelegation(params: { id: string; revoked_by: string; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_delegations')
    .update({ status: 'REVOKED', revoked_at: new Date().toISOString(), revoked_by: params.revoked_by })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listDelegations(params: { tenant_id: string; status?: string }) {
  let query = supabaseAdmin
    .from('identity_delegations')
    .select('*')
    .eq('tenant_id', params.tenant_id)
    .order('created_at', { ascending: false });
  
  if (params.status) {
    query = query.eq('status', params.status);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function requestBreakGlass(params: { tenant_id: string; actor_id: string; reason: string; elevated_roles?: string[]; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_break_glass_sessions')
    .insert({
      actor_id: params.actor_id,
      tenant_id: params.tenant_id,
      reason: params.reason,
      status: 'PENDING',
      review_status: 'AWAITING_REVIEW',
      elevated_roles: params.elevated_roles || ['SUPERADMIN'],
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function activateBreakGlass(params: { id: string; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data: session } = await supabaseAdmin
    .from('identity_break_glass_sessions')
    .select('review_status')
    .eq('id', params.id)
    .single();

  if (!session) throw new Error('Break-glass session not found');
  if (session.review_status !== 'APPROVED') {
    throw new Error('Break-glass session must be reviewed and approved before activation');
  }

  const { data, error } = await supabaseAdmin
    .from('identity_break_glass_sessions')
    .update({ status: 'ACTIVE' })
    .eq('id', params.id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function endBreakGlass(params: { id: string; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_break_glass_sessions')
    .update({ status: 'ENDED', ends_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function listBreakGlassSessions(params: { tenant_id: string; status?: string }) {
  let query = supabaseAdmin
    .from('identity_break_glass_sessions')
    .select('*')
    .eq('tenant_id', params.tenant_id)
    .order('created_at', { ascending: false });
  
  if (params.status) {
    query = query.eq('status', params.status);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function reviewBreakGlass(params: { id: string; reviewer_id: string; status: 'APPROVED' | 'FLAGGED'; notes: string; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_break_glass_sessions')
    .update({
      review_status: params.status,
      review_notes: params.notes,
      reviewed_by: params.reviewer_id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single();
    
    if (error) throw error;
  return data;
}

// --- Phase 3: Evidence Integration ---

export async function applyLegalHold(params: { workspace_id: string; ledger_entry_id: string; reason: string; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_ledger_entries')
    .update({ legal_hold_status: true, legal_hold_expiry: null })
    .eq('workspace_id', params.workspace_id)
    .eq('ledger_entry_id', params.ledger_entry_id)
    .select()
    .single();

  if (error) throw error;
  
  if (data.linked_authority_snapshot_id) {
    await supabaseAdmin
      .from('identity_authority_snapshots')
      .update({ legal_hold_status: true, legal_hold_expiry: null })
      .eq('workspace_id', params.workspace_id)
      .eq('authority_snapshot_id', data.linked_authority_snapshot_id);
  }

  return data;
}

export async function releaseLegalHold(params: { workspace_id: string; ledger_entry_id: string; reason: string; auth?: AuthContext }) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data, error } = await supabaseAdmin
    .from('identity_ledger_entries')
    .update({ legal_hold_status: false })
    .eq('workspace_id', params.workspace_id)
    .eq('ledger_entry_id', params.ledger_entry_id)
    .select()
    .single();

  if (error) throw error;
  
  if (data.linked_authority_snapshot_id) {
    await supabaseAdmin
      .from('identity_authority_snapshots')
      .update({ legal_hold_status: false })
      .eq('workspace_id', params.workspace_id)
      .eq('authority_snapshot_id', data.linked_authority_snapshot_id);
  }

  return data;
}

export async function preserveToVault(params: {
  workspace_id: string;
  ledger_entry_id: string;
  reason: string;
  tenant_id?: string;
  preserved_by?: string;
  auth?: AuthContext;
}) {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data: entry, error: fetchError } = await supabaseAdmin
    .from('identity_ledger_entries')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .eq('ledger_entry_id', params.ledger_entry_id)
    .single();

  if (fetchError) throw fetchError;
  if (!entry) throw new Error('Ledger entry not found');

  const now = new Date().toISOString();
  const payload = JSON.stringify(entry);
  const contentHash = computeHash(payload);
  const metadataHash = computeHash(JSON.stringify({
    source_type: 'identity_ledger', source_id: entry.ledger_entry_id,
    source_system: 'identity_ledger', evidence_type: 'identity_entry',
  }));
  const itemId = `EVI-${now.substring(0, 10).replace(/-/g, '')}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const preservationInput = `${itemId}:${contentHash}:${metadataHash}:${now}`;
  const preservationReceiptHash = computeHash(preservationInput);

  const { data: vaultItem, error: vaultError } = await supabaseAdmin
    .from('vault_evidence_items')
    .insert({
      item_id: itemId, schema_version: '1.0',
      tenant_id: params.tenant_id || entry.tenant_id || params.workspace_id,
      workspace_id: params.workspace_id,
      data_residency: entry.data_residency || 'auto',
      source_type: 'identity_ledger', source_id: entry.ledger_entry_id,
      source_system: 'identity_ledger',
      source_timestamp_utc: entry.timestamp_utc || entry.created_at,
      evidence_type: 'identity_entry', risk_level: 'medium',
      sensitivity: 'internal',
      original_content_hash: contentHash,
      normalized_content_hash: contentHash,
      metadata_hash: metadataHash,
      preservation_receipt_hash: preservationReceiptHash,
      hash_algorithm: 'SHA-256',
      preserved_by_actor_id: params.preserved_by || 'system',
      preservation_reason: params.reason,
      retention_class: 'regulated',
      vault_state: 'preserved',
      captured_at: now,
    })
    .select('item_id')
    .single();

  if (vaultError) throw vaultError;

  const { data, error } = await supabaseAdmin
    .from('identity_ledger_entries')
    .update({ retention: { class: 'EVIDENCE_VAULT', preserved: true, reason: params.reason, vault_item_id: vaultItem.item_id } })
    .eq('workspace_id', params.workspace_id)
    .eq('ledger_entry_id', params.ledger_entry_id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, vault_item_id: vaultItem.item_id };
}

export async function reconstructIdentityChain(params: { workspace_id: string; actor_id: string; case_id: string }) {
  const { data, error } = await supabaseAdmin
    .from('identity_authority_snapshots')
    .select('*')
    .eq('workspace_id', params.workspace_id)
    .eq('actor_id', params.actor_id)
    .order('effective_from', { ascending: true });

  if (error) throw error;
  return data;
}

export async function streamToSIEM(eventPayload: any) {
  const ocsfEvent = {
    activity_id: 1,
    activity_name: 'Identity Change',
    category_name: 'Identity & Access Management',
    category_uid: 3,
    class_name: 'Entity Management',
    class_uid: 3004,
    metadata: {
      version: '1.1.0',
      product: { name: 'ZoikoVertex Evidence Layer', version: '1.0' },
    },
    unmapped: eventPayload,
  };
  return ocsfEvent;
}

// ─── Phase 2: Service-Account Registry ────────────────────────────────────────

export interface ServiceAccountRegistration {
  actor_id: string;
  workspace_id: string;
  tenant_id: string;
  display_name: string;
  source_system: string;
  description?: string;
  permissions?: string[];
  expires_at?: string;
  created_by: string;
  auth?: AuthContext;
}

export async function registerServiceAccount(
  params: ServiceAccountRegistration
): Promise<IdentityActor> {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const { data: existing } = await supabaseAdmin
    .from('identity_actors')
    .select('actor_id')
    .eq('workspace_id', params.workspace_id)
    .eq('actor_id', params.actor_id)
    .maybeSingle();

  if (existing) throw new Error(`Service account ${params.actor_id} already exists`);

  const { data, error } = await supabaseAdmin
    .from('identity_actors')
    .insert({
      actor_id: params.actor_id,
      workspace_id: params.workspace_id,
      tenant_id: params.tenant_id,
      actor_type: 'service_account',
      display_name: params.display_name,
      state: 'active',
      source_system: params.source_system,
      source_ref_id: params.actor_id,
      authority_class: 'service',
      risk_level: 'low',
      risk_flags: [],
      current_roles: ['SERVICE_ACCOUNT'],
      current_permissions: params.permissions || [],
      profile: { description: params.description || '', registered_by: params.created_by },
    })
    .select()
    .single();

  if (error) throw error;

  const now = new Date().toISOString();

  await supabaseAdmin.from('identity_ledger_entries').insert({
    ledger_entry_id: generateOpaqueId('IDL'),
    tenant_id: params.tenant_id,
    workspace_id: params.workspace_id,
    data_residency: 'auto',
    schema_version: '1.0',
    entry_type: 'actor.registered',
    entry_category: 'actor_lifecycle',
    timestamp_utc: now,
    actor_id: params.created_by,
    actor_type: 'human_user',
    source: { source_system: params.source_system, action: 'register_service_account' },
    authority_change: { change: 'created', service_account_id: params.actor_id },
    session_context: {},
    approvals: [],
    linked_authority_snapshot_id: null,
    risk: { risk_level: 'low' },
    retention: { class: 'STANDARD' },
  });

  return data;
}

export async function listServiceAccounts(params: {
  workspace_id: string;
  source_system?: string;
  state?: string;
  limit?: number;
  offset?: number;
}): Promise<{ accounts: IdentityActor[]; total: number }> {
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;

  let query = supabaseAdmin
    .from('identity_actors')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .eq('actor_type', 'service_account');

  if (params.source_system) query = query.eq('source_system', params.source_system);
  if (params.state) query = query.eq('state', params.state);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { accounts: data || [], total: count || 0 };
}

export async function revokeServiceAccount(
  actorId: string,
  workspaceId: string,
  revokedBy: string,
  reason?: string,
  auth?: AuthContext
): Promise<IdentityActor | null> {
  requireAnyPermission(auth, 'identity-ledger:view');
  const actor = await getActorByActorId(actorId, workspaceId);
  if (!actor) return null;
  if (actor.actor_type !== 'service_account') throw new Error('Actor is not a service account');

  const { data, error } = await supabaseAdmin
    .from('identity_actors')
    .update({
      state: 'revoked' as IdentityActorState,
      profile: { ...actor.profile, revoked_at: new Date().toISOString(), revoked_by: revokedBy, revoke_reason: reason || '' },
    })
    .eq('actor_id', actorId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) throw error;

  const now = new Date().toISOString();

  await supabaseAdmin.from('identity_ledger_entries').insert({
    ledger_entry_id: generateOpaqueId('IDL'),
    tenant_id: actor.tenant_id,
    workspace_id: workspaceId,
    data_residency: 'auto',
    schema_version: '1.0',
    entry_type: 'actor.revoked',
    entry_category: 'actor_lifecycle',
    timestamp_utc: now,
    actor_id: revokedBy,
    actor_type: 'human_user',
    source: { source_system: 'identity_ledger', action: 'revoke_service_account', reason: reason || '' },
    authority_change: { change: 'revoked', previous_state: actor.state, service_account_id: actorId },
    session_context: {},
    approvals: [],
    linked_authority_snapshot_id: null,
    risk: { risk_level: 'high' },
    retention: { class: 'EXTENDED' },
  });

  return data;
}

// ─── Phase 2: Actor Timeline with Session Proof ──────────────────────────────

export interface TimelineSession {
  session_id: string;
  session_type: string;
  start: string;
  end: string | null;
  entry_count: number;
  entries: IdentityLedgerEntry[];
  authority_at_start: Record<string, unknown>;
  authority_at_end: Record<string, unknown> | null;
}

export interface ActorTimelineWithSessionsResult {
  actor: Record<string, unknown>;
  total_entries: number;
  sessions: TimelineSession[];
  uncategorized_entries: IdentityLedgerEntry[];
}

export async function getActorTimelineWithSessions(params: {
  workspace_id: string;
  tenant_id?: string;
  actor_id: string;
  limit?: number;
  viewer: ViewerContext;
}): Promise<ActorTimelineWithSessionsResult | null> {
  const timeline = await getActorTimeline({
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    actor_id: params.actor_id,
    limit: params.limit || 100,
    viewer: params.viewer,
  });

  if (!timeline) return null;

  const entries = timeline.timeline as IdentityLedgerEntry[];
  const sessions = new Map<string, TimelineSession>();
  const uncategorized: IdentityLedgerEntry[] = [];

  for (const entry of entries) {
    const sessionContext = entry.session_context as Record<string, unknown> || {};
    const sessionId = sessionContext.session_id as string | undefined;

    if (!sessionId) {
      uncategorized.push(entry);
      continue;
    }

    const existing = sessions.get(sessionId);
    if (existing) {
      existing.entries.push(entry);
      existing.entry_count = existing.entries.length;
      if (entry.timestamp_utc > existing.end!) existing.end = entry.timestamp_utc;
    } else {
      sessions.set(sessionId, {
        session_id: sessionId,
        session_type: (sessionContext.session_type as string) || 'interactive',
        start: entry.timestamp_utc,
        end: entry.timestamp_utc,
        entry_count: 1,
        entries: [entry],
        authority_at_start: (sessionContext.authority_at_start as Record<string, unknown>) || {},
        authority_at_end: (sessionContext.authority_at_end as Record<string, unknown>) || null,
      });
    }
  }

  return {
    actor: timeline.actor,
    total_entries: entries.length,
    sessions: Array.from(sessions.values()).sort((a, b) => b.start.localeCompare(a.start)),
    uncategorized_entries: uncategorized,
  };
}

// ─── Phase 2: Identity Risk Flags ─────────────────────────────────────────────

const RISK_FLAG_PATTERNS: Array<{
  flag: string;
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evaluator: (actor: IdentityActor) => boolean;
}> = [
  {
    flag: 'NO_RECENT_ACTIVITY',
    label: 'No Recent Activity',
    severity: 'medium',
    description: 'Actor has no recorded activity in the last 90 days',
    evaluator: (actor) => {
      if (!actor.last_activity_at) return true;
      const daysSinceActivity = (Date.now() - new Date(actor.last_activity_at).getTime()) / 86400000;
      return daysSinceActivity > 90;
    },
  },
  {
    flag: 'ELEVATED_PERMISSIONS',
    label: 'Elevated Permissions',
    severity: 'high',
    description: 'Actor holds administrative or security roles',
    evaluator: (actor) => {
      const elevated = ['SUPERADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'SECURITY_ADMIN'];
      return actor.current_roles.some(r => elevated.includes(r));
    },
  },
  {
    flag: 'MULTIPLE_FAILED_ATTEMPTS',
    label: 'Multiple Failed Attempts',
    severity: 'high',
    description: 'Actor has multiple recent failed authority resolution attempts',
    evaluator: () => false, // Computed from ledger entries, not actor record
  },
  {
    flag: 'RAPID_SUCCESSION_ACTIONS',
    label: 'Rapid Succession Actions',
    severity: 'medium',
    description: 'Unusual number of actions in a short time window',
    evaluator: () => false, // Computed from ledger entries
  },
  {
    flag: 'SUSPICIOUS_SOURCE',
    label: 'Suspicious Source System',
    severity: 'critical',
    description: 'Actor originates from an untrusted or unusual source',
    evaluator: (actor) => {
      const untrustedSources = ['unknown', 'external_unverified', 'legacy_import'];
      return untrustedSources.includes(actor.source_system);
    },
  },
  {
    flag: 'SERVICE_ACCOUNT_NO_ROTATION',
    label: 'Service Account Without Rotation',
    severity: 'medium',
    description: 'Service account credentials have not been rotated recently',
    evaluator: (actor) => {
      if (actor.actor_type !== 'service_account') return false;
      if (!actor.updated_at) return true;
      const daysSinceUpdate = (Date.now() - new Date(actor.updated_at).getTime()) / 86400000;
      return daysSinceUpdate > 180;
    },
  },
  {
    flag: 'MULTIPLE_ACTIVE_SESSIONS',
    label: 'Multiple Active Sessions',
    severity: 'low',
    description: 'Actor has more than 3 active sessions concurrently',
    evaluator: () => false, // Computed from session data
  },
  {
    flag: 'INACTIVE_SERVICE_ACCOUNT',
    label: 'Inactive Service Account',
    severity: 'medium',
    description: 'Service account has not been used in over 30 days',
    evaluator: (actor) => {
      if (actor.actor_type !== 'service_account') return false;
      if (!actor.last_activity_at) return true;
      const daysSinceActivity = (Date.now() - new Date(actor.last_activity_at).getTime()) / 86400000;
      return daysSinceActivity > 30;
    },
  },
  {
    flag: 'CROSS_TENANT_ACCESS',
    label: 'Cross-Tenant Access',
    severity: 'critical',
    description: 'Actor has accessed resources across multiple tenants',
    evaluator: () => false, // Requires cross-tenant audit trail
  },
];

export async function evaluateActorRiskFlags(
  actorId: string,
  workspaceId: string,
  auth?: AuthContext
): Promise<{
  actor_id: string;
  risk_flags: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  flags: Array<{ flag: string; label: string; severity: string; active: boolean; description: string }>;
}> {
  requireAnyPermission(auth, 'identity-ledger:view');
  const actor = await getActorByActorId(actorId, workspaceId);
  if (!actor) throw new Error(`Actor ${actorId} not found`);

  const results = RISK_FLAG_PATTERNS.map(pattern => ({
    ...pattern,
    active: pattern.evaluator(actor),
  }));

  const activeFlags = results.filter(r => r.active);
  const flagNames = activeFlags.map(r => r.flag);

  // Compute derived risk level from active flags
  const severities = activeFlags.map(r => r.severity);
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (severities.includes('critical')) riskLevel = 'critical';
  else if (severities.includes('high')) riskLevel = 'high';
  else if (severities.includes('medium')) riskLevel = 'medium';

  // Persist computed flags back to actor record
  await supabaseAdmin
    .from('identity_actors')
    .update({
      risk_flags: flagNames,
      risk_level: riskLevel,
    })
    .eq('actor_id', actorId)
    .eq('workspace_id', workspaceId);

  return {
    actor_id: actorId,
    risk_flags: flagNames,
    risk_level: riskLevel,
    flags: results.map(r => ({
      flag: r.flag,
      label: r.label,
      severity: r.severity,
      active: r.active,
      description: r.description,
    })),
  };
}

export async function setActorRiskFlags(params: {
  actor_id: string;
  workspace_id: string;
  risk_flags: string[];
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  set_by: string;
  auth?: AuthContext;
}): Promise<IdentityActor | null> {
  requireAnyPermission(params.auth, 'identity-ledger:view');
  const actor = await getActorByActorId(params.actor_id, params.workspace_id);
  if (!actor) return null;

  const update: Partial<IdentityActor> = {
    risk_flags: params.risk_flags,
  };
  if (params.risk_level) update.risk_level = params.risk_level;

  const { data, error } = await supabaseAdmin
    .from('identity_actors')
    .update(update)
    .eq('actor_id', params.actor_id)
    .eq('workspace_id', params.workspace_id)
    .select()
    .single();

  if (error) throw error;

  const now = new Date().toISOString();

  await supabaseAdmin.from('identity_ledger_entries').insert({
    ledger_entry_id: generateOpaqueId('IDL'),
    tenant_id: actor.tenant_id,
    workspace_id: params.workspace_id,
    data_residency: 'auto',
    schema_version: '1.0',
    entry_type: 'actor.risk_flags_updated',
    entry_category: 'authority_change',
    timestamp_utc: now,
    actor_id: params.set_by,
    actor_type: 'human_user',
    source: { source_system: 'identity_ledger', action: 'set_risk_flags' },
    authority_change: {
      risk_flags_previous: actor.risk_flags,
      risk_flags_new: params.risk_flags,
      reason: params.reason || '',
    },
    session_context: {},
    approvals: [],
    linked_authority_snapshot_id: null,
    risk: { risk_level: params.risk_level || actor.risk_level },
    retention: { class: 'EXTENDED' },
  });

  return data;
}

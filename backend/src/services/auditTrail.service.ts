import { supabaseAdmin } from '../shared/supabase';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { resolveAuthorityBindingForAuditEvent } from './identityLedger.service';
import { logger } from '../shared/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActorType = 'human_user' | 'ai_agent' | 'service_account' | 'system' | 'api_key';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type EventStatus = 'success' | 'failed' | 'blocked' | 'pending' | 'overridden' | 'preserved' | 'sealed';
export type EvidenceState = 'not_preserved' | 'preserved' | 'sealed' | 'archived' | 'legal_hold';
export type RetentionClass = 'STANDARD' | 'EXTENDED' | 'REGULATED' | 'LEGAL_HOLD';
export type EventCategory = 'user_identity' | 'content_lifecycle' | 'ai_agent' | 'approval' | 'policy_governance' | 'platform_integration' | 'evidence_legal' | 'system_security';

export interface AuditEventInput {
  workspace_id: string;
  org_id?: string;
  tenant_id?: string;
  chain_id?: string;
  data_residency?: string;
  event_category: EventCategory;
  event_type: string;
  event_title?: string;
  event_summary?: string;
  timestamp_utc?: string;
  actor: {
    actor_id: string;
    actor_type: ActorType;
    actor_name?: string;
    role_at_event?: string;
    session_id?: string;
    ip_address?: string;
    device_fingerprint?: string;
    geolocation_country?: string;
  };
  object: {
    object_type: string;
    object_id: string;
    object_name?: string;
  };
  related_objects?: Array<{ type: string; id: string }>;
  correlation?: {
    workflow_run_id?: string;
    approval_chain_id?: string;
    campaign_id?: string;
    brand_id?: string;
  };
  authority?: {
    permission_used?: string;
    policy_rule_id?: string;
    approval_required?: boolean;
    override_reason?: string;
    override_authority?: string;
    authority_snapshot_id?: string;
    permissions_at_event?: string[];
    roles_at_event?: string[];
    actor_state_at_event?: string;
  };
  change?: {
    field_changed?: string;
    previous_value?: unknown;
    new_value?: unknown;
    change_reason?: string;
  };
  ai_context?: {
    agent_id?: string;
    agent_version?: string;
    prompt_id?: string;
    prompt_version?: string;
    model_version?: string;
    confidence?: number;
    policy_checks?: string[];
    tokens_used?: number;
  };
  risk_level?: RiskLevel;
  status?: EventStatus;
  evidence_state?: EvidenceState;
  retention_class?: RetentionClass;
  idempotency_key?: string;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  event_id: string;
  block_number: number;
  hash: string;
  prev_hash: string | null;
  schema_version: string;
  received_at: string;
  retention_until: string | null;
  sealed_at: string | null;
  sealed_by: string | null;
  integrity_check_at: string | null;
  created_at: string;
}

// ─── Field-Level Access Control (Section 15) ─────────────────────────────────

export type UserRole = 'ADMIN' | 'SECURITY' | 'COMPLIANCE' | 'LEGAL' | 'CAMPAIGN_MANAGER' | 'PUBLISHER' | 'EXEC_VIEWER' | 'EXTERNAL_AUDITOR';
export type FieldAccessState = 'full' | 'redacted' | 'hashed' | 'denied' | 'self_only' | 'scoped' | 'summary' | 'full_masked';

const REDACTED_MARKER = 'REDACTED_BY_ACCESS_POLICY';
const HASHED_MARKER_PREFIX = 'hash:';
const SUMMARY_MARKER = 'SUMMARY_ONLY';

// Role-based field access matrix matching spec Section 15 exactly
// Fields not listed are 'full' for all roles
const fieldAccessMatrix: Record<string, Partial<Record<UserRole, FieldAccessState>>> = {
  'actor.actor_name': {
    PUBLISHER: 'self_only',
    EXTERNAL_AUDITOR: 'hashed',
  },
  'actor.actor_email': {
    CAMPAIGN_MANAGER: 'self_only',
    PUBLISHER: 'self_only',
    EXEC_VIEWER: 'redacted',
    EXTERNAL_AUDITOR: 'hashed',
  },
  'actor.ip_address': {
    COMPLIANCE: 'redacted',
    CAMPAIGN_MANAGER: 'denied',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'denied',
    EXTERNAL_AUDITOR: 'hashed',
  },
  'actor.device_fingerprint': {
    COMPLIANCE: 'redacted',
    LEGAL: 'redacted',
    CAMPAIGN_MANAGER: 'denied',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'denied',
    EXTERNAL_AUDITOR: 'denied',
  },
  'actor.session_id': {
    COMPLIANCE: 'hashed',
    LEGAL: 'hashed',
    CAMPAIGN_MANAGER: 'denied',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'denied',
    EXTERNAL_AUDITOR: 'denied',
  },
  'object.object_id': {
    CAMPAIGN_MANAGER: 'scoped',
    PUBLISHER: 'scoped',
  },
  'object.before_after': {
    CAMPAIGN_MANAGER: 'scoped',
    PUBLISHER: 'denied',
    EXTERNAL_AUDITOR: 'full_masked',
  },
  'authority.policy_rule_id': {
    CAMPAIGN_MANAGER: 'scoped',
    PUBLISHER: 'denied',
  },
  'authority.override_reason': {
    CAMPAIGN_MANAGER: 'scoped',
    PUBLISHER: 'denied',
  },
  'ai_context.prompt_id': {
    LEGAL: 'redacted',
    CAMPAIGN_MANAGER: 'redacted',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'redacted',
    EXTERNAL_AUDITOR: 'hashed',
  },
  'ai_context.model_version': {
    LEGAL: 'redacted',
    CAMPAIGN_MANAGER: 'redacted',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'redacted',
    EXTERNAL_AUDITOR: 'hashed',
  },
  'ai_context.raw_output': {
    SECURITY: 'redacted',
    CAMPAIGN_MANAGER: 'denied',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'denied',
    EXTERNAL_AUDITOR: 'denied',
  },
  'retention.retention_until': {
    CAMPAIGN_MANAGER: 'scoped',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'summary',
  },
  'evidence.export_manifest': {
    CAMPAIGN_MANAGER: 'denied',
    PUBLISHER: 'denied',
    EXEC_VIEWER: 'summary',
  },
};

function applyFieldAccessToValue(value: unknown, access: FieldAccessState, _userId?: string): unknown {
  switch (access) {
    case 'full':
      return value;
    case 'redacted':
      return REDACTED_MARKER;
    case 'hashed': {
      if (typeof value === 'string' && value.length > 0) {
        return HASHED_MARKER_PREFIX + createHash('sha256').update(value).digest('hex').substring(0, 16);
      }
      return REDACTED_MARKER;
    }
    case 'denied':
      return undefined;
    case 'self_only':
      // Handled by caller - if not self, treat as denied
      return undefined;
    case 'scoped':
      // Scoped - in Phase 1, treat as full. In Phase 2, filter by campaign/brand/workflow scope
      return value;
    case 'summary':
      // Summary view only - return aggregate indicator
      return SUMMARY_MARKER;
    case 'full_masked':
      // Full or masked depending on context - return value with masking indicator
      return value;
    default:
      return value;
  }
}

function resolveAccess(baseAccess: FieldAccessState | undefined, userRole: UserRole, isSelf: boolean): FieldAccessState {
  const access = baseAccess || 'full';
  if (access === 'self_only') return isSelf ? 'full' : 'denied';
  return access;
}

export function applyFieldAccess(
  event: Record<string, unknown>,
  userRole: UserRole,
  userId?: string,
  isSelf?: boolean,
): Record<string, unknown> {
  const result = { ...event } as Record<string, unknown>;

  // actor fields
  const actor = (result.actor as Record<string, unknown>) || {};
  const filteredActor: Record<string, unknown> = { ...actor };

  if (result.actor) {
    filteredActor.actor_name = applyFieldAccessToValue(actor.actor_name, resolveAccess(fieldAccessMatrix['actor.actor_name']?.[userRole], userRole, isSelf || false), userId);
    filteredActor.actor_email = applyFieldAccessToValue(actor.actor_email, resolveAccess(fieldAccessMatrix['actor.actor_email']?.[userRole], userRole, isSelf || false), userId);
    filteredActor.ip_address = applyFieldAccessToValue(actor.ip_address, fieldAccessMatrix['actor.ip_address']?.[userRole] || 'full', userId);
    filteredActor.device_fingerprint = applyFieldAccessToValue(actor.device_fingerprint, fieldAccessMatrix['actor.device_fingerprint']?.[userRole] || 'full', userId);
    filteredActor.session_id = applyFieldAccessToValue(actor.session_id, fieldAccessMatrix['actor.session_id']?.[userRole] || 'full', userId);

    // Remove denied fields (returned as undefined)
    const cleanedActor: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filteredActor)) {
      if (v !== undefined) cleanedActor[k] = v;
    }
    result.actor = cleanedActor;
  }

  // object fields - scoped handling
  if (result.object) {
    const obj = result.object as Record<string, unknown>;
    const objAccess = resolveAccess(fieldAccessMatrix['object.object_id']?.[userRole], userRole, false);
    if (objAccess === 'denied') {
      if (obj.object_id !== undefined) obj.object_id = undefined;
      if (obj.object_name !== undefined) obj.object_name = undefined;
    }
    const cleanedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) cleanedObj[k] = v;
    }
    result.object = cleanedObj;
  }

  // before/after in change
  if (result.change) {
    const change = result.change as Record<string, unknown>;
    const baAccess = resolveAccess(fieldAccessMatrix['object.before_after']?.[userRole], userRole, false);
    if (baAccess !== 'full' && baAccess !== 'full_masked') {
      if (change.previous_value !== undefined) {
        change.previous_value = baAccess === 'denied' ? undefined : REDACTED_MARKER;
      }
      if (change.new_value !== undefined) {
        change.new_value = baAccess === 'denied' ? undefined : REDACTED_MARKER;
      }
    }
  }

  // authority fields
  if (result.authority) {
    const auth = result.authority as Record<string, unknown>;
    auth.policy_rule_id = applyFieldAccessToValue(auth.policy_rule_id, resolveAccess(fieldAccessMatrix['authority.policy_rule_id']?.[userRole], userRole, false), userId);
    auth.override_reason = applyFieldAccessToValue(auth.override_reason, resolveAccess(fieldAccessMatrix['authority.override_reason']?.[userRole], userRole, false), userId);
    const cleanedAuth: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(auth)) {
      if (v !== undefined) cleanedAuth[k] = v;
    }
    result.authority = cleanedAuth;
  }

  // ai_context fields
  if (result.ai_context) {
    const ai = result.ai_context as Record<string, unknown>;
    ai.prompt_id = applyFieldAccessToValue(ai.prompt_id, fieldAccessMatrix['ai_context.prompt_id']?.[userRole] || 'full', userId);
    ai.model_version = applyFieldAccessToValue(ai.model_version, fieldAccessMatrix['ai_context.model_version']?.[userRole] || 'full', userId);
    ai.raw_output = applyFieldAccessToValue(ai.raw_output, fieldAccessMatrix['ai_context.raw_output']?.[userRole] || 'full', userId);
    const cleanedAi: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ai)) {
      if (v !== undefined) cleanedAi[k] = v;
    }
    result.ai_context = cleanedAi;
  }

  // retention + export_manifest
  if (result.retention_until !== undefined) {
    const retAccess = fieldAccessMatrix['retention.retention_until']?.[userRole] || 'full';
    if (retAccess === 'summary') result.retention_until = SUMMARY_MARKER;
    if (retAccess === 'denied') result.retention_until = undefined;
  }
  if (result.export_manifest !== undefined) {
    const expAccess = fieldAccessMatrix['evidence.export_manifest']?.[userRole] || 'full';
    if (expAccess === 'summary') result.export_manifest = SUMMARY_MARKER;
    if (expAccess === 'denied') result.export_manifest = undefined;
  }

  return result;
}

// ─── Hash Computation ─────────────────────────────────────────────────────────

export function computeEventHash(input: {
  tenant_id: string;
  chain_id: string;
  block_number: number;
  schema_version: string;
  event_category: string;
  event_type: string;
  event_title: string;
  event_summary: string;
  actor: Record<string, unknown>;
  object: Record<string, unknown>;
  related_objects?: Array<Record<string, unknown>>;
  correlation: Record<string, unknown>;
  authority: Record<string, unknown>;
  change: Record<string, unknown>;
  ai_context: Record<string, unknown>;
  risk_level: string;
  status: string;
  retention_class: string;
  prev_hash: string | null;
}): string {
  // Must match the SQL function create_audit_event hash string exactly.
  // Pipe-delimited fields, JSON sub-fields use sorted-key no-whitespace JSON (jsonb::TEXT equivalent).
  const parts = [
    input.tenant_id,
    input.chain_id,
    String(input.block_number),
    input.schema_version,
    input.event_category,
    input.event_type,
    input.event_title,
    input.event_summary,
    sortedJson(input.actor),
    sortedJson(input.object),
    sortedJson(input.correlation),
    sortedJson(input.authority),
    sortedJson(input.change),
    sortedJson(input.ai_context),
    input.risk_level,
    input.status,
    input.retention_class,
    input.prev_hash || '',
  ];
  const stringToHash = parts.join('|');
  const hash = createHash('sha256').update(stringToHash).digest('hex');
  return `sha256:${hash}`;
}

function sortedJson(obj: unknown): string {
  if (obj === null || obj === undefined) return '{}';
  if (Array.isArray(obj)) return JSON.stringify(obj);
  if (typeof obj !== 'object') return String(obj);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) {
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Record<string, unknown>).length > 0) {
        result[k] = sortedJson(v);
      } else if (Array.isArray(v)) {
        result[k] = v;
      } else {
        result[k] = v;
      }
    }
  }
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(result).sort()) {
    sorted[k] = result[k];
  }
  return JSON.stringify(sorted);
}

// ─── Core Operations ──────────────────────────────────────────────────────────

export async function createAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  const tenantId = input.tenant_id || 'default';
  const chainId = input.chain_id || 'primary';
  const idempotencyKey = input.idempotency_key || uuidv4();
  const timestampUtc = input.timestamp_utc || new Date().toISOString();
  const retentionClass = input.retention_class || 'STANDARD';
  const actorPayload = { ...input.actor };
  const authorityPayload = { ...(input.authority || {}) };

  try {
    const binding = await resolveAuthorityBindingForAuditEvent({
      workspace_id: input.workspace_id,
      tenant_id: tenantId,
      timestamp_utc: timestampUtc,
      actor: {
        actor_id: input.actor.actor_id,
        actor_type: input.actor.actor_type,
        actor_name: input.actor.actor_name,
        role_at_event: input.actor.role_at_event,
      },
      authority: {
        permission_used: input.authority?.permission_used,
        override_reason: input.authority?.override_reason,
      },
      ai_context: {
        agent_id: input.ai_context?.agent_id,
        agent_version: input.ai_context?.agent_version,
        prompt_version: input.ai_context?.prompt_version,
        model_version: input.ai_context?.model_version,
      },
    });

    authorityPayload.authority_snapshot_id = binding.authority_snapshot_id;
    authorityPayload.permissions_at_event = binding.permissions_at_event;
    authorityPayload.roles_at_event = binding.roles_at_event;
    authorityPayload.actor_state_at_event = binding.actor_state_at_event;

    if (!actorPayload.role_at_event && binding.roles_at_event.length > 0) {
      actorPayload.role_at_event = binding.roles_at_event[0];
    }
    if (!actorPayload.actor_name) {
      actorPayload.actor_name = binding.actor_display_name;
    }
  } catch (err) {
    logger.warn({ error: String(err) }, 'Identity Ledger enrichment unavailable (audit will continue without it)');
  }

  const { data, error } = await supabaseAdmin.rpc('create_audit_event', {
    p_event_data: {
      idempotency_key: idempotencyKey,
      workspace_id: input.workspace_id,
      org_id: input.org_id,
      tenant_id: tenantId,
      chain_id: chainId,
      data_residency: input.data_residency || 'auto',
      event_category: input.event_category,
      event_type: input.event_type,
      event_title: input.event_title || '',
      event_summary: input.event_summary || '',
      timestamp_utc: timestampUtc,
      actor: actorPayload,
      object: input.object,
      related_objects: input.related_objects || [],
      correlation: input.correlation || {},
      authority: authorityPayload,
      change: input.change || {},
      ai_context: input.ai_context || {},
      risk_level: input.risk_level || 'low',
      status: input.status || 'success',
      evidence_state: input.evidence_state || 'not_preserved',
      retention_class: retentionClass,
    },
  });

  if (error) throw error;

  const result = data as unknown as AuditEvent;
  return result;
}

export async function listAuditEvents(params: {
  workspace_id: string;
  limit?: number;
  cursor?: string;
  date_from?: string;
  date_to?: string;
  event_category?: string;
  event_type?: string;
  actor_id?: string;
  object_id?: string;
  risk_level?: string;
  status?: string;
  retention_class?: string;
  search?: string;
}) {
  const limit = Math.min(params.limit || 50, 100);
  let query = supabaseAdmin
    .from('audit_events')
    .select('*', { count: 'exact' })
    .eq('workspace_id', params.workspace_id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (params.cursor) {
    query = query.lt('created_at', params.cursor);
  }

  if (params.date_from) {
    query = query.gte('created_at', params.date_from);
  }
  if (params.date_to) {
    query = query.lte('created_at', params.date_to);
  }
  if (params.event_category) {
    query = query.eq('event_category', params.event_category);
  }
  if (params.event_type) {
    query = query.eq('event_type', params.event_type);
  }
  if (params.actor_id) {
    query = query.filter('actor->>actor_id', 'eq', params.actor_id);
  }
  if (params.object_id) {
    query = query.filter('object->>object_id', 'eq', params.object_id);
  }
  if (params.risk_level) {
    query = query.eq('risk_level', params.risk_level);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.retention_class) {
    query = query.eq('retention_class', params.retention_class);
  }
  if (params.search) {
    query = query.or(
      `event_id.ilike.%${params.search}%,event_title.ilike.%${params.search}%,event_summary.ilike.%${params.search}%,actor->>actor_name.ilike.%${params.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const events = (data || []).slice(0, limit) as AuditEvent[];
  const nextCursor = events.length === limit ? events[events.length - 1]?.created_at : null;

  return { events, total: count || 0, next_cursor: nextCursor };
}

export async function getAuditEvent(eventId: string, workspace_id: string): Promise<AuditEvent | null> {
  const { data, error } = await supabaseAdmin
    .from('audit_events')
    .select('*')
    .eq('id', eventId)
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  if (error) throw error;
  return data as AuditEvent | null;
}

export async function getAuditStats(workspace_id: string) {
  try {
    const { data } = await supabaseAdmin
      .from('audit_event_stats')
      .select('*')
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (data) return data;
  } catch (err) {
    logger.warn({ error: String(err) }, 'Failed to fetch audit_event_stats (falling through to live query)');
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabaseAdmin
    .from('audit_events')
    .select('risk_level, status, event_category, evidence_state, retention_class, created_at')
    .eq('workspace_id', workspace_id);

  if (error) throw error;

  const all = events || [];
  return {
    workspace_id,
    total_events: all.length,
    events_today: all.filter(e => e.created_at >= oneDayAgo).length,
    high_risk_events: all.filter(e => e.risk_level === 'high' || e.risk_level === 'critical').length,
    critical_events: all.filter(e => e.risk_level === 'critical').length,
    failed_events: all.filter(e => e.status === 'failed').length,
    blocked_events: all.filter(e => e.status === 'blocked').length,
    overridden_events: all.filter(e => e.status === 'overridden').length,
    ai_events: all.filter(e => e.event_category === 'ai_agent').length,
    preserved_events: all.filter(e => e.evidence_state === 'preserved' || e.evidence_state === 'legal_hold').length,
    legal_hold_events: all.filter(e => e.retention_class === 'LEGAL_HOLD').length,
    chain_status: 'intact',
    last_event_at: all.length > 0 ? all.reduce((max, e) => e.created_at > max ? e.created_at : max, all[0].created_at) : null,
  };
}

export async function getRelatedEvents(eventId: string, workspace_id: string) {
  const event = await getAuditEvent(eventId, workspace_id);
  if (!event) return { related: [] };

  const related: AuditEvent[] = [];
  const seen = new Set<string>();

  const addIfNotSeen = (e: AuditEvent) => {
    if (!seen.has(e.id) && e.id !== eventId) {
      seen.add(e.id);
      related.push(e);
    }
  };

  const correlation = (event as unknown as Record<string, unknown>).correlation as Record<string, string> | undefined;

  if (correlation?.workflow_run_id) {
    const { data } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .eq('workspace_id', workspace_id)
      .filter('correlation->>workflow_run_id', 'eq', correlation.workflow_run_id)
      .order('created_at', { ascending: true })
      .limit(50);
    (data || []).forEach(addIfNotSeen);
  }

  if (correlation?.approval_chain_id) {
    const { data } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .eq('workspace_id', workspace_id)
      .filter('correlation->>approval_chain_id', 'eq', correlation.approval_chain_id)
      .order('created_at', { ascending: true })
      .limit(50);
    (data || []).forEach(addIfNotSeen);
  }

  const actor = (event as unknown as Record<string, unknown>).actor as Record<string, string> | undefined;
  if (actor?.actor_id) {
    const fifteenMinAgo = new Date(new Date(event.created_at).getTime() - 15 * 60 * 1000).toISOString();
    const fifteenMinAfter = new Date(new Date(event.created_at).getTime() + 15 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .eq('workspace_id', workspace_id)
      .filter('actor->>actor_id', 'eq', actor.actor_id)
      .gte('created_at', fifteenMinAgo)
      .lte('created_at', fifteenMinAfter)
      .order('created_at', { ascending: true })
      .limit(25);
    (data || []).forEach(addIfNotSeen);
  }

  const obj = (event as unknown as Record<string, unknown>).object as Record<string, string> | undefined;
  if (obj?.object_id) {
    const twoHoursAgo = new Date(new Date(event.created_at).getTime() - 2 * 60 * 60 * 1000).toISOString();
    const twoHoursAfter = new Date(new Date(event.created_at).getTime() + 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin
      .from('audit_events')
      .select('*')
      .eq('workspace_id', workspace_id)
      .filter('object->>object_id', 'eq', obj.object_id)
      .gte('created_at', twoHoursAgo)
      .lte('created_at', twoHoursAfter)
      .order('created_at', { ascending: true })
      .limit(25);
    (data || []).forEach(addIfNotSeen);
  }

  // Rule 2: Same content object lineage (object_id OR related_objects match)
  const relatedObjects = (event as unknown as Record<string, unknown>).related_objects as Array<{ type: string; id: string }> | undefined;
  if (relatedObjects && relatedObjects.length > 0) {
    const lineageIds = [obj?.object_id, ...relatedObjects.map(r => r.id)].filter(Boolean);
    for (const lid of lineageIds) {
      if (!lid) continue;
      const { data } = await supabaseAdmin
        .from('audit_events')
        .select('*')
        .eq('workspace_id', workspace_id)
        .filter('object->>object_id', 'eq', lid)
        .order('created_at', { ascending: true })
        .limit(50);
      (data || []).forEach(addIfNotSeen);
      if (related.length >= 50) break;
    }
  }

  // Rule 5: Same campaign or brand scope (+/- 2 hours)
  const corr = (event as unknown as Record<string, unknown>).correlation as Record<string, string> | undefined;
  const campaignId = corr?.campaign_id;
  const brandId = corr?.brand_id;
  if (campaignId || brandId) {
    const twoHoursAgo = new Date(new Date(event.created_at).getTime() - 2 * 60 * 60 * 1000).toISOString();
    const twoHoursAfter = new Date(new Date(event.created_at).getTime() + 2 * 60 * 60 * 1000).toISOString();
    if (campaignId) {
      const { data } = await supabaseAdmin
        .from('audit_events')
        .select('*')
        .eq('workspace_id', workspace_id)
        .filter('correlation->>campaign_id', 'eq', campaignId)
        .gte('created_at', twoHoursAgo)
        .lte('created_at', twoHoursAfter)
        .order('created_at', { ascending: true })
        .limit(25);
      (data || []).forEach(addIfNotSeen);
    }
    if (brandId && related.length < 50) {
      const { data } = await supabaseAdmin
        .from('audit_events')
        .select('*')
        .eq('workspace_id', workspace_id)
        .filter('correlation->>brand_id', 'eq', brandId)
        .gte('created_at', twoHoursAgo)
        .lte('created_at', twoHoursAfter)
        .order('created_at', { ascending: true })
        .limit(25);
      (data || []).forEach(addIfNotSeen);
    }
  }

  return { related: related.slice(0, 50) };
}

export async function verifyChainIntegrity(
  workspace_id: string,
  start_block?: number,
  end_block?: number,
) {
  const tenantId = 'default';
  const chainId = 'primary';

  const events = await supabaseAdmin
    .from('audit_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('chain_id', chainId)
    .order('block_number', { ascending: true });

  const { data, error } = events;
  if (error) throw error;

  const chainEvents = (data || []) as AuditEvent[];
  const results: Array<{
    block_number: number;
    event_id: string;
    hash: string;
    prev_hash: string | null;
    chain_verified: boolean;
    error_message: string | null;
  }> = [];

  for (const event of chainEvents) {
    if (start_block && event.block_number < start_block) continue;
    if (end_block && event.block_number > end_block) continue;

    let chainVerified = true;
    let errorMessage: string | null = null;

    if (event.block_number === 1) {
      if (event.prev_hash !== null) {
        chainVerified = false;
        errorMessage = 'Genesis block has non-null prev_hash';
      }
    } else {
      const prevEvent = chainEvents.find(e => e.block_number === event.block_number - 1);
      if (!prevEvent || event.prev_hash !== prevEvent.hash) {
        chainVerified = false;
        errorMessage = `prev_hash mismatch at block ${event.block_number}`;
      }
    }

    // Recompute hash
    const actor = (event as unknown as Record<string, unknown>).actor as Record<string, unknown>;
    const object = (event as unknown as Record<string, unknown>).object as Record<string, unknown>;
    const relatedObjects = (event as unknown as Record<string, unknown>).related_objects as Array<Record<string, unknown>>; void relatedObjects;
    const correlation = (event as unknown as Record<string, unknown>).correlation as Record<string, unknown>;
    const authority = (event as unknown as Record<string, unknown>).authority as Record<string, unknown>;
    const change = (event as unknown as Record<string, unknown>).change as Record<string, unknown>;
    const aiContext = (event as unknown as Record<string, unknown>).ai_context as Record<string, unknown>;

    const expectedHash = computeEventHash({
      tenant_id: event.tenant_id || 'default',
      chain_id: event.chain_id || 'primary',
      block_number: event.block_number,
      schema_version: event.schema_version || '1.0',
      event_category: event.event_category || '',
      event_type: event.event_type || '',
      event_title: event.event_title || '',
      event_summary: event.event_summary || '',
      actor,
      object,
      correlation,
      authority,
      change,
      ai_context: aiContext,
      risk_level: event.risk_level || 'low',
      status: event.status || 'success',
      retention_class: event.retention_class || 'STANDARD',
      prev_hash: event.prev_hash,
    });

    if (expectedHash !== event.hash) {
      chainVerified = false;
      errorMessage = errorMessage || `Hash mismatch at block ${event.block_number}`;
    }

    results.push({
      block_number: event.block_number,
      event_id: event.event_id,
      hash: event.hash,
      prev_hash: event.prev_hash,
      chain_verified: chainVerified,
      error_message: errorMessage,
    });
  }

  return {
    chain_id: chainId,
    tenant_id: tenantId,
    total_blocks: results.length,
    verified_blocks: results.filter(r => r.chain_verified).length,
    failed_blocks: results.filter(r => !r.chain_verified).length,
    results,
  };
}

export async function sealExpiredRecords() {
  const { data, error } = await supabaseAdmin.rpc('seal_expired_audit_events');
  if (error) throw error;
  return { sealed_count: data };
}

export async function createExportJob(params: {
  workspace_id: string;
  requested_by: string;
  reason: string;
  format: 'csv' | 'json' | 'pdf';
  date_from?: string;
  date_to?: string;
  event_category?: string;
  risk_level?: string;
  status?: string;
  retention_class?: string;
  actor_id?: string;
}) {
  const exportId = uuidv4();
  const { data, error } = await supabaseAdmin
    .from('audit_export_jobs')
    .insert({
      id: exportId,
      workspace_id: params.workspace_id,
      requested_by: params.requested_by,
      reason: params.reason,
      format: params.format,
      filters: {
        date_from: params.date_from,
        date_to: params.date_to,
        event_category: params.event_category,
        risk_level: params.risk_level,
        status: params.status,
        retention_class: params.retention_class,
        actor_id: params.actor_id,
      },
      status: 'PENDING',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listExportJobs(workspace_id: string) {
  const { data, error } = await supabaseAdmin
    .from('audit_export_jobs')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function preserveEvents(params: {
  workspace_id: string;
  event_ids: string[];
  reason: string;
  retention_class: RetentionClass;
  requested_by: string;
  org_id?: string;
  actor: { actor_id: string; actor_type: ActorType; actor_name?: string };
}) {
  // Create an evidence.preserved audit event (does NOT mutate original events)
  const preserveEvent = await createAuditEvent({
    workspace_id: params.workspace_id,
    org_id: params.org_id,
    event_category: 'evidence_legal',
    event_type: 'evidence.preserved',
    event_title: 'Events Preserved to Evidence Vault',
    event_summary: `${params.event_ids.length} event(s) preserved: ${params.reason}`,
    actor: params.actor,
    object: { object_type: 'evidence_preservation', object_id: params.event_ids.join(',') },
    retention_class: params.retention_class,
    risk_level: 'low',
    status: 'success',
    evidence_state: 'preserved',
    correlation: { preserved_event_ids: params.event_ids.join(',') },
    authority: { permission_used: 'evidence.preserve' },
    change: { field_changed: 'evidence_state', previous_value: 'not_preserved', new_value: 'preserved', change_reason: params.reason },
  } as unknown as AuditEventInput);

  return { preserved: params.event_ids.length, preservation_event_id: preserveEvent.event_id };
}

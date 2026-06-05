import * as crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';

export type ConstraintDomain = 'output' | 'behavior' | 'knowledge' | 'tool' | 'channel' | 'brand';
export type ConstraintSeverity = 'block' | 'escalate' | 'warn';

export interface ConstraintRule {
  id: string;
  domain: ConstraintDomain;
  severity: ConstraintSeverity;
  rule: string;
  rationale: string;
  applicableTiers: string[];
  enabled: boolean;
}

export interface CompiledShadow {
  risk_tier: string;
  rules: ConstraintRule[];
}

export interface ConstraintShadowRow {
  id: string;
  prompt_id: string | null;
  version_id: string;
  workspace_id: string | null;
  risk_tier: string;
  compiled_shadow: CompiledShadow;
  shadow_hash: string;
  status: 'compiled' | 'locked';
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompileResult {
  id: string;
  promptVersionId: string;
  rules: ConstraintRule[];
  compiledAt: string;
  shadowHash: string;
  isLocked: boolean;
  status: 'compiled' | 'locked';
}

const TIER_CONSTRAINTS: Record<string, ConstraintRule[]> = {
  tier_1_low: [
    { id: 'out-1', domain: 'output', severity: 'warn', rule: 'Output must follow specified format', rationale: 'Basic output consistency', applicableTiers: ['tier_1_low'], enabled: true },
  ],
  tier_2_medium: [
    { id: 'out-1', domain: 'output', severity: 'warn', rule: 'Output must follow specified format', rationale: 'Output consistency', applicableTiers: ['tier_1_low', 'tier_2_medium'], enabled: true },
    { id: 'beh-1', domain: 'behavior', severity: 'warn', rule: 'Agent must not make unsupported claims', rationale: 'Brand safety', applicableTiers: ['tier_2_medium', 'tier_3_high', 'tier_4_critical'], enabled: true },
    { id: 'kno-1', domain: 'knowledge', severity: 'warn', rule: 'Claims must be grounded in approved knowledge sources', rationale: 'Factual accuracy', applicableTiers: ['tier_2_medium'], enabled: true },
  ],
  tier_3_high: [
    { id: 'out-1', domain: 'output', severity: 'warn', rule: 'Output must follow specified format', rationale: 'Output consistency', applicableTiers: ['tier_1_low', 'tier_2_medium', 'tier_3_high'], enabled: true },
    { id: 'beh-1', domain: 'behavior', severity: 'warn', rule: 'Agent must not make unsupported claims', rationale: 'Brand safety', applicableTiers: ['tier_2_medium', 'tier_3_high', 'tier_4_critical'], enabled: true },
    { id: 'kno-2', domain: 'knowledge', severity: 'block', rule: 'All material claims must trace to an approved source or be flagged for human review', rationale: 'Legal/compliance requirement', applicableTiers: ['tier_3_high'], enabled: true },
    { id: 'beh-2', domain: 'behavior', severity: 'block', rule: 'Tool calls must be explicitly authorized for the current scope', rationale: 'Security boundary', applicableTiers: ['tier_3_high', 'tier_4_critical'], enabled: true },
  ],
  tier_4_critical: [
    { id: 'out-1', domain: 'output', severity: 'block', rule: 'Output must follow specified format; deviations require human approval', rationale: 'Regulatory compliance', applicableTiers: ['tier_4_critical'], enabled: true },
    { id: 'beh-1', domain: 'behavior', severity: 'block', rule: 'Agent must not make unsupported claims', rationale: 'Legal liability prevention', applicableTiers: ['tier_2_medium', 'tier_3_high', 'tier_4_critical'], enabled: true },
    { id: 'kno-2', domain: 'knowledge', severity: 'block', rule: 'All material claims must trace to an approved source or be flagged for human review', rationale: 'Regulatory evidence requirement', applicableTiers: ['tier_3_high', 'tier_4_critical'], enabled: true },
    { id: 'beh-2', domain: 'behavior', severity: 'block', rule: 'Tool calls must be explicitly authorized for the current scope', rationale: 'Security boundary', applicableTiers: ['tier_3_high', 'tier_4_critical'], enabled: true },
    { id: 'cha-1', domain: 'channel', severity: 'block', rule: 'Channel-specific constraints must be respected (character limits, format rules, disclosure requirements)', rationale: 'Platform compliance', applicableTiers: ['tier_4_critical'], enabled: true },
    { id: 'bra-1', domain: 'brand', severity: 'block', rule: 'Three-Key approval required for any output with legal, regulatory, or financial impact', rationale: 'Enterprise governance', applicableTiers: ['tier_4_critical'], enabled: true },
  ],
};

// Deterministic, key-sorted serialization so the shadow_hash is stable across
// JS objects and Postgres jsonb (which does not preserve key order). This is
// what makes hash verification reliable on a real database.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

function hashShadow(compiled: CompiledShadow): string {
  return crypto.createHash('sha256').update(canonicalize(compiled)).digest('hex');
}

export class ConstraintShadowService {
  /** Most-recent shadow row for a version (any status). */
  private static async latest(promptVersionId: string): Promise<ConstraintShadowRow | null> {
    const { data } = await supabaseAdmin
      .from('prompt_constraint_shadows')
      .select('*')
      .eq('version_id', promptVersionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ConstraintShadowRow) || null;
  }

  static async compile(
    promptVersionId: string,
    riskTier: string,
    workspaceId?: string,
    actorId?: string,
    promptId?: string,
  ): Promise<CompileResult> {
    const rules = TIER_CONSTRAINTS[riskTier] || TIER_CONSTRAINTS.tier_1_low;
    const compiledShadow: CompiledShadow = { risk_tier: riskTier, rules };
    const shadowHash = hashShadow(compiledShadow);
    const compiledAt = new Date().toISOString();

    const { data: inserted } = await supabaseAdmin
      .from('prompt_constraint_shadows')
      .insert({
        prompt_id: promptId ?? null,
        version_id: promptVersionId,
        workspace_id: workspaceId ?? null,
        risk_tier: riskTier,
        compiled_shadow: compiledShadow,
        shadow_hash: shadowHash,
        status: 'compiled',
      })
      .select()
      .single();

    await PromptAuditService.record({
      event_type: 'prompt.constraint_shadow.compiled',
      workspace_id: workspaceId,
      version_id: promptVersionId,
      actor_id: actorId,
      reason: `Constraint shadow compiled for risk tier ${riskTier} with ${rules.length} rules`,
      after_state: { rule_count: rules.length, domains: [...new Set(rules.map((r) => r.domain))], shadow_hash: shadowHash },
    });

    return {
      id: inserted?.id || `CS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      promptVersionId,
      rules,
      compiledAt,
      shadowHash,
      isLocked: false,
      status: 'compiled',
    };
  }

  static async lock(promptVersionId: string, workspaceId?: string, actorId?: string): Promise<boolean> {
    const existing = await this.latest(promptVersionId);

    if (!existing) {
      await PromptAuditService.record({
        event_type: 'prompt.constraint_shadow.lock_denied',
        workspace_id: workspaceId,
        version_id: promptVersionId,
        actor_id: actorId,
        reason: 'Cannot lock constraint shadow: no compiled shadow found',
        after_state: { blocked: true, detail: 'missing_shadow' },
      });
      return false;
    }

    if (existing.status === 'locked') {
      return true;
    }

    await supabaseAdmin
      .from('prompt_constraint_shadows')
      .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: actorId ?? null })
      .eq('id', existing.id);

    await PromptAuditService.record({
      event_type: 'prompt.constraint_shadow.locked',
      workspace_id: workspaceId,
      version_id: promptVersionId,
      actor_id: actorId,
      reason: `Constraint shadow ${existing.id} locked for commissioning`,
      after_state: { shadow_id: existing.id, shadow_hash: existing.shadow_hash },
    });

    return true;
  }

  static async isLocked(promptVersionId: string): Promise<boolean> {
    const row = await this.latest(promptVersionId);
    return row?.status === 'locked';
  }

  static async getCurrentHash(promptVersionId: string): Promise<string | null> {
    const row = await this.latest(promptVersionId);
    return row?.shadow_hash || null;
  }

  /** The active LOCKED shadow row for a version, or null if none is locked. */
  static async getLockedShadow(promptVersionId: string): Promise<ConstraintShadowRow | null> {
    const { data } = await supabaseAdmin
      .from('prompt_constraint_shadows')
      .select('*')
      .eq('version_id', promptVersionId)
      .eq('status', 'locked')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ConstraintShadowRow) || null;
  }

  /** True when the row's sealed shadow_hash matches the hash of its compiled_shadow (tamper check). */
  static verifyIntegrity(row: { compiled_shadow?: CompiledShadow | null; shadow_hash?: string | null } | null): boolean {
    if (!row || !row.compiled_shadow || !row.shadow_hash) return false;
    return hashShadow(row.compiled_shadow) === row.shadow_hash;
  }

  /** True when the locked shadow's rules differ from the supplied current rules. */
  static async isStale(promptVersionId: string, newRules: ConstraintRule[]): Promise<boolean> {
    const locked = await this.getLockedShadow(promptVersionId);
    if (!locked) return true;
    const oldRules = locked.compiled_shadow?.rules ?? [];
    return canonicalize(oldRules) !== canonicalize(newRules);
  }

  static getRulesForTier(riskTier: string): ConstraintRule[] {
    return TIER_CONSTRAINTS[riskTier] || TIER_CONSTRAINTS.tier_1_low;
  }

  /**
   * Canonical hash of a compiled shadow — the SAME function used at compile time
   * and by verifyIntegrity. Exposed so tests (and any caller) can construct a
   * hash-valid locked shadow without duplicating the hashing logic.
   */
  static computeShadowHash(compiled: CompiledShadow): string {
    return hashShadow(compiled);
  }

  static getBlockingRules(riskTier: string): ConstraintRule[] {
    return (TIER_CONSTRAINTS[riskTier] || []).filter((r) => r.severity === 'block' && r.enabled);
  }

  static getApplicableRules(riskTier: string, domain?: ConstraintDomain): ConstraintRule[] {
    const rules = TIER_CONSTRAINTS[riskTier] || TIER_CONSTRAINTS.tier_1_low;
    if (domain) return rules.filter((r) => r.domain === domain);
    return rules;
  }
}

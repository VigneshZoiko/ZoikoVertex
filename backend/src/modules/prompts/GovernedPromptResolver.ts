import * as crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';
import { ConstraintShadowService } from './ConstraintShadowService';
import { RuntimeVariableGovernanceService } from './RuntimeVariableGovernanceService';
import { computePDIBand, deriveAutonomyLevel, AutonomyLevel, PDIBand } from './pdiBands';
import { lockStore as autonomyLockStore } from '../../domains/agents/autonomyController';

// Prompt Defensibility Index floor for production execution (spec §17: below 70
// = Sandbox Grade, not eligible for production). Only enforced when a PDI value
// has actually been computed for the version ("if available").
export const GOVERNED_PDI_MIN = 70;

export type GovernedResolveCode =
  | 'OK'
  | 'NO_GOVERNED_PROMPT'
  | 'NOT_PRODUCTION_READY'
  | 'NO_CURRENT_VERSION'
  | 'DEPLOYMENT_MISSING'
  | 'CONSTRAINT_SHADOW_MISSING'
  | 'CONSTRAINT_SHADOW_UNLOCKED'
  | 'CONSTRAINT_SHADOW_TAMPERED'
  | 'CONSTRAINT_SHADOW_STALE'
  | 'RECEIPT_MISSING'
  | 'PDI_BELOW_THRESHOLD'
  | 'RUNTIME_GOVERNANCE_BLOCKED'
  // Launch-hardening (Phase 6.5): platform kill switch enforcement.
  // Fails closed at the very first resolver gate. Tenant isolation is
  // preserved: GLOBAL is platform-wide; ORG is the workspace's org; WORKSPACE
  // matches the current workspaceId only.
  | 'GLOBAL_FROZEN'
  | 'ORG_FROZEN'
  | 'WORKSPACE_FROZEN';

export interface ActiveFreeze {
  code: 'GLOBAL_FROZEN' | 'ORG_FROZEN' | 'WORKSPACE_FROZEN';
  lock_id: string;
  level: string;
  scope: string;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface GovernedEvidence {
  prompt_id: string;
  version_id: string;
  receipt_hash: string;
  constraint_shadow_hash: string;
  variables_hash: string;
  runtime_governance_result: string;
  risk_tier: string;
  pdi_score: number | null;
  pdi_band: PDIBand | null;
  autonomy_level: AutonomyLevel | null;
}

export interface GovernedResolution {
  ok: boolean;
  code: GovernedResolveCode;
  reason?: string;
  governedPrompt?: string;
  evidence?: GovernedEvidence;
}

export interface ResolveInput {
  useCaseKey: string;
  workspaceId: string;
  variables?: Record<string, unknown>;
  executionId?: string;
}

// Stable, key-sorted hash so the variables hash is deterministic.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

export function hashObject(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalize(value)).digest('hex');
}

const PRODUCTION_READY = ['production_active', 'commissioned'];

// ─── Platform freeze detection (Phase 6.5 launch hardening) ─────────────────
//
// ZoikoVertex AGENTS.md §12 defines a 4-level kill switch:
//   L1 = single-agent pause
//   L2 = workspace freeze (all agents in a workspace)
//   L3 = org-wide lock (all workspaces in an org)
//   L4 = global kill (every workspace)
//
// Prompt governance MUST fail closed at the first matching freeze level before
// any model call. Tenant isolation is preserved because:
//   - GLOBAL_FROZEN matches ANY active L4 or scope='GLOBAL' lock (platform-wide).
//   - ORG_FROZEN matches ANY active L3 or scope='ORG' lock (a workspace is in
//     exactly one org; this workspace's org is implicitly locked).
//   - WORKSPACE_FROZEN matches L2 / scope='WORKSPACE' only when the lock's
//     workspace_id equals the resolver's workspaceId.
//
// The implementation is in-process (matches existing lockStore usage) and is
// read-only. A DB-backed implementation can be added later without changing
// this contract — the function shape is stable.
function detectActiveFreeze(workspaceId: string): ActiveFreeze | null {
  type LockLike = {
    id: string;
    level: string;
    scope: string;
    reason: string;
    created_by: string;
    created_at: string;
    workspace_id: string;
  };
  const store = autonomyLockStore as unknown as { values(): IterableIterator<LockLike> };

  // GLOBAL > ORG > WORKSPACE precedence: report the most severe active freeze.
  let workspaceFreeze: ActiveFreeze | null = null;
  for (const lock of store.values()) {
    if (lock.level === 'L4' || lock.scope === 'GLOBAL') {
      return {
        code: 'GLOBAL_FROZEN',
        lock_id: lock.id,
        level: lock.level,
        scope: lock.scope,
        reason: lock.reason,
        created_by: lock.created_by,
        created_at: lock.created_at,
      };
    }
    if (lock.level === 'L3' || lock.scope === 'ORG') {
      return {
        code: 'ORG_FROZEN',
        lock_id: lock.id,
        level: lock.level,
        scope: lock.scope,
        reason: lock.reason,
        created_by: lock.created_by,
        created_at: lock.created_at,
      };
    }
    if (
      (lock.level === 'L2' || lock.scope === 'WORKSPACE') &&
      lock.workspace_id === workspaceId &&
      !workspaceFreeze
    ) {
      workspaceFreeze = {
        code: 'WORKSPACE_FROZEN',
        lock_id: lock.id,
        level: lock.level,
        scope: lock.scope,
        reason: lock.reason,
        created_by: lock.created_by,
        created_at: lock.created_at,
      };
    }
  }
  return workspaceFreeze;
}

/**
 * Resolves THE governed prompt for a use-case and enforces every Phase 1–3
 * governance gate BEFORE a model call. Fails closed at the first missing or
 * invalid artifact. Never returns governedPrompt unless every gate passed.
 */
export class GovernedPromptResolver {
  static async resolve(input: ResolveInput): Promise<GovernedResolution> {
    const { useCaseKey, workspaceId, variables = {}, executionId } = input;

    const fail = async (code: GovernedResolveCode, reason: string, ctx?: Record<string, unknown>): Promise<GovernedResolution> => {
      await PromptAuditService.record({
        event_type: 'prompt.governed_execution.blocked',
        workspace_id: workspaceId,
        reason: `Governed execution blocked for '${useCaseKey}': ${reason}`,
        after_state: { use_case_key: useCaseKey, code, ...(ctx || {}) },
      }).catch(() => undefined);
      return { ok: false, code, reason };
    };

    // 0. Platform freeze gate (Phase 6.5 launch hardening). Runs before any DB
    // read so a frozen workspace is rejected with zero information leakage.
    const freeze = detectActiveFreeze(workspaceId);
    if (freeze) {
      // Specific audit event so SecOps can alert on freeze blocks independently
      // of generic governed_execution blocks.
      await PromptAuditService.record({
        event_type: 'prompt.freeze.blocked',
        workspace_id: workspaceId,
        reason: `Governed execution blocked: platform freeze ${freeze.code} (lock ${freeze.lock_id}, level=${freeze.level}, scope=${freeze.scope})`,
        after_state: {
          use_case_key: useCaseKey,
          freeze_code: freeze.code,
          lock_id: freeze.lock_id,
          lock_level: freeze.level,
          lock_scope: freeze.scope,
          lock_reason: freeze.reason,
          lock_created_by: freeze.created_by,
          lock_created_at: freeze.created_at,
        },
      }).catch(() => undefined);
      return {
        ok: false,
        code: freeze.code,
        reason: `Platform freeze: ${freeze.code} (lock ${freeze.lock_id} — ${freeze.reason})`,
      };
    }

    // 1. Resolve the prompt by (workspace, use_case_key). Prefer ACTIVE, then COMMISSIONED.
    const { data: promptsData } = await supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('use_case_key', useCaseKey);
    const candidates = (promptsData as any[]) || [];
    if (candidates.length === 0) {
      return fail('NO_GOVERNED_PROMPT', `No governed prompt is registered for use case '${useCaseKey}'`);
    }
    const prompt =
      candidates.find((p) => p.status === 'production_active') ||
      candidates.find((p) => p.status === 'commissioned') ||
      candidates[0];

    if (!PRODUCTION_READY.includes(prompt.status)) {
      return fail('NOT_PRODUCTION_READY', `Prompt status '${prompt.status}' is not production-ready (requires production_active or commissioned)`, { prompt_id: prompt.id });
    }

    const versionId: string | undefined = prompt.current_version_id;
    if (!versionId) {
      return fail('NO_CURRENT_VERSION', 'Prompt has no current version', { prompt_id: prompt.id });
    }

    const { data: version } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, body, prompt_id')
      .eq('id', versionId)
      .maybeSingle();
    if (!version) {
      return fail('NO_CURRENT_VERSION', `Current version ${versionId} not found`, { prompt_id: prompt.id });
    }
    const riskTier: string = prompt.risk_tier || 'tier_2_medium';

    // 2. Deployment state — a production-ready prompt must have a deployment record.
    const { data: deployments } = await supabaseAdmin
      .from('prompt_deployments')
      .select('id, environment')
      .eq('prompt_version_id', versionId);
    if (!deployments || deployments.length === 0) {
      return fail('DEPLOYMENT_MISSING', 'No deployment record for the current version', { prompt_id: prompt.id, version_id: versionId });
    }

    // 3. Locked Constraint Shadow — must exist, be locked, hash-intact, and current.
    const shadowHash = await ConstraintShadowService.getCurrentHash(versionId);
    if (!shadowHash) return fail('CONSTRAINT_SHADOW_MISSING', 'Constraint Shadow not compiled', { version_id: versionId });
    const lockedShadow = await ConstraintShadowService.getLockedShadow(versionId);
    if (!lockedShadow) return fail('CONSTRAINT_SHADOW_UNLOCKED', 'Constraint Shadow is not locked', { version_id: versionId });
    if (!ConstraintShadowService.verifyIntegrity(lockedShadow)) {
      return fail('CONSTRAINT_SHADOW_TAMPERED', 'Constraint Shadow hash does not match sealed content', { version_id: versionId });
    }
    if (await ConstraintShadowService.isStale(versionId, ConstraintShadowService.getRulesForTier(riskTier))) {
      return fail('CONSTRAINT_SHADOW_STALE', 'Constraint Shadow is stale (rules changed since lock)', { version_id: versionId });
    }
    const constraintShadowHash = lockedShadow.shadow_hash;

    // 4. Governance receipt — must exist for the version.
    const { data: receipts } = await supabaseAdmin
      .from('prompt_evidence_links')
      .select('evidence_hash, created_at')
      .eq('prompt_version_id', versionId)
      .eq('event_type', 'prompt.governance_receipt.generated')
      .order('created_at', { ascending: false })
      .limit(1);
    if (!receipts || receipts.length === 0) {
      return fail('RECEIPT_MISSING', 'No governance receipt for the current version', { version_id: versionId });
    }
    const receiptHash = (receipts[0] as any).evidence_hash || '';

    // 5. PDI / evaluation threshold — only enforced when a PDI score exists.
    const { data: pdiRows } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('after_state')
      .eq('version_id', versionId)
      .eq('event_type', 'prompt.defensibility_index.computed')
      .order('created_at', { ascending: false })
      .limit(1);
    const pdiScore: number | null = (pdiRows?.[0]?.after_state as any)?.pdi_score ?? null;
    let pdiBand: PDIBand | null = null;
    let autonomyLevel: AutonomyLevel | null = null;
    if (pdiScore !== null) {
      pdiBand = computePDIBand(pdiScore);
      autonomyLevel = deriveAutonomyLevel(pdiBand);
      if (pdiBand === 'WEAK') {
        return fail('PDI_BELOW_THRESHOLD', `PDI band is WEAK (score ${pdiScore}, < 70). Runtime governed execution blocked.`, { version_id: versionId, pdi_score: pdiScore, pdi_band: pdiBand, autonomy_level: autonomyLevel });
      }
    }

    // 6. Runtime variable governance — fail closed on any violation.
    const runtime = await RuntimeVariableGovernanceService.enforce({
      promptVersionId: versionId,
      parameters: variables,
      riskTier,
      workspaceId,
      executionId,
    });
    if (!runtime.passed) {
      return fail('RUNTIME_GOVERNANCE_BLOCKED', `Runtime governance ${runtime.enforcementAction}: ${runtime.constraintViolations[0] || 'blocked'}`, { version_id: versionId });
    }

    // 7. Safe variable rendering ({{key}} substitution).
    let governedPrompt = version.body || '';
    for (const [k, v] of Object.entries(variables)) {
      governedPrompt = governedPrompt.replaceAll(`{{${k}}}`, String(v ?? ''));
    }

    return {
      ok: true,
      code: 'OK',
      governedPrompt,
      evidence: {
        prompt_id: version.prompt_id,
        version_id: versionId,
        receipt_hash: receiptHash,
        constraint_shadow_hash: constraintShadowHash,
        variables_hash: hashObject(variables),
        runtime_governance_result: runtime.enforcementAction,
        risk_tier: riskTier,
        pdi_score: pdiScore,
        pdi_band: pdiBand,
        autonomy_level: autonomyLevel,
      },
    };
  }
}

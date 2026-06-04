import * as crypto from 'crypto';
import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';
import { ConstraintShadowService } from './ConstraintShadowService';
import { RuntimeVariableGovernanceService } from './RuntimeVariableGovernanceService';

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
  | 'RUNTIME_GOVERNANCE_BLOCKED';

export interface GovernedEvidence {
  prompt_id: string;
  version_id: string;
  receipt_hash: string;
  constraint_shadow_hash: string;
  variables_hash: string;
  runtime_governance_result: string;
  risk_tier: string;
  pdi_score: number | null;
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
    if (pdiScore !== null && pdiScore < GOVERNED_PDI_MIN) {
      return fail('PDI_BELOW_THRESHOLD', `PDI ${pdiScore} is below the production floor ${GOVERNED_PDI_MIN}`, { version_id: versionId, pdi_score: pdiScore });
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
      },
    };
  }
}

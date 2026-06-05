import * as crypto from 'crypto';
import { env } from '../../config/env';
import { PromptAuditService } from './PromptAuditService';
import { PromptEvidenceService } from './PromptEvidenceService';
import { GovernedPromptResolver, GovernedResolution, GovernedResolveCode } from './GovernedPromptResolver';

export interface GovernedExecuteInput {
  useCaseKey: string;
  workspaceId: string;
  variables?: Record<string, unknown>;
  modelProvider: string;
  actorId?: string;
  executionId?: string;
  /** The actual model call. Receives the GOVERNED prompt text; returns output text. */
  invoke: (governedPrompt: string) => Promise<string>;
}

export interface GovernedExecuteResult {
  ok: boolean;
  code: GovernedResolveCode;
  reason?: string;
  output?: string;
  evidence?: Record<string, unknown>;
}

function isEnforcedInProduction(): boolean {
  return String(env.PROMPT_GOVERNANCE_ENFORCED).toLowerCase() === 'true' && env.NODE_ENV === 'production';
}

/**
 * The single entry point a model call site should use. It resolves + enforces a
 * governed prompt, invokes the model only when every gate passed, and records a
 * complete governed-call evidence event (prompt_id, version_id, receipt_hash,
 * constraint_shadow_hash, model provider, variables hash, runtime result, output
 * hash). Fails closed: no governed prompt ⇒ no model call.
 */
export class GovernedModelGate {
  static async execute(input: GovernedExecuteInput): Promise<GovernedExecuteResult> {
    const resolution: GovernedResolution = await GovernedPromptResolver.resolve({
      useCaseKey: input.useCaseKey,
      workspaceId: input.workspaceId,
      variables: input.variables,
      executionId: input.executionId,
    });

    if (!resolution.ok || !resolution.governedPrompt || !resolution.evidence) {
      return { ok: false, code: resolution.code, reason: resolution.reason };
    }

    const output = await input.invoke(resolution.governedPrompt);
    const outputHash = crypto.createHash('sha256').update(output || '').digest('hex');

    const evidencePayload = {
      use_case_key: input.useCaseKey,
      prompt_id: resolution.evidence.prompt_id,
      version_id: resolution.evidence.version_id,
      receipt_hash: resolution.evidence.receipt_hash,
      constraint_shadow_hash: resolution.evidence.constraint_shadow_hash,
      model_provider: input.modelProvider,
      variables_hash: resolution.evidence.variables_hash,
      runtime_governance_result: resolution.evidence.runtime_governance_result,
      output_hash: outputHash,
    };

    // Evidence vault + append-only audit record of the governed model call.
    await PromptEvidenceService.record({
      event_type: 'prompt.governed_execution.completed',
      prompt_id: resolution.evidence.prompt_id,
      prompt_version_id: resolution.evidence.version_id,
      workspace_id: input.workspaceId,
      actor_id: input.actorId,
      reason: `Governed model call via ${input.modelProvider} for '${input.useCaseKey}'`,
      payload: evidencePayload,
    }).catch(() => undefined);

    await PromptAuditService.record({
      event_type: 'prompt.governed_execution.completed',
      workspace_id: input.workspaceId,
      prompt_id: resolution.evidence.prompt_id,
      version_id: resolution.evidence.version_id,
      actor_id: input.actorId,
      reason: `Governed model call via ${input.modelProvider} for '${input.useCaseKey}'`,
      after_state: evidencePayload,
    }).catch(() => undefined);

    return { ok: true, code: 'OK', output, evidence: evidencePayload };
  }

  /**
   * Guard for a model call site that still uses an INLINE prompt and has not yet
   * been migrated to a governed prompt. In production with PROMPT_GOVERNANCE_ENFORCED
   * it FAILS CLOSED (throws). Otherwise it records an audited advisory bypass and
   * returns, allowing the legacy inline path to proceed during rollout.
   */
  static async legacyInlineFallback(useCaseKey: string, workspaceId: string | null | undefined, reason: string): Promise<void> {
    const enforced = isEnforcedInProduction();
    await PromptAuditService.record({
      event_type: enforced ? 'prompt.inline_bypass.blocked' : 'prompt.inline_bypass.allowed',
      workspace_id: workspaceId || undefined,
      reason: `Legacy inline prompt for '${useCaseKey}': ${reason}`,
      after_state: { use_case_key: useCaseKey, enforced, node_env: env.NODE_ENV },
    }).catch(() => undefined);

    if (enforced) {
      throw Object.assign(
        new Error(`Governed prompt required for '${useCaseKey}': inline prompts are blocked in production when PROMPT_GOVERNANCE_ENFORCED is set.`),
        { statusCode: 503, code: 'PROMPT_GOVERNANCE_REQUIRED' },
      );
    }
  }
}

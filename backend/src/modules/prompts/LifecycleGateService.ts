import { supabaseAdmin } from '../../shared/supabase';
import { PromptAuditService } from './PromptAuditService';
import { PromptService, PROMPT_STATUS } from './PromptService';

export interface LifecycleGateResult {
  allowed: boolean;
  reason: string;
  currentStatus: string;
  targetStatus: string;
}

const TRANSITIONS: Record<string, string[]> = {
  [PROMPT_STATUS.DRAFT]: [PROMPT_STATUS.INTERNAL_TEST, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.INTERNAL_TEST]: [PROMPT_STATUS.REVIEW_REQUESTED, PROMPT_STATUS.DRAFT, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.REVIEW_REQUESTED]: [PROMPT_STATUS.APPROVED_STAGING, PROMPT_STATUS.PRODUCTION_PENDING, PROMPT_STATUS.DRAFT, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.APPROVED_STAGING]: [PROMPT_STATUS.COMMISSIONED, PROMPT_STATUS.DRAFT, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.PRODUCTION_PENDING]: [PROMPT_STATUS.APPROVED_STAGING, PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.DRAFT, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.COMMISSIONED]: [PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.APPROVED_STAGING, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.PRODUCTION_ACTIVE]: [PROMPT_STATUS.LOCKED, PROMPT_STATUS.SUPERSEDED, PROMPT_STATUS.PAUSED, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.LOCKED]: [PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.SUPERSEDED]: [PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.PAUSED]: [PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.RETIRED]: [PROMPT_STATUS.ARCHIVED],
  [PROMPT_STATUS.ARCHIVED]: [],
};

export class LifecycleGateService {
  static checkTransition(currentStatus: string, targetStatus: string): LifecycleGateResult {
    const allowed = TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
    if (!allowed) {
      return {
        allowed: false,
        reason: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Valid targets: ${(TRANSITIONS[currentStatus] || []).join(', ') || 'none'}.`,
        currentStatus,
        targetStatus,
      };
    }
    return { allowed: true, reason: 'Transition allowed', currentStatus, targetStatus };
  }

  static async enforceTransition(
    promptId: string,
    targetStatus: string,
    workspaceId: string,
    actorId?: string,
    options?: { allowSameStatus?: boolean },
  ): Promise<LifecycleGateResult> {
    const prompt = await PromptService.getById(promptId, workspaceId);
    if (!prompt) {
      return { allowed: false, reason: 'Prompt not found', currentStatus: 'unknown', targetStatus };
    }
    const currentStatus = prompt.status;
    if (options?.allowSameStatus && currentStatus === targetStatus) {
      return { allowed: true, reason: 'Already at target status', currentStatus, targetStatus };
    }
    const result = this.checkTransition(currentStatus, targetStatus);
    if (!result.allowed) {
      await PromptAuditService.record({
        event_type: 'prompt.lifecycle.transition.denied',
        workspace_id: workspaceId,
        prompt_id: promptId,
        actor_id: actorId,
        reason: result.reason,
        after_state: { current_status: currentStatus, target_status: targetStatus },
      });
    }
    return result;
  }

  static isLocked(status: string): boolean {
    return status === PROMPT_STATUS.LOCKED || status === PROMPT_STATUS.RETIRED || status === PROMPT_STATUS.ARCHIVED;
  }

  static isImmutable(status: string): boolean {
    return status === PROMPT_STATUS.RETIRED || status === PROMPT_STATUS.ARCHIVED || status === PROMPT_STATUS.SUPERSEDED;
  }

  static canDeploy(status: string): boolean {
    return status === PROMPT_STATUS.APPROVED_STAGING || status === PROMPT_STATUS.COMMISSIONED || status === PROMPT_STATUS.PRODUCTION_PENDING;
  }

  static canCommission(status: string): boolean {
    return status === PROMPT_STATUS.APPROVED_STAGING;
  }

  static async supersedePriorActive(promptId: string, newVersionId: string, workspaceId: string, actorId?: string): Promise<void> {
    const { data: activeVersions } = await supabaseAdmin
      .from('prompt_versions')
      .select('id')
      .eq('prompt_id', promptId)
      .neq('id', newVersionId);

    const activeIds = (activeVersions || []).map((v: any) => v.id);
    if (activeIds.length === 0) return;

    const { data: activeDeployments } = await supabaseAdmin
      .from('prompt_deployments')
      .select('prompt_version_id')
      .eq('environment', 'production')
      .in('prompt_version_id', activeIds);

    const priorActiveVersionIds = (activeDeployments || []).map((d: any) => d.prompt_version_id);
    if (priorActiveVersionIds.length === 0) return;

    await supabaseAdmin
      .from('prompt_versions')
      .update({ immutable: true })
      .in('id', priorActiveVersionIds);

    for (const priorId of priorActiveVersionIds) {
      await PromptAuditService.record({
        event_type: 'prompt.lifecycle.superseded',
        workspace_id: workspaceId,
        prompt_id: promptId,
        version_id: priorId,
        actor_id: actorId,
        reason: `Version ${priorId} superseded by version ${newVersionId}`,
        after_state: { superseded_by: newVersionId, immutable: true },
      });
    }
  }
}

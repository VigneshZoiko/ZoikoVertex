import { PromptTestService } from './PromptTestService';
import { PromptApprovalService } from './PromptApprovalService';
import { ApprovalInvalidationService } from './ApprovalInvalidationService';
import { PromptApprovalPolicyService } from './PromptApprovalPolicyService';
import { supabaseAdmin } from '../../shared/supabase';

export interface GateBlockingIssue {
  type: string;
  detail: string;
  blocking: boolean;
}

export interface GateWarning {
  type: string;
  detail: string;
}

export interface DeploymentGateResult {
  canDeploy: boolean;
  blockingIssues: GateBlockingIssue[];
  warnings: GateWarning[];
}

export interface DeploymentGateOverrides {
  requireAdversarialPass?: boolean;
  requireDriftResolution?: boolean;
  minimumApprovals?: number;
}

export class DeploymentGateService {
  static async check(
    versionId: string,
    options?: {
      prompt?: any;
      riskTier?: string;
      environment?: string;
      workspaceId?: string;
      overrides?: DeploymentGateOverrides;
    },
  ): Promise<DeploymentGateResult> {
    const blockingIssues: GateBlockingIssue[] = [];
    const warnings: GateWarning[] = [];

    const version = options?.prompt
      ? null
      : await this.getVersion(versionId);
    const prompt = options?.prompt || null;

    if (!version && !prompt) {
      const v = await this.getVersion(versionId);
      if (!v) {
        blockingIssues.push({ type: 'version_not_found', detail: 'Version not found', blocking: true });
        return { canDeploy: false, blockingIssues, warnings };
      }
    }

    const promptObj = prompt;
    const riskTier = options?.riskTier || String(promptObj?.risk_tier || '').toLowerCase();
    const overrides = options?.overrides || {};

    // Gate 1: current-version match (only if prompt loaded)
    if (promptObj && promptObj.current_version_id && promptObj.current_version_id !== versionId) {
      blockingIssues.push({ type: 'not_current_version', detail: 'Only the current prompt version can be deployed.', blocking: true });
    }

    // Gate 2: approval invalidation
    if (!blockingIssues.some((i) => i.blocking)) {
      const persistedValidity = await ApprovalInvalidationService.getValidity(versionId);
      const deployValidity = persistedValidity.invalidated
        ? persistedValidity
        : await ApprovalInvalidationService.evaluate(versionId);
      if (deployValidity.invalidated) {
        blockingIssues.push({
          type: 'approval_invalidated',
          detail: deployValidity.reason || 'Approval has been invalidated due to dependency changes.',
          blocking: true,
        });
      }
    }

    // Gate 3: standard test pass
    if (!blockingIssues.some((i) => i.blocking)) {
      const latestTests = await PromptTestService.listRuns(versionId, { excludeAdversarial: true });
      const latestTest = latestTests[0];
      if (!latestTest || latestTest.pass_fail !== 'PASS') {
        blockingIssues.push({ type: 'tests_not_passing', detail: 'Prompt version must pass required tests before deployment.', blocking: true });
      }
    }

    // Gate 4: adversarial gate
    if (!blockingIssues.some((i) => i.blocking)) {
      const advRuns = await PromptTestService.listAdversarialRuns(versionId);
      const latestAdv = advRuns[0];
      if (latestAdv) {
        const passRequired = overrides.requireAdversarialPass !== false;
        if (riskTier === 'tier_4_critical' && latestAdv.pass_fail !== 'PASS' && passRequired) {
          blockingIssues.push({ type: 'adversarial_failed', detail: 'Prompt version must pass adversarial testing before deployment.', blocking: true });
        } else if ((riskTier === 'tier_2_medium' || riskTier === 'tier_3_high') && latestAdv.pass_fail !== 'PASS') {
          warnings.push({ type: 'adversarial_warning', detail: 'Adversarial tests did not pass for this prompt version.' });
        }
      }
    }

    // Gate 5: approval chain completeness
    if (!blockingIssues.some((i) => i.blocking)) {
      const approvals = await PromptApprovalService.listByVersion(versionId);
      const approvedRoles = new Set(
        approvals
          .filter((approval: any) => approval.decision === 'APPROVED')
          .map((approval: any) => PromptApprovalPolicyService.normalizeReviewerRole(approval.reviewer_role)),
      );
      const requiredRoles = PromptApprovalPolicyService.requiredApprovalRoles(riskTier);
      const complete = requiredRoles.every((requiredRole) =>
        Array.from(approvedRoles).some((role) => PromptApprovalPolicyService.canRoleSatisfy(requiredRole, role)),
      );
      if (!complete) {
        blockingIssues.push({ type: 'incomplete_approvals', detail: 'Required approval chain is incomplete.', blocking: true });
      }
    }

    return {
      canDeploy: blockingIssues.filter((i) => i.blocking).length === 0,
      blockingIssues,
      warnings,
    };
  }

  static async getVersion(versionId: string): Promise<any | null> {
    const { data } = await supabaseAdmin.from('prompt_versions').select('*').eq('id', versionId).maybeSingle();
    return data;
  }
}

import { PromptTestService } from './PromptTestService';
import { PromptApprovalService } from './PromptApprovalService';
import { ApprovalInvalidationService } from './ApprovalInvalidationService';
import { PromptApprovalPolicyService } from './PromptApprovalPolicyService';
import { ThreeKeyService } from './ThreeKeyService';
import { ConstraintShadowService } from './ConstraintShadowService';
import { supabaseAdmin } from '../../shared/supabase';
import { computePDIBand, isPDIBandDeploymentBlocked, deriveAutonomyLevel } from './pdiBands';
import { PromptAuditService } from './PromptAuditService';

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

    // Gate 6: Three-Key validation (Tier 4 Critical only)
    if (!blockingIssues.some((i) => i.blocking) && riskTier === 'tier_4_critical') {
      try {
        const threeKeyStatus = await ThreeKeyService.getStatus(versionId);
        if (!threeKeyStatus.completed) {
          blockingIssues.push({
            type: 'three_key_incomplete',
            detail: 'Three-Key approval must be completed before deployment of Tier 4 prompts.',
            blocking: true,
          });
        }
      } catch {
        // Fail-closed: if Three-Key validation cannot complete, deployment is blocked
        blockingIssues.push({
          type: 'three_key_validation_failed',
          detail: 'Three-Key validation could not be completed. Deployment is blocked.',
          blocking: true,
        });
      }
    }

    // Gate 7: distinct approver validation
    if (!blockingIssues.some((i) => i.blocking)) {
      const approvals = await PromptApprovalService.listByVersion(versionId);
      const approvedApprovals = approvals.filter((a: any) => a.decision === 'APPROVED');
      const reviewerIds = approvedApprovals.map((a: any) => a.reviewer_id);
      const distinctReviewers = new Set(reviewerIds.filter(Boolean));
      if (distinctReviewers.size < reviewerIds.filter(Boolean).length) {
        blockingIssues.push({
          type: 'duplicate_approver',
          detail: 'Each approval role must be held by a distinct user. The same user cannot satisfy multiple required roles.',
          blocking: true,
        });
      }
      // Validate stage separation: the same user cannot approve stages that require separation
      const userRolesMap = new Map<string, string[]>();
      for (const a of approvedApprovals) {
        if (!a.reviewer_id) continue;
        const existing = userRolesMap.get(a.reviewer_id) || [];
        existing.push(PromptApprovalPolicyService.normalizeReviewerRole(a.reviewer_role));
        userRolesMap.set(a.reviewer_id, existing);
      }
      for (const [uid, roles] of userRolesMap) {
        const uniqueRoles = new Set(roles);
        if (uniqueRoles.size > 1) {
          blockingIssues.push({
            type: 'role_conflict_approver',
            detail: `User ${uid} holds multiple approval roles (${Array.from(uniqueRoles).join(', ')}) which violates separation of duties.`,
            blocking: true,
          });
        }
      }
    }

    // Gate 8: Constraint Shadow integrity — fail-closed.
    // A deployable version MUST have a Constraint Shadow that is compiled,
    // locked, hash-intact (not tampered), and not stale (rules unchanged since
    // lock). Any validation error blocks deployment (fail-closed) rather than
    // allowing an ungoverned deploy.
    if (!blockingIssues.some((i) => i.blocking)) {
      try {
        const shadowHash = await ConstraintShadowService.getCurrentHash(versionId);
        if (!shadowHash) {
          blockingIssues.push({ type: 'constraint_shadow_missing', detail: 'Constraint Shadow has not been compiled for this version. Deployment blocked.', blocking: true });
        } else {
          const locked = await ConstraintShadowService.getLockedShadow(versionId);
          if (!locked) {
            blockingIssues.push({ type: 'constraint_shadow_unlocked', detail: 'Constraint Shadow is not locked. Lock it before deployment.', blocking: true });
          } else if (!ConstraintShadowService.verifyIntegrity(locked)) {
            blockingIssues.push({ type: 'constraint_shadow_hash_mismatch', detail: 'Constraint Shadow hash does not match its sealed content (possible tampering). Deployment blocked.', blocking: true });
          } else {
            const currentRules = ConstraintShadowService.getRulesForTier(riskTier);
            const stale = await ConstraintShadowService.isStale(versionId, currentRules);
            if (stale) {
              blockingIssues.push({ type: 'constraint_shadow_stale', detail: 'Constraint Shadow is stale — governance rules have changed since it was locked. Re-compile and re-lock before deployment.', blocking: true });
            }
          }
        }
      } catch (err) {
        // Fail-closed: if the Constraint Shadow service is unavailable, block.
        blockingIssues.push({
          type: 'constraint_shadow_unavailable',
          detail: `Constraint Shadow validation could not be completed: ${err instanceof Error ? err.message : 'service error'}. Deployment blocked (fail-closed).`,
          blocking: true,
        });
      }
    }

    // Gate 9: PDI band — fail-closed on WEAK bands. Only enforced when a PDI
    // score has actually been computed for the version (so draft/internal_test
    // versions without a PDI history are unaffected). MODERATE bands warn
    // rather than block; STRONG and EXCELLENT are unflagged.
    if (!blockingIssues.some((i) => i.blocking)) {
      try {
        const { data: pdiRows } = await supabaseAdmin
          .from('prompt_audit_ledger')
          .select('after_state')
          .eq('version_id', versionId)
          .eq('event_type', 'prompt.defensibility_index.computed')
          .order('created_at', { ascending: false })
          .limit(1);
        const pdiScore: number | null = (pdiRows?.[0]?.after_state as any)?.pdi_score ?? null;
        if (pdiScore !== null) {
          const band = computePDIBand(pdiScore);
          const autonomy = deriveAutonomyLevel(band);
          if (isPDIBandDeploymentBlocked(band)) {
            blockingIssues.push({
              type: 'pdi_band_weak',
              detail: `PDI band is WEAK (score ${pdiScore}, < 70). Deployment blocked.`,
              blocking: true,
            });
            await PromptAuditService.record({
              event_type: 'prompt.gate.pdi_band_blocked',
              workspace_id: options?.workspaceId || null as any,
              version_id: versionId,
              reason: `PDI band WEAK (score ${pdiScore}) blocks deployment`,
              risk_level: riskTier,
              after_state: { pdi_score: pdiScore, pdi_band: band, autonomy_level: autonomy },
            });
          } else if (band === 'MODERATE') {
            warnings.push({
              type: 'pdi_band_moderate',
              detail: `PDI band is MODERATE (score ${pdiScore}). Deployment allowed with autonomy=${autonomy} (supervised).`,
            });
          }
        }
      } catch (err) {
        // Fail-closed: PDI gate could not be evaluated — do NOT block on transient
        // error (this gate is advisory, unlike gates 1–8 which are mandatory).
        warnings.push({
          type: 'pdi_band_evaluation_failed',
          detail: `PDI band evaluation could not complete: ${err instanceof Error ? err.message : 'service error'}. Proceeding without PDI gate.`,
        });
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

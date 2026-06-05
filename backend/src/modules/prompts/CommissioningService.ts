import { supabaseAdmin } from '../../shared/supabase';
import { PromptService, PROMPT_STATUS } from './PromptService';
import { PromptAuditService } from './PromptAuditService';
import { GovernanceReceiptService } from './GovernanceReceiptService';
import { FailClosedGuard } from './FailClosedGuard';
import { SeparationOfDutiesService } from './SeparationOfDutiesService';
import { ThreeKeyService } from './ThreeKeyService';
import { DeploymentGateService } from './DeploymentGateService';
import { ConstraintShadowService } from './ConstraintShadowService';
import { computePDIBand, isPDIBandDeploymentBlocked, deriveAutonomyLevel } from './pdiBands';

export type CommissioningStatus = 'not_commissioned' | 'pending_review' | 'commissioned' | 'commissioning_failed';

export interface CommissionRecord {
  id: string;
  promptId: string;
  promptVersionId: string;
  commissionedBy: string;
  commissionedAt: string;
  status: CommissioningStatus;
  preflightChecks: CommissionPreflightCheck[];
  receiptId: string | null;
  notes: string;
}

export interface CommissionPreflightCheck {
  check: string;
  passed: boolean;
  details: string;
}

export class CommissioningService {
  static async runPreflight(
    promptId: string,
    promptVersionId: string,
    workspaceId: string,
    _actorId?: string,
  ): Promise<{ canCommission: boolean; checks: CommissionPreflightCheck[]; pdiBandInfo?: { score: number | null; band: string | null; autonomy: string | null } }> {
    const prompt = await PromptService.getById(promptId, workspaceId);
    const checks: CommissionPreflightCheck[] = [];

    // 1. Status check
    const statusOk = prompt?.status === PROMPT_STATUS.APPROVED_STAGING || prompt?.status === PROMPT_STATUS.PRODUCTION_PENDING;
    checks.push({
      check: 'Status is approved (staging or production-pending)',
      passed: statusOk,
      details: `Current status: ${prompt?.status || 'unknown'}`,
    });

    if (!statusOk) {
      return { canCommission: false, checks };
    }

    // 2. Approvals complete
    const { data: approvals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('reviewer_role, decision, reviewer_id')
      .eq('prompt_version_id', promptVersionId)
      .eq('decision', 'APPROVED');
    const tier = prompt?.risk_tier || 'tier_2_medium';
    const requiredRoleCount = tier === 'tier_4_critical' ? 3 : tier === 'tier_3_high' ? 3 : 2;
    const approvalsComplete = (approvals?.length || 0) >= requiredRoleCount;
    checks.push({
      check: 'Required approvals complete',
      passed: approvalsComplete,
      details: `${approvals?.length || 0}/${requiredRoleCount} approvals`,
    });

    // 3. Separation of Duties passed
    let sodPassed = true;
    if (approvals && approvals.length > 0) {
      const firstApproval = approvals[0];
      const sodResult = await SeparationOfDutiesService.checkAll(promptVersionId, firstApproval.reviewer_role, firstApproval.reviewer_id || '', workspaceId);
      sodPassed = sodResult.allowed;
    }
    checks.push({
      check: 'Separation of Duties checks passed',
      passed: sodPassed,
      details: sodPassed ? 'No SoD violations' : 'SoD violations detected in approval chain',
    });

    // 4. Three-Key approval passed (Tier 4 only)
    let threeKeyPassed = true;
    if (tier === 'tier_4_critical') {
      try {
        const tkStatus = await ThreeKeyService.getStatus(promptVersionId);
        threeKeyPassed = tkStatus.completed;
      } catch {
        threeKeyPassed = false;
      }
    }
    checks.push({
      check: 'Three-Key approval passed',
      passed: threeKeyPassed,
      details: tier === 'tier_4_critical' ? (threeKeyPassed ? 'Three-Key complete' : 'Three-Key not completed') : 'Not required for this tier',
    });

    // 5. Deployment gate passed
    let gatePassed = false;
    try {
      const gateResult = await DeploymentGateService.check(promptVersionId, {
        prompt,
        riskTier: prompt?.risk_tier,
        environment: 'staging',
        workspaceId,
      });
      gatePassed = gateResult.canDeploy;
    } catch {
      gatePassed = false;
    }
    checks.push({
      check: 'Deployment gate passed',
      passed: gatePassed,
      details: gatePassed ? 'All deployment gates pass' : 'Deployment gate check failed',
    });

    // 6. Evaluation completed
    const { data: evaluation } = await supabaseAdmin
      .from('prompt_test_runs')
      .select('pass_fail')
      .eq('prompt_version_id', promptVersionId)
      .eq('pass_fail', 'PASS')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    checks.push({
      check: 'Evaluation passed',
      passed: evaluation?.pass_fail === 'PASS',
      details: evaluation ? 'Evaluation passed' : 'No passing evaluation found',
    });

    // 7. Governance receipt generated
    const { data: receiptEvidence } = await supabaseAdmin
      .from('prompt_evidence_links')
      .select('vault_item_id')
      .eq('prompt_version_id', promptVersionId)
      .eq('event_type', 'prompt.governance_receipt.generated');
    checks.push({
      check: 'Governance receipt generated',
      passed: (receiptEvidence?.length || 0) > 0,
      details: `${receiptEvidence?.length || 0} receipt(s) found`,
    });

    // 8. Constraint shadow compiled, locked, and hash-verified
    const csLocked = await ConstraintShadowService.isLocked(promptVersionId);
    const csHash = await ConstraintShadowService.getCurrentHash(promptVersionId);
    const csMissing = !csHash;
    const csUnlocked = !csLocked;
    let csStale = false;
    if (csHash && !csMissing) {
      const currentRules = ConstraintShadowService.getRulesForTier(tier);
      csStale = await ConstraintShadowService.isStale(promptVersionId, currentRules);
    }
    const csOk = !csMissing && csLocked && !csStale;
    checks.push({
      check: 'Constraint shadow compiled, locked, and hash-verified',
      passed: csOk,
      details: csMissing ? 'Constraint shadow not compiled' :
               csUnlocked ? 'Constraint shadow is not locked' :
               csStale ? 'Constraint shadow is stale (rules have changed since lock)' :
               `Constraint shadow locked with hash ${csHash?.slice(0, 12)}...`,
    });

    // 9. No active governance violations
    const { data: violations } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('id')
      .eq('prompt_id', promptId)
      .eq('version_id', promptVersionId)
      .or('event_type.eq.prompt.governance.violation,event_type.eq.prompt.separation_of_duties.blocked');
    checks.push({
      check: 'No active governance violations',
      passed: !violations || violations.length === 0,
      details: violations?.length ? `${violations.length} violation(s) found` : 'No violations',
    });

    // 10. PDI band — WEAK blocks commissioning. MODERATE allows with autonomy
    // restrictions; STRONG/EXCELLENT pass. Only enforced when a PDI score has
    // been computed for this version.
    let pdiBandInfo: { score: number | null; band: string | null; autonomy: string | null } = { score: null, band: null, autonomy: null };
    try {
      const { data: pdiRows } = await supabaseAdmin
        .from('prompt_audit_ledger')
        .select('after_state')
        .eq('version_id', promptVersionId)
        .eq('event_type', 'prompt.defensibility_index.computed')
        .order('created_at', { ascending: false })
        .limit(1);
      const pdiScore: number | null = (pdiRows?.[0]?.after_state as any)?.pdi_score ?? null;
      if (pdiScore !== null) {
        const band = computePDIBand(pdiScore);
        const autonomy = deriveAutonomyLevel(band);
        pdiBandInfo = { score: pdiScore, band, autonomy };
        const blocked = isPDIBandDeploymentBlocked(band);
        checks.push({
          check: 'PDI band is not WEAK',
          passed: !blocked,
          details: blocked
            ? `PDI band is WEAK (score ${pdiScore}). Commissioning blocked.`
            : `PDI band is ${band} (score ${pdiScore}); autonomy=${autonomy}`,
        });
      } else {
        checks.push({
          check: 'PDI band is not WEAK',
          passed: true,
          details: 'No PDI score on file for this version; PDI band gate not enforced',
        });
      }
    } catch (err) {
      checks.push({
        check: 'PDI band is not WEAK',
        passed: false,
        details: `PDI band evaluation error: ${err instanceof Error ? err.message : 'service error'}`,
      });
    }

    const canCommission = checks.every((c) => c.passed);
    return { canCommission, checks, pdiBandInfo };
  }

  static async commission(
    promptId: string,
    promptVersionId: string,
    workspaceId: string,
    actorId?: string,
    notes?: string,
  ): Promise<CommissionRecord> {
    const { canCommission, checks } = await this.runPreflight(promptId, promptVersionId, workspaceId, actorId);
    const commissionId = `COM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Fail-closed: any preflight failure blocks commissioning
    if (!canCommission) {
      await FailClosedGuard.guardEvidenceWrite(
        'prompt.commissioning.blocked',
        {
          reason: 'Commissioning preflight checks failed',
          commission_id: commissionId,
          failed_checks: checks.filter((c) => !c.passed).map((c) => c.check),
          risk_level: 'medium',
        },
        {
          operation: 'prompt.commissioning',
          workspaceId,
          promptId,
          promptVersionId,
          actorId,
          criticality: 'high',
          throwOnAuditFailure: true,
          throwOnEvidenceFailure: true,
        },
      );

      return {
        id: commissionId,
        promptId,
        promptVersionId,
        commissionedBy: actorId || 'system',
        commissionedAt: new Date().toISOString(),
        status: 'commissioning_failed',
        preflightChecks: checks,
        receiptId: null,
        notes: notes || 'Preflight checks failed — commissioning blocked',
      };
    }

    // Fail-closed guard: evidence + audit write before committing
    await FailClosedGuard.guardApproval({
      operation: 'prompt.commissioning',
      eventType: 'prompt.commissioning.started',
      workspaceId,
      promptId,
      promptVersionId,
      actorId,
      payload: { reason: `Commissioning started for version ${promptVersionId}`, risk_level: 'medium' },
      criticality: 'high',
    });

    // Record all check results as evidence
    for (const check of checks) {
      await supabaseAdmin.from('prompt_evidence_links').insert({
        prompt_id: promptId,
        prompt_version_id: promptVersionId,
        workspace_id: workspaceId,
        tenant_id: workspaceId,
        event_type: `prompt.commissioning.check.${check.passed ? 'passed' : 'failed'}`,
        vault_item_id: `CHK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        risk_level: 'medium',
        reason: check.details,
        metadata: { check_name: check.check, passed: check.passed },
      });
    }

    // Generate governance receipt (required for commissioning)
    const receipt = await GovernanceReceiptService.generate(promptId, promptVersionId, workspaceId, actorId);

    // Transition status to COMMISSIONED
    await PromptService.updateStatus(promptId, 'COMMISSIONED', workspaceId);

    // Audit completion
    await PromptAuditService.record({
      event_type: 'prompt.commissioning.completed',
      workspace_id: workspaceId,
      prompt_id: promptId,
      version_id: promptVersionId,
      actor_id: actorId,
      reason: notes || `Prompt version ${promptVersionId} commissioned`,
      after_state: {
        commission_id: commissionId,
        receipt_id: receipt.receiptId,
        checks_passed: checks.filter((c) => c.passed).length,
        checks_total: checks.length,
      },
    });

    return {
      id: commissionId,
      promptId,
      promptVersionId,
      commissionedBy: actorId || 'system',
      commissionedAt: new Date().toISOString(),
      status: 'commissioned',
      preflightChecks: checks,
      receiptId: receipt.receiptId,
      notes: notes || '',
    };
  }

  static async revokeCommission(
    promptId: string,
    workspaceId: string,
    actorId?: string,
    reason?: string,
  ): Promise<void> {
    await FailClosedGuard.guardEvidenceWrite(
      'prompt.commissioning.revoked',
      { reason: reason || 'Commission revoked', risk_level: 'medium' },
      { operation: 'prompt.commissioning.revoke', workspaceId, promptId, actorId, criticality: 'high' },
    );

    await PromptAuditService.record({
      event_type: 'prompt.commissioning.revoked',
      workspace_id: workspaceId,
      prompt_id: promptId,
      actor_id: actorId,
      reason: reason || 'Commission revoked',
      after_state: { revoked_at: new Date().toISOString() },
    });
  }
}

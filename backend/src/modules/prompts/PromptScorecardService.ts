 
import { supabaseAdmin } from '../../shared/supabase';
import { PromptService, PROMPT_STATUS } from './PromptService';
import { PromptVersionService } from './PromptVersionService';
import { PromptApprovalService } from './PromptApprovalService';
import { PromptApprovalPolicyService } from './PromptApprovalPolicyService';
import { PromptTestService } from './PromptTestService';
import { AdversarialTestService } from './AdversarialTestService';
import { PromptBindingPolicyService } from './PromptBindingPolicyService';
import { DeploymentGateService } from './DeploymentGateService';
import { GovernanceDashboardService } from './services/GovernanceDashboardService';
import { GovernanceDriftService } from './services/GovernanceDriftService';
import { scorecardCategoryWeights } from './schemas/scorecard.schema';

type ScorecardSeverity = 'healthy' | 'warning' | 'critical';

interface CategoryScore {
  score: number;
  severity: ScorecardSeverity;
  label: string;
  details: Record<string, unknown>;
}

export interface PromptScorecard {
  prompt_id: string;
  version_id: string;
  version_number: number;
  generated_at: string;
  overall_score: number;
  overall_severity: ScorecardSeverity;
  categories: {
    dependency_health: CategoryScore;
    approval_completeness: CategoryScore;
    adversarial_testing: CategoryScore;
    drift_status: CategoryScore;
    audit_integrity: CategoryScore;
    binding_health: CategoryScore;
    lifecycle_status: CategoryScore;
  };
  deployment_ready: boolean;
  modifier_applied: boolean;
  action_items: string[];
}

interface ListScorecardOptions {
  limit?: number;
  offset?: number;
}

function severityFromScore(score: number): ScorecardSeverity {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

function computeWeightedTotal(categories: PromptScorecard['categories']): {
  overall: number;
  severity: ScorecardSeverity;
  actionItems: string[];
} {
  let totalWeight = 0;
  let weightedSum = 0;
  const items: string[] = [];

  for (const [key, cat] of Object.entries(categories)) {
    const weight = (scorecardCategoryWeights as any)[key] || 0;
    weightedSum += cat.score * weight;
    totalWeight += weight;
    if (cat.severity === 'critical') {
      items.push(`${cat.label}: score ${cat.score}/100 — critical`);
    } else if (cat.severity === 'warning' && cat.score < 70) {
      items.push(`${cat.label}: score ${cat.score}/100 — needs attention`);
    }
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  return { overall, severity: severityFromScore(overall), actionItems: items };
}

export class PromptScorecardService {

  // ─── Single-Prompt Scorecard ────────────────────────────────────────────
  // Delegates to existing services for rich per-prompt context.

  static async getScorecard(
    promptId: string,
    workspaceId: string,
  ): Promise<PromptScorecard> {
    const prompt = await PromptService.getById(promptId, workspaceId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    const versionId = prompt.current_version_id;
    let versionNumber = 0;
    if (versionId) {
      const version = await PromptVersionService.getById(versionId);
      versionNumber = version?.version_number || 0;
    }

    const generatedAt = new Date().toISOString();

    // 1. Dependency health — from governance snapshot
    const snapshot = await GovernanceDashboardService.getPromptGovernanceSnapshot(promptId, workspaceId);
    const depScore = this.computeDependencyHealthScore(snapshot);
    const depHealthCat: CategoryScore = {
      ...depScore,
      label: 'Dependency Health',
      details: { blocking_count: snapshot.health.blocking_count, highest_severity: snapshot.health.highest_severity, found: snapshot.found },
    };

    // 2. Approval completeness
    const approvalCat = await this.computeApprovalScore(prompt, workspaceId);

    // 3. Adversarial testing
    const adversarialCat = await this.computeAdversarialScore(prompt);

    // 4. Drift status
    const driftCat = await this.computeDriftScore(promptId, workspaceId);

    // 5. Audit integrity
    const auditCat = await this.computeAuditScore(promptId, workspaceId);

    // 6. Binding health
    const bindingCat = await this.computeBindingScore(prompt);

    // 7. Lifecycle status
    const lifecycleCat = this.computeLifecycleScore(prompt);

    const categories = {
      dependency_health: depHealthCat,
      approval_completeness: approvalCat,
      adversarial_testing: adversarialCat,
      drift_status: driftCat,
      audit_integrity: auditCat,
      binding_health: bindingCat,
      lifecycle_status: lifecycleCat,
    };

    const { overall, actionItems } = computeWeightedTotal(categories);

    // Deployment readiness modifier
    let deploymentReady = true;
    let modifierApplied = false;
    if (versionId) {
      const gateResult = await DeploymentGateService.check(versionId, {
        prompt,
        workspaceId,
      });
      deploymentReady = gateResult.canDeploy;
      if (!deploymentReady) {
        modifierApplied = true;
      }
    }

    const finalScore = modifierApplied ? Math.min(overall, 70) : overall;

    return {
      prompt_id: promptId,
      version_id: versionId || '',
      version_number: versionNumber,
      generated_at: generatedAt,
      overall_score: finalScore,
      overall_severity: severityFromScore(finalScore),
      categories,
      deployment_ready: deploymentReady,
      modifier_applied: modifierApplied,
      action_items: actionItems,
    };
  }

  // ─── List Scorecards (batch-fetch) ──────────────────────────────────────
  // Uses 8 batch queries + in-memory computation for the list endpoint.
  // Never calls per-prompt services.

  static async listScorecards(
    workspaceId: string,
    opts: ListScorecardOptions = {},
  ): Promise<{ data: PromptScorecard[]; summary: { average_score: number; healthy_count: number; warning_count: number; critical_count: number; total: number }; pagination: { limit: number; offset: number } }> {
    const requestedLimit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const returnAll = requestedLimit === 0;
    const limit = returnAll ? 0 : requestedLimit;

    // Batch 1: prompts
    const { data: prompts, error: promptsErr } = await supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (promptsErr) throw promptsErr;
    const allPrompts = (prompts as any[]) || [];

    // Slice for pagination (skip when returnAll)
    const pagePrompts = returnAll ? allPrompts : allPrompts.slice(offset, offset + limit);

    // Batch 2: prompt_versions for current_version_ids
    const versionIds = pagePrompts.map((p: any) => p.current_version_id).filter(Boolean);
    const { data: versions } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .in('id', versionIds);
    const versionMap = new Map<string, any>((versions || []).map((v: any) => [v.id, v]));

    // Batch 3: prompt_approvals
    const { data: approvals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('prompt_version_id', versionIds);
    const approvalsByVersion = new Map<string, any[]>();
    for (const a of (approvals || [])) {
      const list = approvalsByVersion.get(a.prompt_version_id) || [];
      list.push(a);
      approvalsByVersion.set(a.prompt_version_id, list);
    }

    // Batch 4: prompt_test_runs
    const { data: testRuns } = await supabaseAdmin
      .from('prompt_test_runs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('prompt_version_id', versionIds);
    const runsByVersion = new Map<string, any[]>();
    for (const r of (testRuns || [])) {
      const list = runsByVersion.get(r.prompt_version_id) || [];
      list.push(r);
      runsByVersion.set(r.prompt_version_id, list);
    }

    // Batch 5: prompt_bindings
    const { data: bindings } = await supabaseAdmin
      .from('prompt_bindings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('prompt_version_id', versionIds);
    const bindingsByVersion = new Map<string, any[]>();
    for (const b of (bindings || [])) {
      const list = bindingsByVersion.get(b.prompt_version_id) || [];
      list.push(b);
      bindingsByVersion.set(b.prompt_version_id, list);
    }

    // Batch 6: prompt_deployments
    const { data: deployments } = await supabaseAdmin
      .from('prompt_deployments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('prompt_version_id', versionIds);
    const deploysByVersion = new Map<string, any[]>();
    for (const d of (deployments || [])) {
      const list = deploysByVersion.get(d.prompt_version_id) || [];
      list.push(d);
      deploysByVersion.set(d.prompt_version_id, list);
    }

    // Batch 7: prompt_audit_ledger
    const promptIds = pagePrompts.map((p: any) => p.id);
    const { data: auditRecords } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('prompt_id', promptIds);
    const auditByPrompt = new Map<string, any[]>();
    for (const r of (auditRecords || [])) {
      const list = auditByPrompt.get(r.prompt_id) || [];
      list.push(r);
      auditByPrompt.set(r.prompt_id, list);
    }

    // Batch 8: prompt_evidence_links
    const { data: evidenceLinks } = await supabaseAdmin
      .from('prompt_evidence_links')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('prompt_id', promptIds);
    const evidenceByPrompt = new Map<string, any[]>();
    for (const e of (evidenceLinks || [])) {
      const list = evidenceByPrompt.get(e.prompt_id) || [];
      list.push(e);
      evidenceByPrompt.set(e.prompt_id, list);
    }

    // Compute scorecards in-memory
    const generatedAt = new Date().toISOString();
    const scores: PromptScorecard[] = [];

    for (const prompt of pagePrompts) {
      const versionId = prompt.current_version_id;
      const version = versionMap.get(versionId) || null;
      const promptApprovals = approvalsByVersion.get(versionId) || [];
      const promptRuns = runsByVersion.get(versionId) || [];
      const promptBindings = bindingsByVersion.get(versionId) || [];
      const promptDeploys = deploysByVersion.get(versionId) || [];
      const promptAudit = auditByPrompt.get(prompt.id) || [];
      const promptEvidence = evidenceByPrompt.get(prompt.id) || [];

      const categories = {
        dependency_health: this.computeDependencyHealthScoreFromBatch(prompt, promptDeploys, promptRuns),
        approval_completeness: this.computeApprovalScoreFromBatch(prompt, promptApprovals),
        adversarial_testing: this.computeAdversarialScoreFromBatch(prompt, promptRuns),
        drift_status: this.computeDriftScoreFromBatch(prompt, version, promptApprovals, promptBindings, promptDeploys, promptAudit),
        audit_integrity: this.computeAuditScoreFromBatch(prompt, promptEvidence, promptAudit),
        binding_health: this.computeBindingScoreFromBatch(promptBindings),
        lifecycle_status: this.computeLifecycleScoreFromBatch(prompt),
      };

      const { overall, actionItems } = computeWeightedTotal(categories);

      // Simplified gate check from batch data
      const gateBlocks = !this.isDeployReadyFromBatch(prompt, promptApprovals, promptRuns);
      const modifierApplied = gateBlocks;
      const finalScore = modifierApplied ? Math.min(overall, 70) : overall;

      scores.push({
        prompt_id: prompt.id,
        version_id: version?.id || '',
        version_number: version?.version_number || 0,
        generated_at: generatedAt,
        overall_score: finalScore,
        overall_severity: severityFromScore(finalScore),
        categories,
        deployment_ready: !gateBlocks,
        modifier_applied: modifierApplied,
        action_items: actionItems,
      });
    }

    // Summary
    const total = allPrompts.length;
    const healthyCount = scores.filter((s) => s.overall_severity === 'healthy').length;
    const warningCount = scores.filter((s) => s.overall_severity === 'warning').length;
    const criticalCount = scores.filter((s) => s.overall_severity === 'critical').length;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.overall_score, 0) / scores.length) : 0;

    return {
      data: scores,
      summary: { average_score: avgScore, healthy_count: healthyCount, warning_count: warningCount, critical_count: criticalCount, total },
      pagination: { limit, offset },
    };
  }

  // ─── Single-prompt category computation (delegates to services) ─────────

  private static computeDependencyHealthScore(snapshot: any): { score: number; severity: ScorecardSeverity } {
    if (!snapshot.found) return { score: 0, severity: 'critical' };
    const severity = snapshot.health?.highest_severity || 'none';
    const blocking = snapshot.health?.blocking_count || 0;
    if (blocking > 0 || severity === 'critical') return { score: 20, severity: 'critical' };
    if (severity === 'high') return { score: 40, severity: 'warning' };
    if (severity === 'medium') return { score: 60, severity: 'warning' };
    if (severity === 'low') return { score: 80, severity: 'healthy' };
    return { score: 100, severity: 'healthy' };
  }

  private static async computeApprovalScore(prompt: any, _workspaceId: string): Promise<CategoryScore> {
    const versionId = prompt.current_version_id;
    if (!versionId) {
      return { score: 0, severity: 'critical', label: 'Approval Completeness', details: { reason: 'No current version' } };
    }
    const approvals = await PromptApprovalService.listByVersion(versionId);
    const required = PromptApprovalPolicyService.requiredApprovalRoles(prompt.risk_tier);
    const approvedRoles = new Set(
      approvals
        .filter((a: any) => String(a.decision).toUpperCase() === 'APPROVED')
        .map((a: any) => PromptApprovalPolicyService.normalizeReviewerRole(a.reviewer_role)),
    );
    const satisfied = required.filter((r) => Array.from(approvedRoles).some((role) => PromptApprovalPolicyService.canRoleSatisfy(r, role)));
    const ratio = required.length > 0 ? satisfied.length / required.length : 1;
    const score = Math.round(ratio * 100);
    const severity = severityFromScore(score);
    return {
      score,
      severity,
      label: 'Approval Completeness',
      details: { required, approved_roles: Array.from(approvedRoles), satisfied_count: satisfied.length, required_count: required.length },
    };
  }

  private static async computeAdversarialScore(prompt: any): Promise<CategoryScore> {
    const versionId = prompt.current_version_id;
    if (!versionId) {
      return { score: 50, severity: 'warning', label: 'Adversarial Testing', details: { reason: 'No current version' } };
    }
    const runs = await PromptTestService.listAdversarialRuns(versionId);
    if (runs.length === 0) {
      return { score: 50, severity: 'warning', label: 'Adversarial Testing', details: { reason: 'No adversarial runs found' } };
    }
    const latest = runs[0];
    const summary = latest.score_summary || {};
    const overallScore = summary.overall_score ?? 50;
    const passFail = AdversarialTestService.computePassFail(prompt.risk_tier || '', summary);
    const isPass = passFail === 'PASS';
    const score = isPass ? Math.min(overallScore, 100) : Math.min(overallScore, 40);
    const severity = severityFromScore(score);
    return {
      score,
      severity,
      label: 'Adversarial Testing',
      details: { latest_run_id: latest.id, overall_score: overallScore, pass_fail: passFail, total: summary.total, failed: summary.failed, critical_failures: summary.critical_failures },
    };
  }

  private static async computeDriftScore(promptId: string, workspaceId: string): Promise<CategoryScore> {
    const findings = await GovernanceDriftService.detectPromptDrift(promptId, workspaceId);
    if (findings.length === 0) {
      return { score: 100, severity: 'healthy', label: 'Drift Status', details: { drift_count: 0 } };
    }
    const highCount = findings.filter((f) => f.severity === 'high').length;
    const mediumCount = findings.filter((f) => f.severity === 'medium').length;
    const lowCount = findings.filter((f) => f.severity === 'low').length;
    const score = Math.max(0, 100 - (highCount * 30) - (mediumCount * 15) - (lowCount * 5));
    const severity = severityFromScore(score);
    return {
      score,
      severity,
      label: 'Drift Status',
      details: { drift_count: findings.length, high: highCount, medium: mediumCount, low: lowCount, findings: findings.map((f) => f.title) },
    };
  }

  private static async computeAuditScore(promptId: string, workspaceId: string): Promise<CategoryScore> {
    // Count evidence links and audit events
    const { count: evidenceCount, error: evErr } = await supabaseAdmin
      .from('prompt_evidence_links')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('prompt_id', promptId);
    if (evErr) throw evErr;

    const { count: auditCount, error: auErr } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('prompt_id', promptId);
    if (auErr) throw auErr;

    const total = (evidenceCount || 0) + (auditCount || 0);
    const score = total >= 5 ? 100 : total >= 2 ? 70 : total >= 1 ? 40 : 0;
    const severity = severityFromScore(score);
    return {
      score,
      severity,
      label: 'Audit Integrity',
      details: { evidence_links: evidenceCount || 0, audit_events: auditCount || 0, total_records: total },
    };
  }

  private static async computeBindingScore(prompt: any): Promise<CategoryScore> {
    const versionId = prompt.current_version_id;
    if (!versionId) {
      return { score: 50, severity: 'warning', label: 'Binding Health', details: { reason: 'No current version' } };
    }
    const { data: bindings } = await supabaseAdmin
      .from('prompt_bindings')
      .select('*')
      .eq('prompt_version_id', versionId);
    const allBindings = (bindings || []);
    const evaluation = PromptBindingPolicyService.evaluateBindings(allBindings);
    if (evaluation.violations.length === 0 && allBindings.length > 0) {
      return { score: 100, severity: 'healthy', label: 'Binding Health', details: { binding_count: allBindings.length, violations: 0 } };
    }
    if (evaluation.violations.length === 0) {
      return { score: 50, severity: 'warning', label: 'Binding Health', details: { binding_count: 0, reason: 'No bindings defined' } };
    }
    const violationScore = Math.max(0, 100 - (evaluation.violations.length * 25));
    const severity = severityFromScore(violationScore);
    return {
      score: violationScore,
      severity,
      label: 'Binding Health',
      details: { binding_count: allBindings.length, violations: evaluation.violations.length, violation_types: evaluation.violations.map((v: any) => v.type) },
    };
  }

  private static computeLifecycleScore(prompt: any): CategoryScore {
    const status = String(prompt.status || '').toLowerCase();
    const activeStatuses = [PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.APPROVED_STAGING].map((s: string) => s.toLowerCase());
    const warningStatuses = [PROMPT_STATUS.PRODUCTION_PENDING, PROMPT_STATUS.REVIEW_REQUESTED, PROMPT_STATUS.PAUSED].map((s: string) => s.toLowerCase());
    if (activeStatuses.includes(status)) return { score: 100, severity: 'healthy', label: 'Lifecycle Status', details: { status } };
    if (warningStatuses.includes(status)) return { score: 60, severity: 'warning', label: 'Lifecycle Status', details: { status } };
    if (status === PROMPT_STATUS.DRAFT.toLowerCase()) return { score: 40, severity: 'warning', label: 'Lifecycle Status', details: { status } };
    return { score: 20, severity: 'critical', label: 'Lifecycle Status', details: { status } };
  }

  // ─── Batch-computed category scores (list endpoint, no per-prompt queries) ──

  private static computeDependencyHealthScoreFromBatch(prompt: any, deploys: any[], runs: any[]): CategoryScore {
    const risk = String(prompt.risk_tier || '').toLowerCase();
    let issues = 0;
    if (risk === 'tier_4_critical') {
      const hasProdDeploy = deploys.some((d: any) => String(d.environment).toLowerCase() === 'production');
      if (!hasProdDeploy) issues += 1;
    }
    const hasPassingRun = runs.some((r: any) => r.pass_fail === 'PASS' && !r.run_metadata?.adversarial);
    if (!hasPassingRun) issues += 1;
    const score = Math.max(0, 100 - (issues * 30));
    return { score, severity: severityFromScore(score), label: 'Dependency Health', details: { issues, has_prod_deploy: deploys.length > 0, has_passing_run: hasPassingRun } };
  }

  private static computeApprovalScoreFromBatch(prompt: any, approvals: any[]): CategoryScore {
    const required = PromptApprovalPolicyService.requiredApprovalRoles(prompt.risk_tier);
    const approvedRoles = new Set(
      approvals
        .filter((a: any) => String(a.decision).toUpperCase() === 'APPROVED')
        .map((a: any) => PromptApprovalPolicyService.normalizeReviewerRole(a.reviewer_role)),
    );
    const satisfied = required.filter((r) => Array.from(approvedRoles).some((role) => PromptApprovalPolicyService.canRoleSatisfy(r, role)));
    const ratio = required.length > 0 ? satisfied.length / required.length : 1;
    const score = Math.round(ratio * 100);
    return { score, severity: severityFromScore(score), label: 'Approval Completeness', details: { required, approved_roles: Array.from(approvedRoles), satisfied_count: satisfied.length, required_count: required.length } };
  }

  private static computeAdversarialScoreFromBatch(prompt: any, runs: any[]): CategoryScore {
    const advRuns = runs.filter((r: any) => r.run_metadata?.adversarial === true);
    if (advRuns.length === 0) {
      return { score: 50, severity: 'warning', label: 'Adversarial Testing', details: { reason: 'No adversarial runs found' } };
    }
    const latest = advRuns[0];
    const summary = latest.score_summary || {};
    const overallScore = summary.overall_score ?? 50;
    if (latest.pass_fail === 'PASS') return { score: Math.min(overallScore, 100), severity: 'healthy', label: 'Adversarial Testing', details: { latest_run_id: latest.id, overall_score: overallScore, pass_fail: 'PASS' } };
    if (latest.pass_fail === 'WARN') return { score: 60, severity: 'warning', label: 'Adversarial Testing', details: { latest_run_id: latest.id, overall_score: overallScore, pass_fail: 'WARN' } };
    return { score: 30, severity: 'critical', label: 'Adversarial Testing', details: { latest_run_id: latest.id, overall_score: overallScore, pass_fail: 'FAIL' } };
  }

  private static computeDriftScoreFromBatch(prompt: any, version: any, approvals: any[], bindings: any[], deploys: any[], audit: any[]): CategoryScore {
    let findings = 0;
    let highFindings = 0;
    let mediumFindings = 0;

    // Version drift: current version not locked for active prompts
    const activeStatuses = [PROMPT_STATUS.PRODUCTION_ACTIVE, 'approved_for_staging', 'production_pending'].map((s: string) => s?.toLowerCase());
    if (activeStatuses.includes(String(prompt.status).toLowerCase()) && version && !version.immutable) {
      highFindings += 1;
      findings += 1;
    }

    // Approval drift: missing roles for active prompts
    if (activeStatuses.includes(String(prompt.status).toLowerCase())) {
      const required = PromptApprovalPolicyService.requiredApprovalRoles(prompt.risk_tier);
      const approvedRoles = new Set(
        approvals
          .filter((a: any) => String(a.decision).toUpperCase() === 'APPROVED')
          .map((a: any) => PromptApprovalPolicyService.normalizeReviewerRole(a.reviewer_role)),
      );
      const missing = required.filter((r) => !Array.from(approvedRoles).some((role) => PromptApprovalPolicyService.canRoleSatisfy(r, role)));
      if (missing.length > 0) {
        highFindings += 1;
        findings += 1;
      }
    }

    // Audit gap drift
    if (audit.length === 0 && String(prompt.status).toLowerCase() !== PROMPT_STATUS.DRAFT.toLowerCase()) {
      mediumFindings += 1;
      findings += 1;
    }

    const score = Math.max(0, 100 - (highFindings * 30) - (mediumFindings * 15));
    return { score, severity: severityFromScore(score), label: 'Drift Status', details: { drift_count: findings, high: highFindings, medium: mediumFindings, low: 0 } };
  }

  private static computeAuditScoreFromBatch(prompt: any, evidence: any[], audit: any[]): CategoryScore {
    const total = evidence.length + audit.length;
    const score = total >= 5 ? 100 : total >= 2 ? 70 : total >= 1 ? 40 : 0;
    return { score, severity: severityFromScore(score), label: 'Audit Integrity', details: { evidence_links: evidence.length, audit_events: audit.length, total_records: total } };
  }

  private static computeBindingScoreFromBatch(bindings: any[]): CategoryScore {
    const evaluation = PromptBindingPolicyService.evaluateBindings(bindings);
    if (evaluation.violations.length === 0 && bindings.length > 0) {
      return { score: 100, severity: 'healthy', label: 'Binding Health', details: { binding_count: bindings.length, violations: 0 } };
    }
    if (evaluation.violations.length === 0) {
      return { score: 50, severity: 'warning', label: 'Binding Health', details: { binding_count: 0, reason: 'No bindings defined' } };
    }
    const score = Math.max(0, 100 - (evaluation.violations.length * 25));
    return { score, severity: severityFromScore(score), label: 'Binding Health', details: { binding_count: bindings.length, violations: evaluation.violations.length, violation_types: evaluation.violations.map((v: any) => v.type) } };
  }

  private static computeLifecycleScoreFromBatch(prompt: any): CategoryScore {
    return this.computeLifecycleScore(prompt);
  }

  private static isDeployReadyFromBatch(prompt: any, approvals: any[], runs: any[]): boolean {
    // Gate: approvals complete + standard tests pass + adversarial pass for Tier 4
    const required = PromptApprovalPolicyService.requiredApprovalRoles(prompt.risk_tier);
    const approvedRoles = new Set(
      approvals
        .filter((a: any) => String(a.decision).toUpperCase() === 'APPROVED')
        .map((a: any) => PromptApprovalPolicyService.normalizeReviewerRole(a.reviewer_role)),
    );
    const complete = required.every((r) => Array.from(approvedRoles).some((role) => PromptApprovalPolicyService.canRoleSatisfy(r, role)));
    if (!complete) return false;

    const hasPassingTest = runs.some((r: any) => r.pass_fail === 'PASS' && !r.run_metadata?.adversarial);
    if (!hasPassingTest) return false;

    // NB1 fix: Tier 4 prompts require a passing adversarial test run
    if (String(prompt.risk_tier).toLowerCase() === 'tier_4_critical') {
      const hasAdversarialPass = runs.some(
        (r: any) => r.pass_fail === 'PASS' && r.run_metadata?.adversarial === true,
      );
      if (!hasAdversarialPass) return false;
    }

    return true;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../../shared/supabase';
import { PromptDependencyService } from '../PromptDependencyService';
import { DependencyImpactService, ImpactAnalysisResult } from './DependencyImpactService';
import { ReverseDependencyService, ReverseTargetType, ReverseDependencyResult } from './ReverseDependencyService';
import { DependencyNotificationPlanner, NotificationPlan, NotificationPlanInput } from './DependencyNotificationPlanner';
import { ApprovalInvalidationService, ApprovalValidity } from '../ApprovalInvalidationService';
import {
  DependencyHealthSummary,
  DependencySeverity,
  DependencyHealthStatus,
  DependencyHealthResult,
} from '../DependencyHealthService';
import { BehavioralDriftService, BehavioralDriftCategory, BehavioralDriftReport } from './BehavioralDriftService';
import { ADVERSARIAL_CATEGORIES, ADVERSARIAL_CATEGORY_LIST, AdversarialCategoryId } from '../adversarialCategories';
import { ProviderId } from '../crossModelProviders';
import { isRealModelValidationEnabled } from '../modelProviders';
import { listRegisteredProviders } from '../ModelExecutionAdapter';
import { computePDIBand, PDIBand } from '../pdiBands';

// ─────────────────────────────────────────────────────────────────────────────
// GovernanceDashboardService — Batch 3B.14 (Read-only aggregation)
//
// Rolls the dependency-governance suite into one model:
//   * dependency health   (PromptDependencyService.getGraph → summary/edges)
//   * dependency impact    (DependencyImpactService.analyzeDeploymentImpact)
//   * reverse dependencies (ReverseDependencyService.getDependents)
//   * notification plans    (DependencyNotificationPlanner.planNotifications)
//   * approval validity     (ApprovalInvalidationService.getValidity / column)
//
// Two scopes:
//   getWorkspaceDashboard()      — cheap workspace rollup (1 prompts query +
//                                  bounded per-prompt graph fan-out via opts.limit).
//   getPromptGovernanceSnapshot() — deep per-prompt investigation; this is where
//                                  reverse-deps + notification plans belong, driven
//                                  by the prompt's OWN degraded edges (no workspace
//                                  combinatorial enumeration).
//
// Tenant isolation: everything derives from workspace-filtered prompts and the
// underlying workspace-scoped services. Pure read: NO mutations, delivery, audit,
// evidence, or deployment/runtime side-effects.
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: DependencySeverity[] = ['none', 'low', 'medium', 'high', 'critical'];

function maxSeverity(a: DependencySeverity, b: DependencySeverity): DependencySeverity {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

// dependency_type values emitted by getGraph that are valid reverse targets
// (excludes 'version', which carries no health).
const REVERSE_TARGET_TYPES = new Set<ReverseTargetType>([
  'agent', 'workflow', 'workflow_node', 'channel', 'brand', 'knowledge', 'collection', 'tool', 'policy',
]);

/** Translate a classified health status into the signal the planner needs to
 *  reproduce it. MISSING is an existence failure; the rest map by status string
 *  (DependencyHealthService lowercases + maps them). STALE/WARNING have no status
 *  keyword and resolve to a non-blocking/empty plan — acceptable for those tiers. */
function statusToSignal(status: DependencyHealthStatus): Partial<NotificationPlanInput> {
  if (status === 'MISSING') return { exists: false };
  return { status: status.toLowerCase() };
}

export interface WorkspaceDashboardOptions {
  /** Max prompts to fan out graph/health for. Default 100. */
  limit?: number;
}

// Hard cap on the evidence-link scan used to compute distinct prompts-with-evidence.
const EVIDENCE_COMPLETENESS_SCAN_CAP = 20000;

export interface WorkspaceRuntimeRollup {
  runtime_trace_count: number;
  runtime_violation_count: number;
  open_incident_count: number;
  evidence_link_count: number;
  evidence_completeness_score: number;
  export_ready_prompt_count: number;
  completeness_basis_truncated: boolean;
}

export interface PromptRuntimeSummary {
  runtime_traces: { total: number };
  violations: { total: number };
  incidents: { total: number; open: number };
  evidence: { link_count: number };
  export_readiness: { export_ready: boolean; evidence_link_count: number };
}

export interface WorkspacePromptRow {
  prompt_id: string;
  name: string;
  status: string;
  risk_tier: string | null;
  approval_valid: boolean;
  health_summary: DependencyHealthSummary;
  deploy_blocked: boolean;
}

export interface GovernanceDashboard {
  workspace_id: string;
  generated_for: 'workspace';
  prompt_totals: { total: number; by_status: Record<string, number>; by_risk_tier: Record<string, number> };
  approval: { invalidated_count: number; valid_count: number };
  dependency_health: { by_status: Record<string, number>; blocking_count: number; highest_severity: DependencySeverity };
  deployment: { blocked_count: number; ready_count: number };
  prompts: WorkspacePromptRow[];
  truncated: boolean;
  runtime: WorkspaceRuntimeRollup;
  summary: {
    prompt_count: number;
    considered_count: number;
    blocked_count: number;
    invalidated_count: number;
    highest_severity: DependencySeverity;
  };
}

export interface DegradedDependency {
  target: { type: ReverseTargetType; id: string };
  dependency_type: string;
  environment: string | null;
  health: DependencyHealthResult;
  dependents_summary: ReverseDependencyResult['summary'];
  notification_plan: NotificationPlan;
}

export interface PromptGovernanceSnapshot {
  prompt_id: string;
  workspace_id: string;
  found: boolean;
  health: DependencyHealthSummary;
  deployment_impact: ImpactAnalysisResult | null;
  approval_validity: ApprovalValidity;
  degraded_dependencies: DegradedDependency[];
  runtime: PromptRuntimeSummary;
}

export class GovernanceDashboardService {
  /** Tenant-scoped exact count (head:true — no rows fetched). */
  private static async countScoped(
    table: string,
    apply: (q: any) => any,
  ): Promise<number> {
    const { count, error } = await apply(
      supabaseAdmin.from(table).select('id', { count: 'exact', head: true }),
    );
    if (error) throw error;
    return count || 0;
  }

  /**
   * Read-only workspace runtime rollup. Four exact counts + one capped distinct
   * scan over prompt_evidence_links for export-ready prompts. No side effects.
   */
  private static async computeWorkspaceRuntimeRollup(
    workspaceId: string,
    totalPrompts: number,
  ): Promise<WorkspaceRuntimeRollup> {
    const [runtime_trace_count, runtime_violation_count, open_incident_count, evidence_link_count] =
      await Promise.all([
        this.countScoped('prompt_runtime_traces', (q) => q.eq('workspace_id', workspaceId)),
        this.countScoped('prompt_runtime_traces', (q) => q.eq('workspace_id', workspaceId).eq('violation', true)),
        this.countScoped('prompt_incidents', (q) => q.eq('workspace_id', workspaceId).neq('status', 'closed')),
        this.countScoped('prompt_evidence_links', (q) => q.eq('workspace_id', workspaceId)),
      ]);

    // Distinct prompts with >=1 evidence link — capped scan (no silent cap).
    const { data: linkRows, error: linkErr } = await supabaseAdmin
      .from('prompt_evidence_links')
      .select('prompt_id')
      .eq('workspace_id', workspaceId)
      .not('prompt_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(0, EVIDENCE_COMPLETENESS_SCAN_CAP - 1);
    if (linkErr) throw linkErr;
    const rows = linkRows || [];
    const completeness_basis_truncated = rows.length >= EVIDENCE_COMPLETENESS_SCAN_CAP;
    const distinctPrompts = new Set<string>();
    for (const r of rows) if (r.prompt_id) distinctPrompts.add(r.prompt_id as string);
    const export_ready_prompt_count = distinctPrompts.size;

    const evidence_completeness_score =
      totalPrompts > 0 ? Math.round((100 * export_ready_prompt_count) / totalPrompts) : 0;

    return {
      runtime_trace_count,
      runtime_violation_count,
      open_incident_count,
      evidence_link_count,
      evidence_completeness_score,
      export_ready_prompt_count,
      completeness_basis_truncated,
    };
  }

  /** Read-only per-prompt runtime summary. Workspace + prompt scoped. */
  private static async computePromptRuntimeSummary(
    promptId: string,
    workspaceId: string,
  ): Promise<PromptRuntimeSummary> {
    const [traceTotal, violationTotal, incidentTotal, incidentOpen, linkCount] = await Promise.all([
      this.countScoped('prompt_runtime_traces', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId)),
      this.countScoped('prompt_runtime_traces', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId).eq('violation', true)),
      this.countScoped('prompt_incidents', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId)),
      this.countScoped('prompt_incidents', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId).neq('status', 'closed')),
      this.countScoped('prompt_evidence_links', (q) => q.eq('workspace_id', workspaceId).eq('prompt_id', promptId)),
    ]);

    return {
      runtime_traces: { total: traceTotal },
      violations: { total: violationTotal },
      incidents: { total: incidentTotal, open: incidentOpen },
      evidence: { link_count: linkCount },
      export_readiness: { export_ready: linkCount > 0, evidence_link_count: linkCount },
    };
  }

  /**
   * Workspace-level governance rollup. One prompts query for totals; per-prompt
   * graph fan-out is bounded by opts.limit (default 100) with a `truncated` flag.
   * Approval aggregates use the prompts.approval_invalidated_at column — NOT
   * getValidity() per prompt.
   */
  static async getWorkspaceDashboard(
    workspaceId: string,
    opts: WorkspaceDashboardOptions = {},
  ): Promise<GovernanceDashboard> {
    const limit = opts.limit ?? 100;

    // ── 1. ONE workspace-scoped prompts query — totals over ALL prompts ──────
    const { data, error } = await supabaseAdmin
      .from('prompts')
      .select('id, name, status, risk_tier, current_version_id, approval_invalidated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const all = (data as any[]) || [];

    const by_status: Record<string, number> = {};
    const by_risk_tier: Record<string, number> = {};
    let invalidated_count = 0;
    for (const p of all) {
      const s = p.status || 'unknown';
      by_status[s] = (by_status[s] || 0) + 1;
      const rt = p.risk_tier || 'unspecified';
      by_risk_tier[rt] = (by_risk_tier[rt] || 0) + 1;
      if (p.approval_invalidated_at) invalidated_count++;
    }

    // ── 2. Bounded per-prompt graph fan-out for health + deploy-readiness ────
    const considered = all.slice(0, limit);
    const truncated = all.length > considered.length;

    const graphs = await Promise.all(
      considered.map((p) => PromptDependencyService.getGraph(p.id, workspaceId)),
    );

    const health_by_status: Record<string, number> = {};
    let health_blocking_count = 0;
    let highest_severity: DependencySeverity = 'none';
    let blocked_count = 0;
    const rows: WorkspacePromptRow[] = [];

    for (let i = 0; i < considered.length; i++) {
      const p = considered[i];
      const summary = graphs[i].summary;
      for (const [k, v] of Object.entries(summary.by_status)) {
        health_by_status[k] = (health_by_status[k] || 0) + (v as number);
      }
      health_blocking_count += summary.blocking_count;
      highest_severity = maxSeverity(highest_severity, summary.highest_severity);

      const approval_valid = !p.approval_invalidated_at;
      const deploy_blocked = !approval_valid || summary.blocked;
      if (deploy_blocked) blocked_count++;

      rows.push({
        prompt_id: p.id,
        name: p.name || p.id,
        status: p.status || 'unknown',
        risk_tier: p.risk_tier ?? null,
        approval_valid,
        health_summary: summary,
        deploy_blocked,
      });
    }

    const runtime = await this.computeWorkspaceRuntimeRollup(workspaceId, all.length);

    return {
      workspace_id: workspaceId,
      generated_for: 'workspace',
      prompt_totals: { total: all.length, by_status, by_risk_tier },
      approval: { invalidated_count, valid_count: all.length - invalidated_count },
      dependency_health: {
        by_status: health_by_status,
        blocking_count: health_blocking_count,
        highest_severity,
      },
      deployment: { blocked_count, ready_count: considered.length - blocked_count },
      prompts: rows,
      truncated,
      runtime,
      summary: {
        prompt_count: all.length,
        considered_count: considered.length,
        blocked_count,
        invalidated_count,
        highest_severity,
      },
    };
  }

  /**
   * Deep per-prompt governance investigation. Combines health, deployment impact,
   * approval validity, and — for each degraded dependency edge — its reverse
   * dependents and notification plan. getValidity() is used ONLY here.
   */
  static async getPromptGovernanceSnapshot(
    promptId: string,
    workspaceId: string,
    opts: { referenceTime?: string } = {},
  ): Promise<PromptGovernanceSnapshot> {
    const graph = await PromptDependencyService.getGraph(promptId, workspaceId, {
      referenceTime: opts.referenceTime,
    });

    if (!graph.found) {
      return {
        prompt_id: promptId,
        workspace_id: workspaceId,
        found: false,
        health: graph.summary,
        deployment_impact: null,
        approval_validity: { valid: true, invalidated: false },
        degraded_dependencies: [],
        runtime: await this.computePromptRuntimeSummary(promptId, workspaceId),
      };
    }

    // Approval validity — resolve the current version (tenant-scoped lookup).
    const { data: prompt } = await supabaseAdmin
      .from('prompts')
      .select('current_version_id')
      .eq('id', promptId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    const currentVersionId = prompt?.current_version_id || undefined;
    const approval_validity: ApprovalValidity = currentVersionId
      ? await ApprovalInvalidationService.getValidity(currentVersionId)
      : { valid: true, invalidated: false };

    const deployment_impact = await DependencyImpactService.analyzeDeploymentImpact(promptId, workspaceId, {
      referenceTime: opts.referenceTime,
    });

    // Degraded edges (non-HEALTHY) that are valid reverse targets, deduped by target.
    const seen = new Set<string>();
    const degradedEdges = graph.edges.filter((e) => {
      if (!e.health || e.health.status === 'HEALTHY') return false;
      if (!REVERSE_TARGET_TYPES.has(e.dependency_type as ReverseTargetType)) return false;
      const key = `${e.dependency_type}:${e.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const degraded_dependencies: DegradedDependency[] = await Promise.all(
      degradedEdges.map(async (e) => {
        const targetType = e.dependency_type as ReverseTargetType;
        const [dependents, notification_plan] = await Promise.all([
          ReverseDependencyService.getDependents(targetType, e.target, workspaceId),
          DependencyNotificationPlanner.planNotifications({
            targetType,
            targetId: e.target,
            workspaceId,
            referenceTime: opts.referenceTime,
            ...statusToSignal((e.health as DependencyHealthResult).status),
          }),
        ]);
        return {
          target: { type: targetType, id: e.target },
          dependency_type: e.dependency_type,
          environment: e.environment,
          health: e.health as DependencyHealthResult,
          dependents_summary: dependents.summary,
          notification_plan,
        };
      }),
    );

    const runtime = await this.computePromptRuntimeSummary(promptId, workspaceId);

    return {
      prompt_id: promptId,
      workspace_id: workspaceId,
      found: true,
      health: graph.summary,
      deployment_impact,
      approval_validity,
      degraded_dependencies,
      runtime,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Phase 6.5 — Evaluation Intelligence Dashboard
  //
  // Three read-only rollup views, computed from existing prompt tables +
  // audit ledger + BehavioralDriftService. No new tables, no new pages,
  // no duplicate data. Each view returns a structured object that the
  // existing dashboard renders into a tab/section.
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Evaluation view — PDI trends, evaluation pass rates, and cross-model
   * rankings. Reads only existing tables: prompts, prompt_audit_ledger.
   */
  static async getEvaluationView(workspaceId: string): Promise<EvaluationView> {
    // PDI trend: last 50 prompt.defensibility_index.computed events for the
    // workspace, grouped by date.
    const { data: pdiEvents } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('after_state, created_at, prompt_id, version_id')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'prompt.defensibility_index.computed')
      .order('created_at', { ascending: false })
      .limit(50);

    const pdiByVersion: Record<string, { score: number; band: PDIBand; at: string }> = {};
    for (const e of pdiEvents || []) {
      const vs = String(e.version_id || '');
      if (!vs || pdiByVersion[vs]) continue;
      const score = (e.after_state as any)?.pdi_score ?? 0;
      pdiByVersion[vs] = { score, band: computePDIBand(score), at: e.created_at };
    }

    const pdiTrend: EvaluationPDIPoint[] = (pdiEvents || []).slice(0, 30).map((e) => {
      const score = (e.after_state as any)?.pdi_score ?? 0;
      return {
        prompt_id: e.prompt_id,
        version_id: e.version_id,
        score,
        band: computePDIBand(score),
        at: e.created_at,
      };
    });

    const allScores = Object.values(pdiByVersion).map((v) => v.score);
    const bandCounts: Record<PDIBand, number> = { EXCELLENT: 0, STRONG: 0, MODERATE: 0, WEAK: 0 };
    for (const v of Object.values(pdiByVersion)) bandCounts[v.band]++;
    const pdiSummary = {
      total_computed: Object.keys(pdiByVersion).length,
      average_score: allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0,
      band_distribution: bandCounts,
    };

    // Evaluation pass rate: count of test runs (non-adversarial) in the
    // workspace. Pass rate is computed over the last 100 runs.
    const { data: runs } = await supabaseAdmin
      .from('prompt_test_runs')
      .select('pass_fail, score_summary, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);
    const evalRuns = (runs || []).filter((r: any) => r.run_metadata?.adversarial !== true);
    const passed = evalRuns.filter((r) => String(r.pass_fail).toUpperCase() === 'PASS').length;
    const failed = evalRuns.filter((r) => String(r.pass_fail).toUpperCase() === 'FAIL').length;
    const warnings = evalRuns.length - passed - failed;
    const passRate = evalRuns.length > 0 ? Math.round((passed / evalRuns.length) * 100) : 0;
    const evalTrend: EvaluationPassPoint[] = (runs || []).slice(0, 30).map((r) => ({
      pass_fail: String(r.pass_fail || 'UNKNOWN'),
      score: (r.score_summary as any)?.overall_score ?? 0,
      at: r.created_at,
    }));

    // Cross-model rankings: read the latest cross-model real comparison per
    // prompt_version_id. We aggregate by reading the latest audit events.
    const { data: cmEvents } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('after_state, version_id, created_at')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'prompt.cross_model.real_comparison')
      .order('created_at', { ascending: false })
      .limit(20);

    const crossModelRankings: CrossModelRanking[] = [];
    const providerWinCount: Record<ProviderId, number> = { google: 0, groq: 0 };
    for (const e of cmEvents || []) {
      const winner = (e.after_state as any)?.winner as ProviderId | null;
      if (winner) providerWinCount[winner] = (providerWinCount[winner] || 0) + 1;
      const providers = (e.after_state as any)?.providers_evaluated as ProviderId[] | undefined;
      if (providers && Array.isArray(providers)) {
        for (const p of providers) {
          if (!crossModelRankings.find((r) => r.provider === p)) {
            crossModelRankings.push({ provider: p, wins: providerWinCount[p] || 0 });
          }
        }
      }
    }
    for (const r of crossModelRankings) r.wins = providerWinCount[r.provider] || 0;
    crossModelRankings.sort((a, b) => b.wins - a.wins);

    return {
      workspace_id: workspaceId,
      generated_at: new Date().toISOString(),
      validation_enabled: isRealModelValidationEnabled(),
      registered_providers: listRegisteredProviders() as ProviderId[],
      pdi: {
        summary: pdiSummary,
        trend: pdiTrend,
      },
      evaluation: {
        total_runs: evalRuns.length,
        pass_rate: passRate,
        passed,
        failed,
        warnings,
        trend: evalTrend,
      },
      cross_model: {
        rankings: crossModelRankings,
        providers_evaluated: crossModelRankings.length,
        most_recent_winner: (cmEvents?.[0]?.after_state as any)?.winner || null,
        last_evaluation_at: cmEvents?.[0]?.created_at || null,
      },
    };
  }

  /**
   * Adversarial view — pass rates, attack categories, risk distribution.
   * Reads prompt_audit_ledger for real-adversarial events and aggregates
   * by category, severity, and verdict.
   */
  static async getAdversarialView(workspaceId: string): Promise<AdversarialView> {
    const { data: events } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('after_state, created_at, prompt_id, version_id')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'prompt.test.adversarial.real_attack')
      .order('created_at', { ascending: false })
      .limit(500);

    const byCategory: Record<AdversarialCategoryId, { total: number; passed: number; failed: number; warnings: number; pass_rate: number }> = {} as any;
    for (const cat of ADVERSARIAL_CATEGORY_LIST) {
      byCategory[cat.id] = { total: 0, passed: 0, failed: 0, warnings: 0, pass_rate: 0 };
    }
    const bySeverity: Record<string, { total: number; failed: number }> = {
      critical: { total: 0, failed: 0 },
      high: { total: 0, failed: 0 },
      medium: { total: 0, failed: 0 },
      low: { total: 0, failed: 0 },
    };

    let totalAttacks = 0;
    let totalPasses = 0;
    let totalFailures = 0;
    let bypasses = 0;

    for (const e of events || []) {
      const s = e.after_state as any;
      const cat = s?.category as AdversarialCategoryId;
      const sev = s?.severity as string;
      const verdict = s?.verdict as string;
      if (!cat || !byCategory[cat]) continue;
      byCategory[cat].total++;
      totalAttacks++;
      if (verdict === 'pass') {
        byCategory[cat].passed++;
        totalPasses++;
      } else if (verdict === 'fail') {
        byCategory[cat].failed++;
        totalFailures++;
      } else if (verdict === 'warning') {
        byCategory[cat].warnings++;
      }
      if (s?.bypass_detected) bypasses++;
      if (bySeverity[sev]) {
        bySeverity[sev].total++;
        if (verdict !== 'pass') bySeverity[sev].failed++;
      }
    }
    for (const c of Object.values(byCategory)) {
      c.pass_rate = c.total > 0 ? Math.round((c.passed / c.total) * 100) : 0;
    }
    const overallPassRate = totalAttacks > 0 ? Math.round((totalPasses / totalAttacks) * 100) : 0;

    return {
      workspace_id: workspaceId,
      generated_at: new Date().toISOString(),
      validation_enabled: isRealModelValidationEnabled(),
      registered_providers: listRegisteredProviders() as ProviderId[],
      summary: {
        total_attacks: totalAttacks,
        passed: totalPasses,
        failed: totalFailures,
        pass_rate: overallPassRate,
        bypasses_detected: bypasses,
      },
      by_category: byCategory,
      by_severity: bySeverity,
      category_metadata: ADVERSARIAL_CATEGORIES,
      recent_attacks: (events || []).slice(0, 20).map((e) => {
        const s = e.after_state as any;
        return {
          prompt_id: e.prompt_id,
          version_id: e.version_id,
          category: s?.category,
          severity: s?.severity,
          verdict: s?.verdict,
          bypass_detected: s?.bypass_detected,
          at: e.created_at,
        };
      }),
    };
  }

  /**
   * Drift view — semantic / safety / quality drift and incidents. Delegates
   * to BehavioralDriftService.detectWorkspaceDrift so we do not duplicate
   * drift logic; this view just packages the report for the dashboard.
   */
  static async getDriftView(workspaceId: string): Promise<DriftView> {
    const reports: BehavioralDriftReport[] = await BehavioralDriftService.detectWorkspaceDrift(workspaceId);

    const byCategory: Record<BehavioralDriftCategory, { total: number; by_severity: Record<string, number> }> = {
      semantic_drift: { total: 0, by_severity: { low: 0, medium: 0, high: 0, critical: 0 } },
      response_drift: { total: 0, by_severity: { low: 0, medium: 0, high: 0, critical: 0 } },
      safety_drift: { total: 0, by_severity: { low: 0, medium: 0, high: 0, critical: 0 } },
      quality_drift: { total: 0, by_severity: { low: 0, medium: 0, high: 0, critical: 0 } },
      model_drift: { total: 0, by_severity: { low: 0, medium: 0, high: 0, critical: 0 } },
    };
    const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const incidents: DriftView['incidents'] = [];
    let totalFindings = 0;

    for (const r of reports) {
      for (const f of r.findings) {
        totalFindings++;
        byCategory[f.category].total++;
        byCategory[f.category].by_severity[f.severity]++;
        bySeverity[f.severity]++;
        if (f.incident_id) {
          incidents.push({
            incident_id: f.incident_id,
            prompt_id: f.prompt_id,
            version_id: f.prompt_version_id,
            category: f.category,
            severity: f.severity,
            drift_score: f.drift_score,
            opened_at: f.detected_at,
          });
        }
      }
    }

    return {
      workspace_id: workspaceId,
      generated_at: new Date().toISOString(),
      validation_enabled: isRealModelValidationEnabled(),
      registered_providers: listRegisteredProviders() as ProviderId[],
      summary: {
        total_findings: totalFindings,
        prompts_with_drift: reports.length,
        by_severity: bySeverity as DriftView['summary']['by_severity'],
      },
      by_category: byCategory,
      incidents,
      reports,
    };
  }
}

// ─── Phase 6.5 — Dashboard View Types ──────────────────────────────────────

export interface EvaluationPDIPoint {
  prompt_id: string | null;
  version_id: string | null;
  score: number;
  band: PDIBand;
  at: string;
}

export interface EvaluationPassPoint {
  pass_fail: string;
  score: number;
  at: string;
}

export interface CrossModelRanking {
  provider: ProviderId;
  wins: number;
}

export interface EvaluationView {
  workspace_id: string;
  generated_at: string;
  /**
   * True when ENABLE_REAL_MODEL_VALIDATION=true at boot. The cross-model
   * section will show historical rankings from past real comparisons; the
   * dashboard renders a "Validation Disabled" notice when this is false.
   */
  validation_enabled: boolean;
  /** Provider ids currently registered in the boot-time adapter registry. */
  registered_providers: ProviderId[];
  pdi: {
    summary: {
      total_computed: number;
      average_score: number;
      band_distribution: Record<PDIBand, number>;
    };
    trend: EvaluationPDIPoint[];
  };
  evaluation: {
    total_runs: number;
    pass_rate: number;
    passed: number;
    failed: number;
    warnings: number;
    trend: EvaluationPassPoint[];
  };
  cross_model: {
    rankings: CrossModelRanking[];
    providers_evaluated: number;
    most_recent_winner: ProviderId | null;
    last_evaluation_at: string | null;
  };
}

export interface AdversarialView {
  workspace_id: string;
  generated_at: string;
  /**
   * True when ENABLE_REAL_MODEL_VALIDATION=true at boot. The dashboard
   * renders a "Validation Disabled" notice when this is false.
   */
  validation_enabled: boolean;
  /** Provider ids currently registered in the boot-time adapter registry. */
  registered_providers: ProviderId[];
  summary: {
    total_attacks: number;
    passed: number;
    failed: number;
    pass_rate: number;
    bypasses_detected: number;
  };
  by_category: Record<AdversarialCategoryId, { total: number; passed: number; failed: number; warnings: number; pass_rate: number }>;
  by_severity: Record<string, { total: number; failed: number }>;
  category_metadata: typeof ADVERSARIAL_CATEGORIES;
  recent_attacks: Array<{
    prompt_id: string | null;
    version_id: string | null;
    category: string;
    severity: string;
    verdict: string;
    bypass_detected: boolean;
    at: string;
  }>;
}

export interface DriftView {
  workspace_id: string;
  generated_at: string;
  /**
   * True when ENABLE_REAL_MODEL_VALIDATION=true at boot. Drift detection
   * does not call model adapters directly (it inspects runtime traces), so
   * this flag is informational — the dashboard still shows drift data when
   * validation is disabled, with a small "Validation Disabled" notice for
   * consistency with the other two Phase 6 dashboards.
   */
  validation_enabled: boolean;
  /** Provider ids currently registered in the boot-time adapter registry. */
  registered_providers: ProviderId[];
  summary: {
    total_findings: number;
    prompts_with_drift: number;
    by_severity: { low: number; medium: number; high: number; critical: number };
  };
  by_category: Record<BehavioralDriftCategory, { total: number; by_severity: Record<string, number> }>;
  incidents: Array<{
    incident_id: string;
    prompt_id: string;
    version_id: string;
    category: BehavioralDriftCategory;
    severity: string;
    drift_score: number;
    opened_at: string;
  }>;
  reports: BehavioralDriftReport[];
}

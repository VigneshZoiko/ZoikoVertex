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
}

export class GovernanceDashboardService {
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

    return {
      prompt_id: promptId,
      workspace_id: workspaceId,
      found: true,
      health: graph.summary,
      deployment_impact,
      approval_validity,
      degraded_dependencies,
    };
  }
}

import { supabaseAdmin } from '../shared/supabase';
import { logger } from '../shared/logger';

export async function getWorkflowAnalytics(workspaceId: string) {
  const results = await Promise.all([
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).ilike('status', 'active'),
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).in('status', ['running', 'pending', 'waiting_review', 'waiting_approval']),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null).gt('completed_at', 'due_at'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null),
    supabaseAdmin.from('approval_records').select('id, decided_at, created_at', { count: 'exact' }).not('decided_at', 'is', null),
    supabaseAdmin.from('approval_records').select('id', { count: 'exact', head: true }).eq('decision', 'PENDING'),
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('health', 'Healthy'),
  ]);

  const [activeTemplates, totalTemplates, activeRuns, blockedRuns, completedRuns, failedRuns, slaBreached, slaTotal, , pendingApprovals, unhealthyDeps] = results.map((r) => r.count || 0);

  const totalInstances = completedRuns + failedRuns;
  const completionRate = totalInstances > 0 ? Math.round((completedRuns / totalInstances) * 100) : 0;
  const blockedRate = totalInstances > 0 ? Math.round((blockedRuns / (totalInstances + blockedRuns)) * 100) : 0;
  const slaBreachRate = slaTotal > 0 ? Math.round((slaBreached / slaTotal) * 100) : 0;
  const failureRate = totalInstances > 0 ? Math.round((failedRuns / totalInstances) * 100) : 0;

  return {
    active_workflows: activeTemplates,
    total_templates: totalTemplates,
    active_runs: activeRuns,
    blocked_runs: blockedRuns,
    pending_approvals: pendingApprovals,
    unhealthy_dependencies: unhealthyDeps,
    completion_rate: completionRate,
    blocked_run_rate: blockedRate,
    sla_breach_rate: slaBreachRate,
    failure_rate: failureRate,
    evidence_completeness: 0,
    evidence_completeness_unavailable: true,
    dependency_health: totalTemplates > 0 ? Math.round(((totalTemplates - unhealthyDeps) / totalTemplates) * 100) : 100,
  };
}

export async function getControlStripData(workspaceId: string) {
  // workflow_templates.status is a Postgres ENUM — a `.ilike()`/`.eq('Active')`
  // count query on it silently returns a null count (no error), which is why
  // ACTIVE WORKFLOWS read 0. Fetch the templates (safe columns only) and count
  // in JS instead — immune to enum/casing quirks.
  const [tplRes, pendingApprovals, blockedRuns, failedRuns] = await Promise.all([
    supabaseAdmin.from('workflow_templates').select('id, status, risk_level').eq('workspace_id', workspaceId),
    // Agent posts awaiting a decision are waiting_review/pending workflow runs,
    // not approval_records — count those so "Pending Approvals" reflects reality.
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).in('status', ['waiting_review', 'waiting_approval', 'pending']),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);

  const templates = (tplRes.data || []) as Array<{ status?: string; risk_level?: string }>;
  const isActive = (t: { status?: string }) => String(t.status || '').toLowerCase() === 'active';
  const activeWorkflows = templates.filter(isActive).length;
  const criticalRiskItems = templates.filter(
    (t) => isActive(t) && ['high', 'critical'].includes(String(t.risk_level || '').toLowerCase()),
  ).length;

  logger.info(
    {
      workspaceId,
      templateCount: templates.length,
      activeWorkflows,
      criticalRiskItems,
      pendingApprovals: pendingApprovals.count,
      tplError: tplRes.error?.message || null,
    },
    '[workflow-stats] control strip',
  );

  return {
    activeWorkflows,
    pendingApprovals: pendingApprovals.count || 0,
    blockedRuns: blockedRuns.count || 0,
    failedRuns: failedRuns.count || 0,
    slaBreach: 0,
    staleDependencies: 0,
    criticalRiskItems,
  };
}

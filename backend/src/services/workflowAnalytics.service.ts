import { supabaseAdmin } from '../shared/supabase';

export async function getWorkflowAnalytics(workspaceId: string) {
  const results = await Promise.all([
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'Active'),
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).in('status', ['RUNNING', 'RUNNING']),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'BLOCKED'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'FAILED'),
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
    dependency_health: totalTemplates > 0 ? Math.round(((totalTemplates - unhealthyDeps) / totalTemplates) * 100) : 100,
  };
}

export async function getControlStripData(workspaceId: string) {
  const [activeWf, pendingApprovals, blockedRuns, failedRuns, slaBreach, staleDeps, criticalRisk] = await Promise.all([
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'Active'),
    supabaseAdmin.from('approval_records').select('id', { count: 'exact', head: true }).eq('decision', 'PENDING'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'BLOCKED'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).eq('status', 'FAILED'),
    supabaseAdmin.from('workflow_instances').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null).gt('completed_at', 'due_at'),
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).neq('health', 'Healthy'),
    supabaseAdmin.from('workflow_templates').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).in('risk_level', ['high', 'critical']).eq('status', 'Active'),
  ]);

  return {
    activeWorkflows: activeWf.count || 0,
    pendingApprovals: pendingApprovals.count || 0,
    blockedRuns: blockedRuns.count || 0,
    failedRuns: failedRuns.count || 0,
    slaBreach: slaBreach.count || 0,
    staleDependencies: staleDeps.count || 0,
    criticalRiskItems: criticalRisk.count || 0,
  };
}

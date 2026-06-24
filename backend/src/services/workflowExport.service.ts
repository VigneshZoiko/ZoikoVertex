import { supabaseAdmin } from '../shared/supabase';
import * as evidenceService from './workflowEvidence.service';
import * as dependencyService from './workflowDependency.service';
import * as simulationService from './workflowSimulation.service';
import { createAuditEvent } from './auditTrail.service';
import { alertSecOpsAuditFailure } from '../shared/alertSecOps';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExportPayload {
  exported_at: string;
  exported_by: string;
  export_reason: string;
  workflow: {
    id: string;
    name: string;
    status: string;
    risk_level: string;
    created_at: string | null;
    updated_at: string | null;
  };
  versions: Array<{
    id: string;
    version_number: number;
    state: string;
    created_at: string;
    created_by: string;
  }>;
  evidence_bundles: any[];
  approval_chains: any[];
  simulation_results: any[];
  dependency_results: any[];
  policy_results: any[];
  warnings: string[];
  blocks: string[];
  errors: string[];
  metrics: {
    total_versions: number;
    total_evidence_bundles: number;
    total_simulations: number;
    total_approvals: number;
    total_dependencies: number;
    total_policy_checks: number;
    evidence_refs: string[];
  };
}

export interface CsvRow {
  [key: string]: string | number | boolean | null;
}

export interface PdfReadyPayload {
  title: string;
  subtitle: string;
  generated_at: string;
  generated_by: string;
  sections: Array<{
    heading: string;
    type: 'table' | 'key_value' | 'list' | 'json';
    data: any;
  }>;
}

// ─── Workspace-scoped helpers ───────────────────────────────────────────────

async function verifyWorkspaceAccess(workflowId: string, workspaceId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('workflow_templates')
    .select('id, workspace_id')
    .eq('id', workflowId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

function sanitizeForCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function objectsToCsv(rows: CsvRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(sanitizeForCsv).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => sanitizeForCsv(row[h])).join(','));
  }
  return lines.join('\n');
}

// ─── Main Export Functions ──────────────────────────────────────────────────

export async function exportWorkflowFull(params: {
  workflowId: string;
  workspaceId: string;
  userId: string;
  userEmail?: string;
  reason?: string;
}): Promise<ExportPayload> {
  const { workflowId, workspaceId, userId, userEmail, reason } = params;

  // Workspace isolation
  const hasAccess = await verifyWorkspaceAccess(workflowId, workspaceId);
  if (!hasAccess) {
    throw Object.assign(new Error('Workflow not found in this workspace'), { statusCode: 404 });
  }

  // Gather workflow metadata
  const { data: workflow, error: wfErr } = await supabaseAdmin
    .from('workflow_templates')
    .select('id, name, status, risk_level, created_at, updated_at')
    .eq('id', workflowId)
    .single();
  if (wfErr || !workflow) {
    throw Object.assign(new Error('Workflow not found'), { statusCode: 404 });
  }

  // Gather versions
  const { data: versions } = await supabaseAdmin
    .from('workflow_versions')
    .select('id, version_number, state, created_at, created_by')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false });

  // Gather evidence bundles
  const { data: evidenceRaw } = await supabaseAdmin
    .from('workflow_evidence_bundles')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false });

  // Gather approval chains via versions
  let approvalChains: any[] = [];
  const versionIds = (versions || []).map((v: any) => v.id);
  if (versionIds.length > 0) {
    const { data: chains } = await supabaseAdmin
      .from('workflow_approval_chains')
      .select('*, workflow_approval_keys(*)')
      .in('version_id', versionIds)
      .order('created_at', { ascending: false });
    approvalChains = chains || [];
  }

  // Gather simulation results
  let simulationResults: any[] = [];
  if (versionIds.length > 0) {
    const sims = await simulationService.listSimulations(versionIds[0]);
    simulationResults = Array.isArray(sims) ? sims : [];
  }

  // Gather dependency results
  let dependencyResults: any[] = [];
  try {
    dependencyResults = await dependencyService.checkWorkflowDependencies(workflowId);
  } catch {
    dependencyResults = [];
  }

  // Flatten policy results from evidence
  const policyResults: any[] = [];
  const warnings: string[] = [];
  const blocks: string[] = [];
  const errors: string[] = [];
  const evidenceRefs: string[] = [];

  for (const bundle of evidenceRaw || []) {
    if (bundle.evidence_ref) evidenceRefs.push(bundle.evidence_ref);
    if (Array.isArray(bundle.policy_results)) {
      policyResults.push(...bundle.policy_results.map((pr: any) => ({ ...pr, bundle_ref: bundle.evidence_ref, bundle_id: bundle.id })));
    }
    if (Array.isArray(bundle.warnings)) warnings.push(...bundle.warnings.map((w: string) => `[${bundle.evidence_ref || bundle.id}] ${w}`));
    if (Array.isArray(bundle.blocks)) blocks.push(...bundle.blocks.map((b: string) => `[${bundle.evidence_ref || bundle.id}] ${b}`));
    if (Array.isArray(bundle.errors)) errors.push(...bundle.errors.map((e: string) => `[${bundle.evidence_ref || bundle.id}] ${e}`));
  }

  const payload: ExportPayload = {
    exported_at: new Date().toISOString(),
    exported_by: userEmail || userId,
    export_reason: reason || 'manual_export',
    workflow: {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      risk_level: workflow.risk_level,
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,
    },
    versions: (versions || []).map((v: any) => ({
      id: v.id,
      version_number: v.version_number,
      state: v.state,
      created_at: v.created_at,
      created_by: v.created_by,
    })),
    evidence_bundles: evidenceRaw || [],
    approval_chains: approvalChains,
    simulation_results: simulationResults,
    dependency_results: dependencyResults,
    policy_results: policyResults,
    warnings,
    blocks,
    errors,
    metrics: {
      total_versions: (versions || []).length,
      total_evidence_bundles: (evidenceRaw || []).length,
      total_simulations: simulationResults.length,
      total_approvals: approvalChains.length,
      total_dependencies: dependencyResults.length,
      total_policy_checks: policyResults.length,
      evidence_refs: evidenceRefs,
    },
  };

  return payload;
}

export async function exportApprovalsCsv(params: {
  workflowId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
}): Promise<string> {
  const { workflowId, workspaceId } = params;

  const hasAccess = await verifyWorkspaceAccess(workflowId, workspaceId);
  if (!hasAccess) {
    throw Object.assign(new Error('Workflow not found in this workspace'), { statusCode: 404 });
  }

  // Column order for the export — also used as a header-only fallback so the
  // CSV is always a valid, non-empty file (even when there are no approvals).
  const APPROVAL_HEADERS = [
    'chain_id', 'version_id', 'status', 'approval_sequence', 'required_role',
    'approver_name', 'decision', 'decided_at', 'evidence_ref', 'note', 'created_at',
  ];
  const headerRow = APPROVAL_HEADERS.join(',');

  const { data: versions } = await supabaseAdmin
    .from('workflow_versions')
    .select('id, version_number')
    .eq('workflow_id', workflowId);

  const versionIds = (versions || []).map((v: any) => v.id);
  if (!versionIds.length) return '';

  const { data: chains } = await supabaseAdmin
    .from('workflow_approval_chains')
    .select('*, workflow_approval_keys(*)')
    .in('version_id', versionIds)
    .order('created_at', { ascending: false });

  const rows: CsvRow[] = [];
  for (const chain of chains || []) {
    const keys: any[] = chain.workflow_approval_keys || [];
    for (const key of keys) {
      rows.push({
        chain_id: chain.id,
        version_id: chain.version_id,
        status: chain.status,
        approval_sequence: key.approval_sequence,
        required_role: key.required_role,
        approver_name: key.approver_name || '',
        decision: key.decision || 'pending',
        decided_at: key.decided_at || '',
        evidence_ref: key.evidence_ref || '',
        note: key.reason || '',
        created_at: chain.created_at,
      });
    }
  }

  return rows.length ? objectsToCsv(rows) : headerRow;
}

export async function exportEvidenceByRef(params: {
  evidenceRef: string;
  workspaceId: string;
  userId: string;
  reason?: string;
}): Promise<ExportPayload> {
  const { evidenceRef, workspaceId, userId, reason } = params;

  const bundle = await evidenceService.getEvidenceByRef(evidenceRef);
  if (!bundle) {
    throw Object.assign(new Error('Evidence bundle not found'), { statusCode: 404 });
  }

  // Workspace isolation on the bundle itself
  if (bundle.workspace_id !== workspaceId) {
    throw Object.assign(new Error('Evidence bundle not found in this workspace'), { statusCode: 404 });
  }

  // Reuse full export scoped to that workflow
  return exportWorkflowFull({
    workflowId: bundle.workflow_id,
    workspaceId,
    userId,
    userEmail: params.reason,
    reason,
  });
}

// ─── Runtime Timeline CSV Export ─────────────────────────────────────────────

export async function exportRuntimeTimelineCsv(params: {
  workflowId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
}): Promise<string> {
  const { workflowId, workspaceId } = params;

  const hasAccess = await verifyWorkspaceAccess(workflowId, workspaceId);
  if (!hasAccess) {
    throw Object.assign(new Error('Workflow not found in this workspace'), { statusCode: 404 });
  }

  // Gather versions
  const { data: versions } = await supabaseAdmin
    .from('workflow_versions')
    .select('id, version_number')
    .eq('workflow_id', workflowId);

  // Gather instances
  const { data: instances } = await supabaseAdmin
    .from('workflow_instances')
    .select('id, version_id, status, started_at, completed_at, trigger_type, trigger_source')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false });

  const instanceIds = (instances || []).map((i: any) => i.id);
  const versionMap = new Map((versions || []).map((v: any) => [v.id, v.version_number]));

  // Gather step runs
  let stepRuns: any[] = [];
  if (instanceIds.length > 0) {
    const { data: runs } = await supabaseAdmin
      .from('workflow_step_runs')
      .select('*, workflow_instances!inner(workflow_id)')
      .in('instance_id', instanceIds)
      .order('started_at', { ascending: true });
    stepRuns = runs || [];
  }

  const rows: CsvRow[] = [];

  for (const instance of instances || []) {
    const versionNumber = versionMap.get(instance.version_id) ?? '';
    const instanceSteps = stepRuns.filter((sr: any) => sr.instance_id === instance.id);

    if (instanceSteps.length === 0) {
      rows.push({
        instance_id: instance.id,
        version_number: versionNumber,
        step_name: '',
        step_type: '',
        status: instance.status,
        started_at: instance.started_at || '',
        completed_at: instance.completed_at || '',
        duration_seconds: instance.started_at && instance.completed_at
          ? Math.round((new Date(instance.completed_at).getTime() - new Date(instance.started_at).getTime()) / 1000)
          : '',
        trigger_type: instance.trigger_type || '',
        trigger_source: instance.trigger_source || '',
        actor_type: '',
        actor_id: '',
        error_code: '',
        reason_code: '',
      });
    } else {
      for (const step of instanceSteps) {
        const duration = step.started_at && step.completed_at
          ? Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)
          : '';
        rows.push({
          instance_id: instance.id,
          version_number: versionNumber,
          step_name: step.step_name || step.step_id || '',
          step_type: step.step_type || '',
          status: step.status || '',
          started_at: step.started_at || '',
          completed_at: step.completed_at || '',
          duration_seconds: duration,
          trigger_type: instance.trigger_type || '',
          trigger_source: instance.trigger_source || '',
          actor_type: step.actor_type || '',
          actor_id: step.actor_id || '',
          error_code: step.error_code || '',
          reason_code: step.reason_code || '',
        });
      }
    }
  }

  return objectsToCsv(rows);
}

// ─── Audit Logging for Exports ───────────────────────────────────────────────

export async function logExportAuditEvent(params: {
  workflowId: string;
  workflowName: string;
  workspaceId: string;
  userId: string;
  userEmail?: string;
  exportType: string;
  reason?: string;
}): Promise<void> {
  try {
    await createAuditEvent({
      workspace_id: params.workspaceId,
      event_category: 'evidence_legal',
      // 'evidence.exported' is the registered canonical type for export actions
      // (see auditExportWorker). 'workflow.exported' is not registered and the
      // create_audit_event RPC rejects it.
      event_type: 'evidence.exported',
      event_title: `Workflow Exported: ${params.workflowName}`,
      event_summary: `Export type: ${params.exportType}${params.reason ? `. Reason: ${params.reason}` : ''}`,
      actor: {
        actor_id: params.userId,
        actor_type: 'human_user',
        actor_name: params.userEmail || params.userId,
      },
      object: {
        object_type: 'workflow_template',
        object_id: params.workflowId,
        object_name: params.workflowName,
      },
      change: {
        change_reason: params.reason || 'manual_export',
      },
      risk_level: 'low',
      status: 'success',
    });
  } catch (err) {
    alertSecOpsAuditFailure({
      alert_type: 'audit_write_failure',
      severity: 'critical',
      message: `Export audit event write failed for workflow ${params.workflowId}`,
      source: 'workflowExport.service',
      details: { workflowId: params.workflowId, exportType: params.exportType, error: String(err) },
    });
    throw err;
  }
}

// ─── PDF Payload Builder ─────────────────────────────────────────────────────

export function buildPdfReadyPayload(exportData: ExportPayload): PdfReadyPayload {
  const sections: PdfReadyPayload['sections'] = [
    {
      heading: 'Workflow Overview',
      type: 'key_value',
      data: exportData.workflow,
    },
    {
      heading: 'Versions',
      type: 'table',
      data: exportData.versions.map((v) => ({
        Version: v.version_number,
        State: v.state,
        Created: v.created_at,
        By: v.created_by,
      })),
    },
    {
      heading: 'Evidence Bundles',
      type: 'table',
      data: exportData.evidence_bundles.map((b: any) => ({
        Ref: b.evidence_ref || '',
        Type: b.bundle_type || '',
        Actor: b.actor_name || '',
        Sealed: b.sealed_at || '',
        Hash: b.canonical_hash ? b.canonical_hash.substring(0, 16) : '',
        Created: b.created_at || '',
      })),
    },
  ];

  if (exportData.approval_chains.length > 0) {
    sections.push({
      heading: 'Approval Chains',
      type: 'json',
      data: exportData.approval_chains.map((c: any) => ({
        id: c.id,
        version_id: c.version_id,
        status: c.status,
        keys: (c.workflow_approval_keys || []).map((k: any) => ({
          sequence: k.approval_sequence,
          role: k.required_role,
          decision: k.decision,
        })),
      })),
    });
  }

  if (exportData.simulation_results.length > 0) {
    sections.push({
      heading: 'Simulation Results',
      type: 'json',
      data: exportData.simulation_results,
    });
  }

  if (exportData.dependency_results.length > 0) {
    sections.push({
      heading: 'Dependency Health',
      type: 'table',
      data: exportData.dependency_results.map((d: any) => ({
        Type: d.dependency_type || '',
        Name: d.dependency_name || d.dependency_id_ref || '',
        Health: d.health || '',
        Impact: d.impact_level || '',
        Blocking: d.blocking ? 'Yes' : 'No',
      })),
    });
  }

  if (exportData.metrics.total_policy_checks > 0) {
    sections.push({
      heading: 'Policy Results',
      type: 'json',
      data: exportData.policy_results,
    });
  }

  if (exportData.warnings.length > 0) {
    sections.push({
      heading: `Warnings (${exportData.warnings.length})`,
      type: 'list',
      data: exportData.warnings,
    });
  }

  if (exportData.blocks.length > 0) {
    sections.push({
      heading: `Blocks (${exportData.blocks.length})`,
      type: 'list',
      data: exportData.blocks,
    });
  }

  if (exportData.errors.length > 0) {
    sections.push({
      heading: `Errors (${exportData.errors.length})`,
      type: 'list',
      data: exportData.errors,
    });
  }

  sections.push({
    heading: 'Metrics Summary',
    type: 'key_value',
    data: exportData.metrics,
  });

  return {
    title: `Workflow Export: ${exportData.workflow.name}`,
    subtitle: `ID: ${exportData.workflow.id} — ${exportData.workflow.status}`,
    generated_at: exportData.exported_at,
    generated_by: exportData.exported_by,
    sections,
  };
}

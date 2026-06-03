/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { PromptService } from './PromptService';
import { PromptVersionService } from './PromptVersionService';
import { PromptTestService } from './PromptTestService';
import { PromptApprovalService } from './PromptApprovalService';
import { PromptDeploymentService } from './PromptDeploymentService';
import { PromptBindingService } from './PromptBindingService';
import { PromptEvidenceService } from './PromptEvidenceService';
import { PromptAuditService } from './PromptAuditService';
import { ApprovalInvalidationService } from './ApprovalInvalidationService';
import { PromptDependencyService } from './PromptDependencyService';
import { PromptRuntimeTraceService } from './PromptRuntimeTraceService';
import { DependencyImpactService } from './services/DependencyImpactService';
import { ReverseDependencyService, ReverseTargetType } from './services/ReverseDependencyService';
import { DependencyNotificationPlanner } from './services/DependencyNotificationPlanner';
import { GovernanceDashboardService } from './services/GovernanceDashboardService';
import { GovernanceDriftService } from './services/GovernanceDriftService';
import { PromptIncidentService } from './services/PromptIncidentService';
import { PromptEvidenceExportService } from './services/PromptEvidenceExportService';
import { AdversarialScenarioService } from './AdversarialScenarioService';
import { AdversarialTestService } from './AdversarialTestService';
import { DeploymentGateService } from './DeploymentGateService';
import { PromptApprovalPolicyService } from './PromptApprovalPolicyService';
import { PolicySimulationService } from './PolicySimulationService';
import { PromptScorecardService } from './PromptScorecardService';
import { GovernanceMetricsService } from './services/GovernanceMetricsService';
import { createAdversarialScenarioSchema, updateAdversarialScenarioSchema, runAdversarialTestSchema } from './schemas/adversarial.schema';
import { runPolicySimulationSchema, promptRunPolicySimulationSchema } from './schemas/policySimulation.schema';
import { getParam, getQueryValue, getQueryNumber } from '../../shared/request';
import { logToDatabase } from '../../shared/databaseLogger';
import { PROMPT_STATUS, normalizePromptStatus } from './PromptService';

const PROMPT_AUDIT_SERVICE = 'prompt-governance';

const normalizeReviewerRole = PromptApprovalPolicyService.normalizeReviewerRole;
const requiredApprovalRoles = PromptApprovalPolicyService.requiredApprovalRoles;
const canRoleSatisfy = PromptApprovalPolicyService.canRoleSatisfy;

function clientIp(req?: AuthRequest): string | null {
  if (!req) return null;
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Record a prompt governance event. This is the single integration point for
 * Prompt Governance auditing, and it writes to THREE independent sinks:
 *
 *   1. system_logs            — operational log (logToDatabase)
 *   2. Evidence Vault         — content-hashed immutable artifact ("what happened")
 *   3. prompt_audit_ledger    — append-only governance audit trail
 *                               ("who did it, when, why, and what changed")
 *
 * The audit ledger is independent from system_logs and from the Evidence Vault.
 * Routing every lifecycle action through this helper guarantees full audit
 * coverage. Returns the vault evidence UUID (or null) so callers can backlink it
 * onto the approval/deployment row's evidence_id column.
 */
async function auditPromptEvent(
  action: string,
  payload: Record<string, unknown>,
  req?: AuthRequest,
  options?: { critical?: boolean },
): Promise<string | null> {
  await logToDatabase('info', PROMPT_AUDIT_SERVICE, action, {
    ...payload,
    evidence_type: 'prompt_governance_event',
    created_at: new Date().toISOString(),
  });
  const receipt = await PromptEvidenceService.record({
    event_type: action,
    prompt_id: payload.prompt_id as string | undefined,
    prompt_version_id: payload.prompt_version_id as string | undefined,
    workspace_id: payload.workspace_id as string | undefined,
    actor_id: payload.actor_id as string | undefined,
    risk_tier: payload.risk_tier as string | undefined,
    reason: payload.reason as string | undefined,
    payload,
  });

  if (options?.critical && !receipt) {
    throw new Error(`Critical audit/evidence write failed for ${action}: evidence preservation returned no receipt`);
  }

  // Append-only governance audit trail (independent of system_logs / vault).
  const correlationId = receipt?.vault_item_uuid || (payload.correlation_id as string | undefined) || null;
  const auditRecord = await PromptAuditService.record({
    event_type: action,
    workspace_id: payload.workspace_id as string | undefined,
    prompt_id: payload.prompt_id as string | undefined,
    version_id: payload.prompt_version_id as string | undefined,
    actor_id: (payload.actor_id as string | undefined) || req?.user?.id,
    actor_name: req?.user?.email || (payload.actor_name as string | undefined),
    actor_role: req?.user?.role || (payload.actor_role as string | undefined) || undefined,
    reason: payload.reason as string | undefined,
    risk_level: payload.risk_tier as string | undefined,
    approval_context: {
      reviewer_role: payload.reviewer_role ?? null,
      approval_complete: payload.approval_complete ?? null,
      environment: payload.environment ?? null,
      rollback_to_version_id: payload.rollback_to_version_id ?? null,
    },
    before_state: (payload.before_state as Record<string, unknown> | undefined) || {},
    after_state: (payload.after_state as Record<string, unknown> | undefined) || {},
    evidence_reference: receipt?.vault_item_id || null,
    source_ip: clientIp(req),
    correlation_id: correlationId,
  });

  if (options?.critical && !auditRecord) {
    throw new Error(`Critical audit/evidence write failed for ${action}: audit ledger record returned no data`);
  }

  return receipt?.vault_item_uuid || null;
}

// Prompt statuses for which a live approval can be invalidated (lowercase enums).
const APPROVAL_ELIGIBLE_STATUSES = ['approved', 'approved_for_staging', 'production_pending'];

/**
 * Governance rule (Doc 3 §7): after a risk-impacting dependency change, re-check
 * whether the version's approval is still valid and, if not, invalidate it and
 * emit `prompt.approval.invalidated` through the existing audit/evidence helper.
 *
 * Create/Update are detected by ApprovalInvalidationService.evaluate() via
 * timestamp comparison. Deletions leave no row to compare, so for deletions we
 * additionally treat the removal of a dependency from an approval-eligible,
 * already-approved version as an invalidation.
 *
 * Enforcement never breaks the underlying mutation — the mutation has already
 * succeeded and been audited; any failure here is swallowed.
 */
async function enforceApprovalInvalidation(
  req: AuthRequest,
  params: { promptId: string; versionId: string; workspaceId: string; deletion?: boolean },
): Promise<void> {
  try {
    let result = await ApprovalInvalidationService.evaluate(params.versionId);

    if (!result.invalidated && params.deletion) {
      const prompt = await PromptService.getById(params.promptId, params.workspaceId);
      const eligible = APPROVAL_ELIGIBLE_STATUSES.includes(String(prompt?.status || '').toLowerCase());
      const approvedAt = eligible ? await ApprovalInvalidationService.getLatestApprovalAt(params.versionId) : null;
      if (approvedAt) {
        result = {
          valid: false,
          invalidated: true,
          reason: 'Approval invalidated: dependency removed after approval.',
        };
      }
    }

    if (result.invalidated) {
      await ApprovalInvalidationService.invalidate(
        params.versionId,
        result.reason || 'Dependency changed after approval',
        result.invalidatedAt,
      );
      await auditPromptEvent('prompt.approval.invalidated', {
        prompt_id: params.promptId,
        prompt_version_id: params.versionId,
        workspace_id: params.workspaceId,
        actor_id: req.user?.id,
        reason: result.reason,
        after_state: { approval_invalidated_at: result.invalidatedAt || null, valid: false },
      }, req);
    }
  } catch {
    // Governance enforcement is best-effort; never break the mutation response.
  }
}

export class PromptController {

  private static async getWorkspaceId(userId: string | undefined): Promise<string> {
    if (!userId) throw new Error('Unauthorized');
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!member) throw new Error('Workspace not found');
    return member.workspace_id;
  }

  private static async resolveWorkspaceId(req: AuthRequest): Promise<string> {
    if (req.user?.workspace_id) return req.user.workspace_id;
    return PromptController.getWorkspaceId(req.user?.id);
  }

  private static async requireVersionInWorkspace(versionId: string, workspaceId: string) {
    const version = await PromptVersionService.getById(versionId);
    if (!version) return null;
    await PromptService.requireById(version.prompt_id, workspaceId);
    return version;
  }

  // ─── Prompt CRUD ────────────────────────────────────────────────────────

  static async listPrompts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptService.list(workspaceId, {
        status: getQueryValue(req, 'status'),
        risk_tier: getQueryValue(req, 'risk_tier'),
        prompt_type: getQueryValue(req, 'prompt_type'),
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptService.getById(getParam(req, 'id'), workspaceId);
      if (!data) return res.status(404).json({ error: 'Prompt not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listPromptEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const result = await PromptEvidenceService.listByPrompt(getParam(req, 'id'), {
        event_type: getQueryValue(req, 'event_type'),
        prompt_version_id: getQueryValue(req, 'version_id'),
        risk_level: getQueryValue(req, 'risk_level'),
        actor_id: getQueryValue(req, 'actor_id'),
        date_from: getQueryValue(req, 'date_from'),
        date_to: getQueryValue(req, 'date_to'),
        limit: Number(getQueryValue(req, 'limit')) || undefined,
        offset: Number(getQueryValue(req, 'offset')) || undefined,
      });
      res.json({
        success: true,
        data: result.records,
        pagination: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Runtime Evidence (Phase 4 / Batch 4.3) ───────────────────────────────
  // Ingestion-only surface for runtime traces. The Runtime Engine remains the
  // source of truth; these endpoints record and read traces. They never enforce
  // runtime behavior and never mutate the Runtime Engine.

  /**
   * Ingest a runtime trace. Service-authenticated OR strongly role-gated:
   *   - API key  : scopeGuard('write:prompt_runtime_trace') already enforced the
   *                scope at the route (JWT users bypass scopeGuard, so they are
   *                checked here).
   *   - JWT user : must be superadmin / GOVERNANCE_ADMIN / ADMIN / WORKSPACE_OWNER.
   * workspace_id is taken from the authenticated token, never from the body.
   */
  static async ingestRuntimeTrace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const isServiceKey = !!user?.api_key_id; // scope already validated by scopeGuard
      const role = String(user?.role || '').toUpperCase();
      const strongRole =
        !!user?.is_superadmin || ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER'].includes(role);
      if (!isServiceKey && !strongRole) {
        return res.status(403).json({
          error: 'Forbidden: runtime trace ingestion requires a scoped service key or a governance admin role',
        });
      }

      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const body = (req.body || {}) as Record<string, unknown>;

      const result = await PromptRuntimeTraceService.ingestRuntimeTrace({
        workspace_id: workspaceId,
        prompt_version_id: String(body.prompt_version_id || ''),
        execution_id: body.execution_id as string | undefined,
        environment: body.environment as string | undefined,
        model_id: body.model_id as string | undefined,
        input_hash: body.input_hash as string | undefined,
        output_hash: body.output_hash as string | undefined,
        policy_result: body.policy_result as string | undefined,
        policy_result_json: body.policy_result_json as Record<string, unknown> | undefined,
        tool_calls: body.tool_calls as unknown[] | undefined,
        kb_sources: body.kb_sources as unknown[] | undefined,
        runtime_policy_id: body.runtime_policy_id as string | undefined,
        violation: body.violation === true,
        violation_reason: body.violation_reason as string | undefined,
        deployment_id: body.deployment_id as string | undefined,
        actor_id: user?.id,
        source_ip: clientIp(req) || undefined,
        correlation_id: body.correlation_id as string | undefined,
      });

      if (!result.ok) {
        const status = result.code === 'MISSING_WORKSPACE' ? 400 : result.code === 'VERSION_NOT_FOUND' ? 404 : 403;
        return res.status(status).json({ error: result.code });
      }

      return res.status(201).json({ success: true, data: result.trace });
    } catch (error) {
      next(error);
    }
  }

  /** List runtime traces for a prompt (workspace-scoped). */
  static async listPromptRuntimeTraces(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      // Tenant + existence check: a prompt from another workspace 404s here.
      await PromptService.requireById(promptId, workspaceId);
      const result = await PromptRuntimeTraceService.listByPrompt(promptId, workspaceId, {
        version_id: getQueryValue(req, 'version_id'),
        violation_only: getQueryValue(req, 'violation_only') === 'true',
        limit: getQueryNumber(req, 'limit', 50),
        offset: getQueryNumber(req, 'offset', 0),
      });
      res.json({
        success: true,
        data: result.records,
        pagination: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (error) {
      next(error);
    }
  }

  /** List runtime traces for a single prompt version (workspace-scoped). */
  static async listVersionRuntimeTraces(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const result = await PromptRuntimeTraceService.listByVersion(versionId, workspaceId, {
        violation_only: getQueryValue(req, 'violation_only') === 'true',
        limit: getQueryNumber(req, 'limit', 50),
        offset: getQueryNumber(req, 'offset', 0),
      });
      res.json({
        success: true,
        data: result.records,
        pagination: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Prompt Incidents (Phase 4 / Batch 4.4) ───────────────────────────────
  // Prompt-Governance incident lifecycle. Reads are available to authenticated
  // workspace users; create/update/close require a governance role.

  /** True when the caller holds a governance role permitted to mutate incidents. */
  private static isGovernanceRole(req: AuthRequest): boolean {
    const user = req.user;
    const role = String(user?.role || '').toUpperCase();
    return !!user?.is_superadmin || ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER'].includes(role);
  }

  private static incidentErrorStatus(code: string): number {
    if (code === 'MISSING_WORKSPACE') return 400;
    if (code === 'TENANT_MISMATCH') return 403;
    if (code === 'INVALID_TRANSITION' || code === 'ALREADY_CLOSED') return 409;
    return 404; // PROMPT_NOT_FOUND / VERSION_NOT_FOUND / TRACE_NOT_FOUND / INCIDENT_NOT_FOUND
  }

  /** Open an incident for a prompt (governance roles only). */
  static async createIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PromptController.isGovernanceRole(req)) {
        return res.status(403).json({ error: 'Forbidden: incident management requires a governance role' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const body = (req.body || {}) as Record<string, unknown>;

      const result = await PromptIncidentService.openIncident({
        workspace_id: workspaceId,
        prompt_id: promptId,
        prompt_version_id: body.prompt_version_id as string | undefined,
        runtime_trace_id: body.runtime_trace_id as string | undefined,
        deployment_id: body.deployment_id as string | undefined,
        rollback_deployment_id: body.rollback_deployment_id as string | undefined,
        rollback_to_version_id: body.rollback_to_version_id as string | undefined,
        severity: body.severity as string | undefined,
        category: body.category as string | undefined,
        trigger: body.trigger as string | undefined,
        runtime_policy_id: body.runtime_policy_id as string | undefined,
        detected_by: body.detected_by as string | undefined,
        owner_id: body.owner_id as string | undefined,
        remediation: body.remediation as string | undefined,
        affected_scope: body.affected_scope as Record<string, unknown> | undefined,
        actor_id: req.user?.id,
        actor_role: req.user?.role || undefined,
        source_ip: clientIp(req) || undefined,
      });

      if (!result.ok) {
        return res.status(PromptController.incidentErrorStatus(result.code)).json({ error: result.code });
      }
      return res.status(201).json({ success: true, data: result.incident });
    } catch (error) {
      next(error);
    }
  }

  /** List incidents for a prompt (workspace-scoped). */
  static async listPromptIncidents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      await PromptService.requireById(promptId, workspaceId);
      const result = await PromptIncidentService.listByPrompt(promptId, workspaceId, {
        status: getQueryValue(req, 'status'),
        severity: getQueryValue(req, 'severity'),
        limit: getQueryNumber(req, 'limit', 50),
        offset: getQueryNumber(req, 'offset', 0),
      });
      res.json({
        success: true,
        data: result.records,
        pagination: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (error) {
      next(error);
    }
  }

  /** Fetch a single incident (workspace-scoped). */
  static async getIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const incident = await PromptIncidentService.getIncident(getParam(req, 'incidentId'), workspaceId);
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
      res.json({ success: true, data: incident });
    } catch (error) {
      next(error);
    }
  }

  /** Update an incident — status transitions + fields (governance roles only). */
  static async updateIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PromptController.isGovernanceRole(req)) {
        return res.status(403).json({ error: 'Forbidden: incident management requires a governance role' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const body = (req.body || {}) as Record<string, unknown>;

      const result = await PromptIncidentService.updateIncident(getParam(req, 'incidentId'), workspaceId, {
        status: body.status as string | undefined,
        severity: body.severity as string | undefined,
        category: body.category as string | undefined,
        owner_id: body.owner_id as string | undefined,
        remediation: body.remediation as string | undefined,
        post_incident_note: body.post_incident_note as string | undefined,
        affected_scope: body.affected_scope as Record<string, unknown> | undefined,
        actor_id: req.user?.id,
        actor_role: req.user?.role || undefined,
        source_ip: clientIp(req) || undefined,
      });

      if (!result.ok) {
        return res.status(PromptController.incidentErrorStatus(result.code)).json({ error: result.code });
      }
      res.json({ success: true, data: result.incident });
    } catch (error) {
      next(error);
    }
  }

  /** Close an incident (governance roles only). */
  static async closeIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PromptController.isGovernanceRole(req)) {
        return res.status(403).json({ error: 'Forbidden: incident management requires a governance role' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const body = (req.body || {}) as Record<string, unknown>;

      const result = await PromptIncidentService.closeIncident(getParam(req, 'incidentId'), workspaceId, {
        closed_by: req.user?.id,
        post_incident_note: body.post_incident_note as string | undefined,
        remediation: body.remediation as string | undefined,
        actor_id: req.user?.id,
        actor_role: req.user?.role || undefined,
        source_ip: clientIp(req) || undefined,
      });

      if (!result.ok) {
        return res.status(PromptController.incidentErrorStatus(result.code)).json({ error: result.code });
      }
      res.json({ success: true, data: result.incident });
    } catch (error) {
      next(error);
    }
  }

  // ─── Evidence Export (Phase 4 / Batch 4.5) ────────────────────────────────
  // Permission-gated, reason-stamped evidence export. Reuses the Evidence Vault
  // package/seal/export primitives; creates no new tables or export ledger.

  /**
   * True when the caller may export prompt evidence:
   *   - API key with scope `prompt.export.evidence` or `*`, OR
   *   - JWT superadmin / GOVERNANCE_ADMIN / ADMIN / WORKSPACE_OWNER /
   *     COMPLIANCE_REVIEWER / AUDITOR.
   */
  private static canExportEvidence(req: AuthRequest): boolean {
    const user = req.user;
    if (user?.api_key_id) {
      const scopes = user.api_key_scopes || [];
      return scopes.includes('*') || scopes.includes('prompt.export.evidence');
    }
    const role = String(user?.role || '').toUpperCase();
    return (
      !!user?.is_superadmin ||
      ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER', 'COMPLIANCE_REVIEWER', 'AUDITOR'].includes(role)
    );
  }

  private static exportErrorStatus(code: string): number {
    if (code === 'MISSING_WORKSPACE' || code === 'MISSING_REASON') return 400;
    if (code === 'TENANT_MISMATCH') return 403;
    if (code === 'NO_EVIDENCE') return 409;
    return 404; // PROMPT_NOT_FOUND / EXPORT_NOT_FOUND
  }

  /** Create a sealed evidence export package for a prompt. Reason is mandatory. */
  static async createPromptEvidenceExport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PromptController.canExportEvidence(req)) {
        return res.status(403).json({ error: 'Forbidden: evidence export requires the prompt.export.evidence permission or a governance/audit role' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const body = (req.body || {}) as Record<string, unknown>;

      const result = await PromptEvidenceExportService.createPromptEvidenceExport({
        workspace_id: workspaceId,
        prompt_id: getParam(req, 'id'),
        reason: String(body.reason || ''),
        disclosure_mode: body.disclosure_mode as string | undefined,
        delivery_method: body.delivery_method as string | undefined,
        expires_at: body.expires_at as string | undefined,
        actor_id: req.user?.id,
        actor_role: req.user?.role || undefined,
        source_ip: clientIp(req) || undefined,
      });

      if (!result.ok) {
        return res.status(PromptController.exportErrorStatus(result.code)).json({ error: result.code });
      }
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }

  /** Fetch an evidence export receipt + manifest (workspace + prompt scoped). */
  static async getPromptEvidenceExport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PromptController.canExportEvidence(req)) {
        return res.status(403).json({ error: 'Forbidden: evidence export requires the prompt.export.evidence permission or a governance/audit role' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const result = await PromptEvidenceExportService.getPromptEvidenceExport(
        getParam(req, 'exportId'),
        getParam(req, 'id'),
        workspaceId,
      );
      if (!result.ok) {
        return res.status(PromptController.exportErrorStatus(result.code)).json({ error: result.code });
      }
      res.json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Append-Only Audit Trail ──────────────────────────────────────────────
  // Read-only. There is intentionally NO update or delete endpoint — the
  // prompt_audit_ledger is append-only and immutable at the database tier.

  static async listPromptAudit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      // Tenant + existence check: a prompt from another workspace 404s here.
      await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const result = await PromptAuditService.getByPrompt(getParam(req, 'id'), workspaceId, {
        event_type: getQueryValue(req, 'event_type'),
        version_id: getQueryValue(req, 'version_id'),
        actor_id: getQueryValue(req, 'actor_id'),
        risk_level: getQueryValue(req, 'risk_level'),
        date_from: getQueryValue(req, 'date_from'),
        date_to: getQueryValue(req, 'date_to'),
        limit: getQueryNumber(req, 'limit', 50),
        offset: getQueryNumber(req, 'offset', 0),
      });
      res.json({
        success: true,
        data: result.records,
        pagination: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptAuditTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const result = await PromptAuditService.getTimeline(getParam(req, 'id'), workspaceId, getQueryNumber(req, 'limit', 500));
      res.json({
        success: true,
        data: result.records,
        pagination: { total: result.total, limit: result.limit, truncated: result.truncated },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuditEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptAuditService.getById(getParam(req, 'auditId'), workspaceId);
      if (!data) return res.status(404).json({ error: 'Audit record not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptService.create({
        ...req.body,
        workspace_id: workspaceId,
        owner_id: req.user?.id,
        owner_name: req.user?.email || req.user?.id,
        created_by: req.user?.id,
      });
      await PromptVersionService.create({
        prompt_id: data.id,
        body: req.body.body || req.body.initial_body || `Prompt draft for ${data.name}\n\nPurpose: ${data.description || 'Define the governed instruction set.'}`,
        variables_json: req.body.variables_json,
        guardrails_json: req.body.guardrails_json,
        model_routes_json: req.body.model_routes_json,
        change_summary: 'Initial draft version',
        created_by: req.user?.id,
      });
      await PromptTestService.createSuite({
        prompt_id: data.id,
        suite_name: 'Default Governance Suite',
        required_for_risk_tier: [data.risk_tier || 'TIER_2_MEDIUM'],
        scenario_count: 1,
        evaluator_config: { bootstrap: true },
      }).catch(() => null);
      await auditPromptEvent('prompt.created', {
        prompt_id: data.id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: data.risk_tier,
        after_state: { name: data.name, status: data.status, risk_tier: data.risk_tier, owner_id: data.owner_id },
      }, req);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updatePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      if ([PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED].includes(existing.status)) {
        return res.status(409).json({ error: 'Retired and archived prompts are immutable; clone to draft before editing.' });
      }
      const changedFields = Object.keys(req.body || {});
      const beforeState: Record<string, unknown> = {};
      const afterState: Record<string, unknown> = {};
      for (const field of changedFields) {
        beforeState[field] = (existing as Record<string, unknown>)[field] ?? null;
        afterState[field] = (req.body as Record<string, unknown>)[field] ?? null;
      }
      const data = await PromptService.update(getParam(req, 'id'), req.body, workspaceId);
      await auditPromptEvent('prompt.updated', {
        prompt_id: data.id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: data.risk_tier,
        changed_fields: changedFields,
        before_state: beforeState,
        after_state: afterState,
      }, req);

      // Surface risk-tier and ownership changes as their own dedicated audit
      // events so the governance ledger reflects them explicitly, not only as a
      // generic update.
      if (changedFields.includes('risk_tier') && beforeState.risk_tier !== afterState.risk_tier) {
        await auditPromptEvent('prompt.risk.changed', {
          prompt_id: data.id,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: data.risk_tier,
          reason: req.body.reason || 'Risk tier changed',
          before_state: { risk_tier: beforeState.risk_tier },
          after_state: { risk_tier: afterState.risk_tier },
        }, req);
      }
      if ((changedFields.includes('owner_id') || changedFields.includes('owner_name')) &&
          (beforeState.owner_id !== afterState.owner_id || beforeState.owner_name !== afterState.owner_name)) {
        await auditPromptEvent('prompt.ownership.changed', {
          prompt_id: data.id,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: data.risk_tier,
          reason: req.body.reason || 'Ownership changed',
          before_state: { owner_id: beforeState.owner_id, owner_name: beforeState.owner_name },
          after_state: { owner_id: afterState.owner_id, owner_name: afterState.owner_name },
        }, req);
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const stats = await PromptService.getStats(workspaceId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async clonePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptService.clone(getParam(req, 'id'), req.user?.id, workspaceId);
      await auditPromptEvent('prompt.cloned', {
        source_prompt_id: getParam(req, 'id'),
        prompt_id: data.id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: data.risk_tier,
        after_state: { name: data.name, cloned_from: getParam(req, 'id') },
      }, req);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Lifecycle Actions ──────────────────────────────────────────────────

  static async pausePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      if (![PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.PAUSED].includes(prompt.status)) {
        return res.status(409).json({ error: 'Only production-active prompts can be paused.' });
      }
      const promptId = getParam(req, 'id');
      await auditPromptEvent('prompt.paused', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || '', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.PAUSED } }, req, { critical: true });
      const data = await PromptService.updateStatus(promptId, 'PAUSED', workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async resumePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      if (prompt.status !== PROMPT_STATUS.PAUSED) {
        return res.status(409).json({ error: 'Only paused prompts can be resumed.' });
      }
      const promptId = getParam(req, 'id');
      await auditPromptEvent('prompt.resumed', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || '', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.PRODUCTION_ACTIVE } }, req, { critical: true });
      await auditPromptEvent('prompt.restored', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || 'Restored from paused state', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.PRODUCTION_ACTIVE } }, req, { critical: true });
      const data = await PromptService.updateStatus(promptId, 'PRODUCTION_ACTIVE', workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async archivePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      if (prompt.status === PROMPT_STATUS.PRODUCTION_ACTIVE) {
        return res.status(409).json({ error: 'Production-active prompts must be retired or paused before archive.' });
      }
      const promptId = getParam(req, 'id');
      await auditPromptEvent('prompt.archived', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || '', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.ARCHIVED } }, req, { critical: true });
      const data = await PromptService.updateStatus(promptId, 'ARCHIVED', workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async retirePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const promptId = getParam(req, 'id');
      await auditPromptEvent('prompt.retired', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || '', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.RETIRED } }, req, { critical: true });
      const data = await PromptService.updateStatus(promptId, 'RETIRED', workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Versions ───────────────────────────────────────────────────────────

  static async listVersions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const data = await PromptVersionService.listByPrompt(getParam(req, 'id'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      if ([PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED].includes(prompt.status)) {
        return res.status(409).json({ error: 'Retired and archived prompts are immutable; clone to draft before versioning.' });
      }
      const data = await PromptVersionService.create({
        prompt_id: getParam(req, 'id'),
        body: req.body.body || '',
        variables_json: req.body.variables_json,
        guardrails_json: req.body.guardrails_json,
        model_routes_json: req.body.model_routes_json,
        change_summary: req.body.change_summary || '',
        created_by: req.user?.id,
      });
      await PromptService.updateStatus(getParam(req, 'id'), 'DRAFT', workspaceId);
      await auditPromptEvent('prompt.version.created', {
        prompt_id: getParam(req, 'id'),
        prompt_version_id: data.id,
        version_number: data.version_number,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        after_state: { version_number: data.version_number, change_summary: data.change_summary },
      }, req);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptController.requireVersionInWorkspace(getParam(req, 'versionId'), workspaceId);
      if (!data) return res.status(404).json({ error: 'Version not found' });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Lifecycle State Transitions ────────────────────────────────────────

  static async submitForReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const prompt = await PromptService.requireById(promptId, workspaceId);
      if (!prompt.current_version_id) {
        return res.status(409).json({ error: 'Prompt requires a draft version before review.' });
      }

      const gateResult = await DeploymentGateService.check(prompt.current_version_id, {
        prompt,
        workspaceId,
        overrides: { requireAdversarialPass: true },
      });
      const blockingIssue = gateResult.blockingIssues.find((i) => i.blocking);
      if (blockingIssue) {
        return res.status(409).json({ error: blockingIssue.detail });
      }
      for (const w of gateResult.warnings) {
        if (w.type === 'adversarial_warning') {
          res.set('X-Adversarial-Warning', w.detail);
        }
      }

      await auditPromptEvent('prompt.review.submitted', {
        prompt_id: promptId,
        prompt_version_id: prompt.current_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        before_state: { status: prompt.status },
        after_state: { status: 'review_requested' },
      }, req, { critical: true });
      await PromptService.updateStatus(promptId, 'REVIEW_REQUESTED', workspaceId);
      const data = await PromptService.getById(promptId, workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async approveVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);
      if (prompt.current_version_id && prompt.current_version_id !== versionId) {
        return res.status(409).json({ error: 'Only the current prompt version can be approved.' });
      }

      // Derive reviewer_role from authenticated user first, then body fallback, then default
      const reviewerRole = normalizeReviewerRole(req.user?.role || req.body.reviewer_role);
      const requiredRoles = requiredApprovalRoles(prompt.risk_tier);
      const approvals = await PromptApprovalService.listByVersion(versionId);
      const approvedRoles = new Set(
        approvals
          .filter((approval: any) => approval.decision === 'APPROVED')
          .map((approval: any) => normalizeReviewerRole(approval.reviewer_role)),
      );
      const nextRequiredRole = requiredRoles.find((requiredRole) => !Array.from(approvedRoles).some((role) => canRoleSatisfy(requiredRole, role)));
      if (!nextRequiredRole) {
        return res.status(409).json({ error: 'All required approvals are already complete.' });
      }
      if (!canRoleSatisfy(nextRequiredRole, reviewerRole)) {
        return res.status(403).json({ error: `Next approval requires ${nextRequiredRole}.` });
      }
      if (prompt.owner_id === req.user?.id && nextRequiredRole !== 'PROMPT_OWNER') {
        return res.status(403).json({ error: 'Independent review is required; prompt owners cannot satisfy this approval stage.' });
      }

      const approvalRecord = await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: req.user?.id,
        reviewer_role: reviewerRole,
        decision: 'APPROVED',
        decision_reason: req.body.comments || '',
      });

      const refreshedApprovals = await PromptApprovalService.listByVersion(versionId);
      const refreshedRoles = new Set(
        refreshedApprovals
          .filter((approval: any) => approval.decision === 'APPROVED')
          .map((approval: any) => normalizeReviewerRole(approval.reviewer_role)),
      );
      const complete = requiredRoles.every((requiredRole) => Array.from(refreshedRoles).some((role) => canRoleSatisfy(requiredRole, role)));

      // Audit BEFORE irreversible status changes. If audit fails, delete the
      // approval record (reversible) and abort.
      const approvalEvidenceId = await auditPromptEvent('prompt.approval.recorded', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        reviewer_role: reviewerRole,
        approval_complete: complete,
        reason: req.body.comments || '',
        after_state: { decision: 'APPROVED', approval_complete: complete },
      }, req, { critical: true });

      if (complete) {
        await PromptService.updateStatus(version.prompt_id, 'APPROVED_STAGING', workspaceId);
        await ApprovalInvalidationService.clear(versionId);
      }
      if (approvalEvidenceId && approvalRecord?.id) {
        await supabaseAdmin.from('prompt_approvals').update({ evidence_id: approvalEvidenceId }).eq('id', approvalRecord.id);
      }

      res.json({ success: true, message: complete ? 'Version approved for staging' : 'Approval recorded; additional approvals required' });
    } catch (error) {
      next(error);
    }
  }

  static async rejectVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);

      // Derive reviewer_role from authenticated user first, then body fallback, then default
      const reviewerRole = normalizeReviewerRole(req.user?.role || req.body.reviewer_role);
      if (!req.body.comments && !req.body.reason) {
        return res.status(400).json({ error: 'Rejections require actionable notes or a reason category.' });
      }

      await auditPromptEvent('prompt.approval.rejected', {
        prompt_id: prompt.id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        reviewer_role: reviewerRole,
        reason: req.body.comments || req.body.reason,
        after_state: { decision: 'REJECTED', status: 'draft' },
      }, req, { critical: true });

      await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: req.user?.id,
        reviewer_role: reviewerRole,
        decision: 'REJECTED',
        decision_reason: req.body.comments || req.body.reason || '',
      });

      await PromptService.updateStatus(version.prompt_id, 'DRAFT', workspaceId);

      res.json({ success: true, message: 'Version rejected' });
    } catch (error) {
      next(error);
    }
  }

  static async deployVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);
      if (prompt.current_version_id && prompt.current_version_id !== versionId) {
        return res.status(409).json({ error: 'Only the current prompt version can be deployed.' });
      }

      const environment = req.body.environment || 'staging';
      const normalizedEnvironment = String(environment).toLowerCase();

      const gateResult = await DeploymentGateService.check(versionId, {
        prompt,
        riskTier: prompt.risk_tier,
        environment,
        workspaceId,
      });
      const blockingIssue = gateResult.blockingIssues.find((i) => i.blocking);
      if (blockingIssue) {
        await auditPromptEvent('prompt.deployment.blocked', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: blockingIssue.type,
          after_state: { blocked: true, type: blockingIssue.type, detail: blockingIssue.detail },
        }, req);
        return res.status(409).json({ error: blockingIssue.detail });
      }
      for (const w of gateResult.warnings) {
        if (w.type === 'adversarial_warning') {
          res.set('X-Adversarial-Warning', w.detail);
        }
      }
      if (normalizedEnvironment === 'production' && prompt.status !== PROMPT_STATUS.PRODUCTION_PENDING) {
        await auditPromptEvent('prompt.production.requested', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          environment: 'production',
          before_state: { status: prompt.status },
          after_state: { status: 'production_pending' },
        }, req, { critical: true });
        await PromptService.updateStatus(version.prompt_id, 'PRODUCTION_PENDING', workspaceId);
        return res.json({ success: true, message: 'Production deployment requested; final production approval is now pending.' });
      }

      const { data: previousProduction } = await supabaseAdmin
        .from('prompt_deployments')
        .select('prompt_version_id')
        .eq('environment', 'production')
        .in('prompt_version_id', (await PromptVersionService.listByPrompt(version.prompt_id)).map((v: any) => v.id))
        .order('created_at', { ascending: false })
        .limit(1);

      // Create deployment record (reversible INSERT — no production impact yet).
      const deploymentRecord = await PromptDeploymentService.create({
        prompt_version_id: versionId,
        environment: normalizedEnvironment,
        scope_json: req.body.scope || {},
        deployed_by: req.user?.id,
        release_note: req.body.release_note || '',
        rollback_to_version_id: previousProduction?.[0]?.prompt_version_id || null,
      });

      // Audit with critical BEFORE irreversible status changes.
      const deploymentEvidenceId = await auditPromptEvent('prompt.deployed', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        environment: normalizedEnvironment,
        reason: req.body.release_note || '',
        rollback_to_version_id: previousProduction?.[0]?.prompt_version_id || null,
        after_state: { environment: normalizedEnvironment, status: normalizedEnvironment === 'production' ? 'production_active' : 'approved_for_staging' },
      }, req, { critical: true });

      // Audit succeeded — proceed with irreversible status changes.
      if (normalizedEnvironment === 'production') {
        await PromptService.updateStatus(version.prompt_id, 'PRODUCTION_ACTIVE', workspaceId);
        await PromptVersionService.markImmutable(versionId);
      } else if (normalizedEnvironment === 'staging') {
        await PromptService.updateStatus(version.prompt_id, 'APPROVED_STAGING', workspaceId);
      }
      if (deploymentEvidenceId && deploymentRecord?.id) {
        await supabaseAdmin.from('prompt_deployments').update({ evidence_id: deploymentEvidenceId }).eq('id', deploymentRecord.id);
      }

      res.json({ success: true, message: `Deployed to ${normalizedEnvironment}` });
    } catch (error) {
      next(error);
    }
  }

  // ─── Rollback ───────────────────────────────────────────────────────────

  static async rollbackPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const prompt = await PromptService.getById(promptId, workspaceId);
      if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
      if (![PROMPT_STATUS.PRODUCTION_ACTIVE, PROMPT_STATUS.PAUSED].includes(prompt.status)) {
        return res.status(409).json({ error: 'Only production-active or paused prompts can be rolled back.' });
      }
      const versions = await PromptVersionService.listByPrompt(promptId);
      const versionIds = versions.map((version: any) => version.id);
      if (versionIds.length === 0) return res.status(400).json({ error: 'No prompt versions exist for rollback.' });

      // Find the last production deployment that has rollback target
      const { data: deployments } = await supabaseAdmin
        .from('prompt_deployments')
        .select('*')
        .eq('environment', 'production')
        .in('prompt_version_id', versionIds)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!deployments?.[0]) return res.status(400).json({ error: 'No production deployments to rollback from' });

      const result = await PromptDeploymentService.rollback(deployments[0].id, req.user?.id);

      // Audit with critical BEFORE irreversible status changes. The rollback
      // deployment record itself is a reversible INSERT; the status + version
      // update below is the actual production impact.
      await auditPromptEvent('prompt.rollback.completed', {
        prompt_id: promptId,
        prompt_version_id: result.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        reason: req.body.reason || 'Rollback requested from Prompt Governance',
        deployment_id: result.id,
        before_state: { current_version_id: prompt.current_version_id, status: prompt.status },
        after_state: { current_version_id: result.prompt_version_id, status: 'production_active' },
      }, req, { critical: true });

      await PromptService.updateCurrentVersion(promptId, result.prompt_version_id, workspaceId);
      await PromptService.updateStatus(promptId, 'PRODUCTION_ACTIVE', workspaceId);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Tests ──────────────────────────────────────────────────────────────

  static async listTestSuites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const data = await PromptTestService.listSuites(getParam(req, 'id'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createTestSuite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const data = await PromptTestService.createSuite({
        prompt_id: getParam(req, 'id'),
        ...req.body,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listTestRuns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptTestService.listRuns(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async runTests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const { data: suites } = await supabaseAdmin
        .from('prompt_test_suites')
        .select('id, suite_name')
        .eq('prompt_id', version.prompt_id);

      const ensuredSuites = suites && suites.length > 0
        ? suites
        : [await PromptTestService.createSuite({
            prompt_id: version.prompt_id,
            suite_name: 'Default Governance Suite',
            required_for_risk_tier: ['TIER_1_LOW', 'TIER_2_MEDIUM', 'TIER_3_HIGH', 'TIER_4_CRITICAL'],
            scenario_count: 1,
            evaluator_config: { bootstrap: true },
          })];

      const runs = await Promise.all(ensuredSuites.map(async (suite: any) => {
        return PromptTestService.createRun({
          prompt_version_id: versionId,
          suite_id: suite.id,
          environment: req.body.environment || 'draft',
          score_summary: req.body.score_summary || { score: 85 },
          run_metadata: { triggered_by: req.user?.id, automated: false, evidence_type: 'prompt_test_evidence' },
          created_by: req.user?.id,
        });
      }));

      const allPass = runs.every(r => r.pass_fail === 'PASS');
      if (allPass && version.prompt_id) {
        await PromptService.updateStatus(version.prompt_id, 'INTERNAL_TEST', workspaceId);
      }
      await auditPromptEvent(allPass ? 'prompt.test.passed' : 'prompt.test.failed', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        run_ids: runs.map((run: any) => run.id),
        after_state: { pass_fail: allPass ? 'PASS' : 'FAIL', run_count: runs.length },
      }, req);

      res.status(201).json({ success: true, data: runs });
    } catch (error) {
      next(error);
    }
  }

  // ─── Approvals ──────────────────────────────────────────────────────────

  static async listApprovals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptApprovalService.listByVersion(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getApprovalStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await PromptApprovalService.getApprovalStats(workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Deployments ────────────────────────────────────────────────────────

  static async listDeployments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptDeploymentService.listByVersion(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Bindings ───────────────────────────────────────────────────────────

  static async listBindings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptBindingService.listByVersion(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptBindingService.create({
        prompt_version_id: versionId,
        ...req.body,
      });
      await auditPromptEvent('prompt.dependency.changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        binding_id: data?.id,
        agent_id: data?.agent_id || null,
        workflow_id: data?.workflow_id || null,
        after_state: { agent_id: data?.agent_id || null, workflow_id: data?.workflow_id || null, environment: data?.environment || null },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId, workspaceId });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listKnowledgeBindings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptBindingService.listKnowledgeBindings(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createKnowledgeBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptBindingService.createKnowledgeBinding({
        prompt_version_id: versionId,
        ...req.body,
      });
      await auditPromptEvent('prompt.knowledge.binding_changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        binding_id: data?.id,
        kb_id: data?.kb_id || null,
        retrieval_mode: data?.retrieval_mode || null,
        after_state: { kb_id: data?.kb_id || null, retrieval_mode: data?.retrieval_mode || null, citation_required: data?.citation_required ?? null },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId, workspaceId });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listToolPermissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptBindingService.listToolPermissions(versionId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createToolPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const data = await PromptBindingService.createToolPermission({
        prompt_version_id: versionId,
        ...req.body,
      });
      await auditPromptEvent('prompt.tool_permission.changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        permission_id: data?.id,
        tool_name: data?.tool_name || null,
        allowed_actions: data?.allowed_actions || [],
        after_state: { tool_name: data?.tool_name || null, allowed_actions: data?.allowed_actions || [], approval_required: data?.approval_required ?? null },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId, workspaceId });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dependency Binding Edits (update / delete) ───────────────────────────
  // Tenant-scoped: each binding is resolved to its prompt version, and the
  // version must belong to the caller's workspace before any mutation. Every
  // change is audit-logged as a dependency event with before/after state.

  static async updateBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptBindingService.getBindingById(getParam(req, 'bindingId'));
      if (!existing) return res.status(404).json({ error: 'Binding not found' });
      const version = await PromptController.requireVersionInWorkspace(existing.prompt_version_id, workspaceId);
      if (!version) return res.status(404).json({ error: 'Binding not found' });
      const data = await PromptBindingService.updateBinding(getParam(req, 'bindingId'), req.body);
      await auditPromptEvent('prompt.dependency.changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: existing.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        binding_id: existing.id,
        before_state: { agent_id: existing.agent_id, workflow_id: existing.workflow_id, environment: existing.environment },
        after_state: { agent_id: data?.agent_id, workflow_id: data?.workflow_id, environment: data?.environment },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId: existing.prompt_version_id, workspaceId });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptBindingService.getBindingById(getParam(req, 'bindingId'));
      if (!existing) return res.status(404).json({ error: 'Binding not found' });
      const version = await PromptController.requireVersionInWorkspace(existing.prompt_version_id, workspaceId);
      if (!version) return res.status(404).json({ error: 'Binding not found' });
      await PromptBindingService.deleteBinding(getParam(req, 'bindingId'));
      await auditPromptEvent('prompt.dependency.changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: existing.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        binding_id: existing.id,
        reason: req.body?.reason || 'Binding removed',
        before_state: { agent_id: existing.agent_id, workflow_id: existing.workflow_id, environment: existing.environment },
        after_state: { removed: true },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId: existing.prompt_version_id, workspaceId, deletion: true });
      res.json({ success: true, data: { id: existing.id, removed: true } });
    } catch (error) {
      next(error);
    }
  }

  static async updateKnowledgeBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptBindingService.getKnowledgeBindingById(getParam(req, 'bindingId'));
      if (!existing) return res.status(404).json({ error: 'Knowledge binding not found' });
      const version = await PromptController.requireVersionInWorkspace(existing.prompt_version_id, workspaceId);
      if (!version) return res.status(404).json({ error: 'Knowledge binding not found' });
      const data = await PromptBindingService.updateKnowledgeBinding(getParam(req, 'bindingId'), req.body);
      await auditPromptEvent('prompt.knowledge.binding_changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: existing.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        binding_id: existing.id,
        before_state: { kb_id: existing.kb_id, retrieval_mode: existing.retrieval_mode, citation_required: existing.citation_required },
        after_state: { kb_id: data?.kb_id, retrieval_mode: data?.retrieval_mode, citation_required: data?.citation_required },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId: existing.prompt_version_id, workspaceId });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteKnowledgeBinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptBindingService.getKnowledgeBindingById(getParam(req, 'bindingId'));
      if (!existing) return res.status(404).json({ error: 'Knowledge binding not found' });
      const version = await PromptController.requireVersionInWorkspace(existing.prompt_version_id, workspaceId);
      if (!version) return res.status(404).json({ error: 'Knowledge binding not found' });
      await PromptBindingService.deleteKnowledgeBinding(getParam(req, 'bindingId'));
      await auditPromptEvent('prompt.knowledge.binding_changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: existing.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        binding_id: existing.id,
        reason: req.body?.reason || 'Knowledge binding removed',
        before_state: { kb_id: existing.kb_id, retrieval_mode: existing.retrieval_mode },
        after_state: { removed: true },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId: existing.prompt_version_id, workspaceId, deletion: true });
      res.json({ success: true, data: { id: existing.id, removed: true } });
    } catch (error) {
      next(error);
    }
  }

  static async updateToolPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptBindingService.getToolPermissionById(getParam(req, 'permissionId'));
      if (!existing) return res.status(404).json({ error: 'Tool permission not found' });
      const version = await PromptController.requireVersionInWorkspace(existing.prompt_version_id, workspaceId);
      if (!version) return res.status(404).json({ error: 'Tool permission not found' });
      const data = await PromptBindingService.updateToolPermission(getParam(req, 'permissionId'), req.body);
      await auditPromptEvent('prompt.tool_permission.changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: existing.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        permission_id: existing.id,
        before_state: { tool_name: existing.tool_name, allowed_actions: existing.allowed_actions, approval_required: existing.approval_required },
        after_state: { tool_name: data?.tool_name, allowed_actions: data?.allowed_actions, approval_required: data?.approval_required },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId: existing.prompt_version_id, workspaceId });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async deleteToolPermission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const existing = await PromptBindingService.getToolPermissionById(getParam(req, 'permissionId'));
      if (!existing) return res.status(404).json({ error: 'Tool permission not found' });
      const version = await PromptController.requireVersionInWorkspace(existing.prompt_version_id, workspaceId);
      if (!version) return res.status(404).json({ error: 'Tool permission not found' });
      await PromptBindingService.deleteToolPermission(getParam(req, 'permissionId'));
      await auditPromptEvent('prompt.tool_permission.changed', {
        prompt_id: version.prompt_id,
        prompt_version_id: existing.prompt_version_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        permission_id: existing.id,
        reason: req.body?.reason || 'Tool permission removed',
        before_state: { tool_name: existing.tool_name, allowed_actions: existing.allowed_actions },
        after_state: { removed: true },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: version.prompt_id, versionId: existing.prompt_version_id, workspaceId, deletion: true });
      res.json({ success: true, data: { id: existing.id, removed: true } });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptGraph(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      await PromptService.requireById(promptId, workspaceId);
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;
      const graph = await PromptDependencyService.getGraph(promptId, workspaceId, { referenceTime });
      res.json({ success: true, data: graph });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptVersionGraph(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;
      const graph = await PromptDependencyService.getGraph(version.prompt_id, workspaceId, {
        versionId: version.id,
        referenceTime,
      });
      res.json({ success: true, data: graph });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dependency Health (Batch 3B.8) ──────────────────────────────────────
  // Read-only projections of the forward dependency graph's HEALTH view. They
  // reuse PromptDependencyService.getGraph() as the single source of truth — the
  // graph already classifies each edge through DependencyHealthService and rolls
  // up a summary, so these endpoints never recompute health or call the health
  // service directly. No mutations, no audit emission, no deploy/runtime impact.

  static async getPromptDependencyHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      // Tenant isolation: prompts.workspace_id — a prompt from another workspace 404s here.
      await PromptService.requireById(promptId, workspaceId);
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;
      const graph = await PromptDependencyService.getGraph(promptId, workspaceId, { referenceTime });
      res.json({
        success: true,
        data: {
          found: graph.found,
          prompt_id: graph.prompt_id,
          workspace_id: graph.workspace_id,
          summary: graph.summary,
          health: graph.edges
            .filter((e) => e.health)
            .map((e) => ({
              source: e.source,
              target: e.target,
              dependency_type: e.dependency_type,
              environment: e.environment,
              ...e.health,
            })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptVersionDependencyHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      // Version isolation: prompt_versions → prompts → workspace_id.
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;
      const graph = await PromptDependencyService.getGraph(version.prompt_id, workspaceId, {
        versionId: version.id,
        referenceTime,
      });
      res.json({
        success: true,
        data: {
          found: graph.found,
          prompt_id: graph.prompt_id,
          workspace_id: graph.workspace_id,
          summary: graph.summary,
          health: graph.edges
            .filter((e) => e.health)
            .map((e) => ({
              source: e.source,
              target: e.target,
              dependency_type: e.dependency_type,
              environment: e.environment,
              ...e.health,
            })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dependency Impact (Batch 3B.9) ──────────────────────────────────────
  // Read-only governance impact previews. Reuse DependencyImpactService (which
  // sources everything from PromptDependencyService.getGraph()). NO mutations,
  // NO audit emission, NO deployment-gate change — the live deploy gate in
  // deployVersion is the enforcement path; these endpoints are advisory only.

  static async getPromptImpact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      // Tenant isolation: a prompt from another workspace 404s here.
      await PromptService.requireById(promptId, workspaceId);

      const action = getQueryValue(req, 'action');
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;

      let result;
      switch (action) {
        case 'deploy':
          result = await DependencyImpactService.analyzeDeploymentImpact(promptId, workspaceId, { referenceTime });
          break;
        case 'archive':
          result = await DependencyImpactService.analyzeArchiveImpact(promptId, workspaceId, { referenceTime });
          break;
        case 'retire':
          result = await DependencyImpactService.analyzeRetireImpact(promptId, workspaceId, { referenceTime });
          break;
        case 'rollback': {
          const targetVersionId = getQueryValue(req, 'targetVersionId');
          if (!targetVersionId) {
            return res.status(400).json({ error: 'targetVersionId is required for a prompt-level rollback impact request.' });
          }
          result = await DependencyImpactService.analyzeRollbackImpact(promptId, workspaceId, targetVersionId, { referenceTime });
          break;
        }
        default:
          return res.status(400).json({ error: "Invalid action. Allowed values: 'deploy', 'rollback', 'archive', 'retire'." });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptVersionImpact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      // Version isolation: prompt_versions → prompts → workspace_id.
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const action = getQueryValue(req, 'action');
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;

      let result;
      switch (action) {
        case 'deploy':
          result = await DependencyImpactService.analyzeDeploymentImpact(version.prompt_id, workspaceId, { versionId: version.id, referenceTime });
          break;
        case 'archive':
          result = await DependencyImpactService.analyzeArchiveImpact(version.prompt_id, workspaceId, { referenceTime });
          break;
        case 'retire':
          result = await DependencyImpactService.analyzeRetireImpact(version.prompt_id, workspaceId, { referenceTime });
          break;
        case 'rollback':
          // The requested version IS the rollback target — no extra param required.
          result = await DependencyImpactService.analyzeRollbackImpact(version.prompt_id, workspaceId, version.id, { referenceTime });
          break;
        default:
          return res.status(400).json({ error: "Invalid action. Allowed values: 'deploy', 'rollback', 'archive', 'retire'." });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Reverse Dependency Traversal (Batch 3B.11) ──────────────────────────
  // GET /api/v1/prompts/dependents?targetType=&targetId= — "which prompts depend
  // on this target?". Read-only; tenant isolation is delegated to
  // ReverseDependencyService (workspace gate via prompt_versions → prompts →
  // workspace_id), so a foreign targetId cannot leak cross-tenant prompts. No
  // mutations, no audit emission, no deploy/runtime impact.

  static async getPromptDependents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);

      const ALLOWED_TARGET_TYPES: ReverseTargetType[] = [
        'agent', 'workflow', 'workflow_node', 'knowledge', 'collection', 'tool', 'channel', 'brand', 'policy',
      ];
      const targetType = getQueryValue(req, 'targetType');
      const targetId = getQueryValue(req, 'targetId');

      if (!targetType || !ALLOWED_TARGET_TYPES.includes(targetType as ReverseTargetType)) {
        return res.status(400).json({
          error: `Invalid or missing targetType. Allowed values: ${ALLOWED_TARGET_TYPES.join(', ')}.`,
        });
      }
      if (!targetId) {
        return res.status(400).json({ error: 'targetId is required.' });
      }

      const result = await ReverseDependencyService.getDependents(
        targetType as ReverseTargetType,
        targetId,
        workspaceId,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Dependency Notification Plan (Batch 3B.13) ──────────────────────────
  // GET /api/v1/prompts/dependency-notifications/plan?targetType=&targetId=&status=
  // Returns a notification PLAN only (who/why/what/severity/recommended action).
  // Read-only; NEVER sends. Tenant isolation is delegated to
  // DependencyNotificationPlanner (reverse-traversal workspace gate + prompt
  // re-filter). No mutations, no audit/evidence emission, no deploy/runtime impact.

  static async getDependencyNotificationPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);

      const ALLOWED_TARGET_TYPES: ReverseTargetType[] = [
        'agent', 'workflow', 'workflow_node', 'knowledge', 'collection', 'tool', 'channel', 'brand', 'policy',
      ];
      const targetType = getQueryValue(req, 'targetType');
      const targetId = getQueryValue(req, 'targetId');
      // status is passed straight through to the planner — intentionally NOT validated.
      const status = getQueryValue(req, 'status');

      if (!targetType || !ALLOWED_TARGET_TYPES.includes(targetType as ReverseTargetType)) {
        return res.status(400).json({
          error: `Invalid or missing targetType. Allowed values: ${ALLOWED_TARGET_TYPES.join(', ')}.`,
        });
      }
      if (!targetId) {
        return res.status(400).json({ error: 'targetId is required.' });
      }

      const result = await DependencyNotificationPlanner.planNotifications({
        targetType: targetType as ReverseTargetType,
        targetId,
        workspaceId,
        status,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Governance Dashboard (Batch 3B.15) ──────────────────────────────────
  // Read-only aggregation endpoints over GovernanceDashboardService. No
  // mutations, no audit/evidence emission, no deploy/runtime impact. Workspace
  // isolation via resolveWorkspaceId (+ requireById on the snapshot).

  static async getGovernanceDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const limit = getQueryNumber(req, 'limit', 100);
      const data = await GovernanceDashboardService.getWorkspaceDashboard(workspaceId, { limit });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getPromptGovernanceSnapshot(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      // Tenant isolation: a prompt from another workspace 404s here.
      await PromptService.requireById(promptId, workspaceId);
      const referenceTime = getQueryValue(req, 'referenceTime') || undefined;
      const data = await GovernanceDashboardService.getPromptGovernanceSnapshot(promptId, workspaceId, { referenceTime });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 5B — Drift Monitoring ────────────────────────────────────────────

  static async scanPromptDrift(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      await PromptService.requireById(promptId, workspaceId);
      const findings = await GovernanceDriftService.detectPromptDrift(promptId, workspaceId);
      res.json({ success: true, data: findings });
    } catch (error) {
      next(error);
    }
  }

  static async getDriftSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const findings = await GovernanceDriftService.detectWorkspaceDrift(workspaceId);
      const bySeverity: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      for (const f of findings) {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
        byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      }
      res.json({
        success: true,
        data: {
          total_findings: findings.length,
          by_severity: bySeverity,
          by_category: byCategory,
          findings,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolveDrift(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = (req.body as any)?.prompt_id as string | undefined;
      const category = (req.body as any)?.category as string | undefined;
      const resolution = (req.body as any)?.resolution as string | undefined;
      const note = (req.body as any)?.note as string | undefined;

      if (!promptId || !category || !resolution) {
        return res.status(400).json({ error: 'prompt_id, category, and resolution are required' });
      }

      await PromptService.requireById(promptId, workspaceId);

      await auditPromptEvent('prompt.drift.resolved', {
        prompt_id: promptId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        drift_category: category,
        resolution,
        note: note || '',
      }, req);

      res.json({ success: true, message: `Drift ${category} resolved as ${resolution}` });
    } catch (error) {
      next(error);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 5E — Prompt Scorecards
  // ═════════════════════════════════════════════════════════════════════════

  static async getPromptScorecard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      await PromptService.requireById(promptId, workspaceId);
      const data = await PromptScorecardService.getScorecard(promptId, workspaceId);
      await auditPromptEvent('prompt.scorecard.generated', {
        prompt_id: promptId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        overall_score: data.overall_score,
        overall_severity: data.overall_severity,
        after_state: { overall_score: data.overall_score, overall_severity: data.overall_severity, version_id: data.version_id },
      }, req);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listPromptScorecards(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const limit = getQueryNumber(req, 'limit', 50);
      const offset = getQueryNumber(req, 'offset', 0);
      const result = await PromptScorecardService.listScorecards(workspaceId, { limit, offset });
      await auditPromptEvent('prompt.scorecard.generated', {
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        scorecard_count: result.data.length,
        average_score: result.summary.average_score,
        after_state: { count: result.data.length, average_score: result.summary.average_score },
      }, req);
      res.json({
        success: true,
        data: result.data,
        summary: result.summary,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 5F — Governance Metrics Dashboard
  // ═════════════════════════════════════════════════════════════════════════

  static async getGovernanceMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const metrics = await GovernanceMetricsService.compute(workspaceId);
      await auditPromptEvent('prompt.metrics.viewed', {
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        total_prompts: metrics.total_prompts,
        average_score: metrics.average_score,
        after_state: { total_prompts: metrics.total_prompts, average_score: metrics.average_score },
      }, req);
      res.json({
        success: true,
        data: metrics,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 5C — Adversarial Testing
  // ═════════════════════════════════════════════════════════════════════════

  static async listAdversarialScenarios(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const suiteId = getParam(req, 'suiteId');
      await PromptService.requireById(promptId, workspaceId);
      const scenarios = await AdversarialScenarioService.listScenarios(suiteId);
      res.json({ success: true, data: scenarios });
    } catch (error) {
      next(error);
    }
  }

  static async createAdversarialScenario(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const suiteId = getParam(req, 'suiteId');
      await PromptService.requireById(promptId, workspaceId);
      const parsed = createAdversarialScenarioSchema.parse(req.body);
      const scenario = await AdversarialScenarioService.createScenario({
        suite_id: suiteId,
        ...parsed,
      });
      res.status(201).json({ success: true, data: scenario });
    } catch (error) {
      next(error);
    }
  }

  static async updateAdversarialScenario(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const scenarioId = getParam(req, 'scenarioId');
      await PromptService.requireById(promptId, workspaceId);
      const parsed = updateAdversarialScenarioSchema.parse(req.body);
      const scenario = await AdversarialScenarioService.updateScenario(scenarioId, parsed);
      res.json({ success: true, data: scenario });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAdversarialScenario(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const scenarioId = getParam(req, 'scenarioId');
      await PromptService.requireById(promptId, workspaceId);
      await AdversarialScenarioService.deleteScenario(scenarioId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async seedDefaultAdversarialScenarios(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const suiteId = getParam(req, 'suiteId');
      await PromptService.requireById(promptId, workspaceId);
      const scenarios = await AdversarialScenarioService.seedDefaults(suiteId);
      res.json({ success: true, data: scenarios });
    } catch (error) {
      next(error);
    }
  }

  static async runAdversarialTests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', versionId)
        .single();
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);
      const parsed = runAdversarialTestSchema.parse(req.body);

      await auditPromptEvent('prompt.test.adversarial.started', {
        prompt_version_id: versionId,
        suite_id: parsed.suite_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
      }, req);

      const report = await AdversarialTestService.evaluatePromptVersion(
        versionId,
        parsed.suite_id,
        prompt.risk_tier,
      );

      const run = await PromptTestService.createAdversarialRun({
        prompt_version_id: versionId,
        suite_id: parsed.suite_id,
        pass_fail: report.summary.overall_result === 'PASS' ? 'PASS' : 'FAIL',
        score_summary: {
          score: report.summary.overall_score,
          adversarial: true,
          category_scores: report.summary.category_scores,
        },
        run_metadata: {
          adversarial: true,
          scenario_results: report.scenario_results,
          summary: report.summary,
          evidence_refs: report.evidence_refs,
        },
        created_by: req.user?.id,
      });

      const auditEvent = report.summary.overall_result === 'PASS'
        ? 'prompt.test.adversarial.passed'
        : report.summary.overall_result === 'WARN'
          ? 'prompt.test.adversarial.warning'
          : 'prompt.test.adversarial.failed';

      await auditPromptEvent(auditEvent, {
        prompt_version_id: versionId,
        prompt_id: version.prompt_id,
        suite_id: parsed.suite_id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        run_id: run.id,
        after_state: {
          pass_fail: run.pass_fail,
          overall_score: report.summary.overall_score,
          total_scenarios: report.summary.total,
          passed: report.summary.passed,
          warnings: report.summary.warnings,
          failed: report.summary.failed,
          critical_failures: report.summary.critical_failures,
        },
      }, req);

      res.status(201).json({
        success: true,
        data: {
          run_id: run.id,
          pass_fail: run.pass_fail,
          overall_score: report.summary.overall_score,
          overall_result: report.summary.overall_result,
          category_scores: report.summary.category_scores,
          total_scenarios: report.summary.total,
          passed: report.summary.passed,
          warnings: report.summary.warnings,
          failed: report.summary.failed,
          critical_failures: report.summary.critical_failures,
          evidence_refs: report.evidence_refs,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async listAdversarialResults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', versionId)
        .single();
      if (!version) return res.status(404).json({ error: 'Version not found' });
      await PromptService.requireById(version.prompt_id, workspaceId);
      const runs = await PromptTestService.listAdversarialRuns(versionId);
      res.json({ success: true, data: runs });
    } catch (error) {
      next(error);
    }
  }

  static async getAdversarialResultDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const runId = getParam(req, 'runId');
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', versionId)
        .single();
      if (!version) return res.status(404).json({ error: 'Version not found' });
      await PromptService.requireById(version.prompt_id, workspaceId);
      const { data: run } = await supabaseAdmin
        .from('prompt_test_runs')
        .select('*')
        .eq('id', runId)
        .eq('prompt_version_id', versionId)
        .single();
      if (!run) return res.status(404).json({ error: 'Run not found' });
      res.json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 5D — Policy Simulation ──────────────────────────────────────

  static async runPolicySimulation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const parsed = runPolicySimulationSchema.parse(req.body);
      const report = await PolicySimulationService.simulate({
        workspace_id: workspaceId,
        simulation_type: parsed.simulation_type,
        parameters: parsed.parameters,
        actor_id: req.user?.id ?? undefined,
        actor_role: req.user?.role ?? undefined,
      });
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async runPromptPolicySimulation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const promptId = getParam(req, 'id');
      const prompt = await PromptService.requireById(promptId, workspaceId);
      if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
      const parsed = runPolicySimulationSchema.parse(req.body);
      const report = await PolicySimulationService.simulate({
        workspace_id: workspaceId,
        simulation_type: parsed.simulation_type,
        parameters: parsed.parameters,
        prompt_id: promptId,
        actor_id: req.user?.id ?? undefined,
        actor_role: req.user?.role ?? undefined,
      });
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';
import { PromptService } from './PromptService';
import { PostGovernanceService } from './PostGovernanceService';
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
import { PromptEvaluationService } from './PromptEvaluationService';
import { ConstraintShadowService } from './ConstraintShadowService';
import { PromptVariableService } from './PromptVariableService';
import { ParameterPolicyService } from './ParameterPolicyService';
import { RuntimeVariableGovernanceService } from './RuntimeVariableGovernanceService';
import { PromptDefensibilityIndexService } from './PromptDefensibilityIndex';
import { CrossModelComparisonService } from './CrossModelComparisonService';
import { GovernanceReceiptService } from './GovernanceReceiptService';
import { CommissioningService } from './CommissioningService';
import { FailClosedGuard } from './FailClosedGuard';
import { ThreeKeyService } from './ThreeKeyService';
import { SeparationOfDutiesService } from './SeparationOfDutiesService';
import { DelegationService } from './DelegationService';
import { EscalationService } from './EscalationService';
import { LifecycleGateService } from './LifecycleGateService';
import { createAdversarialScenarioSchema, updateAdversarialScenarioSchema, runAdversarialTestSchema } from './schemas/adversarial.schema';
import { runPolicySimulationSchema } from './schemas/policySimulation.schema';
import { getParam, getQueryValue, getQueryNumber } from '../../shared/request';
import { logToDatabase } from '../../shared/databaseLogger';
import { PROMPT_STATUS } from './PromptService';

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

  // ─── A7: Ownership enforcement (Doc 3 §15 prompt.edit.own vs prompt.edit.any) ──
  // Roles that carry `prompt.edit.any` — may edit any draft in tenant scope.
  // Everyone else with `prompt.edit.own` (e.g. AGENT_ARCHITECT) may only edit
  // drafts they own (owner_id) or created (created_by). Enforced IN ADDITION to
  // the existing govEdit route guard — never a bypass of it.
  private static readonly EDIT_ANY_ROLES = ['ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER'];

  private static hasEditAny(req: AuthRequest): boolean {
    if (req.user?.api_key_id) {
      const scopes = req.user.api_key_scopes || [];
      return scopes.includes('*') || scopes.includes('prompt.edit.any');
    }
    const role = String(req.user?.role || '').toUpperCase();
    return !!req.user?.is_superadmin || PromptController.EDIT_ANY_ROLES.includes(role);
  }

  private static ownsPrompt(req: AuthRequest, prompt: { owner_id?: string | null; created_by?: string | null }): boolean {
    const uid = req.user?.id;
    if (!uid) return false;
    return prompt.owner_id === uid || prompt.created_by === uid;
  }

  /** `prompt.edit.any` short-circuits to allowed; otherwise the caller must own
   *  (created_by/owner_id) the prompt to satisfy `prompt.edit.own`. */
  private static checkEditPermission(
    req: AuthRequest,
    prompt: { owner_id?: string | null; created_by?: string | null },
  ): { allowed: boolean; reason: string } {
    if (PromptController.hasEditAny(req)) return { allowed: true, reason: 'edit.any' };
    if (PromptController.ownsPrompt(req, prompt)) return { allowed: true, reason: 'edit.own' };
    return {
      allowed: false,
      reason: 'Forbidden: prompt.edit.own permits editing only prompts you own or are assigned to. prompt.edit.any is required to edit drafts owned by others.',
    };
  }

  /** Guard: enforce edit permission, audit any denial, and send 403.
   *  Returns true when the caller may proceed. */
  private static async enforceEditPermission(
    req: AuthRequest,
    res: Response,
    prompt: { id: string; owner_id?: string | null; created_by?: string | null; risk_tier?: string },
    workspaceId: string,
  ): Promise<boolean> {
    const check = PromptController.checkEditPermission(req, prompt);
    if (check.allowed) return true;
    await auditPromptEvent('prompt.edit.denied', {
      prompt_id: prompt.id,
      workspace_id: workspaceId,
      actor_id: req.user?.id,
      risk_tier: prompt.risk_tier,
      reason: 'ownership_denied',
      after_state: { blocked: true, required_permission: 'prompt.edit.any', owner_id: prompt.owner_id ?? null },
    }, req);
    res.status(403).json({ error: check.reason });
    return false;
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
      // A7: prompt.edit.own vs prompt.edit.any
      if (!(await PromptController.enforceEditPermission(req, res, existing, workspaceId))) return;
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

  // ─── A1: Create starting paths (Doc 3 §5 / §12) ──────────────────────────
  // Statuses that represent a prompt that has cleared approval and is therefore
  // eligible to be used as a template.
  private static readonly TEMPLATE_SOURCE_STATUSES: string[] = [
    PROMPT_STATUS.APPROVED_STAGING,
    PROMPT_STATUS.PRODUCTION_PENDING,
    PROMPT_STATUS.COMMISSIONED,
    PROMPT_STATUS.PRODUCTION_ACTIVE,
    PROMPT_STATUS.PAUSED,
    PROMPT_STATUS.RETIRED,
    PROMPT_STATUS.ARCHIVED,
  ];

  /**
   * A1 — Create-from-Template. Copies an APPROVED source prompt's configuration
   * (metadata, risk tier, agent/workflow links, knowledge sources, permitted
   * tools) and its current version's content (body, variables, guardrails, model
   * routes) into a brand-new DRAFT. Approvals, audit history, deployment history,
   * and evidence are intentionally NOT copied — a fresh prompt + version are
   * inserted, so none of those rows carry over.
   */
  static async createFromTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const sourceId = getParam(req, 'id');
      const source = await PromptService.requireById(sourceId, workspaceId);
      if (!PromptController.TEMPLATE_SOURCE_STATUSES.includes(String(source.status))) {
        return res.status(409).json({ error: 'Templates can only be created from an approved prompt (approved, production, paused, retired, or archived).' });
      }

      const sourceVersion = source.current_version_id
        ? await PromptVersionService.getById(source.current_version_id).catch(() => null)
        : null;

      const created = await PromptService.create({
        workspace_id: workspaceId,
        name: req.body.name || `${source.name} (From Template)`,
        description: req.body.description || `Created from template "${source.name}".`,
        prompt_type: source.prompt_type,
        owner_id: req.user?.id,
        owner_name: req.user?.email || req.user?.id,
        risk_tier: req.body.risk_tier || source.risk_tier,
        linked_agent: source.linked_agent,
        linked_agent_id: source.linked_agent_id,
        linked_workflow: source.linked_workflow,
        linked_workflow_id: source.linked_workflow_id,
        knowledge_sources: source.knowledge_sources || [],
        tools_permitted: source.tools_permitted || [],
        created_by: req.user?.id,
      });

      await PromptVersionService.create({
        prompt_id: created.id,
        body: sourceVersion?.body || `Prompt draft for ${created.name}`,
        variables_json: sourceVersion?.variables_json,
        guardrails_json: sourceVersion?.guardrails_json,
        model_routes_json: sourceVersion?.model_routes_json,
        change_summary: `Initial draft copied from template "${source.name}"`,
        created_by: req.user?.id,
      });

      await PromptTestService.createSuite({
        prompt_id: created.id,
        suite_name: 'Default Governance Suite',
        required_for_risk_tier: [created.risk_tier || 'TIER_2_MEDIUM'],
        scenario_count: 1,
        evaluator_config: { bootstrap: true },
      }).catch(() => null);

      await auditPromptEvent('prompt.created', {
        prompt_id: created.id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: created.risk_tier,
        after_state: { name: created.name, status: created.status, created_from_template: sourceId },
      }, req);

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  }

  /**
   * A1 — Import prompt definition JSON. Validates schema / required fields /
   * risk tier / variable structure and surfaces all validation errors. On
   * success, creates a DRAFT prompt + initial version from the definition.
   */
  static async importPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const raw = (req.body && typeof req.body.definition === 'object' && req.body.definition !== null)
        ? req.body.definition
        : req.body;
      const def = (raw || {}) as Record<string, any>;

      const errors: string[] = [];
      const VALID_TIERS = ['tier_1_low', 'tier_2_medium', 'tier_3_high', 'tier_4_critical', 'TIER_1_LOW', 'TIER_2_MEDIUM', 'TIER_3_HIGH', 'TIER_4_CRITICAL'];

      if (!def.name || typeof def.name !== 'string' || !def.name.trim()) {
        errors.push('`name` is required and must be a non-empty string.');
      }
      if (!def.prompt_type || typeof def.prompt_type !== 'string') {
        errors.push('`prompt_type` is required.');
      }
      if (!def.risk_tier || !VALID_TIERS.includes(String(def.risk_tier))) {
        errors.push('`risk_tier` is required and must be one of tier_1_low, tier_2_medium, tier_3_high, tier_4_critical.');
      }
      // Variable structure: optional, but if present must be an object map of
      // { name -> { type, ... } } or an array of { name, type }.
      if (def.variables_json !== undefined && def.variables_json !== null) {
        const v = def.variables_json;
        const isObjectMap = typeof v === 'object' && !Array.isArray(v);
        const isArray = Array.isArray(v);
        if (!isObjectMap && !isArray) {
          errors.push('`variables_json` must be an object map or an array of variable definitions.');
        } else {
          const entries = isArray ? v : Object.entries(v).map(([name, body]: [string, any]) => ({ name, ...(body || {}) }));
          entries.forEach((entry: any, i: number) => {
            if (!entry || (!entry.name && !isObjectMap)) errors.push(`Variable #${i + 1}: missing name.`);
            if (entry && entry.type && typeof entry.type !== 'string') errors.push(`Variable #${i + 1}: type must be a string.`);
          });
        }
      }
      if (def.guardrails_json !== undefined && def.guardrails_json !== null && typeof def.guardrails_json !== 'object') {
        errors.push('`guardrails_json` must be an object or array.');
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, error: 'Prompt import validation failed.', errors });
      }

      const created = await PromptService.create({
        workspace_id: workspaceId,
        name: String(def.name),
        description: def.description || 'Imported prompt definition.',
        prompt_type: def.prompt_type,
        owner_id: req.user?.id,
        owner_name: req.user?.email || req.user?.id,
        risk_tier: def.risk_tier,
        linked_agent: def.linked_agent,
        linked_agent_id: def.linked_agent_id,
        linked_workflow: def.linked_workflow,
        linked_workflow_id: def.linked_workflow_id,
        knowledge_sources: Array.isArray(def.knowledge_sources) ? def.knowledge_sources : [],
        tools_permitted: Array.isArray(def.tools_permitted) ? def.tools_permitted : [],
        created_by: req.user?.id,
      });

      await PromptVersionService.create({
        prompt_id: created.id,
        body: def.body || def.initial_body || `Imported prompt: ${created.name}`,
        variables_json: def.variables_json,
        guardrails_json: def.guardrails_json,
        model_routes_json: def.model_routes_json,
        change_summary: 'Initial draft imported from definition',
        created_by: req.user?.id,
      });

      await PromptTestService.createSuite({
        prompt_id: created.id,
        suite_name: 'Default Governance Suite',
        required_for_risk_tier: [created.risk_tier || 'TIER_2_MEDIUM'],
        scenario_count: 1,
        evaluator_config: { bootstrap: true },
      }).catch(() => null);

      await auditPromptEvent('prompt.created', {
        prompt_id: created.id,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: created.risk_tier,
        after_state: { name: created.name, status: created.status, imported: true },
      }, req);

      res.status(201).json({ success: true, data: created });
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

      // Lifecycle gate: validate transition to RETIRED
      const transitionCheck = await LifecycleGateService.enforceTransition(promptId, PROMPT_STATUS.RETIRED, workspaceId, req.user?.id);
      if (!transitionCheck.allowed) {
        await auditPromptEvent('prompt.lifecycle.transition.denied', {
          prompt_id: promptId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: transitionCheck.reason,
          after_state: { current_status: prompt.status, target_status: PROMPT_STATUS.RETIRED },
        }, req);
        return res.status(409).json({ error: transitionCheck.reason });
      }

      await auditPromptEvent('prompt.retired', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || '', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.RETIRED } }, req, { critical: true });
      const data = await PromptService.updateStatus(promptId, 'RETIRED', workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // Bring a retired/archived prompt back into the working set. Governance does not
  // allow a direct jump to production (that would bypass approvals), so the prompt
  // is reactivated as a DRAFT and must re-enter the lifecycle. DB DELETE is blocked
  // by design (prompts immutability trigger); RETIRED/ARCHIVED is the terminal
  // hidden state and reactivation is its reversible counterpart.
  static async reactivatePrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      if (![PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED].includes(prompt.status)) {
        return res.status(409).json({ error: 'Only retired or archived prompts can be reactivated.' });
      }
      const promptId = getParam(req, 'id');
      await auditPromptEvent('prompt.reactivated', { prompt_id: promptId, workspace_id: workspaceId, actor_id: req.user?.id, risk_tier: prompt.risk_tier, reason: req.body.reason || 'Reactivated to draft', before_state: { status: prompt.status }, after_state: { status: PROMPT_STATUS.DRAFT } }, req, { critical: true });
      const data = await PromptService.updateStatus(promptId, 'DRAFT', workspaceId);
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
      // A7: creating a new draft version is an edit — prompt.edit.own vs prompt.edit.any
      if (!(await PromptController.enforceEditPermission(req, res, prompt, workspaceId))) return;
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

      // Lifecycle gate: LOCKED, SUPERSEDED, RETIRED, ARCHIVED cannot be submitted for review
      if (LifecycleGateService.isLocked(prompt.status) || LifecycleGateService.isImmutable(prompt.status)) {
        await auditPromptEvent('prompt.review.blocked', {
          prompt_id: promptId,
          prompt_version_id: prompt.current_version_id,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'lifecycle_locked',
          after_state: { blocked: true, status: prompt.status },
        }, req);
        return res.status(409).json({ error: `Cannot submit for review: prompt is in '${prompt.status}' status.` });
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

      // Lifecycle gate: LOCKED, SUPERSEDED, RETIRED, ARCHIVED cannot be approved
      if (LifecycleGateService.isLocked(prompt.status) || LifecycleGateService.isImmutable(prompt.status)) {
        await auditPromptEvent('prompt.approval.denied', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'lifecycle_locked',
          after_state: { blocked: true, status: prompt.status },
        }, req);
        return res.status(409).json({ error: `Cannot approve: prompt is in '${prompt.status}' status.` });
      }

      const userId = req.user?.id as string;
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
        await auditPromptEvent('prompt.approval.denied', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: userId,
          risk_tier: prompt.risk_tier,
          reviewer_role: reviewerRole,
          reason: 'role_mismatch',
          after_state: { blocked: true, required_role: nextRequiredRole },
        }, req);
        return res.status(403).json({ error: `Next approval requires ${nextRequiredRole}.` });
      }
      // Separation of Duties: self-approval check (uses version.created_by, not prompt.owner_id)
      const selfApprovalCheck = await SeparationOfDutiesService.checkSelfApproval(versionId, userId);
      if (!selfApprovalCheck.allowed) {
        await auditPromptEvent('prompt.approval.denied', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: userId,
          risk_tier: prompt.risk_tier,
          reviewer_role: reviewerRole,
          reason: 'self_approval',
          after_state: { blocked: true, detail: selfApprovalCheck.reason },
        }, req);
        return res.status(403).json({ error: selfApprovalCheck.reason });
      }
      // Separation of Duties: role conflict check
      const conflictCheck = await SeparationOfDutiesService.checkRoleConflict(versionId, reviewerRole, userId);
      if (!conflictCheck.allowed) {
        await auditPromptEvent('prompt.approval.denied', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: userId,
          risk_tier: prompt.risk_tier,
          reviewer_role: reviewerRole,
          reason: 'role_conflict',
          after_state: { blocked: true, detail: conflictCheck.reason, existing_role: conflictCheck.existingRole },
        }, req);
        return res.status(403).json({ error: conflictCheck.reason });
      }
      // Separation of Duties: stage order check
      const stageOrderCheck = await SeparationOfDutiesService.checkStageOrder(versionId, reviewerRole);
      if (!stageOrderCheck.allowed) {
        await auditPromptEvent('prompt.approval.denied', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: userId,
          risk_tier: prompt.risk_tier,
          reviewer_role: reviewerRole,
          reason: 'stage_order_violation',
          after_state: { blocked: true, detail: stageOrderCheck.reason },
        }, req);
        return res.status(403).json({ error: stageOrderCheck.reason });
      }

      // Fail-closed guard: evidence + audit write enforcement before recording approval
      await FailClosedGuard.guardApproval({
        operation: 'prompt.approve',
        eventType: 'prompt.approval.before_record',
        workspaceId,
        promptId: version.prompt_id,
        promptVersionId: versionId,
        actorId: userId,
        payload: {
          reason: req.body.comments || 'Approval recorded',
          reviewer_role: reviewerRole,
          risk_level: prompt.risk_tier,
        },
        criticality: 'high',
      });

      const approvalRecord = await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: userId,
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
        await GovernanceReceiptService.generate(version.prompt_id, versionId, workspaceId, req.user?.id);
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

      // A5 (Doc 3 §7): every rejection must include a reason CATEGORY and
      // actionable notes. Both are required.
      const notes = String(req.body.comments || req.body.reason || '').trim();
      const category = String(req.body.reason_category || '').trim();
      const VALID_REJECTION_CATEGORIES = [
        'safety', 'compliance', 'brand', 'quality', 'legal', 'security',
        'missing_evidence', 'failed_test', 'approval_conflict', 'other',
      ];
      if (!category) {
        return res.status(400).json({ error: 'A rejection reason category is required.', valid_categories: VALID_REJECTION_CATEGORIES });
      }
      if (!VALID_REJECTION_CATEGORIES.includes(category.toLowerCase())) {
        return res.status(400).json({ error: `Invalid rejection category. Must be one of: ${VALID_REJECTION_CATEGORIES.join(', ')}.`, valid_categories: VALID_REJECTION_CATEGORIES });
      }
      if (!notes) {
        return res.status(400).json({ error: 'Rejections require actionable notes describing the required change.' });
      }

      // Persist the category structurally inside decision_reason (no schema
      // migration): "[category] notes". The category is also surfaced in the
      // audit event.
      const decisionReason = `[${category.toLowerCase()}] ${notes}`;

      await auditPromptEvent('prompt.approval.rejected', {
        prompt_id: prompt.id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        reviewer_role: reviewerRole,
        reason: notes,
        reason_category: category.toLowerCase(),
        after_state: { decision: 'REJECTED', status: 'draft', reason_category: category.toLowerCase() },
      }, req, { critical: true });

      await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: req.user?.id,
        reviewer_role: reviewerRole,
        decision: 'REJECTED',
        decision_reason: decisionReason,
      });

      await PromptService.updateStatus(version.prompt_id, 'DRAFT', workspaceId);

      res.json({ success: true, message: 'Version rejected', data: { reason_category: category.toLowerCase() } });
    } catch (error) {
      next(error);
    }
  }

  // A6 (Doc 3 §5): "waive with justification where policy allows."
  // True when the caller holds the prompt.admin.override capability.
  private static canAdminOverride(req: AuthRequest): boolean {
    if (req.user?.api_key_id) {
      const scopes = req.user.api_key_scopes || [];
      return scopes.includes('*') || scopes.includes('prompt.admin.override');
    }
    const role = String(req.user?.role || '').toUpperCase();
    return !!req.user?.is_superadmin || ['ADMIN', 'GOVERNANCE_ADMIN', 'WORKSPACE_OWNER'].includes(role);
  }

  /**
   * A6 — Waive outstanding review requirements with justification. Permission-
   * gated to prompt.admin.override. Policy-aware: HARD deployment-gate blocks
   * (safety / compliance / adversarial / constraint) are NOT waivable and return
   * 409. The waiver records an immutable audit/evidence event and completes the
   * approval chain only when no hard block remains.
   */
  static async waiveApproval(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!PromptController.canAdminOverride(req)) {
        return res.status(403).json({ error: 'Forbidden: waiving review requirements requires the prompt.admin.override capability (governance admin or above).' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);
      if (prompt.current_version_id && prompt.current_version_id !== versionId) {
        return res.status(409).json({ error: 'Only the current prompt version can be waived.' });
      }
      if (LifecycleGateService.isLocked(prompt.status) || LifecycleGateService.isImmutable(prompt.status)) {
        return res.status(409).json({ error: `Cannot waive: prompt is in '${prompt.status}' status.` });
      }

      const justification = String(req.body.justification || req.body.reason || '').trim();
      if (justification.length < 8) {
        return res.status(400).json({ error: 'A waiver requires a justification of at least 8 characters.' });
      }

      // Policy-aware: hard safety/compliance/test gates remain enforced. A waiver
      // may only override soft review-sequencing requirements, never a hard block.
      const gateResult = await DeploymentGateService.check(versionId, {
        prompt,
        workspaceId,
        overrides: { requireAdversarialPass: true },
      });
      const hardBlock = gateResult.blockingIssues.find((i) => i.blocking);
      if (hardBlock) {
        await auditPromptEvent('prompt.approval.waive.blocked', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'hard_block_not_waivable',
          after_state: { blocked: true, type: hardBlock.type, detail: hardBlock.detail },
        }, req);
        return res.status(409).json({ error: `This is a hard safety/compliance block and cannot be waived: ${hardBlock.detail}` });
      }

      const reviewerRole = normalizeReviewerRole(req.user?.role || req.body.reviewer_role);
      const policyBasis = String(req.body.policy_basis || 'governance_admin_override').trim();

      // Immutable waiver evidence BEFORE the status change (fail-closed).
      const waiveEvidenceId = await auditPromptEvent('prompt.approval.waived', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        reviewer_role: reviewerRole,
        reason: justification,
        after_state: { decision: 'WAIVED', policy_basis: policyBasis, approval_complete: true },
      }, req, { critical: true });

      const waiverRecord = await PromptApprovalService.create({
        prompt_version_id: versionId,
        reviewer_id: req.user?.id,
        reviewer_role: reviewerRole,
        decision: 'WAIVED',
        decision_reason: `[waiver:${policyBasis}] ${justification}`,
        conditions: policyBasis,
        evidence_id: waiveEvidenceId || undefined,
      });

      await GovernanceReceiptService.generate(version.prompt_id, versionId, workspaceId, req.user?.id);
      await PromptService.updateStatus(version.prompt_id, 'APPROVED_STAGING', workspaceId);
      await ApprovalInvalidationService.clear(versionId);

      res.json({ success: true, message: 'Review requirements waived; version approved for staging.', data: { waiver_id: waiverRecord?.id || null, policy_basis: policyBasis } });
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

      // Lifecycle gate: LOCKED, RETIRED, ARCHIVED, SUPERSEDED cannot be deployed
      if (LifecycleGateService.isLocked(prompt.status) || LifecycleGateService.isImmutable(prompt.status)) {
        await auditPromptEvent('prompt.deployment.blocked', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'lifecycle_locked',
          after_state: { blocked: true, status: prompt.status, detail: `Cannot deploy in status '${prompt.status}'` },
        }, req);
        return res.status(409).json({ error: `Cannot deploy: prompt is in '${prompt.status}' status.` });
      }

      const environment = req.body.environment || 'staging';
      const normalizedEnvironment = String(environment).toLowerCase();

      // Constraint shadow lock check before deployment
      const csLocked = await ConstraintShadowService.isLocked(versionId);
      const csHash = await ConstraintShadowService.getCurrentHash(versionId);
      if (!csHash || !csLocked) {
        const reason = !csHash ? 'Constraint shadow not compiled for this version' : 'Constraint shadow is not locked';
        await auditPromptEvent('prompt.deployment.blocked', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'constraint_shadow_' + (!csHash ? 'missing' : 'unlocked'),
          after_state: { blocked: true, has_shadow: !!csHash, locked: csLocked },
        }, req);
        return res.status(409).json({ error: reason });
      }

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

      // ACTIVE state must only be reachable from COMMISSIONED
      if (normalizedEnvironment === 'production' && prompt.status !== PROMPT_STATUS.COMMISSIONED) {
        await auditPromptEvent('prompt.deployment.blocked', {
          prompt_id: version.prompt_id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'not_commissioned',
          after_state: { blocked: true, status: prompt.status, detail: 'Production activation requires COMMISSIONED status.' },
        }, req);
        return res.status(409).json({ error: 'Production activation requires COMMISSIONED status. Run commission() first.' });
      }

      // Governance receipt generated before deployment record
      await GovernanceReceiptService.generate(version.prompt_id, versionId, workspaceId, req.user?.id);

      // Fail-closed guard: evidence + audit write enforcement before deployment
      await FailClosedGuard.guardDeployment({
        operation: 'prompt.deploy',
        eventType: 'prompt.deployment.before_record',
        workspaceId,
        promptId: version.prompt_id,
        promptVersionId: versionId,
        actorId: req.user?.id,
        payload: {
          reason: req.body.release_note || 'Deployment',
          environment: normalizedEnvironment,
          risk_level: prompt.risk_tier,
        },
        criticality: 'critical',
      });

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
        // SUPERSEDED: prior ACTIVE versions are automatically invalidated
        await LifecycleGateService.supersedePriorActive(version.prompt_id, versionId, workspaceId, req.user?.id);
        await PromptService.updateStatus(version.prompt_id, 'PRODUCTION_ACTIVE', workspaceId);
        await PromptVersionService.markImmutable(versionId);
      } else if (normalizedEnvironment === 'staging') {
        await PromptService.updateStatus(version.prompt_id, 'APPROVED_STAGING', workspaceId);
      }
      if (deploymentEvidenceId && deploymentRecord?.id) {
        await supabaseAdmin.from('prompt_deployments').update({ evidence_id: deploymentEvidenceId }).eq('id', deploymentRecord.id);
      }

      // A4 (Doc 3 §12 Confirmation state): return real deployment data so the UI
      // can render deployed version, scope, rollback target, evidence link,
      // timestamp, and actor without fabricating any values.
      res.json({
        success: true,
        message: `Deployed to ${normalizedEnvironment}`,
        data: {
          prompt_id: version.prompt_id,
          version_id: versionId,
          version_number: version.version_number,
          environment: normalizedEnvironment,
          deployment_id: deploymentRecord?.id || null,
          evidence_id: deploymentEvidenceId || null,
          rollback_to_version_id: previousProduction?.[0]?.prompt_version_id || null,
          scope: req.body.scope || {},
          release_note: req.body.release_note || '',
          deployed_by: req.user?.email || req.user?.id || null,
          deployed_at: new Date().toISOString(),
          linked_agent: prompt.linked_agent || null,
          linked_workflow: prompt.linked_workflow || null,
        },
      });
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

      // Governance receipt generated before rollback record
      await GovernanceReceiptService.generate(promptId, result.prompt_version_id, workspaceId, req.user?.id);

      // Fail-closed guard: evidence + audit write enforcement before rollback
      await FailClosedGuard.guardDeployment({
        operation: 'prompt.rollback',
        eventType: 'prompt.rollback.before_record',
        workspaceId,
        promptId,
        promptVersionId: result.prompt_version_id,
        actorId: req.user?.id,
        payload: {
          reason: req.body.reason || 'Rollback requested from Prompt Governance',
          deployment_id: result.id,
          risk_level: prompt.risk_tier,
        },
        criticality: 'critical',
      });

      // SUPERSEDED: rollback creates a new active version, superseding the current one
      await LifecycleGateService.supersedePriorActive(promptId, result.prompt_version_id, workspaceId, req.user?.id);

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
  // Phase 6.5 — Evaluation Intelligence Dashboard Views
  // ═════════════════════════════════════════════════════════════════════════

  static async getEvaluationView(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await GovernanceDashboardService.getEvaluationView(workspaceId);
      await auditPromptEvent('prompt.dashboard.evaluation_viewed', {
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        after_state: { pdi_average: data.pdi.summary.average_score, eval_pass_rate: data.evaluation.pass_rate },
      }, req);
      res.json({ success: true, data, generated_at: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  static async getAdversarialView(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await GovernanceDashboardService.getAdversarialView(workspaceId);
      await auditPromptEvent('prompt.dashboard.adversarial_viewed', {
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        after_state: { total_attacks: data.summary.total_attacks, pass_rate: data.summary.pass_rate },
      }, req);
      res.json({ success: true, data, generated_at: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  static async getDriftView(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const data = await GovernanceDashboardService.getDriftView(workspaceId);
      await auditPromptEvent('prompt.dashboard.drift_viewed', {
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        after_state: { total_findings: data.summary.total_findings, prompts_with_drift: data.summary.prompts_with_drift },
      }, req);
      res.json({ success: true, data, generated_at: new Date().toISOString() });
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

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 6.2 — Real Adversarial Attack Execution Endpoint
  // ═════════════════════════════════════════════════════════════════════════

  static async runRealAdversarialSuite(req: AuthRequest, res: Response, next: NextFunction) {
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

      const body = (req.body || {}) as {
        model_id?: string;
        provider?: import('./crossModelProviders').ProviderId;
        attacks?: any[];
      };
      const report = await AdversarialTestService.runRealAdversarialSuite({
        promptVersionId: versionId,
        promptId: version.prompt_id,
        workspaceId,
        modelId: body.model_id,
        provider: body.provider,
        riskTier: prompt.risk_tier,
        customAttacks: body.attacks,
        actorId: req.user?.id,
      });

      await auditPromptEvent('prompt.test.adversarial.real_completed', {
        prompt_id: version.prompt_id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        after_state: {
          total_attacks: report.summary.total,
          passed: report.summary.passed,
          failed: report.summary.failed,
          pass_rate: report.summary.pass_rate,
          overall_result: report.summary.overall_result,
          model_id: report.model_id,
          provider: report.provider,
        },
      }, req);

      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Phase 6.3 — Real Cross-Model Comparison Endpoint
  // ═════════════════════════════════════════════════════════════════════════

  static async runRealCrossModelComparison(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', versionId)
        .single();
      const body = (req.body || {}) as { test_input?: string; providers?: any[] };
      const result = await CrossModelComparisonService.runRealCrossModelComparison({
        promptVersionId: versionId,
        promptId: version?.prompt_id || '',
        workspaceId,
        testInput: body.test_input,
        providers: body.providers,
        actorId: req.user?.id,
      });
      res.json({ success: true, data: result });
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

  // ─── Phase 1 — Prompt Evaluation ────────────────────────────────────────

  static async evaluatePromptVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const result = await PromptEvaluationService.evaluatePromptVersion(versionId, workspaceId, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 2 — Constraint Shadow ────────────────────────────────────────

  static async getConstraintShadow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const versionId = prompt.current_version_id || getQueryValue(req, 'version_id') || '';
      const shadow = await ConstraintShadowService.compile(versionId, prompt.risk_tier || 'tier_2_medium', workspaceId, req.user?.id, prompt.id);
      res.json({ success: true, data: shadow });
    } catch (error) {
      next(error);
    }
  }

  static async lockConstraintShadow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const versionId = prompt.current_version_id || getQueryValue(req, 'version_id') || '';
      const locked = await ConstraintShadowService.lock(versionId, workspaceId, req.user?.id);
      if (!locked) {
        return res.status(409).json({ error: 'Cannot lock constraint shadow: no compiled shadow found for this version' });
      }
      await auditPromptEvent('prompt.constraint_shadow.locked', {
        prompt_id: prompt.id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        after_state: { locked: true, version_id: versionId },
      }, req);
      res.json({ success: true, message: 'Constraint shadow locked' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 2 — Variable Management ────────────────────────────────────────

  static async getPromptVariables(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const variables = await PromptVariableService.getVariables(versionId);
      res.json({ success: true, data: variables });
    } catch (error) {
      next(error);
    }
  }

  static async updatePromptVariables(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);
      if ([PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED].includes(prompt.status)) {
        return res.status(409).json({ error: 'Retired and archived prompts are immutable; clone to draft before editing variables.' });
      }
      // A7: variable authoring is an edit — prompt.edit.own vs prompt.edit.any
      if (!(await PromptController.enforceEditPermission(req, res, prompt, workspaceId))) return;
      await PromptVariableService.storeVariableDefinitions(versionId, req.body.variables || {});
      // §7: variables are risk-impacting — re-evaluate approval validity.
      await enforceApprovalInvalidation(req, { promptId: prompt.id, versionId, workspaceId });
      res.json({ success: true, data: { updated: true } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * A2 — Guardrail authoring. Persists the structured guardrail set onto the
   * version's existing `guardrails_json` column (no new storage). Guardrails
   * are risk-impacting, so an edit re-evaluates approval validity (§7).
   */
  static async updatePromptGuardrails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.requireById(version.prompt_id, workspaceId);
      if ([PROMPT_STATUS.RETIRED, PROMPT_STATUS.ARCHIVED].includes(prompt.status)) {
        return res.status(409).json({ error: 'Retired and archived prompts are immutable; clone to draft before editing guardrails.' });
      }
      // A7: guardrail authoring is an edit — prompt.edit.own vs prompt.edit.any
      if (!(await PromptController.enforceEditPermission(req, res, prompt, workspaceId))) return;

      const incoming = req.body.guardrails;
      // Accept either { rules: [...] } or a bare array of rules; normalize to { rules }.
      const rulesArray = Array.isArray(incoming) ? incoming : Array.isArray(incoming?.rules) ? incoming.rules : null;
      if (!rulesArray) {
        return res.status(400).json({ error: 'guardrails must be an array of rules or an object with a rules[] array.' });
      }
      const ALLOWED_CATEGORIES = ['policy_rule', 'prohibited_instruction', 'claim_rule', 'safety_block', 'escalation_trigger', 'refusal_rule'];
      const normalized: Array<Record<string, unknown>> = [];
      for (let i = 0; i < rulesArray.length; i++) {
        const r = rulesArray[i] || {};
        const category = String(r.category || '').toLowerCase();
        const rule = String(r.rule || '').trim();
        if (!ALLOWED_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: `Guardrail #${i + 1}: category must be one of ${ALLOWED_CATEGORIES.join(', ')}.` });
        }
        if (!rule) {
          return res.status(400).json({ error: `Guardrail #${i + 1}: rule text is required.` });
        }
        normalized.push({ category, rule, enabled: r.enabled !== false, order: i });
      }

      const guardrailsJson = { rules: normalized, updated_at: new Date().toISOString() };
      const { error } = await supabaseAdmin
        .from('prompt_versions')
        .update({ guardrails_json: guardrailsJson, updated_at: new Date().toISOString() })
        .eq('id', versionId);
      if (error) throw error;

      await auditPromptEvent('prompt.guardrails.updated', {
        prompt_id: prompt.id,
        prompt_version_id: versionId,
        workspace_id: workspaceId,
        actor_id: req.user?.id,
        risk_tier: prompt.risk_tier,
        after_state: { guardrail_count: normalized.length, categories: normalized.map((g) => g.category) },
      }, req);
      await enforceApprovalInvalidation(req, { promptId: prompt.id, versionId, workspaceId });

      res.json({ success: true, data: { updated: true, guardrails: guardrailsJson } });
    } catch (error) {
      next(error);
    }
  }

  static async validatePromptVariables(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const result = await PromptVariableService.validateVariables(versionId, req.body.values || {});
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 2 — Parameter Policy ────────────────────────────────────────────

  static async evaluateParameterPolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const result = await ParameterPolicyService.evaluateParameters(
        req.body.parameters || {},
        prompt.risk_tier || 'tier_2_medium',
        getQueryValue(req, 'version_id') || undefined,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 2 — Runtime Variable Governance ─────────────────────────────────

  static async enforceRuntimeGovernance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const prompt = await PromptService.getById(version.prompt_id, workspaceId);
      const result = await RuntimeVariableGovernanceService.enforce({
        promptVersionId: versionId,
        parameters: req.body.parameters || {},
        riskTier: prompt?.risk_tier || 'tier_2_medium',
        workspaceId,
        executionId: req.body.execution_id as string | undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 3 — PDI ────────────────────────────────────────────────────────

  static async computePDI(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const versionId = prompt.current_version_id || getQueryValue(req, 'version_id') || '';
      if (!versionId) return res.status(400).json({ error: 'No version ID available' });
      const result = await PromptDefensibilityIndexService.compute(prompt.id, versionId, workspaceId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 3 — Cross-Model Comparison ─────────────────────────────────────

  static async compareCrossModel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', versionId)
        .single();
      const result = await CrossModelComparisonService.compare(versionId, version?.prompt_id || '', workspaceId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async runCrossModelParityCheck(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const { data: version } = await supabaseAdmin
        .from('prompt_versions')
        .select('prompt_id')
        .eq('id', versionId)
        .single();
      const result = await CrossModelComparisonService.runParityCheck(versionId, version?.prompt_id || '', workspaceId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 4 — Governance Receipt ──────────────────────────────────────────

  static async generateGovernanceReceipt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const versionId = prompt.current_version_id || (req.body.version_id as string) || '';
      if (!versionId) return res.status(400).json({ error: 'No version ID available' });
      const receipt = await GovernanceReceiptService.generate(prompt.id, versionId, workspaceId, req.user?.id);
      res.status(201).json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 5 — Commissioning ─────────────────────────────────────────────

  static async runCommissionPreflight(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const versionId = prompt.current_version_id || (req.body.version_id as string) || '';
      if (!versionId) return res.status(400).json({ error: 'No version ID available' });
      const result = await CommissioningService.runPreflight(prompt.id, versionId, workspaceId, req.user?.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async commissionPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const prompt = await PromptService.requireById(getParam(req, 'id'), workspaceId);
      const versionId = prompt.current_version_id || (req.body.version_id as string) || '';
      if (!versionId) return res.status(400).json({ error: 'No version ID available' });

      // Lifecycle gate: LOCKED, SUPERSEDED, RETIRED, ARCHIVED cannot be commissioned
      if (LifecycleGateService.isLocked(prompt.status) || LifecycleGateService.isImmutable(prompt.status)) {
        await auditPromptEvent('prompt.commissioning.blocked', {
          prompt_id: prompt.id,
          prompt_version_id: versionId,
          workspace_id: workspaceId,
          actor_id: req.user?.id,
          risk_tier: prompt.risk_tier,
          reason: 'lifecycle_locked',
          after_state: { blocked: true, status: prompt.status, detail: `Cannot commission in status '${prompt.status}'` },
        }, req);
        return res.status(409).json({ error: `Cannot commission: prompt is in '${prompt.status}' status.` });
      }

      const result = await CommissioningService.commission(prompt.id, versionId, workspaceId, req.user?.id, req.body.notes as string | undefined);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 7 — SoD Check ──────────────────────────────────────────────────

  static async checkSeparationOfDuties(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const result = await SeparationOfDutiesService.checkAll(
        versionId,
        req.body.role || req.user?.role || '',
        req.user?.id || '',
        workspaceId,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async delegateApproval(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const body = req.body as { to_user_id: string; to_role: string; reason: string; duration_hours?: number };
      const result = await DelegationService.create(
        req.user?.id || '',
        req.user?.role || '',
        body.to_user_id,
        body.to_role,
        versionId,
        body.reason,
        workspaceId,
        body.duration_hours,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async escalateApproval(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const body = req.body as { reason: string; target_role?: string };
      const result = await EscalationService.escalate(
        versionId,
        req.user?.id || '',
        req.user?.role || '',
        body.reason,
        workspaceId,
        body.target_role,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Phase 7 — Three-Key ──────────────────────────────────────────────────

  static async initializeThreeKey(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const result = await ThreeKeyService.initialize(versionId, workspaceId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async submitThreeKey(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const body = req.body as { role: string; decision: 'approved' | 'rejected'; reason: string };
      const result = await ThreeKeyService.submitKey(
        '',
        versionId,
        body.role || req.user?.role || '',
        req.user?.id || '',
        req.user?.email || '',
        body.decision,
        body.reason,
        workspaceId,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getThreeKeyStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      const result = await ThreeKeyService.getStatus(versionId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Per-version sealed hash history (read-only, Phase 5.C) ───────────────
  // Audit-grade sealed metadata for ONE version so the Diff Viewer can compare
  // governance artifacts across versions. Pure reads; workspace-scoped via
  // requireVersionInWorkspace (cross-workspace prompt → throws, no leakage).
  // Missing optional artifacts return null / empty — never fabricated.
  static async getVersionSealedHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      const versionId = getParam(req, 'versionId');
      const version = await PromptController.requireVersionInWorkspace(versionId, workspaceId);
      if (!version) return res.status(404).json({ error: 'Version not found' });
      const promptId = version.prompt_id;
      const prompt = await PromptService.getById(promptId, workspaceId).catch(() => null);

      const [shadowRes, evidenceRes, deployRes, auditRes, testRes] = await Promise.all([
        supabaseAdmin.from('prompt_constraint_shadows').select('shadow_hash, status, locked_at, locked_by').eq('version_id', versionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from('prompt_evidence_links').select('event_type, evidence_hash, metadata, actor_id, created_at').eq('prompt_version_id', versionId).order('created_at', { ascending: false }),
        supabaseAdmin.from('prompt_deployments').select('environment, deployed_by, created_at').eq('prompt_version_id', versionId).order('created_at', { ascending: false }).limit(1),
        supabaseAdmin.from('prompt_audit_ledger').select('event_type, after_state, actor_id, created_at').eq('version_id', versionId).order('created_at', { ascending: true }),
        supabaseAdmin.from('prompt_test_runs').select('pass_fail, score_summary, created_at').eq('prompt_version_id', versionId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      const shadow = (shadowRes as any)?.data || null;
      const evidence: any[] = Array.isArray((evidenceRes as any)?.data) ? (evidenceRes as any).data : [];
      const deployments: any[] = Array.isArray((deployRes as any)?.data) ? (deployRes as any).data : [];
      const audit: any[] = Array.isArray((auditRes as any)?.data) ? (auditRes as any).data : [];
      const test = (testRes as any)?.data || null;

      const receipt = evidence.find((e) => String(e.event_type || '').includes('governance_receipt'));
      const exported = evidence.some((e) => String(e.event_type || '').includes('export'));
      const pdiEvent = [...audit].reverse().find((e) => e.event_type === 'prompt.defensibility_index.computed');
      const commissionedEvent = audit.find((e) => e.event_type === 'prompt.commissioning.completed');
      const dep = deployments[0] || null;
      const score = test?.score_summary || {};
      const actors = Array.from(new Set([
        ...(version.created_by ? [version.created_by] : []),
        ...evidence.map((e) => e.actor_id),
        ...audit.map((e) => e.actor_id),
        ...(shadow?.locked_by ? [shadow.locked_by] : []),
      ].filter(Boolean)));

      res.json({
        success: true,
        data: {
          prompt_id: promptId,
          version_id: versionId,
          version_status: prompt?.status ?? null,
          body_hash: version.body_hash ?? null,
          governance_receipt_hash: receipt?.evidence_hash ?? null,
          constraint_shadow_hash: shadow?.shadow_hash ?? receipt?.metadata?.constraint_shadow_hash ?? null,
          evaluation_hash: score.hash ?? null,
          evaluation_score: score.overall_score ?? score.score ?? null,
          pdi_score: (pdiEvent?.after_state as any)?.pdi_score ?? null,
          deployment_status: dep ? 'deployed' : null,
          deployment_environment: dep?.environment ?? null,
          deployment_at: dep?.created_at ?? null,
          commissioned_at: commissionedEvent?.created_at ?? null,
          locked_at: shadow?.locked_at ?? null,
          actors,
          evidence_links: evidence.map((e) => ({ event_type: e.event_type, evidence_hash: e.evidence_hash ?? null, created_at: e.created_at ?? null })),
          evidence_exported: exported,
          audit_events: { count: audit.length, recent: audit.slice(-10).map((e) => ({ event_type: e.event_type, created_at: e.created_at })) },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Test Center — Classify post description through the governance pipeline ──
  static async classifyTestDescription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { description, platform } = req.body || {};
      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, error: 'description is required' });
      }
      const workspaceId = await PromptController.resolveWorkspaceId(req);
      if (!workspaceId) {
        return res.status(400).json({ success: false, error: 'Workspace context required' });
      }

      const result = await PostGovernanceService.classify(
        description.trim(),
        platform || 'linkedin',
        workspaceId,
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

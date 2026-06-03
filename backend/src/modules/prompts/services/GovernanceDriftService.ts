import { supabaseAdmin } from '../../../shared/supabase';
import { PROMPT_STATUS } from '../PromptService';
import { PromptApprovalPolicyService } from '../PromptApprovalPolicyService';

export type DriftCategory = 'version_drift' | 'approval_drift' | 'deployment_drift' | 'audit_gap_drift' | 'risk_tier_drift' | 'binding_drift';

export type DriftSeverity = 'low' | 'medium' | 'high';

export interface DriftFinding {
  id: string;
  prompt_id: string;
  prompt_name: string;
  category: DriftCategory;
  severity: DriftSeverity;
  title: string;
  description: string;
  evidence_refs: string[];
  detected_at: string;
}

const { randomUUID } = require('crypto');

const normalizedRole = (r: string): string => PromptApprovalPolicyService.normalizeReviewerRole(r);
const requiredApprovalRoles = PromptApprovalPolicyService.requiredApprovalRoles;
const canRoleSatisfy = PromptApprovalPolicyService.canRoleSatisfy;

function mkFinding(
  promptId: string,
  promptName: string,
  category: DriftCategory,
  severity: DriftSeverity,
  title: string,
  description: string,
  evidenceRefs: string[],
): DriftFinding {
  return {
    id: randomUUID(),
    prompt_id: promptId,
    prompt_name: promptName,
    category,
    severity,
    title,
    description,
    evidence_refs: evidenceRefs,
    detected_at: new Date().toISOString(),
  };
}

export class GovernanceDriftService {

  static async detectPromptDrift(promptId: string, workspaceId: string, overrides?: {
    stalenessDays?: number;
    auditGapMs?: number;
    riskTierGapMs?: number;
  }): Promise<DriftFinding[]> {
    const { data: prompt, error } = await supabaseAdmin
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) throw error;
    if (!prompt) return [];

    const findings: DriftFinding[] = [];
    const name = prompt.name || promptId;
    const opts = overrides || {};

    findings.push(...await this.detectVersionDrift(prompt));
    findings.push(...await this.detectApprovalDrift(prompt));
    findings.push(...await this.detectDeploymentDrift(prompt));
    findings.push(...await this.detectAuditGapDrift(prompt, opts.auditGapMs));
    findings.push(...await this.detectRiskTierDrift(prompt, opts.riskTierGapMs));
    findings.push(...await this.detectBindingDrift(prompt, opts.stalenessDays));

    return findings;
  }

  static async detectWorkspaceDrift(workspaceId: string): Promise<DriftFinding[]> {
    const { data: prompts, error } = await supabaseAdmin
      .from('prompts')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    if (!prompts || prompts.length === 0) return [];

    const all: DriftFinding[] = [];
    for (const p of prompts) {
      const f = await this.detectPromptDrift(p.id, workspaceId);
      all.push(...f);
    }
    return all;
  }

  // ─── Version Drift ──────────────────────────────────────────────────────────
  // Detects deployed prompts whose current version is NOT marked immutable,
  // meaning the body could have been modified after deployment without approval.

  private static async detectVersionDrift(prompt: any): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = [];
    const activeStatuses = [PROMPT_STATUS.PRODUCTION_ACTIVE, 'approved_for_staging', 'production_pending'].map(s => s?.toLowerCase());

    if (!activeStatuses.includes(String(prompt.status).toLowerCase())) return findings;
    if (!prompt.current_version_id) return findings;

    const { data: version } = await supabaseAdmin
      .from('prompt_versions')
      .select('id, immutable, version_number')
      .eq('id', prompt.current_version_id)
      .maybeSingle();

    if (!version) return findings;
    if (version.immutable) return findings;

    findings.push(mkFinding(
      prompt.id,
      prompt.name,
      'version_drift',
      'high',
      'Current version not locked after deployment',
      `Prompt is ${prompt.status} but current version ${version.version_number} is NOT marked immutable. This means the prompt body may have been modified without going through an approved deployment.`,
      [version.id],
    ));

    return findings;
  }

  // ─── Approval Drift ─────────────────────────────────────────────────────────
  // Detects production-active or approved prompts where the current approval
  // chain no longer satisfies the risk tier's required approval roles.

  private static async detectApprovalDrift(prompt: any): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = [];
    const checkStatuses = [PROMPT_STATUS.PRODUCTION_ACTIVE, 'approved_for_staging', 'production_pending'].map(s => s?.toLowerCase());

    if (!checkStatuses.includes(String(prompt.status).toLowerCase())) return findings;
    if (!prompt.current_version_id) return findings;

    const { data: approvals } = await supabaseAdmin
      .from('prompt_approvals')
      .select('reviewer_role, decision')
      .eq('prompt_version_id', prompt.current_version_id);

    if (!approvals) return findings;

    const required = requiredApprovalRoles(prompt.risk_tier);
    const approvedRoles = new Set(
      approvals
        .filter((a: any) => String(a.decision).toUpperCase() === 'APPROVED')
        .map((a: any) => normalizedRole(a.reviewer_role)),
    );

    const missing = required.filter((r) => !Array.from(approvedRoles).some((role) => canRoleSatisfy(r, role)));
    if (missing.length === 0) return findings;

    findings.push(mkFinding(
      prompt.id,
      prompt.name,
      'approval_drift',
      'high',
      'Approval chain incomplete for current risk tier',
      `Prompt is ${prompt.status} with risk tier ${prompt.risk_tier} but missing these required approval roles: ${missing.join(', ')}. Current approvals only cover: ${Array.from(approvedRoles).join(', ') || 'none'}.`,
      [prompt.current_version_id].concat(approvals.map((a: any) => a.reviewer_role)),
    ));

    return findings;
  }

  // ─── Deployment Drift ───────────────────────────────────────────────────────
  // Detects prompts whose current_version_id does not match the last deployment's
  // prompt_version_id, or that are production_active without a production deploy.

  private static async detectDeploymentDrift(prompt: any): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = [];

    if (String(prompt.status).toLowerCase() === 'production_active') {
      const { data: prodDeployments } = await supabaseAdmin
        .from('prompt_deployments')
        .select('prompt_version_id, created_at')
        .eq('environment', 'production')
        .in('prompt_version_id',
          (await supabaseAdmin
            .from('prompt_versions')
            .select('id')
            .eq('prompt_id', prompt.id)
          ).data?.map((v: any) => v.id) || [])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!prodDeployments || prodDeployments.length === 0) {
        const { data: anyDeploy } = await supabaseAdmin
          .from('prompt_deployments')
          .select('prompt_version_id')
          .in('prompt_version_id',
            (await supabaseAdmin
              .from('prompt_versions')
              .select('id')
              .eq('prompt_id', prompt.id)
            ).data?.map((v: any) => v.id) || [])
          .limit(1);

        findings.push(mkFinding(
          prompt.id,
          prompt.name,
          'deployment_drift',
          'high',
          'Production-active but no production deployment record',
          `Prompt status is ${prompt.status} but no production deployment record exists in prompt_deployments. The prompt may have been activated outside the deployment process.${anyDeploy?.length ? ' (staging deployments exist)' : ' (no deployments found at all)'}`,
          [prompt.id],
        ));
        return findings;
      }

      const lastDeployVersionId = prodDeployments[0].prompt_version_id;
      if (lastDeployVersionId && prompt.current_version_id !== lastDeployVersionId) {
        findings.push(mkFinding(
          prompt.id,
          prompt.name,
          'deployment_drift',
          'high',
          'Current version does not match last production deployment',
          `Prompt's current_version_id (${prompt.current_version_id}) does not match the last production deployment's prompt_version_id (${lastDeployVersionId}). This means the active version was changed without a corresponding deployment record.`,
          [prompt.current_version_id, lastDeployVersionId],
        ));
      }
    }

    return findings;
  }

  // ─── Audit Gap Drift ────────────────────────────────────────────────────────
  // Detects prompts whose metadata (updated_at) changed more recently than the
  // last audit event for that prompt, suggesting unrecorded modifications.

  private static async detectAuditGapDrift(prompt: any, auditGapMs?: number): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = [];

    const { data: lastAudit } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('created_at')
      .eq('prompt_id', prompt.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const updatedAt = prompt.updated_at || prompt.created_at;
    const lastAuditAt = lastAudit?.[0]?.created_at;

    if (!lastAuditAt) {
      if (String(prompt.status).toLowerCase() !== 'draft') {
        findings.push(mkFinding(
          prompt.id,
          prompt.name,
          'audit_gap_drift',
          'medium',
          'No audit events exist for this prompt',
          `Prompt has status ${prompt.status} but zero audit ledger events exist. Every lifecycle transition should produce an audit event.`,
          [prompt.id],
        ));
      }
      return findings;
    }

    const gapMs = auditGapMs ?? 5000;
    if (new Date(updatedAt).getTime() > new Date(lastAuditAt).getTime() + gapMs) {
      findings.push(mkFinding(
        prompt.id,
        prompt.name,
        'audit_gap_drift',
        'medium',
        'Prompt updated more recently than last audit event',
        `Prompt was last updated at ${updatedAt} but the most recent audit event is at ${lastAuditAt}. This gap may indicate unrecorded modifications.`,
        [prompt.id, lastAuditAt],
      ));
    }

    return findings;
  }

  // ─── Risk Tier Drift ────────────────────────────────────────────────────────
  // Detects when a prompt's risk_tier is non-default and no corresponding
  // prompt.risk.changed audit event exists, suggesting the value may have been
  // set or changed without proper audit trail.

  private static async detectRiskTierDrift(prompt: any, riskTierGapMs?: number): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = [];

    const risk = String(prompt.risk_tier || '').toLowerCase();
    if (risk === 'tier_1_low' || !risk) return findings;

    const { data: riskChanged } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('created_at')
      .eq('prompt_id', prompt.id)
      .eq('event_type', 'prompt.risk.changed')
      .limit(1);

    if (riskChanged && riskChanged.length > 0) return findings;

    const created = new Date(prompt.created_at).getTime();
    const updated = new Date(prompt.updated_at || prompt.created_at).getTime();

    const gapMs = riskTierGapMs ?? 60000;
    if (updated > created + gapMs) {
      findings.push(mkFinding(
        prompt.id,
        prompt.name,
        'risk_tier_drift',
        'high',
        'Risk tier may have changed without audit trail',
        `Current risk_tier is ${prompt.risk_tier} but no 'prompt.risk.changed' audit event exists. Prompt was last updated at ${prompt.updated_at} (created ${prompt.created_at}). If the risk tier was modified after initial creation, that change was not recorded.`,
        [prompt.id],
      ));
    }

    return findings;
  }

  // ─── Binding Drift (Redesigned — Prompt Governance data only) ───────────────
  // Detects:
  //   1. Production-environment binding without a production deployment
  //   2. High-risk prompt missing tool permissions
  //   3. Stale binding (updated_at significantly older than last audit)

  private static async detectBindingDrift(prompt: any, stalenessDays?: number): Promise<DriftFinding[]> {
    const findings: DriftFinding[] = [];

    if (!prompt.current_version_id) return findings;

    const { data: bindings } = await supabaseAdmin
      .from('prompt_bindings')
      .select('*')
      .eq('prompt_version_id', prompt.current_version_id);

    const { data: knowledgeBindings } = await supabaseAdmin
      .from('prompt_knowledge_bindings')
      .select('*')
      .eq('prompt_version_id', prompt.current_version_id);

    const { data: toolPermissions } = await supabaseAdmin
      .from('prompt_tool_permissions')
      .select('*')
      .eq('prompt_version_id', prompt.current_version_id);

    // 1. Production-environment binding without production deployment
    if (bindings && bindings.length > 0) {
      const prodBindings = bindings.filter((b: any) => String(b.environment).toLowerCase() === 'production');

      if (prodBindings.length > 0) {
        const versions = await this.getVersionIdsForPrompt(prompt.id);
        if (versions.length > 0) {
          const { data: prodDeploy } = await supabaseAdmin
            .from('prompt_deployments')
            .select('id')
            .eq('environment', 'production')
            .in('prompt_version_id', versions)
            .limit(1);

          if (!prodDeploy || prodDeploy.length === 0) {
            findings.push(mkFinding(
              prompt.id,
              prompt.name,
              'binding_drift',
              'medium',
              'Production binding exists without production deployment',
              `${prodBindings.length} binding(s) specify environment='production' but no production deployment record exists for this prompt. The prompt may not be deployed to production despite having production bindings.`,
              prodBindings.map((b: any) => b.id),
            ));
          }
        }
      }
    }

    // 2. High-risk prompt missing tool permissions
    const risk = String(prompt.risk_tier || '').toLowerCase();
    if (['tier_3_high', 'tier_4_critical'].includes(risk)) {
      if (!toolPermissions || toolPermissions.length === 0) {
        findings.push(mkFinding(
          prompt.id,
          prompt.name,
          'binding_drift',
          'medium',
          'High-risk prompt has no tool permissions defined',
          `Prompt risk tier is ${prompt.risk_tier} but no tool permissions are defined for the current version. High-risk prompts with tool-use capability should have explicit tool permission records.`,
          [prompt.current_version_id],
        ));
      }
    }

    // 3. Stale binding — binding updated_at is older than the last audit event by a large margin
    const { data: lastAudit } = await supabaseAdmin
      .from('prompt_audit_ledger')
      .select('created_at')
      .eq('prompt_id', prompt.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastAuditAt = lastAudit?.[0]?.created_at;
    if (lastAuditAt) {
      const allBindings = [...(bindings || []), ...(knowledgeBindings || []), ...(toolPermissions || [])];
      const staleDays = stalenessDays ?? 90;
      const staleThreshold = new Date(lastAuditAt).getTime() - staleDays * 24 * 60 * 60 * 1000;

      for (const b of allBindings) {
        const updated = b.updated_at || b.created_at;
        if (updated && new Date(updated).getTime() < staleThreshold) {
          const table = b.tool_name ? 'tool_permission' : b.kb_id ? 'knowledge_binding' : 'binding';
          findings.push(mkFinding(
            prompt.id,
            prompt.name,
            'binding_drift',
            'low',
            `Stale ${table} has not been updated in over 90 days`,
            `${table} (${b.id}) was last updated at ${updated} and the prompt's most recent audit is at ${lastAuditAt}. This binding may be outdated or unused.`,
            [b.id, lastAuditAt],
          ));
          break;
        }
      }
    }

    return findings;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static async getVersionIdsForPrompt(promptId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('prompt_versions')
      .select('id')
      .eq('prompt_id', promptId);
    return (data || []).map((v: any) => v.id);
  }
}

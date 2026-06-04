/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '../../../shared/supabase';
import { ReverseDependencyService, ReverseTargetType } from './ReverseDependencyService';
import { DependencyHealthService, DependencyHealthResult, DependencySeverity } from '../DependencyHealthService';

// ─────────────────────────────────────────────────────────────────────────────
// DependencyNotificationPlanner — Batch 3B.12 (Notification PLANNING only)
//
// Decides WHO should be notified, WHY, WHAT dependency caused it, the SEVERITY,
// and the RECOMMENDED ACTION when a target entity (agent / workflow / KB / tool /
// policy / …) changes or degrades. It plans — it NEVER delivers.
//
// Pure & side-effect-free:
//   * NO notification delivery (no email / SMS / Slack / queue imports).
//   * NO mutations, NO audit events, NO evidence generation.
//
// Reuse:
//   * ReverseDependencyService — finds the affected prompts (WHO is impacted),
//     already workspace-gated.
//   * DependencyHealthService  — classifies the target (severity / reason /
//     recommended action), the single source of truth shared with the health
//     and impact engines.
//
// Severity gate: HEALTHY targets produce NO notification entries.
//
// Tenant isolation: the affected prompts come from ReverseDependencyService
// (chain prompt_version_id → prompt_versions → prompts → workspace_id). Recipient
// enrichment RE-FILTERS prompts by workspace_id, so a foreign targetId can never
// surface cross-tenant recipients/PII.
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationPlanInput {
  targetType: ReverseTargetType;
  targetId: string;
  workspaceId: string;
  // Health signal about the target — fed verbatim to DependencyHealthService.classify.
  status?: string | null;
  exists?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  expiry_date?: string | null;
  review_date?: string | null;
  freshness_rule?: string | null;
  last_updated_at?: string | null;
  retrieval_mode?: string | null;
  /** Human-readable description of the change (overrides health.reason in trigger). */
  changeReason?: string;
  /** Reference time for classification (testing / point-in-time). */
  referenceTime?: string;
}

export interface NotificationRecipient {
  kind: 'owner' | 'creator' | 'approver';
  id?: string | null;
  name?: string | null;
  role?: string | null;
}

export interface NotificationEntry {
  prompt_id: string;
  prompt_name: string;
  prompt_status: string;
  version_id: string;
  version_number: number | null;
  is_current_version: boolean;
  dependency_type: ReverseTargetType;
  recipients: NotificationRecipient[];
  severity: DependencySeverity;
  reason: string;
  recommended_action: string[];
  blocking: boolean;
}

export interface NotificationPlan {
  target: { type: ReverseTargetType; id: string };
  workspace_id: string;
  trigger: { health: DependencyHealthResult; reason: string };
  severity: DependencySeverity;
  recommended_actions: string[];
  notifications: NotificationEntry[];
  summary: {
    prompt_count: number;
    recipient_count: number;
    notify_count: number;
    highest_severity: DependencySeverity;
    blocking_count: number;
  };
}

export class DependencyNotificationPlanner {
  private static recipientKey(r: NotificationRecipient): string {
    return `${r.kind}:${r.id ?? ''}:${r.role ?? ''}:${r.name ?? ''}`;
  }

  /**
   * Build a notification PLAN for a target-entity change. Read-only; never sends.
   */
  static async planNotifications(input: NotificationPlanInput): Promise<NotificationPlan> {
    const { targetType, targetId, workspaceId } = input;

    // 1. Classify the target — severity / reason / recommended action (SoT).
    const health = DependencyHealthService.classify(
      {
        type: targetType,
        id: targetId,
        exists: input.exists,
        status: input.status,
        effective_from: input.effective_from,
        effective_to: input.effective_to,
        expiry_date: input.expiry_date,
        review_date: input.review_date,
        freshness_rule: input.freshness_rule,
        last_updated_at: input.last_updated_at,
        retrieval_mode: input.retrieval_mode,
      },
      input.referenceTime,
    );

    const trigger = { health, reason: input.changeReason || health.reason };

    const emptyPlan: NotificationPlan = {
      target: { type: targetType, id: targetId },
      workspace_id: workspaceId,
      trigger,
      severity: health.severity,
      recommended_actions: health.recommendations,
      notifications: [],
      summary: {
        prompt_count: 0,
        recipient_count: 0,
        notify_count: 0,
        highest_severity: 'none',
        blocking_count: 0,
      },
    };

    // 2. Severity gate — HEALTHY targets generate NO notification entries.
    if (health.status === 'HEALTHY') {
      return emptyPlan;
    }

    // 3. Affected prompts (WHO) — workspace-gated by ReverseDependencyService.
    const reverse = await ReverseDependencyService.getDependents(targetType, targetId, workspaceId);
    if (reverse.dependents.length === 0) {
      return emptyPlan;
    }

    const promptIds = Array.from(new Set(reverse.dependents.map((d) => d.prompt_id)));
    const versionIds = Array.from(new Set(reverse.dependents.map((d) => d.version_id)));

    // 4. Recipient enrichment — RE-FILTER prompts by workspace_id (defense-in-depth).
    const { data: prompts, error: pErr } = await supabaseAdmin
      .from('prompts')
      .select('id, owner_id, owner_name, created_by')
      .in('id', promptIds)
      .eq('workspace_id', workspaceId);
    if (pErr) throw pErr;
    const promptMap = new Map<string, any>();
    for (const p of (prompts as any[]) || []) promptMap.set(p.id, p);

    // Approvers, keyed by version (reviewer_role per approval record).
    const { data: approvals, error: aErr } = await supabaseAdmin
      .from('prompt_approvals')
      .select('prompt_version_id, reviewer_role')
      .in('prompt_version_id', versionIds);
    if (aErr) throw aErr;
    const approverRoles = new Map<string, Set<string>>();
    for (const a of (approvals as any[]) || []) {
      if (!a.reviewer_role) continue;
      const set = approverRoles.get(a.prompt_version_id) || new Set<string>();
      set.add(a.reviewer_role);
      approverRoles.set(a.prompt_version_id, set);
    }

    // 5. Assemble per-prompt notification entries (WARNING and above).
    const notifications: NotificationEntry[] = [];
    const promptSet = new Set<string>();
    const recipientSet = new Set<string>();

    for (const d of reverse.dependents) {
      const p = promptMap.get(d.prompt_id);
      if (!p) continue; // tenant boundary: not in caller workspace → dropped.

      const recipients: NotificationRecipient[] = [];
      if (p.owner_id || p.owner_name) {
        recipients.push({ kind: 'owner', id: p.owner_id ?? null, name: p.owner_name ?? null });
      }
      if (p.created_by) {
        recipients.push({ kind: 'creator', id: p.created_by });
      }
      const roles = approverRoles.get(d.version_id);
      if (roles) {
        for (const role of roles) recipients.push({ kind: 'approver', role });
      }

      for (const r of recipients) recipientSet.add(this.recipientKey(r));

      notifications.push({
        prompt_id: d.prompt_id,
        prompt_name: d.prompt_name,
        prompt_status: d.prompt_status,
        version_id: d.version_id,
        version_number: d.version_number,
        is_current_version: d.is_current_version,
        dependency_type: d.dependency_type,
        recipients,
        severity: health.severity,
        reason: health.reason,
        recommended_action: health.recommendations,
        blocking: health.blocking,
      });
      promptSet.add(d.prompt_id);
    }

    return {
      target: { type: targetType, id: targetId },
      workspace_id: workspaceId,
      trigger,
      severity: health.severity,
      recommended_actions: health.recommendations,
      notifications,
      summary: {
        prompt_count: promptSet.size,
        recipient_count: recipientSet.size,
        notify_count: notifications.length,
        highest_severity: notifications.length > 0 ? health.severity : 'none',
        blocking_count: notifications.filter((n) => n.blocking).length,
      },
    };
  }

  // ── Typed convenience wrappers ──────────────────────────────────────────────
  static planForAgentChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'agent', targetId, workspaceId });
  }

  static planForWorkflowChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'workflow', targetId, workspaceId });
  }

  static planForWorkflowNodeChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'workflow_node', targetId, workspaceId });
  }

  static planForKnowledgeChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'knowledge', targetId, workspaceId });
  }

  static planForCollectionChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'collection', targetId, workspaceId });
  }

  static planForToolChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'tool', targetId, workspaceId });
  }

  static planForChannelChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'channel', targetId, workspaceId });
  }

  static planForBrandChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'brand', targetId, workspaceId });
  }

  static planForPolicyChange(targetId: string, workspaceId: string, signal: Partial<NotificationPlanInput> = {}): Promise<NotificationPlan> {
    return this.planNotifications({ ...signal, targetType: 'policy', targetId, workspaceId });
  }
}

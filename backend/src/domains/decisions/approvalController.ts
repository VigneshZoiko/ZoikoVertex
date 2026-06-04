/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../shared/supabase";
import { AuthRequest } from "../../shared/authMiddleware";
import { internalEventBus } from "../../shared/internalEventBus";
import { evaluateIntent } from "./decisionEngine";
import { RiskClassifier } from "./riskClassifier";
import { logAuditEvent } from "../governance/evidenceController";
import { broadcastWebhookEvent } from "../integrations/apiWebhookController";

// Which statuses each role sees in the queue
const ROLE_QUEUE_STATUSES: Record<string, string[]> = {
  REVIEWER: ["PENDING_REVIEW", "PENDING_MANAGER"],
  MANAGER: ["PENDING_MANAGER", "PENDING_REVIEW"],
  VALIDATOR: ["PENDING_VALIDATION"],
  APPROVER: ["PENDING_AUTHORIZATION", "PENDING_ADMIN"],
  GOVERNANCE_ADMIN: ["PENDING_GOVERNANCE"],
  COMPLIANCE_REVIEWER: ["PENDING_GOVERNANCE"],
  BRAND_REVIEWER: ["PENDING_REVIEW"],
  PUBLISHER: ["PENDING_REVIEW"],
  CREATOR: ["RETURNED", "IN_REVISION"],
  ADMIN: [
    "PENDING_REVIEW",
    "PENDING_MANAGER",
    "PENDING_VALIDATION",
    "PENDING_AUTHORIZATION",
    "PENDING_GOVERNANCE",
    "PENDING_ADMIN",
  ],
  WORKSPACE_OWNER: [
    "PENDING_REVIEW",
    "PENDING_MANAGER",
    "PENDING_VALIDATION",
    "PENDING_AUTHORIZATION",
    "PENDING_GOVERNANCE",
    "PENDING_ADMIN",
  ],
};

// Approval path per risk level — ordered stages the item moves through
const RISK_PATHS: Record<string, string[]> = {
  LOW: ["PENDING_REVIEW", "APPROVED"],
  STANDARD: ["PENDING_MANAGER", "APPROVED"],
  ELEVATED: ["PENDING_MANAGER", "PENDING_VALIDATION", "APPROVED"],
  HIGH: [
    "PENDING_MANAGER",
    "PENDING_VALIDATION",
    "PENDING_AUTHORIZATION",
    "APPROVED",
  ],
  RESTRICTED: [
    "PENDING_MANAGER",
    "PENDING_VALIDATION",
    "PENDING_AUTHORIZATION",
    "PENDING_GOVERNANCE",
    "APPROVED",
  ],
};

function getNextStatus(currentStatus: string, riskLevel: string): string {
  const path = RISK_PATHS[riskLevel?.toUpperCase()] ?? RISK_PATHS.STANDARD;
  const idx = path.indexOf(currentStatus);
  if (idx === -1 || idx >= path.length - 1) return "APPROVED";
  return path[idx + 1];
}

const ActionSchema = z.object({
  action: z.enum([
    "approve",
    "reject",
    "return_revision",
    "block",
    "escalate",
    "validate",
    "authorize",
  ]),
  feedback: z.string().optional(),
});

const SubmitForReviewSchema = z.object({
  content: z.string().min(1),
  platform: z.string(),
  target_account_ids: z.array(z.string().uuid()).min(1),
  media_urls: z.array(z.string()).optional(),
  risk_override: z
    .enum(["LOW", "STANDARD", "ELEVATED", "HIGH", "RESTRICTED"])
    .optional(),
});

export const submitForReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { content, platform, target_account_ids, media_urls, risk_override } =
      SubmitForReviewSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .single();
    if (!member)
      return res.status(403).json({ error: "No workspace membership" });

    const safetyResult = risk_override
      ? {
          assessment: {
            level: risk_override,
            score: 0,
            factors: [] as string[],
          },
          nksViolations: [] as string[],
          brandViolations: [] as string[],
        }
      : await RiskClassifier.assessContentAdvanced(
          content,
          platform,
          member.workspace_id,
        );

    const assessment = safetyResult.assessment;

    const path = RISK_PATHS[assessment.level] ?? RISK_PATHS.STANDARD;
    const initialStatus = path[0];

    const { data, error } = await supabaseAdmin
      .from("publish_intents")
      .insert({
        workspace_id: member.workspace_id,
        creator_id: userId,
        target_account_ids,
        content,
        media_urls: media_urls || [],
        media_url: media_urls?.[0] || null,
        platform,
        status: initialStatus,
        risk_level: assessment.level,
        risk_score: assessment.score,
        risk_factors: assessment.factors,
        requires_approval: true,
        approval_level: path.join(" -> "),
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      workspaceId: member.workspace_id,
      actorId: userId,
      actorType: "USER",
      action: `Content submitted for review at ${initialStatus}`,
      objectType: "PUBLISH_INTENT",
      objectId: data.id,
      module: "Approval",
      riskLevel: assessment.level,
      metadata: { initialStatus },
    });

    broadcastWebhookEvent(member.workspace_id, "approval.requested", {
      intent_id: data.id,
      platform,
      content: content.substring(0, 500),
      risk_level: assessment.level,
      status: initialStatus,
      submitted_at: new Date().toISOString(),
    }).catch(() => {});

    res.status(201).json({ success: true, data, risk: assessment });
  } catch (error) {
    next(error);
  }
};

export const getApprovalQueue = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [{ data: userCtx }, { data: member }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("is_superadmin")
        .eq("id", userId)
        .single(),
      supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const isSuperAdmin =
      userCtx?.is_superadmin || req.user?.is_superadmin || false;
    const role = (member?.role || (isSuperAdmin ? "ADMIN" : "")).toUpperCase();
    const workspaceId = member?.workspace_id || req.user?.workspace_id;

    let statusFilter: string[];
    if (isSuperAdmin) {
      statusFilter = [...new Set(Object.values(ROLE_QUEUE_STATUSES).flat())];
    } else if (["ADMIN", "WORKSPACE_OWNER"].includes(role)) {
      statusFilter = ROLE_QUEUE_STATUSES.ADMIN;
    } else {
      statusFilter = ROLE_QUEUE_STATUSES[role] || [];
    }

    // Fetch all (workspace-scoped) and filter by status in JS to avoid enum type errors
    // for status values not yet present in the DB's intent_status enum.
    let query = supabaseAdmin
      .from("publish_intents")
      .select("*")
      .order("created_at", { ascending: true });

    if (!isSuperAdmin && workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    if (role === "CREATOR") {
      query = query.eq("creator_id", userId);
    }

    const { data: rawData, error } = await query;
    if (error) {
      if ((error as { code?: string }).code === "42P01")
        return res.json({ success: true, data: [], role });
      throw error;
    }

    // Join creator users in-memory
    const items = rawData || [];
    const creatorIds = [
      ...new Set(items.map((i: any) => i.creator_id).filter(Boolean)),
    ];
    const userMap = new Map<string, { full_name: string; email: string }>();

    if (creatorIds.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from("users")
          .select("id, full_name, email")
          .in("id", creatorIds);

        if (usersData) {
          usersData.forEach((u: any) => {
            userMap.set(u.id, { full_name: u.full_name, email: u.email });
          });
        }
      } catch {
        // ignore
      }
    }

    const data = items.map((item: any) => {
      const creatorInfo = item.creator_id ? userMap.get(item.creator_id) : null;
      return {
        ...item,
        creator: creatorInfo || null,
      };
    });

    const filtered = (data || []).filter((item: any) =>
      statusFilter.includes(item.status),
    );
    res.json({ success: true, data: filtered, role });
  } catch (error) {
    next(error);
  }
};

export const getApprovalStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: userCtx } = await supabaseAdmin
      .from("users")
      .select("is_superadmin")
      .eq("id", userId)
      .single();

    let query = supabaseAdmin
      .from("publish_intents")
      .select("status, created_at");
    if (!userCtx?.is_superadmin && member?.workspace_id) {
      query = query.eq("workspace_id", member.workspace_id);
    }
    const { data: all, error: pubErr } = await query;
    if (pubErr) {
      if ((pubErr as any).code === "42P01")
        return res.json({
          success: true,
          data: { counts: {}, recent_decisions: [] },
          recent_decisions: [],
        });
      throw pubErr;
    }

    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const counts = {
      pending_review: 0,
      pending_validation: 0,
      pending_authorization: 0,
      pending_governance: 0,
      returned: 0,
      blocked: 0,
      total_pending: 0,
      approved_this_week: 0,
      rejected_this_week: 0,
    };

    for (const item of all || []) {
      const s = item.status;
      if (["PENDING_REVIEW", "PENDING_MANAGER"].includes(s))
        counts.pending_review++;
      else if (s === "PENDING_VALIDATION") counts.pending_validation++;
      else if (["PENDING_AUTHORIZATION", "PENDING_ADMIN"].includes(s))
        counts.pending_authorization++;
      else if (s === "PENDING_GOVERNANCE") counts.pending_governance++;
      else if (["RETURNED", "IN_REVISION"].includes(s)) counts.returned++;
      else if (["BLOCKED", "GOVERNANCE_BLOCKED"].includes(s)) counts.blocked++;

      if (item.created_at >= weekAgo) {
        if (s === "APPROVED") counts.approved_this_week++;
        else if (s === "REJECTED") counts.rejected_this_week++;
      }
    }
    counts.total_pending =
      counts.pending_review +
      counts.pending_validation +
      counts.pending_authorization +
      counts.pending_governance;

    // Recent decisions (last 10 approved/rejected)
    let recentQuery = supabaseAdmin
      .from("publish_intents")
      .select("id, content, platform, status, created_at, creator_id")
      .in("status", ["APPROVED", "REJECTED", "BLOCKED", "GOVERNANCE_BLOCKED"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (!userCtx?.is_superadmin && member?.workspace_id) {
      recentQuery = recentQuery.eq("workspace_id", member.workspace_id);
    }
    const { data: recentRaw } = await recentQuery;

    // Join creator users in-memory
    const recentItems = recentRaw || [];
    const recentCreatorIds = [
      ...new Set(recentItems.map((i: any) => i.creator_id).filter(Boolean)),
    ];
    const recentUserMap = new Map<string, { full_name: string }>();

    if (recentCreatorIds.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from("users")
          .select("id, full_name")
          .in("id", recentCreatorIds);

        if (usersData) {
          usersData.forEach((u: any) => {
            recentUserMap.set(u.id, { full_name: u.full_name });
          });
        }
      } catch {
        // ignore
      }
    }

    const recent = recentItems.map((item: any) => {
      const creatorInfo = item.creator_id
        ? recentUserMap.get(item.creator_id)
        : null;
      return {
        ...item,
        creator: creatorInfo || null,
      };
    });

    const total = counts.approved_this_week + counts.rejected_this_week;
    const approval_rate =
      total > 0 ? Math.round((counts.approved_this_week / total) * 100) : null;

    res.json({
      success: true,
      data: { counts, recent: recent || [], approval_rate },
    });
  } catch (error) {
    next(error);
  }
};

export const takeApprovalAction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { action, feedback } = ActionSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = (member?.role || "").toUpperCase();

    const { data: intent, error: fetchErr } = await supabaseAdmin
      .from("publish_intents")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr || !intent)
      return res.status(404).json({ error: "Intent not found" });

    const riskLevel = (intent.risk_level || "STANDARD").toUpperCase();
    let nextStatus: string;

    switch (action) {
      case "reject":
        nextStatus = "REJECTED";
        break;
      case "return_revision":
        nextStatus = "RETURNED";
        break;
      case "block":
        nextStatus = "GOVERNANCE_BLOCKED";
        break;
      case "escalate":
        nextStatus = "PENDING_GOVERNANCE";
        break;
      case "approve":
      case "validate":
      case "authorize": {
        nextStatus = getNextStatus(intent.status, riskLevel);
        break;
      }
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    if (nextStatus === "APPROVED") {
      const wsId = Array.isArray(intent.workspace_id)
        ? intent.workspace_id[0]
        : String(intent.workspace_id);
      const decisionResult = await evaluateIntent(String(id), "", wsId);

      if (!decisionResult.governance_cleared) {
        await supabaseAdmin
          .from("publish_intents")
          .update({
            status: "GOVERNANCE_BLOCKED",
            feedback: `Blocked: ${decisionResult.decision_class}`,
            decision_id: decisionResult.decision_id,
          })
          .eq("id", id);
        return res
          .status(403)
          .json({
            error: "Governance blocked",
            decision_class: decisionResult.decision_class,
          });
      }

      await supabaseAdmin
        .from("publish_intents")
        .update({
          status: nextStatus,
          feedback: feedback || null,
          decision_id: decisionResult.decision_id,
        })
        .eq("id", id);

      internalEventBus.emit("execution.requested", {
        intentId: id,
        orgId: intent.workspace_id,
      });
    } else {
      await supabaseAdmin
        .from("publish_intents")
        .update({ status: nextStatus, feedback: feedback || null })
        .eq("id", id);
    }

    await logAuditEvent({
      workspaceId: intent.workspace_id,
      actorId: userId,
      actorType: "USER",
      action: `${action} on ${id} → ${nextStatus} by ${role}`,
      objectType: "PUBLISH_INTENT",
      objectId: String(id),
      module: "Approval",
      riskLevel: intent.risk_level,
      metadata: { action, nextStatus, role },
    });

    broadcastWebhookEvent(intent.workspace_id, "approval.completed", {
      intent_id: id,
      action,
      new_status: nextStatus,
      platform: intent.platform,
      content: (intent.content || "").substring(0, 500),
      feedback: feedback || null,
      decided_at: new Date().toISOString(),
    }).catch(() => {});

    res.json({ success: true, newStatus: nextStatus });
  } catch (error) {
    next(error);
  }
};

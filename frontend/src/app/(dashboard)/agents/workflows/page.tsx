"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import ActiveOrchestrations from "./components/ActiveOrchestrations";
import WorkflowRunDetailDrawer from "./components/WorkflowRunDetailDrawer";
import PublishedContentPanel from "./components/PublishedContentPanel";
import {
  RefreshCw,
  GitBranch,
  FileCheck2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  GitMerge,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ControlStripData {
  activeWorkflows: number;
  pendingApprovals?: number;
  blockedRuns: number;
  failedRuns: number;
  criticalRiskItems: number;
  highRiskRuns?: number;
  completedToday?: number;
}

interface ApprovalStats {
  counts?: {
    total_pending?: number;
    pending_validation?: number;
    pending_authorization?: number;
    pending_governance?: number;
  };
}

const INSTANCE_STATUS_MAP: Record<string, string> = {
  pending: "Pending",
  running: "In Progress",
  waiting_approval: "Waiting",
  waiting_review: "Waiting",
  paused: "Paused",
  blocked: "Blocked",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Failed",
};

function formatRelativeMinutes(date?: string | null) {
  if (!date) return "Just now";
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function mapActiveInstance(instance: any) {
  return {
    id: instance.id,
    workflowId: instance.workflow_id,
    workflowName: safeStr(
      instance.workflowName ||
        instance.workflow_templates?.name,
      "Workflow Run",
    ),
    currentStep: safeStr(
      instance.currentStep ||
        instance.current_step_name ||
        instance.current_step_id,
      "Awaiting Step",
    ),
    agentAssigned: safeStr(
      instance.agentAssigned ||
        instance.assigned_agent_name,
      "Assigned Agent",
    ),
    owner: safeStr(instance.owner || instance.started_by) || undefined,
    status: INSTANCE_STATUS_MAP[instance.status] || safeStr(instance.status, "Pending"),
    timeInStep: formatRelativeMinutes(
      instance.started_at || instance.created_at,
    ),
    startedAt: instance.started_at || instance.created_at,
    riskScore: typeof instance.risk_score === "number" ? instance.risk_score : undefined,
    confidenceScore: typeof instance.confidence_score === "number" ? instance.confidence_score : undefined,
    sla: instance.due_at
      ? new Date(instance.due_at).toLocaleString()
      : undefined,
    blocker: (() => {
      const raw = instance.blocker || instance.reason_code;
      return raw && typeof raw === "string" ? raw : undefined;
    })(),
    post: instance.post && typeof instance.post === "object"
      ? {
          platform: safeStr(instance.post.platform, ""),
          excerpt: safeStr(instance.post.excerpt, ""),
        }
      : undefined,
    prompt: instance.prompt || instance.execution_prompt || undefined,
    knowledgeBaseSource:
      instance.knowledgeBaseSource ||
      instance.knowledge_base_source ||
      instance.knowledge_source ||
      undefined,
    nextStep:
      instance.nextStep || instance.next_step || instance.nextAction || instance.next_action || undefined,
    kbCollection: instance.kbCollection || instance.kb_collection || undefined,
    reviewerName: instance.reviewerName || undefined,
    reviewerRole: instance.reviewerRole || undefined,
    reviewDecision: instance.reviewDecision || undefined,
    reviewComment: instance.reviewComment || undefined,
    reviewedAt: instance.reviewedAt || undefined,
  };
}

// ── Safe render helpers ────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || typeof v === "object") return fallback;
  return String(v);
}

function safeNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || typeof v !== "number") return fallback;
  return v;
}

// ── Control Strip ──────────────────────────────────────────────────────────

function ControlStrip({
  data,
  approvalStats,
}: {
  data?: ControlStripData;
  approvalStats?: ApprovalStats | null;
}) {
  // Prefer the workspace-scoped workflow count (data.pendingApprovals); fall back
  // to the approval-records total only if the stats endpoint is unavailable.
  const totalPending = data?.pendingApprovals ?? approvalStats?.counts?.total_pending ?? 0;
  const blocked = data?.blockedRuns ?? 0;
  const failed = data?.failedRuns ?? 0;
  // Live per-run risk (open runs scoring ≥ 70) replaces the template-config
  // "Critical Risk", which was structurally always 0.
  const highRisk = data?.highRiskRuns ?? 0;

  const strip = [
    {
      label: "Active Workflows",
      value: data?.activeWorkflows ?? 0,
      icon: GitMerge,
      color: "text-info-text",
      urgent: false,
    },
    {
      label: "Pending Approvals",
      value: totalPending,
      icon: FileCheck2,
      color: "text-warning-text",
      urgent: totalPending > 0,
    },
    {
      label: "Blocked Runs",
      value: blocked,
      icon: XCircle,
      color: "text-error-text",
      urgent: blocked > 0,
    },
    {
      label: "Failed Runs",
      value: failed,
      icon: AlertCircle,
      color: "text-red-400",
      urgent: failed > 0,
    },
    {
      label: "High-Risk Runs",
      value: highRisk,
      icon: AlertTriangle,
      color: "text-error-text",
      urgent: highRisk > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {strip.map((item) => (
        <div
          key={item.label}
          className={`flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all ${
            item.urgent
              ? "bg-error-text/5 border-error-border/20"
              : "bg-[var(--surface)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {item.label}
            </span>
          </div>
          <p
            className={`text-2xl font-bold ${item.urgent ? "text-error-text" : "text-[var(--text-primary)]"}`}
          >
            {safeNum(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [stats, setStats] = useState<any>(undefined);
  const [active, setActive] = useState<any[]>([]);
  const [publishedContent, setPublishedContent] = useState<any[] | undefined>(undefined);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const responses = await Promise.allSettled([
      api.get("/api/v1/agents/workflows/stats"),
      api.get("/api/v1/agents/workflows/active"),
      api.get("/api/v1/agents/workflows/approvals/stats"),
      api.get("/api/v1/agents/workflows/published-content"),
    ]);
    const [
      statsRes,
      activeRes,
      approvalsRes,
      publishedRes,
    ] = responses.map((r) =>
      r.status === "fulfilled" ? r.value : { success: false, data: null },
    );
    if (statsRes.success) setStats(statsRes.data);
    if (activeRes.success)
      setActive((activeRes.data || []).map(mapActiveInstance));
    if (approvalsRes.success) setApprovalStats(approvalsRes.data || null);
    if (publishedRes.success) setPublishedContent(publishedRes.data || []);
    else setPublishedContent([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const safeFetch = () => { if (!cancelled && document.visibilityState === 'visible') fetchAll(); };
    safeFetch();
    const interval = setInterval(safeFetch, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchAll]);


  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-info-text/10 rounded-2xl border border-info-border/20">
            <GitBranch className="w-7 h-7 text-info-text" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Agent Workflows
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-success-text/10 text-success-text border-success-border/20 uppercase tracking-widest">
                Production
              </span>
            </div>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              Governed execution circuits — chained actions, decision gates,
              approvals, policy checks, and evidence capture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success-text/10 border border-success-border/20 rounded-full text-xs font-medium text-success-text">
            <span className="w-1.5 h-1.5 bg-success-text rounded-full animate-pulse" />
            Auto-refresh 20s
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Indicators ── */}
      <ControlStrip data={stats} approvalStats={approvalStats} />

      {/* ── Published Content ── */}
      <PublishedContentPanel data={publishedContent} />

      {/* ── Live Workflow Runs ── */}
      <ActiveOrchestrations
        data={active}
        onActionComplete={fetchAll}
        onRowClick={setSelectedRun}
      />
      <WorkflowRunDetailDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  XCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  GitBranch,
  Bot,
  FileText,
  BookOpen,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Pause,
  Search,
  UserCheck,
  MessageSquare,
  Info,
} from "lucide-react";

interface RunData {
  id: string;
  workflowId?: string;
  workflowName: string;
  agentAssigned: string;
  status: string;
  timeInStep: string;
  riskScore?: number;
  prompt?: string;
  knowledgeBaseSource?: string;
  nextStep?: string;
  currentStep?: string;
  owner?: string;
  confidenceScore?: number;
  blocker?: string;
  sla?: string;
  post?: { platform?: string; excerpt?: string };
  startedAt?: string;
}

function safeStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || typeof v === "object") return fallback;
  return String(v);
}

function safeNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || typeof v !== "number") return fallback;
  return v;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  Completed: <CheckCircle2 className="w-4 h-4 text-success-text" />,
  "In Progress": <Loader2 className="w-4 h-4 text-info-text animate-spin" />,
  Processing: <Loader2 className="w-4 h-4 text-warning-text animate-spin" />,
  Pending: <Clock className="w-4 h-4 text-error-text" />,
  Waiting: <Clock className="w-4 h-4 text-orange-400" />,
  Blocked: <XCircle className="w-4 h-4 text-error-text" />,
  Paused: <Pause className="w-4 h-4 text-warning-text" />,
  Failed: <AlertCircle className="w-4 h-4 text-red-500" />,
};

const STATUS_COLOR: Record<string, string> = {
  Completed: "text-success-text",
  "In Progress": "text-info-text",
  Processing: "text-warning-text",
  Pending: "text-error-text",
  Waiting: "text-orange-400",
  Blocked: "text-error-text",
  Paused: "text-warning-text",
  Failed: "text-red-500",
};

const OUTCOME_MAP: Record<string, string> = {
  Completed: "Completed",
  "In Progress": "Running",
  Processing: "Running",
  Pending: "Pending",
  Waiting: "Review Required",
  Blocked: "Blocked",
  Paused: "Pending",
  Failed: "Failed",
};

const DECISION_SOURCE_MAP: Record<string, string> = {
  Completed: "Governance Engine — all checks passed",
  "In Progress": "Pending execution",
  Processing: "Pending execution",
  Pending: "Awaiting trigger",
  Waiting: "Awaiting human review",
  Blocked: "Governance Engine — policy or knowledge check failed",
  Failed: "Runtime Engine — step execution failure",
};

const JOURNEY_STEPS = [
  { key: "submitted", label: "Post Submitted", icon: FileText },
  { key: "created", label: "Workflow Created", icon: GitBranch },
  { key: "agent", label: "Agent Triggered", icon: Bot },
  { key: "prompt", label: "Prompt Executed", icon: MessageSquare },
  { key: "knowledge", label: "Knowledge Search", icon: Search },
  { key: "policy", label: "Policy / Claim Validation", icon: Shield },
  { key: "review", label: "Review / Approval", icon: UserCheck },
  { key: "outcome", label: "Completed / Blocked / Failed", icon: AlertTriangle },
];

function getJourneyState(
  stepKey: string,
  status: string,
): "completed" | "active" | "blocked" | "failed" | "missing" {
  if (status === "Completed") return "completed";
  if (status === "Blocked" || status === "Failed") {
    if (stepKey === "outcome") return status === "Blocked" ? "blocked" : "failed";
    return "completed";
  }
  if (status === "In Progress" || status === "Processing") {
    const activeIndex = JOURNEY_STEPS.findIndex((s) => s.key === "agent");
    const stepIndex = JOURNEY_STEPS.findIndex((s) => s.key === stepKey);
    if (stepIndex < activeIndex) return "completed";
    if (stepIndex === activeIndex) return "active";
    return "missing";
  }
  return "missing";
}

function getJourneyIcon(state: string, Icon: React.ElementType) {
  if (state === "completed") return <CheckCircle2 className="w-4 h-4 text-success-text" />;
  if (state === "active") return <Loader2 className="w-4 h-4 text-info-text animate-spin" />;
  if (state === "blocked" || state === "failed") return <XCircle className="w-4 h-4 text-error-text" />;
  return <Icon className="w-4 h-4 text-[var(--text-muted)]" />;
}

function getJourneyColor(state: string) {
  if (state === "completed") return "border-success-text/30 bg-success-text/5";
  if (state === "active") return "border-info-text/30 bg-info-text/10";
  if (state === "blocked" || state === "failed") return "border-error-text/30 bg-error-text/10";
  return "border-[var(--border)] bg-[var(--surface-hover)]/20";
}

function getOutcomeReason(run: RunData): string {
  const status = run.status;
  if (status === "Blocked" && run.blocker) return run.blocker;
  if (status === "Blocked") return "The workflow was stopped because a required governance, policy, or knowledge check failed.";
  if (status === "Failed") return "The workflow failed because one runtime step could not complete.";
  if (status === "Completed") return "The workflow was completed because required checks passed and required evidence was available.";
  if (status === "Waiting") return "The workflow requires human review before proceeding.";
  if (status === "In Progress" || status === "Processing") return "The workflow is currently executing.";
  if (status === "Pending" || status === "Paused") return "The workflow is awaiting the next trigger or manual action.";
  return "Reason not available.";
}

const DECISION_TRACE_ITEMS = [
  { key: "content", label: "Content received" },
  { key: "agent", label: "Agent selected" },
  { key: "prompt", label: "Prompt executed" },
  { key: "knowledge", label: "Knowledge lookup" },
  { key: "governance", label: "Governance rule applied" },
  { key: "outcome", label: "Outcome selected" },
  { key: "evidence", label: "Evidence recorded" },
];

function getTraceState(key: string, run: RunData): "done" | "missing" {
  if (run.status === "Completed") return "done";
  if (key === "content" || key === "agent" || key === "prompt") return "done";
  if (key === "knowledge" && run.knowledgeBaseSource) return "done";
  if (key === "outcome" || key === "evidence") {
    if (run.status === "Completed" || run.status === "Blocked" || run.status === "Failed") return "done";
    return "missing";
  }
  if (key === "governance") {
    if (run.status === "Blocked" || run.status === "Completed" || run.status === "Failed") return "done";
    return "missing";
  }
  return "missing";
}

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-[var(--text-secondary)] shrink-0 flex items-center gap-1.5">
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </span>
      <span className="text-xs text-[var(--text-primary)] text-right font-medium max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "resources", label: "Resources" },
  { key: "journey", label: "Journey" },
  { key: "decision", label: "Decision" },
  { key: "evidence", label: "Evidence" },
  { key: "approvals", label: "Approvals" },
  { key: "failure", label: "Failure", hidden: true },
];

export default function WorkflowRunDetailDrawer({
  run,
  onClose,
}: {
  run: RunData | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (run) {
      setTab("overview");
      // Scroll the page to the top first, then lock it there, so the drawer
      // (a `fixed` overlay that a transformed ancestor can pin to page-top)
      // is fully in view instead of off-screen above the current scroll position.
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.body.style.overflow = "hidden";
      setTimeout(() => scrollRef.current?.scrollTo(0, 0), 0);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [run]);

  if (!run) return null;

  const outcome = OUTCOME_MAP[run.status] || "Pending";
  const showFailure = run.status === "Blocked" || run.status === "Failed";
  const noKb = !run.knowledgeBaseSource || run.knowledgeBaseSource === "—";
  const visibleTabs = TABS.filter((t) => !t.hidden || (t.key === "failure" && showFailure));

  const tabContent = (() => {
    switch (tab) {
      // ── Overview ──
      case "overview":
        return (
          <div className="rounded-xl border border-[var(--border)] p-4 space-y-0.5 bg-[var(--surface-hover)]/20">
            <DetailRow label="Workflow Name" value={safeStr(run.workflowName)} icon={<GitBranch className="w-3.5 h-3.5 text-info-text" />} />
            <DetailRow label="Workflow ID" value={safeStr(run.id)} />
            <DetailRow
              label="Status"
              value={<span className={`inline-flex items-center gap-1.5 font-semibold ${STATUS_COLOR[run.status] || "text-[var(--text-primary)]"}`}>{STATUS_ICON[run.status] || null}{run.status}</span>}
            />
            {run.currentStep && <DetailRow label="Current Step" value={safeStr(run.currentStep)} />}
            {run.nextStep && <DetailRow label="Next Step" value={safeStr(run.nextStep)} />}
            <DetailRow label="Risk Score" value={run.riskScore != null ? `${safeNum(run.riskScore)}%` : "—"} />
            {run.confidenceScore != null && <DetailRow label="Confidence Score" value={`${safeNum(run.confidenceScore)}%`} />}
            {run.startedAt && <DetailRow label="Created" value={new Date(run.startedAt).toLocaleString()} />}
            <DetailRow label="Last Updated" value={run.timeInStep ? `${run.timeInStep} ago` : "Not available"} />
          </div>
        );

      // ── Resources ──
      case "resources":
        return (
          <div className="rounded-xl border border-[var(--border)] p-4 space-y-0.5 bg-[var(--surface-hover)]/20">
            <DetailRow label="Agent Linked" value={safeStr(run.agentAssigned)} icon={<Bot className="w-3.5 h-3.5 text-success-text" />} />
            <DetailRow label="Prompt Linked" value={safeStr(run.prompt)} icon={<MessageSquare className="w-3.5 h-3.5 text-sky-400" />} />
            <DetailRow label="Prompt Version" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow
              label="Knowledge Base Source"
              value={noKb ? <span className="text-[var(--text-muted)] italic flex items-center gap-1"><AlertCircle className="w-3 h-3" />No relevant KB source</span> : safeStr(run.knowledgeBaseSource)}
              icon={<BookOpen className="w-3.5 h-3.5 text-violet-400" />}
            />
            <DetailRow label="KB Collection" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            {run.post?.excerpt && (
              <DetailRow label="Content Excerpt" value={<span className="text-[var(--text-secondary)] block max-w-full truncate">{run.post.excerpt}</span>} icon={<FileText className="w-3.5 h-3.5 text-amber-400" />} />
            )}
          </div>
        );

      // ── Journey ──
      case "journey":
        return (
          <div className="space-y-1.5">
            {JOURNEY_STEPS.map((step) => {
              const state = getJourneyState(step.key, run.status);
              return (
                <div key={step.key} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${getJourneyColor(state)}`}>
                  {getJourneyIcon(state, step.icon)}
                  <span className={`text-xs font-medium ${state === "completed" ? "text-success-text" : state === "active" ? "text-info-text" : state === "blocked" ? "text-error-text" : state === "failed" ? "text-red-500" : "text-[var(--text-muted)]"}`}>
                    {step.label}
                  </span>
                  {state === "active" && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-info-text/10 text-info-text border border-info-border/20 uppercase tracking-wider">Current</span>}
                  {state === "blocked" && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-error-text/10 text-error-text border border-error-border/20 uppercase tracking-wider">Blocked</span>}
                  {state === "failed" && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-600/10 text-red-500 border-red-600/20 uppercase tracking-wider">Failed</span>}
                  {state === "missing" && <span className="ml-auto text-[9px] text-[var(--text-muted)] italic">Not available</span>}
                </div>
              );
            })}
          </div>
        );

      // ── Decision ──
      case "decision":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-0.5 bg-[var(--surface-hover)]/20">
              <DetailRow label="Final Outcome" value={<span className={`inline-flex items-center gap-1.5 font-semibold ${STATUS_COLOR[run.status] || ""}`}>{STATUS_ICON[run.status] || null}{outcome}</span>} />
              <DetailRow label="Decision Source" value={safeStr(DECISION_SOURCE_MAP[run.status] || "Not available")} />
              {run.startedAt && <DetailRow label="Decision Time" value={new Date(run.startedAt).toLocaleString()} />}
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-hover)]/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Reason & Explanation</p>
              <div className={`flex items-start gap-2.5 ${run.status === "Blocked" || run.status === "Failed" ? "text-error-text" : run.status === "Completed" ? "text-success-text" : "text-[var(--text-secondary)]"}`}>
                {run.status === "Blocked" || run.status === "Failed" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : run.status === "Completed" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                <p className="text-xs leading-relaxed">{getOutcomeReason(run)}</p>
              </div>
              {noKb && run.status !== "Completed" && (
                <p className="text-xs text-[var(--text-muted)] mt-2 pl-6.5">The workflow required knowledge verification, but no relevant approved KB source was found.</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Decision Trace</p>
              <div className="space-y-1">
                {DECISION_TRACE_ITEMS.map((item) => {
                  const state = getTraceState(item.key, run);
                  return (
                    <div key={item.key} className="flex items-center gap-3 p-2 rounded-lg">
                      {state === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-success-text shrink-0" /> : <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />}
                      <span className={`text-xs ${state === "done" ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{item.label}</span>
                      {state === "done" ? <span className="ml-auto text-[9px] text-success-text font-medium">Completed</span> : <span className="ml-auto text-[9px] text-[var(--text-muted)] italic">Not available</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      // ── Evidence ──
      case "evidence":
        return (
          <div className="rounded-xl border border-[var(--border)] p-4 space-y-0.5 bg-[var(--surface-hover)]/20">
            <DetailRow label="Evidence ID" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow label="Evidence Bundle ID" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow label="Prompt Used" value={safeStr(run.prompt)} icon={<MessageSquare className="w-3.5 h-3.5 text-sky-400" />} />
            <DetailRow label="Prompt Version" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow label="KB Source Used" value={noKb ? <span className="text-[var(--text-muted)] italic">Not used</span> : safeStr(run.knowledgeBaseSource)} />
            <DetailRow label="Source Citation" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow
              label="Policy Result"
              value={run.status === "Blocked" ? <span className="text-error-text flex items-center gap-1"><ShieldAlert className="w-3 h-3" />Blocked</span> : run.status === "Completed" ? <span className="text-success-text flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Passed</span> : <span className="text-[var(--text-muted)] italic">Pending</span>}
              icon={<Shield className="w-3.5 h-3.5 text-amber-400" />}
            />
            <DetailRow label="Workflow Trace" value={run.startedAt ? <span className="text-[var(--text-secondary)]">Started {new Date(run.startedAt).toLocaleString()}</span> : <span className="text-[var(--text-muted)] italic">Not available</span>} />
          </div>
        );

      // ── Approvals ──
      case "approvals":
        return (
          <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-hover)]/20">
            {run.owner ? (
              <div className="space-y-0.5">
                <DetailRow label="Reviewer" value={safeStr(run.owner)} />
                <DetailRow label="Role" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
                <DetailRow label="Decision" value={run.status === "Completed" ? "Approved" : run.status === "Blocked" || run.status === "Failed" ? "Rejected" : "Pending"} />
                <DetailRow label="Comments" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
                {run.startedAt && <DetailRow label="Timestamp" value={new Date(run.startedAt).toLocaleString()} />}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No approval history available.</p>
            )}
          </div>
        );

      // ── Failure ──
      case "failure":
        return (
          <div className="rounded-xl border border-error-border/20 p-4 space-y-0.5 bg-error-text/5">
            <DetailRow label="Failed Step" value={safeStr(run.currentStep)} icon={<AlertCircle className="w-3.5 h-3.5 text-error-text" />} />
            <DetailRow label="Failure Reason" value={run.blocker ? <span className="text-error-text">{run.blocker}</span> : <span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow label="System Message" value={<span className="text-[var(--text-muted)] italic">Not available</span>} />
            <DetailRow
              label="Recommended Action"
              value={
                <span className="text-info-text text-[11px] font-medium">
                  {noKb ? "Add an approved KB source or send this item to review queue." : run.status === "Blocked" ? "Route to authorized reviewer or update the content." : run.prompt ? "Check linked agent or prompt configuration." : "Review workflow logs and evidence."}
                </span>
              }
            />
          </div>
        );

      default:
        return null;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <div className="w-full max-w-[600px] h-screen max-h-screen bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-[var(--surface)] shrink-0">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Workflow Run Detail</p>
              <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight truncate">{run.workflowName}</h2>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">{run.id}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0 mt-0.5">
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-[var(--border)] px-4 shrink-0">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? "text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-b-2 border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
          {tabContent}
        </div>
      </div>
    </div>
  );
}

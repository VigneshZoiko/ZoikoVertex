"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileLock2,
  Filter,
  Flag,
  Gauge,
  Hand,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  StopCircle,
  TimerReset,
  UserCheck,
  X,
} from "lucide-react";
import { useRoleContext } from "@/lib/context/RoleContext";
import { agentOperationsApi } from "./api";
import { canRunAction, getPrimaryNextAction } from "./permissions";
import type { AgentRun, EvidenceBundle, QueueItem, RuntimeAction } from "./types";
import { useAgentOperations } from "./useAgentOperations";

const STATUS_OPTIONS = ["", "SCHEDULED", "QUEUED", "RUNNING", "WAITING_HUMAN_REVIEW", "POLICY_BLOCKED", "FAILED", "PAUSED", "COMPLETED", "QUARANTINED"];
const SEVERITY_OPTIONS = ["", "normal", "attention", "warning", "critical", "blocked"];
const ENV_OPTIONS = ["", "production", "staging", "sandbox"];
const POLICY_RESULT_OPTIONS = ["", "pass", "warning", "blocked", "pending_review", "not_applicable"];
const BRAND_OPTIONS = ["", "luxe", "essence", "vivid", "neutral", "prestige", "artisan", "studio"];
const QUEUE_TABS = ["all", "approval", "failure", "retry", "human_review", "publishing", "exception"];

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function minutesUntil(value?: string | null) {
  if (!value) return null;
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

function toneForSeverity(severity?: string) {
  switch (severity) {
    case "critical":
    case "blocked":
      return "border-error-border bg-error-bg text-error-text";
    case "warning":
      return "border-warning-border bg-warning-bg text-warning-text";
    case "attention":
      return "border-info-border bg-info-bg text-info-text";
    default:
      return "border-success-border bg-success-bg text-success-text";
  }
}

function statusTone(status?: string) {
  switch (status) {
    case "RUNNING":
      return "border-success-border bg-success-bg text-success-text";
    case "FAILED":
    case "POLICY_BLOCKED":
    case "QUARANTINED":
      return "border-error-border bg-error-bg text-error-text";
    case "PAUSED":
    case "WAITING_HUMAN_REVIEW":
    case "QUEUED":
      return "border-warning-border bg-warning-bg text-warning-text";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function HealthCard({ label, value, sub, icon: Icon, tone }: { label: string; value: string | number; sub?: string; icon: typeof Activity; tone: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--foreground)] tabular-nums">{value}</p>
          {sub ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{sub}</p> : null}
        </div>
        <div className={`rounded-xl border p-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  action,
  run,
  label,
  icon: Icon,
  onAction,
}: {
  action: RuntimeAction;
  run: AgentRun | null;
  label: string;
  icon: typeof PauseCircle;
  onAction: (action: RuntimeAction) => void;
}) {
  const { role, isSuperAdmin } = useRoleContext();
  const gate = canRunAction(role, isSuperAdmin, run, action);
  return (
    <button
      type="button"
      disabled={!gate.allowed}
      title={gate.allowed ? label : gate.reason}
      onClick={() => onAction(action)}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function VirtualizedRunsTable({ runs, selectedRunId, onOpen, onAction }: { runs: AgentRun[]; selectedRunId: string | null; onOpen: (id: string) => void; onAction: (run: AgentRun, action: RuntimeAction) => void }) {
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 78;
  const viewportHeight = 560;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 8;
  const visibleRows = runs.slice(start, start + visibleCount);

  if (runs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-success-text" />
        <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">No matching active operations</h3>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">Try scheduled, completed, or recent failed runs, or check workflow health.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-[var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
        <span>Run and Agent</span>
        <span>Workflow</span>
        <span>Status</span>
        <span>Policy</span>
        <span>SLA</span>
        <span>Next Action</span>
      </div>
      <div className="relative overflow-auto" style={{ height: viewportHeight }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div style={{ height: runs.length * rowHeight, position: "relative" }}>
          {visibleRows.map((run, index) => {
            const due = minutesUntil(run.due_at);
            const next = getPrimaryNextAction(run);
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => onOpen(run.id)}
                className={`absolute left-0 grid w-full grid-cols-[1.4fr_1fr_0.9fr_0.8fr_0.8fr_0.9fr] items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition hover:bg-[var(--surface)] ${selectedRunId === run.id ? "bg-[var(--surface)]" : ""}`}
                style={{ top: (start + index) * rowHeight, height: rowHeight }}
              >
                <span>
                  <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{run.task_objective || run.agent_name}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--foreground-muted)]">{run.agent_name} · {run.agent_type} · {run.environment}</span>
                </span>
                <span>
                  <span className="block truncate text-sm text-[var(--foreground)]">{run.workflow_name || "Workflow pending"}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--foreground-muted)]">{run.workflow_version || "version unknown"} · {run.channel || "any channel"}</span>
                </span>
                <span className="space-y-1">
                  <Badge className={statusTone(run.status)}>{run.status.replace(/_/g, " ")}</Badge>
                  <span className="block"><Badge className={toneForSeverity(String(run.severity))}>{String(run.severity || "normal")}</Badge></span>
                </span>
                <span>
                  <Badge className={run.policy_result === "failed" || run.status === "POLICY_BLOCKED" ? "border-error-border bg-error-bg text-error-text" : "border-success-border bg-success-bg text-success-text"}>
                    {String(run.policy_result || "pending").replace(/_/g, " ")}
                  </Badge>
                  <span className="mt-1 block text-xs text-[var(--foreground-muted)]">{run.evidence_status || "evidence pending"}</span>
                </span>
                <span className="text-xs">
                  <span className={`block font-semibold ${due !== null && due < 0 ? "text-error-text" : "text-[var(--foreground)]"}`}>
                    {due === null ? "No SLA" : due < 0 ? `${Math.abs(due)}m breached` : `${due}m left`}
                  </span>
                  <span className="mt-1 block text-[var(--foreground-muted)]">{run.owner_name || "Unassigned"}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold capitalize text-[var(--foreground)]">{next.replace(/_/g, " ")}</span>
                  {next !== "open" ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onAction(run, next);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onAction(run, next);
                      }}
                      className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--card)]"
                    >
                      Act
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QueuePanel({ queues, onAssign, onResolve }: { queues: QueueItem[]; onAssign: (item: QueueItem) => void; onResolve: (item: QueueItem) => void }) {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? queues : queues.filter((item) => item.queue_type === tab);
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Queue and Exceptions</h2>
        <Badge className="border-info-border bg-info-bg text-info-text">{filtered.length} open</Badge>
      </div>
      <div className="mt-4 flex gap-2 overflow-auto pb-1">
        {QUEUE_TABS.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${tab === item ? "border-info-border bg-info-bg text-info-text" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}>
            {item.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {filtered.slice(0, 8).map((item) => {
          const due = minutesUntil(item.due_at);
          return (
            <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-[var(--foreground)]">{item.queue_type.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Priority {item.priority} · {item.status} · {item.assignee_name || "unassigned"}</p>
                  <p className={`mt-1 text-xs ${due !== null && due < 0 ? "text-error-text" : "text-[var(--foreground-muted)]"}`}>{due === null ? "No SLA due time" : due < 0 ? `SLA breached by ${Math.abs(due)}m` : `SLA due in ${due}m`}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onAssign(item)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs">Claim</button>
                  <button onClick={() => onResolve(item)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs">Resolve</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--foreground-muted)]">No work is hidden in this queue.</p> : null}
      </div>
    </section>
  );
}

function RunDetailDrawer({ open, detail, timeline, loading, onClose, onAction }: { open: boolean; detail: ReturnType<typeof useAgentOperations>["selectedDetail"]; timeline: ReturnType<typeof useAgentOperations>["timeline"]; loading: boolean; onClose: () => void; onAction: (action: RuntimeAction | "export_output_snapshot") => void }) {
  const [tab, setTab] = useState("overview");
  const run = detail?.run ?? null;
  if (!open) return null;
  const tabs = ["overview", "timeline", "inputs", "prompt", "knowledge", "policy", "output", "evidence"];
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl overflow-auto border-l border-[var(--border)] bg-[var(--background)] shadow-2xl">
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">Run detail and evidence</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">{run?.task_objective || "Loading run"}</h2>
            {run ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{run.id}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-xl border border-[var(--border)] p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton action="pause" run={run} label="Pause" icon={PauseCircle} onAction={onAction} />
          <ActionButton action="resume" run={run} label="Resume" icon={PlayCircle} onAction={onAction} />
          <ActionButton action="stop" run={run} label="Stop" icon={StopCircle} onAction={onAction} />
          <ActionButton action="retry" run={run} label="Retry" icon={TimerReset} onAction={onAction} />
          <ActionButton action="quarantine" run={run} label="Quarantine" icon={Archive} onAction={onAction} />
          <ActionButton action="escalate" run={run} label="Escalate" icon={Flag} onAction={onAction} />
          <ActionButton action="emergency_pause" run={run} label="Emergency Pause" icon={Siren} onAction={onAction} />
          <ActionButton action="restricted_mode" run={run} label="Restricted Mode" icon={Ban} onAction={onAction} />
          <ActionButton action="hold" run={run} label="Hold" icon={PauseCircle} onAction={onAction} />
          <ActionButton action="release_hold" run={run} label="Release Hold" icon={PlayCircle} onAction={onAction} />
        </div>
      </div>
      <div className="border-b border-[var(--border)] px-5 py-3">
        <div className="flex gap-2 overflow-auto">
          {tabs.map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${tab === item ? "border-success-border bg-success-bg text-success-text" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {loading ? <p className="text-sm text-[var(--foreground-muted)]">Loading operational evidence...</p> : null}
        {!loading && run && tab === "overview" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Agent", `${run.agent_name} · ${run.agent_type}`],
              ["Workflow", run.workflow_id ? <Link href={`/agents/workflows?id=${run.workflow_id}`} className="underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--gold)]">{run.workflow_name || "Unknown"} · {run.workflow_version || "version missing"}</Link> : `${run.workflow_name || "Unknown"} · ${run.workflow_version || "version missing"}`],
              ["Owner", run.owner_name || "Unassigned"],
              ["Environment", run.environment],
              ["Brand / Campaign", `${run.brand_name || run.brand_id || "Brand scoped"} / ${run.campaign_name || "No campaign"}`],
              ["Timing", `Started ${formatDate(run.started_at)} · Due ${formatDate(run.due_at)}`],
              ["Retry linkage", run.original_run_id ? `Retry of ${run.original_run_id}` : "Original attempt"],
              ["Last event", run.last_event || formatDate(run.last_event_at)],
            ].map(([label, value], idx) => (
              <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs text-[var(--foreground-muted)]">{label}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && tab === "timeline" ? (
          <div className="space-y-3">
            {timeline.map((event) => (
              <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{event.event_type}</p>
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">{event.previous_state || "start"} → {event.new_state || "recorded"} · {event.actor_name || event.actor_id || "system"}</p>
                    {event.reason ? <p className="mt-2 text-sm text-[var(--foreground)]">{event.reason}</p> : null}
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(event.id)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs">Copy ID</button>
                </div>
                <p className="mt-2 text-xs text-[var(--foreground-muted)]">{formatDate(event.created_at)}</p>
              </div>
            ))}
            {timeline.length === 0 ? <p className="text-sm text-[var(--foreground-muted)]">No immutable events have been recorded for this run yet.</p> : null}
          </div>
        ) : null}
        {!loading && tab === "policy" ? (
          <div className="space-y-3">
            {(detail?.policy_results || []).map((policy) => (
              <div key={policy.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{policy.failed_rule || (policy.policy_id ? <Link href={`/governance/policies?id=${policy.policy_id}`} className="underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--gold)]">{policy.policy_id}</Link> : policy.policy_id)}</p>
                  <Badge className={policy.outcome === "FAIL" || policy.outcome === "ESCALATE" ? "border-error-border bg-error-bg text-error-text" : "border-success-border bg-success-bg text-success-text"}>{policy.outcome}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">Version {policy.policy_version || "unknown"} · Severity {policy.severity} · Remediation {policy.remediation_required ? "required" : "not required"}</p>
              </div>
            ))}
            {(detail?.policy_results || []).length === 0 ? <p className="text-sm text-[var(--foreground-muted)]">Policy results are pending or unavailable. External actions should fail closed until checks complete.</p> : null}
          </div>
        ) : null}
        {!loading && tab === "evidence" ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Evidence bundle</p>
            <p className="mt-2 text-xs text-[var(--foreground-muted)]">Status: {detail?.evidence_bundle?.status || run?.evidence_status || "pending"}</p>
            {detail?.evidence_bundle?.id ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">ID: <Link href={`/evidence/evidence-vault/items/${detail.evidence_bundle.id}`} className="break-all underline underline-offset-2 decoration-[var(--border)] hover:decoration-[var(--gold)]">{detail.evidence_bundle.id}</Link></p> : null}
            <p className="mt-1 break-all text-xs text-[var(--foreground-muted)]">Hash: {detail?.evidence_bundle?.hash || "not locked"}</p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">Approval chain: {(detail?.approval_chain || []).length} recorded decision events</p>
            <button onClick={() => onAction("export_evidence")} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold"><Download className="h-4 w-4" /> Export evidence</button>
          </div>
        ) : null}
        {!loading && ["inputs", "prompt", "knowledge", "output"].includes(tab) ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold capitalize text-[var(--foreground)]">{tab}</p>
                <p className="mt-2 text-sm text-[var(--foreground-muted)]">Linked {tab} records are reserved for immutable runtime evidence. This panel is read-only unless the backend grants state-safe editing.</p>
              </div>
              {tab === "output" ? (
                <button
                  type="button"
                  onClick={() => onAction("export_output_snapshot")}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface)]"
                >
                  <Download className="h-4 w-4" /> Export
                </button>
              ) : null}
            </div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-[var(--surface)] p-3 text-xs text-[var(--foreground-muted)]">{JSON.stringify(tab === "prompt" ? detail?.prompt_version : tab === "knowledge" ? detail?.knowledge_sources : tab === "output" ? detail?.output_snapshot : run, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ActionModal({ action, run, evidenceBundle, onClose, onComplete }: { action: RuntimeAction | "assign_queue" | "resolve_queue" | "create_incident" | "export_csv" | "export_output_snapshot" | null; run: AgentRun | null; evidenceBundle?: EvidenceBundle; onClose: () => void; onComplete: () => void }) {
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState("critical");
  const [category, setCategory] = useState("runtime_failure");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!action) return null;

  const isEvidenceExport = action === "export_evidence";
  const isOutputSnapshotExport = action === "export_output_snapshot";
  const isCSVExport = action === "export_csv";
  const needsRun = action !== "create_incident" && !isEvidenceExport && !isCSVExport;
  let title = action.replace(/_/g, " ");
  if (isCSVExport) title = "Export Analytics CSV";
  if (isOutputSnapshotExport) title = "Export Output Snapshot";
  const impact = action === "emergency_pause"
    ? "This will halt the selected runtime path and should be paired with an incident record."
    : action === "retry"
      ? "This creates a linked retry attempt and preserves the original failure evidence."
      : action === "hold"
        ? "This pauses the run with a hold marker. Unlike pause, hold is available to more roles (Reviewer, Validator, Approver) for lighter-touch intervention. Evidence and event history are preserved."
        : action === "release_hold"
          ? "This resumes a previously held run back to RUNNING status. The release is recorded with your user id, reason, and scope."
          : action === "export_evidence"
            ? evidenceBundle
              ? `Export evidence bundle ${evidenceBundle.id.slice(0, 8)}... with immutable hash ${evidenceBundle.hash?.slice(0, 12) || "not locked"}. The export is recorded with your user id, reason, timestamp, and bundle scope.`
              : "No evidence bundle is available for this run. Create or lock a bundle first via the evidence panel."
            : isCSVExport
              ? "Downloads current operational analytics as a CSV file. The export is recorded with your user id and reason."
              : isOutputSnapshotExport
                ? "Exports the run output snapshot to a server-audited export event. The snapshot path and reason are recorded with your user id and timestamp."
                : "The backend will re-check current run state before applying this controlled action.";

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (action === "create_incident") {
        await agentOperationsApi.createIncident({
          run_id: run?.id,
          severity,
          category,
          root_cause: reason,
        });
      } else if (action === "export_evidence") {
        if (!evidenceBundle) throw new Error("No evidence bundle is available for export yet.");
        await agentOperationsApi.exportEvidence(evidenceBundle, reason);
      } else if (action === "export_csv") {
        await agentOperationsApi.exportAnalyticsCSV(reason);
      } else if (action === "export_output_snapshot") {
        if (!run) throw new Error("A run is required for output snapshot export.");
        await agentOperationsApi.exportOutputSnapshot(run.id, reason);
      } else {
        if (needsRun && !run) throw new Error("A run is required for this action.");
        await agentOperationsApi.performRunAction(run!.id, action as RuntimeAction, reason);
        if (action === "emergency_pause") {
          await agentOperationsApi.createIncident({
            run_id: run!.id,
            severity: "critical",
            category: "emergency_pause",
            root_cause: reason,
          });
        }
      }
      onComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">Governed runtime control</p>
            <h3 className="mt-1 text-xl font-bold capitalize text-[var(--foreground)]">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-[var(--border)] p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 rounded-xl border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
          {impact}
        </div>
        {action === "create_incident" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--foreground-muted)]">Severity<select value={severity} onChange={(event) => setSeverity(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)]"><option>critical</option><option>high</option><option>medium</option><option>low</option></select></label>
            <label className="text-sm text-[var(--foreground-muted)]">Category<input value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--foreground)]" /></label>
          </div>
        ) : null}
        <label className="mt-4 block text-sm text-[var(--foreground-muted)]">
          Required reason <span className="text-[var(--foreground-muted)]">(minimum 8 characters)</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className={`mt-1 w-full rounded-xl border bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] ${reason.trim().length > 0 && reason.trim().length < 8 ? "border-warning-border" : "border-[var(--border)]"}`} placeholder="Record the operational reason, expected impact, and any reviewer handoff (at least 8 characters)." />
          <span className={`mt-1 block text-xs ${reason.trim().length < 8 ? "text-warning-text" : "text-success-text"}`}>
            {reason.trim().length < 8
              ? `At least 8 characters required — ${8 - reason.trim().length} more to go (${reason.trim().length}/8).`
              : `Reason looks good (${reason.trim().length} characters).`}
          </span>
        </label>
        {error ? <p className="mt-3 rounded-xl border border-error-border bg-error-bg p-3 text-sm text-error-text">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm">Cancel</button>
          <button disabled={pending || reason.trim().length < 8} onClick={submit} className="rounded-xl bg-success-text px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{pending ? "Applying..." : "Confirm and audit"}</button>
        </div>
      </div>
    </div>
  );
}

export function AgentOperationsPage() {
  const ops = useAgentOperations();
  const [modalAction, setModalAction] = useState<RuntimeAction | "create_incident" | "export_csv" | "export_output_snapshot" | null>(null);
  const [modalRun, setModalRun] = useState<AgentRun | null>(null);
  const selectedRun = ops.selectedDetail?.run ?? null;

  const health = useMemo(() => {
    const s = ops.stats;
    return [
      { label: "Active Agents", value: s?.active_runs ?? "—", sub: "live runtime executions", icon: Activity, tone: "border-success-border bg-success-bg text-success-text" },
      { label: "Queued Tasks", value: s?.queue_depth ?? "—", sub: `${s?.pending_queues ?? 0} unresolved queue items`, icon: TimerReset, tone: "border-info-border bg-info-bg text-info-text" },
      { label: "Failed Runs", value: s?.failed_runs ?? "—", sub: `${s?.failure_rate ?? 0}% failure rate`, icon: AlertTriangle, tone: "border-error-border bg-error-bg text-error-text" },
      { label: "Policy Blocks", value: s?.policy_blocked_runs ?? "—", sub: `${s?.policy_block_rate ?? 0}% block rate`, icon: ShieldAlert, tone: "border-warning-border bg-warning-bg text-warning-text" },
      { label: "Evidence Ready", value: `${ops.analytics?.evidence_completeness ?? 0}%`, sub: "locked bundle coverage", icon: FileLock2, tone: "border-info-border bg-info-bg text-info-text" },
      { label: "SLA Breach", value: `${ops.analytics?.sla_breach_rate ?? 0}%`, sub: "due-item breach rate", icon: Clock3, tone: "border-warning-border bg-warning-bg text-warning-text" },
    ];
  }, [ops.stats, ops.analytics]);

  function openAction(run: AgentRun | null, action: RuntimeAction | "create_incident" | "export_csv" | "export_output_snapshot") {
    setModalRun(run);
    setModalAction(action);
  }

  async function assignQueue(item: QueueItem) {
    await agentOperationsApi.assignQueueItem(item.id);
    ops.refresh();
  }

  async function resolveQueue(item: QueueItem) {
    await agentOperationsApi.resolveQueueItem(item.id);
    ops.refresh();
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="rounded-3xl border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-success-text">Agent Operations</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Runtime control room</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--foreground-muted)]">Monitor live and scheduled runs, control interventions safely, inspect policy and evidence, and route incidents without leaving the operating surface.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ops.degradedRealtime ? <Badge className="border-warning-border bg-warning-bg text-warning-text">Degraded realtime · polling fallback</Badge> : <Badge className="border-success-border bg-success-bg text-success-text">Realtime ready</Badge>}
            <span className="text-xs text-[var(--foreground-muted)]">Last refresh {ops.lastUpdated ? ops.lastUpdated.toLocaleTimeString() : "pending"}</span>
            <button onClick={ops.refresh} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold"><RefreshCcw className="h-4 w-4" /> Refresh</button>
            <button onClick={() => openAction(selectedRun, "create_incident")} className="inline-flex items-center gap-2 rounded-xl bg-error-text px-3 py-2 text-sm font-semibold text-foreground"><Siren className="h-4 w-4" /> Incident</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {health.map((card) => <HealthCard key={card.label} {...card} />)}
        </div>
      </section>

      {ops.staleWarning ? <div className="rounded-2xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">Displayed state may be stale — no update received in over 2 minutes. <button onClick={ops.refresh} className="underline font-semibold">Refresh now</button>.</div> : null}
  {ops.error ? <div className="rounded-2xl border border-error-border bg-error-bg p-4 text-sm text-error-text">{ops.error}</div> : null}

      <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:grid-cols-[1fr_160px_160px_140px_160px_140px_auto]">
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--foreground-muted)]" />
          <input value={ops.filters.search} onChange={(event) => ops.setFilters({ ...ops.filters, search: event.target.value })} placeholder="Search runs, agents, owners, workflows" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)]" />
        </label>
        <select value={ops.filters.status} onChange={(event) => ops.setFilters({ ...ops.filters, status: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">{STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}</select>
        <select value={ops.filters.severity} onChange={(event) => ops.setFilters({ ...ops.filters, severity: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">{SEVERITY_OPTIONS.map((item) => <option key={item} value={item}>{item || "All severities"}</option>)}</select>
        <select value={ops.filters.environment} onChange={(event) => ops.setFilters({ ...ops.filters, environment: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">{ENV_OPTIONS.map((item) => <option key={item} value={item}>{item || "All environments"}</option>)}</select>
        <select value={ops.filters.policy_result} onChange={(event) => ops.setFilters({ ...ops.filters, policy_result: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">{POLICY_RESULT_OPTIONS.map((item) => <option key={item} value={item}>{item || "All policy results"}</option>)}</select>
        <select value={ops.filters.brand_name || ""} onChange={(event) => ops.setFilters({ ...ops.filters, brand_name: event.target.value })} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">{BRAND_OPTIONS.map((item) => <option key={item} value={item}>{item || "All brands"}</option>)}</select>
        <span className="self-center text-xs text-[var(--foreground-muted)]">{ops.totalRuns} permitted records</span>
      </section>

      <main className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Live agent activity</h2>
            <p className="text-xs text-[var(--foreground-muted)]">Virtualized table · action-safe rows · immutable evidence links</p>
          </div>
          {ops.loading ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10 text-sm text-[var(--foreground-muted)]">Loading operational runs...</div> : <VirtualizedRunsTable runs={ops.runs} selectedRunId={ops.selectedRunId} onOpen={ops.openRun} onAction={openAction} />}
        </section>
        <aside className="space-y-6">
          <QueuePanel queues={ops.queues} onAssign={assignQueue} onResolve={resolveQueue} />
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--foreground)]">Open incidents</h2>
              <Badge className="border-error-border bg-error-bg text-error-text">{ops.incidents.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {ops.incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{incident.category}</p>
                    <Badge className={toneForSeverity(incident.severity)}>{incident.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">{incident.run_name || incident.run_id || "Systemic incident"} · {incident.owner_name || "unassigned"}</p>
                </div>
              ))}
              {ops.incidents.length === 0 ? <p className="text-sm text-[var(--foreground-muted)]">No open incidents in the selected operational scope.</p> : null}
            </div>
          </section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--foreground)]">Operational analytics</h2>
              <button
                type="button"
                onClick={() => openAction(null, "export_csv")}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-2 py-1 text-xs font-semibold hover:bg-[var(--surface)]"
              >
                <Download className="h-3 w-3" /> CSV
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--surface)] p-3"><Gauge className="h-4 w-4 text-info-text" /><p className="mt-2 text-xs text-[var(--foreground-muted)]">24h throughput</p><p className="text-lg font-bold">{ops.analytics?.throughput?.["24h"] ?? 0}</p></div>
              <div className="rounded-xl bg-[var(--surface)] p-3"><CheckCircle2 className="h-4 w-4 text-success-text" /><p className="mt-2 text-xs text-[var(--foreground-muted)]">7d policy block</p><p className="text-lg font-bold">{ops.analytics?.policy_block_rate?.["7d"] ?? 0}%</p></div>
              <div className="rounded-xl bg-[var(--surface)] p-3"><UserCheck className="h-4 w-4 text-info-text" /><p className="mt-2 text-xs text-[var(--foreground-muted)]">Evidence completeness</p><p className="text-lg font-bold">{ops.analytics?.evidence_completeness ?? 0}%</p></div>
              <div className="rounded-xl bg-[var(--surface)] p-3"><AlertTriangle className="h-4 w-4 text-error-text" /><p className="mt-2 text-xs text-[var(--foreground-muted)]">30d failure</p><p className="text-lg font-bold">{ops.analytics?.failure_rate?.["30d"] ?? 0}%</p></div>
              <div className="rounded-xl bg-[var(--surface)] p-3"><Clock3 className="h-4 w-4 text-warning-text" /><p className="mt-2 text-xs text-[var(--foreground-muted)]">Avg human review</p><p className="text-lg font-bold">{ops.analytics?.human_review_time?.value ?? "—"}</p><p className="text-xs text-[var(--foreground-muted)]">min (30d)</p></div>
              <div className="rounded-xl bg-[var(--surface)] p-3"><TimerReset className="h-4 w-4 text-info-text" /><p className="mt-2 text-xs text-[var(--foreground-muted)]">Avg incident closure</p><p className="text-lg font-bold">{ops.analytics?.incident_closure_time?.value ?? "—"}</p><p className="text-xs text-[var(--foreground-muted)]">hours (30d)</p></div>
            </div>
          </section>
        </aside>
      </main>

      <RunDetailDrawer open={Boolean(ops.selectedRunId)} detail={ops.selectedDetail} timeline={ops.timeline} loading={ops.detailLoading} onClose={ops.closeRun} onAction={(action) => openAction(selectedRun, action)} />
      <ActionModal action={modalAction} run={modalRun || selectedRun} evidenceBundle={ops.selectedDetail?.evidence_bundle} onClose={() => setModalAction(null)} onComplete={ops.refresh} />
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import RoutingStats from "./components/RoutingStats";
import WorkflowCanvas from "./components/WorkflowCanvas";
import ActiveOrchestrations from "./components/ActiveOrchestrations";
import EscalationPaths from "./components/EscalationPaths";
import {
  RefreshCw,
  GitBranch,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Plus,
  Search,
  Pause,
  XCircle,
  Clock,
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Archive,
  RotateCcw,
  Shield,
  Zap,
  BookOpen,
  ScanLine,
  Users,
  Bell,
  ArrowUpCircle,
  PackageCheck,
  Timer,
  GitMerge,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type WorkflowStatus =
  | "Draft"
  | "Testing"
  | "Pending Approval"
  | "Approved"
  | "Active"
  | "Paused"
  | "Blocked"
  | "Deprecated"
  | "Retired"
  | "Failed";

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface WorkflowRecord {
  id: string;
  name: string;
  status: WorkflowStatus;
  nodes: number;
  conditionalGates: number;
  lastRun: string | null;
  owner: string;
  riskLevel: RiskLevel;
  linkedAgents: string[];
  activeRuns: number;
  health: "Healthy" | "Warning" | "Critical" | "Stale";
  brandIds: string[];
  updatedAt: string;
}

interface ApprovalStats {
  counts?: {
    total_pending?: number;
    pending_validation?: number;
    pending_authorization?: number;
    pending_governance?: number;
  };
}

interface ControlStripData {
  activeWorkflows: number;
  pendingApprovals: number;
  blockedRuns: number;
  failedRuns: number;
  slaBreach: number;
  staleDependencies: number;
  criticalRiskItems: number;
}

// ── Status helpers ─────────────────────────────────────────────────────────

const WORKFLOW_STATUS_STYLES: Record<WorkflowStatus, string> = {
  Draft:             "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  Testing:           "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Pending Approval":"bg-amber-500/10 text-amber-400 border-amber-500/20",
  Approved:          "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Active:            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Paused:            "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Blocked:           "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Deprecated:        "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Retired:           "bg-gray-500/10 text-gray-400 border-gray-500/20",
  Failed:            "bg-red-600/10 text-red-500 border-red-600/20",
};

const RISK_STYLES: Record<RiskLevel, string> = {
  Low:      "text-emerald-400",
  Medium:   "text-amber-400",
  High:     "text-orange-400",
  Critical: "text-rose-400",
};

const HEALTH_STYLES: Record<string, string> = {
  Healthy:  "bg-emerald-400",
  Warning:  "bg-amber-400",
  Critical: "bg-rose-400",
  Stale:    "bg-gray-400",
};

// ── Node-type legend items ─────────────────────────────────────────────────

const NODE_LEGEND = [
  { type: "trigger",   label: "Trigger",         color: "bg-indigo-500" },
  { type: "agent",     label: "Agent Action",     color: "bg-emerald-500" },
  { type: "prompt",    label: "Prompt Execution", color: "bg-sky-500" },
  { type: "knowledge", label: "Knowledge Lookup", color: "bg-violet-500" },
  { type: "policy",    label: "Policy Check",     color: "bg-amber-500" },
  { type: "human",     label: "Human Review",     color: "bg-rose-500" },
  { type: "approval",  label: "Approval Gate",    color: "bg-pink-500" },
  { type: "evidence",  label: "Evidence Capture", color: "bg-cyan-500" },
  { type: "action",    label: "Publish / Action", color: "bg-teal-500" },
  { type: "branch",    label: "Branch",           color: "bg-orange-500" },
  { type: "end",       label: "End",              color: "bg-gray-500" },
];

// ── Approval stage icons ───────────────────────────────────────────────────

const APPROVAL_STAGES = [
  { key: "pending_validation",    label: "Validation",    icon: ScanLine,     color: "text-sky-400" },
  { key: "pending_authorization", label: "Authorization", icon: Shield,       color: "text-indigo-400" },
  { key: "pending_governance",    label: "Governance",    icon: ShieldCheck,  color: "text-violet-400" },
];

// ── Control Strip ──────────────────────────────────────────────────────────

function ControlStrip({ data, approvalStats }: { data?: ControlStripData; approvalStats?: ApprovalStats | null }) {
  const totalPending = approvalStats?.counts?.total_pending ?? 0;
  const blocked  = data?.blockedRuns      ?? 0;
  const failed   = data?.failedRuns       ?? 0;
  const breach   = data?.slaBreach        ?? 0;
  const stale    = data?.staleDependencies ?? 0;
  const critical = data?.criticalRiskItems ?? 0;

  const strip = [
    { label: "Active Workflows",   value: data?.activeWorkflows ?? 0, icon: GitMerge,     color: "text-indigo-400",  urgent: false },
    { label: "Pending Approvals",  value: totalPending,                icon: FileCheck2,   color: "text-amber-400",   urgent: totalPending > 0 },
    { label: "Blocked Runs",       value: blocked,                     icon: XCircle,      color: "text-rose-400",    urgent: blocked > 0 },
    { label: "Failed Runs",        value: failed,                      icon: AlertCircle,  color: "text-red-400",     urgent: failed > 0 },
    { label: "SLA Breaches",       value: breach,                      icon: Clock,        color: "text-orange-400",  urgent: breach > 0 },
    { label: "Stale Dependencies", value: stale,                       icon: Archive,      color: "text-purple-400",  urgent: stale > 0 },
    { label: "Critical Risk",      value: critical,                    icon: AlertTriangle,color: "text-rose-500",    urgent: critical > 0 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {strip.map((item) => (
        <div
          key={item.label}
          className={`flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all ${
            item.urgent
              ? "bg-rose-500/5 border-rose-500/20"
              : "bg-[var(--surface)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{item.label}</span>
          </div>
          <p className={`text-2xl font-bold ${item.urgent ? "text-rose-400" : "text-[var(--text-primary)]"}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Workflow Template Library ──────────────────────────────────────────────

function TemplateLibrary({
  workflows,
  search,
  onSearch,
}: {
  workflows: WorkflowRecord[];
  search: string;
  onSearch: (v: string) => void;
}) {
  const filtered = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.owner.toLowerCase().includes(search.toLowerCase()) ||
      w.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--surface-hover)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <GitBranch className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Workflow Template Library</h2>
            <p className="text-xs text-[var(--text-secondary)]">{filtered.length} templates — governed, versioned, and evidence-tracked</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/40"
            placeholder="Search templates, owners, status…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--surface-hover)]/20">
            <tr>
              <th className="px-5 py-3 font-medium text-left">Workflow</th>
              <th className="px-5 py-3 font-medium text-left">Status</th>
              <th className="px-5 py-3 font-medium text-left">Risk</th>
              <th className="px-5 py-3 font-medium text-left">Owner</th>
              <th className="px-5 py-3 font-medium text-left">Active Runs</th>
              <th className="px-5 py-3 font-medium text-left">Health</th>
              <th className="px-5 py-3 font-medium text-left">Nodes / Gates</th>
              <th className="px-5 py-3 font-medium text-left">Last Run</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">
                  No workflows match your search. Create a workflow or clear your filter.
                </td>
              </tr>
            )}
            {filtered.map((w) => (
              <tr key={w.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">{w.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{w.id}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${WORKFLOW_STATUS_STYLES[w.status]}`}>
                    {w.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold ${RISK_STYLES[w.riskLevel]}`}>{w.riskLevel}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">{w.owner}</td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-bold text-[var(--text-primary)]">{w.activeRuns}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${HEALTH_STYLES[w.health]}`} />
                    <span className="text-xs text-[var(--text-secondary)]">{w.health}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)]">
                  {w.nodes} nodes · {w.conditionalGates} gates
                </td>
                <td className="px-5 py-3.5 text-xs text-[var(--text-muted)]">
                  {w.lastRun ? new Date(w.lastRun).toLocaleString() : "Not executed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Approval Gates Panel ───────────────────────────────────────────────────

function ApprovalGatesPanel({ approvalStats }: { approvalStats: ApprovalStats | null }) {
  const total = approvalStats?.counts?.total_pending ?? 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-500/10 rounded-xl">
          <FileCheck2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Approval Gates</h2>
          <p className="text-xs text-[var(--text-secondary)]">Role-based gates blocking execution until authorized</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-hover)]/40 border border-[var(--border)]">
          <span className="text-xs text-[var(--text-secondary)]">Total Pending</span>
          <span className={`text-lg font-bold ${total > 0 ? "text-amber-400" : "text-emerald-400"}`}>{total}</span>
        </div>
        {APPROVAL_STAGES.map((stage) => {
          const count = approvalStats?.counts?.[stage.key as keyof typeof approvalStats.counts] ?? 0;
          return (
            <div key={stage.key} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)]">
              <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                {stage.label}
              </span>
              <span className={`text-sm font-bold ${count > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{count}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
        <p className="text-[10px] text-indigo-400 leading-relaxed">
          Approval authority is role-based. Critical paths require three-key quorum. Overrides require reason capture and evidence.
        </p>
      </div>
    </div>
  );
}

// ── Execution Doctrine ─────────────────────────────────────────────────────

function ExecutionDoctrine() {
  const rules = [
    { icon: ShieldCheck, color: "text-emerald-400", title: "No direct production edits", desc: "Active workflows must go through draft → simulate → approve → deploy." },
    { icon: Shield,      color: "text-indigo-400",  title: "High-risk gates are mandatory", desc: "Critical paths require approval gates, policy checks, and evidence capture." },
    { icon: BookOpen,    color: "text-sky-400",     title: "Grounding required", desc: "Factual, legal, and regulated claims must include knowledge lookup and source trace." },
    { icon: AlertCircle, color: "text-rose-400",    title: "Policy failures block or escalate", desc: "Critical failures stop the workflow. Warnings require mitigation or reason." },
    { icon: PackageCheck,color: "text-amber-400",   title: "Evidence by default", desc: "Design changes, simulations, approvals, and runtime actions generate evidence automatically." },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-rose-500/10 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Execution Doctrine</h2>
          <p className="text-xs text-[var(--text-secondary)]">Governance non-negotiables — enforced at runtime</p>
        </div>
      </div>
      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.title} className="flex gap-3 p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)]/30 transition-colors">
            <rule.icon className={`w-4 h-4 mt-0.5 shrink-0 ${rule.color}`} />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{rule.title}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{rule.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Node Type Legend ───────────────────────────────────────────────────────

function NodeTypeLegend() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-violet-500/10 rounded-xl">
          <Zap className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Builder Node Types</h2>
          <p className="text-xs text-[var(--text-secondary)]">Controlled nodes available in the workflow builder</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {NODE_LEGEND.map((n) => (
          <div key={n.type} className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border)]">
            <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${n.color}`} />
            <span className="text-[11px] text-[var(--text-secondary)]">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Workflow Lifecycle ─────────────────────────────────────────────────────

function WorkflowLifecycle() {
  const states: { state: WorkflowStatus; desc: string; icon: React.ElementType }[] = [
    { state: "Draft",            desc: "Being created, not in production",                icon: FlaskConical },
    { state: "Testing",          desc: "Simulation and policy checks in progress",        icon: ScanLine },
    { state: "Pending Approval", desc: "Awaiting authorized review before activation",   icon: Clock },
    { state: "Approved",         desc: "Approved, not yet active in production",         icon: CheckCircle2 },
    { state: "Active",           desc: "Running production instances",                   icon: Zap },
    { state: "Paused",           desc: "Temporarily stopped, state preserved",           icon: Pause },
    { state: "Blocked",          desc: "Dependency or policy check failed",              icon: XCircle },
    { state: "Deprecated",       desc: "No longer preferred, historical reference",      icon: Archive },
    { state: "Retired",          desc: "Cannot run new instances, records retained",     icon: RotateCcw },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-teal-500/10 rounded-xl">
          <Timer className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Workflow Lifecycle States</h2>
          <p className="text-xs text-[var(--text-secondary)]">Version discipline enforced across all state transitions</p>
        </div>
      </div>
      <div className="space-y-2">
        {states.map(({ state, desc, icon: Icon }) => (
          <div key={state} className="flex items-center gap-3 p-2.5 rounded-lg">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${WORKFLOW_STATUS_STYLES[state]}`}>
              {state}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reporting Metrics ──────────────────────────────────────────────────────

function ReportingMetrics({ stats }: { stats?: any }) {
  const metrics = [
    { label: "Completion Rate",        value: stats?.completionRate    != null ? `${stats.completionRate}%`  : "—", desc: "Instances completed successfully" },
    { label: "Avg Approval Time",      value: stats?.avgApprovalTime   ?? "—",                                       desc: "From request to decision" },
    { label: "Blocked-Run Rate",       value: stats?.blockedRunRate    != null ? `${stats.blockedRunRate}%`  : "—", desc: "Stopped by policy or dependency" },
    { label: "SLA Breach Rate",        value: stats?.slaBreachRate     != null ? `${stats.slaBreachRate}%`  : "—", desc: "Steps completed after deadline" },
    { label: "Policy Failure Rate",    value: stats?.policyFailureRate != null ? `${stats.policyFailureRate}%` : "—", desc: "Warnings and blocks by type" },
    { label: "Evidence Completeness",  value: stats?.evidenceComplete  != null ? `${stats.evidenceComplete}%` : "—", desc: "Runs with full evidence bundles" },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Reporting & Governance Metrics</h2>
          <p className="text-xs text-[var(--text-secondary)]">Evidence completeness and execution reliability at a glance</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/20">
            <p className="text-xl font-bold text-[var(--text-primary)]">{m.value}</p>
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mt-0.5">{m.label}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Emergency Pause Banner ─────────────────────────────────────────────────

function EmergencyPauseBanner({ onPause }: { onPause: () => void }) {
  return (
    <button
      onClick={onPause}
      className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all font-semibold"
    >
      <Pause className="w-4 h-4" />
      Emergency Pause
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [stats, setStats]               = useState<any>(undefined);
  const [graph, setGraph]               = useState<any>(undefined);
  const [active, setActive]             = useState<any[]>([]);
  const [escalations, setEscalations]   = useState<any[] | undefined>(undefined);
  const [workflows, setWorkflows]       = useState<WorkflowRecord[]>([]);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, graphRes, activeRes, escalationsRes, workflowsRes, approvalsRes] = await Promise.all([
        api.get("/api/v1/agents/workflows/stats"),
        api.get("/api/v1/agents/workflows/graph"),
        api.get("/api/v1/agents/workflows/active"),
        api.get("/api/v1/agents/workflows/escalations"),
        api.get("/api/v1/agents/workflows"),
        api.get("/api/v1/approvals/stats"),
      ]);
      if (statsRes.success)      setStats(statsRes.data);
      if (graphRes.success)      setGraph(graphRes.data);
      if (activeRes.success)     setActive(activeRes.data);
      if (escalationsRes.success) setEscalations(escalationsRes.data);
      if (workflowsRes.success)  setWorkflows(workflowsRes.data || []);
      if (approvalsRes.success)  setApprovalStats(approvalsRes.data || null);
    } catch (err) {
      console.error("Failed to load workflows data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 20000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleEmergencyPause = () => {
    // Triggers emergency pause modal — wired to /api/v1/autonomy/emergency-locks at L2+ scope
    console.warn("Emergency pause triggered — implement confirmation modal");
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <GitBranch className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Agent Workflows</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-widest">
                Production
              </span>
            </div>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              Governed execution circuits — chained actions, decision gates, approvals, policy checks, and evidence capture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Auto-refresh 20s
          </div>
          <EmergencyPauseBanner onPause={handleEmergencyPause} />
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold text-white transition-all">
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* ── Control Strip ── */}
      <ControlStrip data={stats} approvalStats={approvalStats} />

      {/* ── Routing Stats ── */}
      <RoutingStats data={stats} />

      {/* ── Template Library ── */}
      <TemplateLibrary workflows={workflows} search={search} onSearch={setSearch} />

      {/* ── Workflow Canvas ── */}
      <WorkflowCanvas graph={graph} />

      {/* ── Governance Panels Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ApprovalGatesPanel approvalStats={approvalStats} />
        <ExecutionDoctrine />
        <NodeTypeLegend />
      </div>

      {/* ── Lifecycle + Metrics Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <WorkflowLifecycle />
        <ReportingMetrics stats={stats} />
      </div>

      {/* ── Live Orchestrations + Escalations ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <ActiveOrchestrations data={active} />
        </div>
        <div className="xl:col-span-2">
          <EscalationPaths escalations={escalations} />
        </div>
      </div>

    </div>
  );
}
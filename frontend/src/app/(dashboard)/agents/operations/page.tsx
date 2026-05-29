"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bot,
  Activity,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  Square,
  RotateCcw,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  Eye,
  BarChart3,
  Ticket,
  Ban,
  ShieldX,
  Search,
  ChevronDown,
  Download,
  Users,
  Building2,
  Globe,
  CalendarRange,
  Zap,
  FileText,
  Database,
  Shield,
  Package,
  List,
  LayoutGrid,
  Copy,
  Check,
  Hash,
  ArrowRight,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Unlock,
  UserCheck,
  Siren,
  Radio,
  CheckSquare,
  WifiOff,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentRun {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  agent_version?: string;
  workflow_name: string;
  workflow_version?: string;
  task_objective: string;
  current_step?: string;
  trigger_source?: string;
  status: string;
  severity: string;
  owner_name: string;
  owner_id?: string;
  priority: number;
  brand_name?: string;
  workspace_name?: string;
  channel?: string;
  campaign_name?: string;
  environment?: string;
  created_at: string;
  started_at: string | null;
  due_at: string | null;
  last_event_at: string;
  policy_result: string;
  evidence_status: string;
  next_action?: string;
  error_code?: string;
  retry_count?: number;
  permitted_actions?: RuntimeActionType[];
  action_gates?: Array<{ action: RuntimeActionType; allowed: boolean; reason?: string }>;
}

interface RunEvent {
  id: string;
  event_type: string;
  actor_name: string;
  actor_type?: string;
  previous_state: string | null;
  new_state: string;
  reason: string;
  created_at: string;
  correlation_id?: string;
}

interface PolicyResult {
  id: string;
  policy_id?: string;
  policy_version?: string;
  outcome: string;
  severity: string;
  failed_rule?: string;
  failed_category?: string;
  platform_impact?: string;
  remediation_required: boolean;
  source_policy?: string;
  created_at: string;
}

interface EvidenceBundle {
  id: string;
  status: string;
  hash?: string;
  locked_at?: string;
  exported_by?: string;
  exported_at?: string;
  export_reason?: string;
  storage_ref?: string;
}

interface RunDetail {
  run: AgentRun;
  inputs?: Record<string, unknown>;
  prompt_template?: string;
  prompt_version?: string;
  knowledge_sources?: Array<{ name: string; version: string; freshness: string; confidence: number }>;
  policy_results?: PolicyResult[];
  output_snapshot?: string;
  output_status?: string;
  approval_chain?: Array<{ actor: string; action: string; timestamp: string; reason?: string }>;
  evidence_bundle?: EvidenceBundle;
}

interface QueueItem {
  id: string;
  run_id?: string;
  queue_type: string;
  priority: number;
  assignee_name: string | null;
  due_at: string | null;
  status: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
  resolved_at?: string | null;
  sla_breached?: boolean;
}

interface Incident {
  id: string;
  run_id: string | null;
  run_name: string;
  severity: string;
  category: string;
  owner_name: string | null;
  status: string;
  created_by_name: string;
  created_at: string;
  due_at: string | null;
  root_cause?: string;
  remediation?: string;
  closed_by?: string;
  closed_at?: string;
}

interface OperationsStats {
  active_runs: number;
  queued_tasks: number;
  failed_runs: number;
  open_incidents: number;
  policy_blocks: number;
  avg_trust_score: number;
  sla_breaches?: number;
  escalations?: number;
}

type NumericMetric = number | Record<string, number | undefined> | null | undefined;
type RuntimeActionType = "pause" | "resume" | "stop" | "retry" | "quarantine" | "escalate" | "emergency_pause" | "restricted_mode" | "export_evidence";

interface AnalyticsMetrics {
  failure_rate?: NumericMetric;
  retry_success_rate?: NumericMetric;
  policy_block_rate?: NumericMetric;
  avg_review_time_minutes?: NumericMetric;
  sla_breach_rate?: NumericMetric;
  incident_closure_time_hours?: NumericMetric;
  evidence_completeness_pct?: NumericMetric;
  evidence_completeness?: NumericMetric;
  throughput_per_day?: NumericMetric;
  throughput?: NumericMetric;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string; severity: string }> = {
  SCHEDULED:            { label: "Scheduled",           color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    dot: "bg-blue-400",                       severity: "normal"    },
  QUEUED:               { label: "Queued",              color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   dot: "bg-amber-400",                      severity: "attention" },
  RUNNING:              { label: "Running",             color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400 animate-pulse",       severity: "normal"    },
  WAITING_HUMAN_REVIEW: { label: "Waiting Review",      color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20",  dot: "bg-purple-400",                     severity: "warning"   },
  POLICY_BLOCKED:       { label: "Policy Blocked",      color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    dot: "bg-rose-400",                       severity: "critical"  },
  FAILED:               { label: "Failed",              color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     dot: "bg-red-400",                        severity: "critical"  },
  PAUSED:               { label: "Paused",              color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  dot: "bg-orange-400",                     severity: "warning"   },
  COMPLETED:            { label: "Completed",           color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400",                    severity: "normal"    },
  QUARANTINED:          { label: "Quarantined",         color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    dot: "bg-rose-400",                       severity: "critical"  },
  ESCALATED:            { label: "Escalated",           color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  dot: "bg-orange-400 animate-pulse",       severity: "critical"  },
  RESTRICTED:           { label: "Restricted",          color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  dot: "bg-yellow-400",                     severity: "warning"   },
};

const POLICY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PASS:           { label: "Pass",           color: "text-emerald-400", bg: "bg-emerald-500/10" },
  WARNING:        { label: "Warning",        color: "text-amber-400",   bg: "bg-amber-500/10"   },
  BLOCKED:        { label: "Blocked",        color: "text-rose-400",    bg: "bg-rose-500/10"    },
  PENDING_REVIEW: { label: "Pending Review", color: "text-purple-400",  bg: "bg-purple-500/10"  },
  NOT_APPLICABLE: { label: "N/A",            color: "text-[#555]",      bg: "bg-white/5"        },
};

const EVIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  CAPTURED:     { label: "Captured",     color: "text-emerald-400" },
  PARTIAL:      { label: "Partial",      color: "text-amber-400"   },
  FAILED:       { label: "Failed",       color: "text-rose-400"    },
  LOCKED:       { label: "Locked",       color: "text-blue-400"    },
  EXPORT_READY: { label: "Export Ready", color: "text-indigo-400"  },
};

const INCIDENT_SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "text-rose-400",   bg: "bg-rose-500/10"   },
  high:     { label: "High",     color: "text-orange-400", bg: "bg-orange-500/10" },
  medium:   { label: "Medium",   color: "text-amber-400",  bg: "bg-amber-500/10"  },
  low:      { label: "Low",      color: "text-blue-400",   bg: "bg-blue-500/10"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  if (!date) return "-";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

function formatTimeRemaining(dueAt: string | null): { label: string; overdue: boolean } {
  if (!dueAt) return { label: "", overdue: false };
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff < 0) return { label: "Overdue", overdue: true };
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return { label: `${h}h ${m % 60}m left`, overdue: false };
  return { label: `${m}m left`, overdue: false };
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function metricNumber(metric: NumericMetric, period = "30d"): number | null {
  if (typeof metric === "number") {
    return Number.isFinite(metric) ? metric : null;
  }
  if (metric && typeof metric === "object") {
    const value = metric[period] ?? metric["7d"] ?? metric["24h"];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  return null;
}

function formatPercentMetric(metric: NumericMetric, period = "30d"): string {
  const value = metricNumber(metric, period);
  if (value === null) return "—";
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

function formatUnitMetric(metric: NumericMetric, suffix = "", period = "30d"): string {
  const value = metricNumber(metric, period);
  if (value === null) return "—";
  return `${value}${suffix}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function actionGate(run: AgentRun, action: RuntimeActionType) {
  return run.action_gates?.find((gate) => gate.action === action) || {
    action,
    allowed: Boolean(run.permitted_actions?.includes(action)),
    reason: "Action is not currently permitted",
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:bg-white/5 rounded text-[#555] hover:text-white transition-colors"
      title="Copy ID"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "text-[#888]", bg: "bg-white/5", border: "border-white/10", dot: "bg-gray-400", severity: "normal" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PolicyBadge({ result }: { result: string }) {
  const cfg = POLICY_CONFIG[result] || POLICY_CONFIG.NOT_APPLICABLE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
      <Shield className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function EvidenceBadge({ status }: { status: string }) {
  const cfg = EVIDENCE_CONFIG[status] || { label: status, color: "text-[#555]" };
  return <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function SeverityDot({ severity }: { severity: string }) {
  const map: Record<string, string> = { critical: "bg-rose-400", warning: "bg-orange-400", attention: "bg-amber-400", normal: "bg-emerald-400", blocked: "bg-rose-400" };
  return <span className={`w-2 h-2 rounded-full ${map[severity] || "bg-gray-400"} shrink-0`} />;
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  description: string;
  impactPreview?: string;
  requireReason?: boolean;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmModal({ title, description, impactPreview, requireReason = true, confirmLabel, confirmClass = "bg-rose-500 hover:bg-rose-600", onConfirm, onCancel, loading }: ConfirmModalProps) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b border-[#2a2a2a]">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-sm text-[#888] mt-1">{description}</p>
        </div>
        <div className="p-5 space-y-4">
          {impactPreview && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              <p className="font-semibold mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Impact Preview</p>
              <p>{impactPreview}</p>
            </div>
          )}
          {requireReason && (
            <div>
              <label className="block text-xs text-[#666] mb-1.5">Reason <span className="text-rose-400">*</span></label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white h-20 resize-none focus:outline-none focus:border-[#444] placeholder-[#444]"
                placeholder="Describe reason for this action..."
              />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-1.5 bg-[#2a2a2a] text-[#aaa] rounded-xl text-sm hover:bg-[#333] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={(requireReason && !reason.trim()) || loading}
            className={`px-4 py-1.5 text-white rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center gap-2 ${confirmClass}`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Export Modal ────────────────────────────────────────────────────

function EvidenceExportModal({ bundleId, onConfirm, onCancel, loading }: { bundleId: string; onConfirm: (reason: string) => void; onCancel: () => void; loading?: boolean }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b border-[#2a2a2a]">
          <h3 className="text-base font-bold text-white flex items-center gap-2"><Download className="w-4 h-4 text-indigo-400" /> Export Evidence Bundle</h3>
          <p className="text-xs text-[#888] mt-1 font-mono">Bundle: {shortId(bundleId)}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            This export will be recorded with your identity, timestamp, and stated reason per governance requirements.
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1.5">Export Reason <span className="text-rose-400">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white h-20 resize-none focus:outline-none focus:border-[#444] placeholder-[#444]"
              placeholder="Legal review, audit request, incident investigation..."
            />
          </div>
        </div>
        <div className="p-4 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-1.5 bg-[#2a2a2a] text-[#aaa] rounded-xl text-sm hover:bg-[#333] transition-colors">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || loading}
            className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Export Bundle
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Run Detail Drawer ────────────────────────────────────────────────────────

type DrawerTab = "overview" | "timeline" | "inputs" | "prompt" | "knowledge" | "policy" | "output" | "evidence";

interface RunDetailDrawerProps {
  run: AgentRun;
  detail: RunDetail | null;
  timeline: RunEvent[];
  loadingDetail: boolean;
  loadingTimeline: boolean;
  onClose: () => void;
  onCreateIncident: () => void;
  onExportEvidence: (bundleId: string) => void;
  exportEvidenceLoading: boolean;
  onApproveOutput: (run: AgentRun) => void;
  onRejectOutput: (run: AgentRun) => void;
  onRequestOutputChanges: (run: AgentRun) => void;
  onExportSnapshot: (run: AgentRun, detail: RunDetail) => void;
  onEscalateForReview: (runId: string, reason: string) => Promise<void>;
}

function RunDetailDrawer({
  run,
  detail,
  timeline,
  loadingDetail,
  loadingTimeline,
  onClose,
  onCreateIncident,
  onExportEvidence,
  exportEvidenceLoading,
  onApproveOutput,
  onRejectOutput,
  onRequestOutputChanges,
  onExportSnapshot,
  onEscalateForReview,
}: RunDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [flagStaleLoading, setFlagStaleLoading] = useState<string | null>(null);
  const tabs: { id: DrawerTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",  label: "Overview",  icon: <Info className="w-3.5 h-3.5" />       },
    { id: "timeline",  label: "Timeline",  icon: <Clock className="w-3.5 h-3.5" />      },
    { id: "inputs",    label: "Inputs",    icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: "prompt",    label: "Prompt",    icon: <Hash className="w-3.5 h-3.5" />        },
    { id: "knowledge", label: "Knowledge", icon: <Database className="w-3.5 h-3.5" />   },
    { id: "policy",    label: "Policy",    icon: <Shield className="w-3.5 h-3.5" />      },
    { id: "output",    label: "Output",    icon: <FileText className="w-3.5 h-3.5" />    },
    { id: "evidence",  label: "Evidence",  icon: <Lock className="w-3.5 h-3.5" />        },
  ];

  const statusCfg = STATUS_CONFIG[run.status] || { label: run.status, color: "text-[#888]", bg: "bg-white/5", border: "border-white/10", dot: "bg-gray-400", severity: "normal" };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-end z-50 p-4">
      <div className="bg-[#131313] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl h-[calc(100vh-2rem)] flex flex-col shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-start justify-between p-5 border-b border-[#2a2a2a] shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={run.status} />
              <PolicyBadge result={run.policy_result} />
              <EvidenceBadge status={run.evidence_status} />
            </div>
            <h3 className="text-base font-bold text-white truncate">{run.agent_name}</h3>
            <p className="text-xs text-[#666] truncate mt-0.5">{run.task_objective || run.workflow_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono text-[#444] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{shortId(run.id)}</span>
              <CopyButton text={run.id} />
              {run.environment && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#666] border border-[#2a2a2a]">{run.environment}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-[#555] hover:text-white ml-4 shrink-0">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer tabs */}
        <div className="flex items-center gap-0 px-4 border-b border-[#2a2a2a] overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-[#555] hover:text-[#aaa]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Agent Type",       value: run.agent_type                      },
                  { label: "Agent Version",    value: run.agent_version || "—"             },
                  { label: "Workflow",         value: run.workflow_name                    },
                  { label: "Workflow Version", value: run.workflow_version || "—"          },
                  { label: "Current Step",     value: run.current_step || "—"              },
                  { label: "Trigger Source",   value: run.trigger_source || "—"            },
                  { label: "Owner",            value: run.owner_name                       },
                  { label: "Priority",         value: String(run.priority)                 },
                  { label: "Brand",            value: run.brand_name || "—"                },
                  { label: "Channel",          value: run.channel || "—"                   },
                  { label: "Campaign",         value: run.campaign_name || "—"             },
                  { label: "Environment",      value: run.environment || "—"               },
                  { label: "Started",          value: run.started_at ? new Date(run.started_at).toLocaleString() : "—" },
                  { label: "Due",              value: run.due_at ? new Date(run.due_at).toLocaleString() : "—" },
                ].map((row) => (
                  <div key={row.label} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                    <p className="text-[10px] text-[#555] mb-0.5">{row.label}</p>
                    <p className="text-xs text-white font-medium truncate">{row.value}</p>
                  </div>
                ))}
              </div>
              {run.next_action && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-[10px] text-indigo-400 mb-0.5 font-semibold uppercase tracking-wide">Next Action</p>
                  <p className="text-sm text-white">{run.next_action}</p>
                </div>
              )}
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab === "timeline" && (
            <div>
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-12 gap-3 text-[#555]">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-sm">Loading timeline…</span>
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-center text-[#555] text-sm py-12">No events recorded for this run.</p>
              ) : (
                <div className="relative space-y-0">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="flex items-start gap-3 pb-4">
                      <div className="flex flex-col items-center shrink-0 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[#131313] z-10" />
                        {i < timeline.length - 1 && <span className="w-px flex-1 bg-[#2a2a2a] mt-1 h-full min-h-[1.5rem]" />}
                      </div>
                      <div className="flex-1 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-white font-semibold">{event.event_type.replace(/\./g, " → ")}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-mono text-[#444]">{shortId(event.id)}</span>
                            <CopyButton text={event.id} />
                          </div>
                        </div>
                        <p className="text-[10px] text-[#666] mt-0.5">
                          {event.actor_name}{event.actor_type && ` (${event.actor_type})`}
                          {event.previous_state && ` · ${event.previous_state} → ${event.new_state}`}
                        </p>
                        {event.reason && <p className="text-xs text-[#555] mt-1">{event.reason}</p>}
                        <p className="text-[10px] text-[#3a3a3a] mt-1.5">{new Date(event.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INPUTS ── */}
          {activeTab === "inputs" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[#555]">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-sm">Loading inputs…</span>
                </div>
              ) : detail?.inputs ? (
                Object.entries(detail.inputs).map(([key, val]) => (
                  <div key={key} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                    <p className="text-[10px] text-[#555] mb-1 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-white whitespace-pre-wrap">{typeof val === "string" ? val : JSON.stringify(val, null, 2)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#555] text-center py-12">No input data available.</p>
              )}
            </div>
          )}

          {/* ── PROMPT ── */}
          {activeTab === "prompt" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[#555]">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.prompt_template ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-semibold text-white">Prompt Template</span>
                    </div>
                    {detail.prompt_version && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">v{detail.prompt_version}</span>
                    )}
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 font-mono text-xs text-[#aaa] whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {detail.prompt_template}
                  </div>
                  <a
                    href="/agents/prompts"
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Open Prompt Governance record
                  </a>
                </>
              ) : (
                <p className="text-sm text-[#555] text-center py-12">No prompt data available.</p>
              )}
            </div>
          )}

          {/* ── KNOWLEDGE ── */}
          {activeTab === "knowledge" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[#555]">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.knowledge_sources?.length ? (
                detail.knowledge_sources.map((ks, i) => (
                  <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{ks.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${ks.confidence >= 80 ? "bg-emerald-500/10 text-emerald-400" : ks.confidence >= 60 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {ks.confidence}% confidence
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-[#555]">
                      <span>v{ks.version}</span>
                      <span>Freshness: {ks.freshness}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <a href="/agents/knowledge" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />Open source
                      </a>
                      <button
                        disabled={flagStaleLoading === ks.name}
                        onClick={async () => {
                          setFlagStaleLoading(ks.name);
                          try { await onEscalateForReview(run.id, `Stale knowledge source flagged: ${ks.name}`); }
                          finally { setFlagStaleLoading(null); }
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {flagStaleLoading === ks.name
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <AlertTriangle className="w-3 h-3" />}
                        Flag stale
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#555] text-center py-12">No knowledge sources accessed.</p>
              )}
            </div>
          )}

          {/* ── POLICY ── */}
          {activeTab === "policy" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[#555]">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.policy_results?.length ? (
                detail.policy_results.map((pr) => {
                  const polCfg = POLICY_CONFIG[pr.outcome] || POLICY_CONFIG.NOT_APPLICABLE;
                  return (
                    <div key={pr.id} className={`bg-[#1a1a1a] border rounded-xl p-4 ${pr.outcome === "BLOCKED" ? "border-rose-500/30" : pr.outcome === "WARNING" ? "border-amber-500/30" : "border-[#2a2a2a]"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${polCfg.bg} ${polCfg.color}`}>{polCfg.label}</span>
                        <span className="text-[10px] text-[#555]">{new Date(pr.created_at).toLocaleString()}</span>
                      </div>
                      {pr.failed_rule && (
                        <p className="text-xs text-white mb-1"><span className="text-[#555]">Failed rule:</span> {pr.failed_rule}</p>
                      )}
                      {pr.failed_category && (
                        <p className="text-xs text-white mb-1"><span className="text-[#555]">Category:</span> {pr.failed_category}</p>
                      )}
                      {pr.platform_impact && (
                        <p className="text-xs text-amber-300 mb-1"><span className="text-[#555]">Platform impact:</span> {pr.platform_impact}</p>
                      )}
                      {pr.source_policy && (
                        <p className="text-[10px] text-[#555]">Source policy: {pr.source_policy} {pr.policy_version && `v${pr.policy_version}`}</p>
                      )}
                      {pr.remediation_required && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => onEscalateForReview(run.id, `Policy violation sent to reviewer: ${pr.failed_category || pr.failed_rule || 'policy check'}`)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" />Send to reviewer
                          </button>
                          <button onClick={onCreateIncident} className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1"><Ticket className="w-3 h-3" />Create incident</button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="w-10 h-10 text-emerald-400/20 mx-auto mb-2" />
                  <p className="text-sm text-[#555]">No policy results available.</p>
                </div>
              )}
            </div>
          )}

          {/* ── OUTPUT ── */}
          {activeTab === "output" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[#555]">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.output_snapshot ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">Generated Output</span>
                    {detail.output_status && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1f1f1f] text-[#888] border border-[#2a2a2a]">{detail.output_status}</span>
                    )}
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 text-xs text-[#ccc] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {detail.output_snapshot}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onApproveOutput(run)}
                      className="px-3 py-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => onRejectOutput(run)}
                      className="px-3 py-1.5 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => onRequestOutputChanges(run)}
                      className="px-3 py-1.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Request Changes
                    </button>
                    <button
                      onClick={() => onExportSnapshot(run, detail)}
                      className="px-3 py-1.5 text-xs bg-[#1f1f1f] border border-[#2a2a2a] text-[#888] rounded-lg hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Snapshot
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#555] text-center py-12">No output available yet.</p>
              )}
            </div>
          )}

          {/* ── EVIDENCE ── */}
          {activeTab === "evidence" && (
            <div className="space-y-4">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[#555]">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : (
                <>
                  {detail?.evidence_bundle ? (
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-semibold text-white">Evidence Bundle</span>
                        </div>
                        <EvidenceBadge status={detail.evidence_bundle.status} />
                      </div>
                      {detail.evidence_bundle.hash && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#555]">Hash:</span>
                          <span className="font-mono text-[10px] text-[#888]">{detail.evidence_bundle.hash}</span>
                          <CopyButton text={detail.evidence_bundle.hash} />
                        </div>
                      )}
                      {detail.evidence_bundle.locked_at && (
                        <p className="text-[10px] text-[#555]">Locked: {new Date(detail.evidence_bundle.locked_at).toLocaleString()}</p>
                      )}
                      {detail.evidence_bundle.exported_by && (
                        <p className="text-[10px] text-amber-400">Last exported by {detail.evidence_bundle.exported_by} · {detail.evidence_bundle.exported_at ? new Date(detail.evidence_bundle.exported_at).toLocaleString() : ""}</p>
                      )}
                      <button
                        onClick={() => detail.evidence_bundle?.id && onExportEvidence(detail.evidence_bundle.id)}
                        disabled={exportEvidenceLoading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                      >
                        {exportEvidenceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Export Bundle
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#1a1a1a] border border-amber-500/20 rounded-xl p-4 text-center">
                      <AlertTriangle className="w-8 h-8 text-amber-400/30 mx-auto mb-2" />
                      <p className="text-sm text-amber-400">Evidence capture incomplete</p>
                      <p className="text-xs text-[#555] mt-1">Missing artifacts detected. A remediation task may be required.</p>
                    </div>
                  )}
                  {detail?.approval_chain?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-[#666] mb-2 uppercase tracking-wide">Approval Chain</p>
                      <div className="space-y-2">
                        {detail.approval_chain.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
                            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-white">{a.actor} <span className="text-[#555]">·</span> <span className="text-emerald-400">{a.action}</span></p>
                              {a.reason && <p className="text-[10px] text-[#555] mt-0.5">{a.reason}</p>}
                              <p className="text-[10px] text-[#3a3a3a] mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t border-[#2a2a2a] flex items-center justify-between shrink-0">
          <button
            onClick={onCreateIncident}
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5" /> Create Incident
          </button>
          <button onClick={onClose} className="px-4 py-1.5 bg-[#2a2a2a] text-[#aaa] rounded-xl text-xs hover:bg-[#333] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentOperationsPage() {
  // ── Data state ──
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [realtimeDegraded, setRealtimeDegraded] = useState(false);

  // ── Context bar state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [envFilter, setEnvFilter] = useState("");

  // ── Tabs and filters ──
  const [activeTab, setActiveTab] = useState<"runs" | "queues" | "incidents" | "analytics">("runs");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  // ── Run detail state ──
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runTimeline, setRunTimeline] = useState<RunEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // ── Action modals ──
  const [confirmAction, setConfirmAction] = useState<{
    type: "pause" | "resume" | "stop" | "retry" | "quarantine" | "escalate" | "emergency_pause" | "assign";
    runId: string;
    label: string;
    description: string;
    impactPreview?: string;
    confirmLabel: string;
    confirmClass?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Evidence export ──
  const [evidenceExportBundleId, setEvidenceExportBundleId] = useState<string | null>(null);
  const [evidenceExportLoading, setEvidenceExportLoading] = useState(false);

  // ── Incident modal ──
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ severity: "medium", category: "runtime_error", root_cause: "", remediation: "" });
  const [incidentLoading, setIncidentLoading] = useState(false);

  // ── Stale state check ──
  const staleCheckRef = useRef<Record<string, string>>({});

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    if (initialLoad.current) setLoading(true);
    setError(null);
    try {
      const scopedParams: Record<string, string> = {};
      if (brandFilter) scopedParams.brand = brandFilter;
      if (envFilter) scopedParams.environment = envFilter;
      const params: Record<string, string> = { ...scopedParams, limit: "50" };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [statsRes, runsRes, queuesRes, incidentsRes, analyticsRes] = await Promise.allSettled([
        api.getOperationsStatsScoped(scopedParams).catch(() => null),
        api.listAgentRuns(params).catch(() => null),
        api.listQueues(scopedParams).catch(() => null),
        api.listIncidents(scopedParams).catch(() => null),
        api.getOperationsAnalytics(scopedParams).catch(() => null),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value) setStats(statsRes.value);
      if (runsRes.status === "fulfilled" && runsRes.value?.runs) {
        // Stale check: detect if any run status changed since last render
        const changed = runsRes.value.runs.some(
          (r: AgentRun) => staleCheckRef.current[r.id] && staleCheckRef.current[r.id] !== r.status
        );
        if (changed) setRealtimeDegraded(false);
        staleCheckRef.current = Object.fromEntries(runsRes.value.runs.map((r: AgentRun) => [r.id, r.status]));
        setRuns(runsRes.value.runs);
      }
      if (queuesRes.status === "fulfilled" && queuesRes.value?.items) setQueues(queuesRes.value.items);
      if (incidentsRes.status === "fulfilled" && incidentsRes.value?.incidents) setIncidents(incidentsRes.value.incidents);
      if (analyticsRes.status === "fulfilled" && analyticsRes.value) setAnalytics(analyticsRes.value);

      setLastRefreshed(new Date());
    } catch {
      setError("Failed to load operations data.");
      setRealtimeDegraded(true);
    } finally {
      if (initialLoad.current) {
        setLoading(false);
        initialLoad.current = false;
      }
    }
  }, [statusFilter, brandFilter, envFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const controller = new AbortController();
    let closed = false;

    async function connectOperationsStream() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setRealtimeDegraded(true);
          return;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/api/v1/operations/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          setRealtimeDegraded(true);
          return;
        }
        setRealtimeDegraded(false);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!closed && !controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.includes("event: operations")) {
            await fetchData();
          }
        }
        if (!closed) setRealtimeDegraded(true);
      } catch {
        if (!closed && !controller.signal.aborted) setRealtimeDegraded(true);
      }
    }

    connectOperationsStream();
    return () => {
      closed = true;
      controller.abort();
    };
  }, [fetchData]);

  // ── Open run drawer ──
  const handleViewRun = async (run: AgentRun) => {
    setSelectedRun(run);
    setRunDetail(null);
    setRunTimeline([]);
    setLoadingDetail(true);
    setLoadingTimeline(true);
    try {
      const [detailRes, timelineRes] = await Promise.allSettled([
        api.getRunDetail(run.id).catch(() => null),
        api.getRunTimeline(run.id).catch(() => null),
      ]);
      if (detailRes.status === "fulfilled" && detailRes.value) setRunDetail(detailRes.value);
      if (timelineRes.status === "fulfilled" && timelineRes.value?.events) setRunTimeline(timelineRes.value.events);
    } catch {
      setError("Failed to load run details.");
    } finally {
      setLoadingDetail(false);
      setLoadingTimeline(false);
    }
  };

  // ── Stale check before critical action ──
  const checkStaleAndAct = async (runId: string, action: typeof confirmAction) => {
    try {
      const fresh = await api.getRunDetail(runId).catch(() => null);
      if (fresh?.run?.status && staleCheckRef.current[runId] && fresh.run.status !== staleCheckRef.current[runId]) {
        setError(`Run state changed to "${fresh.run.status}" before action was applied. Please review the current state.`);
        await fetchData();
        return;
      }
    } catch { /* proceed */ }
    setConfirmAction(action);
  };

  // ── Execute confirmed action ──
  const handleConfirmedAction = async (reason: string) => {
    if (!confirmAction) return;
    setActionLoading(confirmAction.runId);
    try {
      switch (confirmAction.type) {
        case "pause":         await api.pauseRun(confirmAction.runId, reason); break;
        case "resume":        await api.resumeRun(confirmAction.runId, reason); break;
        case "stop":          await api.stopRun(confirmAction.runId, reason); break;
        case "retry":         await api.retryRun(confirmAction.runId); break;
        case "quarantine":    await api.quarantineRun(confirmAction.runId, reason); break;
        case "escalate":      await api.escalateRun(confirmAction.runId, reason); break;
        case "emergency_pause": await api.emergencyPause(confirmAction.runId, reason); break;
      }
      setConfirmAction(null);
      await fetchData();
    } catch {
      setError(`Failed to ${confirmAction.type} run. Please try again.`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Evidence export ──
  const handleEvidenceExport = async (reason: string) => {
    if (!evidenceExportBundleId) return;
    setEvidenceExportLoading(true);
    try {
      await api.exportEvidence(evidenceExportBundleId, reason);
      setEvidenceExportBundleId(null);
      setError(null);
    } catch {
      setError("Evidence export failed. Check your permissions.");
    } finally {
      setEvidenceExportLoading(false);
    }
  };

  // ── Create incident ──
  const downloadSnapshot = useCallback((filename: string, payload: string) => {
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleQueueAssign = async (item: QueueItem) => {
    try {
      const res = await api.assignQueueItem(item.id);
      if (!res?.success) throw new Error(res?.error || "Assign failed");
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to assign queue item.");
    }
  };

  const handleQueueHold = async (item: QueueItem) => {
    if (!item.run_id) {
      setError("This queue item is not linked to a runnable task.");
      return;
    }
    try {
      const res = await api.pauseRun(item.run_id, "Held from task queue");
      if (!res?.success) throw new Error(res?.error || "Hold failed");
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to hold queue item.");
    }
  };

  const handleQueueEscalate = async (item: QueueItem) => {
    if (!item.run_id) {
      setError("This queue item is not linked to a runnable task.");
      return;
    }
    const reason = window.prompt("Enter escalation reason:", "Escalated from task queue");
    if (reason === null) return;
    try {
      const res = await api.escalateRun(item.run_id, reason || "Escalated from task queue");
      if (!res?.success) throw new Error(res?.error || "Escalation failed");
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to escalate queue item.");
    }
  };

  const handleQueueCancel = async (item: QueueItem) => {
    if (!item.run_id) {
      setError("This queue item is not linked to a runnable task.");
      return;
    }
    try {
      const res = await api.stopRun(item.run_id, "Cancelled from task queue");
      if (!res?.success) throw new Error(res?.error || "Cancel failed");
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel queue item.");
    }
  };

  const handleEscalateForReview = async (runId: string, reason: string): Promise<void> => {
    try {
      const res = await api.escalateRun(runId, reason);
      if (!res?.success) throw new Error(res?.error || "Escalation failed");
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to escalate for review.");
    }
  };

  const handleApproveOutput = async (run: AgentRun) => {
    try {
      const queueItem = queues.find((item) => item.run_id === run.id && item.status !== "RESOLVED");
      if (queueItem) {
        const res = await api.resolveQueueItem(queueItem.id);
        if (!res?.success) throw new Error(res?.error || "Approval failed");
      }
      await fetchData();
      await handleViewRun(run);
    } catch (err: any) {
      setError(err?.message || "Failed to approve output.");
    }
  };

  const handleRejectOutput = async (run: AgentRun) => {
    try {
      const res = await api.quarantineRun(run.id, "Rejected from output review");
      if (!res?.success) throw new Error(res?.error || "Reject failed");
      await fetchData();
      await handleViewRun(run);
    } catch (err: any) {
      setError(err?.message || "Failed to reject output.");
    }
  };

  const handleRequestOutputChanges = async (run: AgentRun) => {
    try {
      const res = await api.escalateRun(run.id, "Output review requested changes");
      if (!res?.success) throw new Error(res?.error || "Request changes failed");
      await fetchData();
      await handleViewRun(run);
    } catch (err: any) {
      setError(err?.message || "Failed to request changes.");
    }
  };

  const handleExportSnapshot = useCallback(
    (run: AgentRun, detail: RunDetail) => {
      downloadSnapshot(
        `run-output-${run.id}.txt`,
        detail.output_snapshot || "No output snapshot available.",
      );
    },
    [downloadSnapshot],
  );

  const handleCreateIncident = async () => {
    setIncidentLoading(true);
    try {
      await api.createIncident({
        severity: incidentForm.severity,
        category: incidentForm.category,
        root_cause: incidentForm.root_cause,
        remediation: incidentForm.remediation,
        run_id: selectedRun?.id,
      });
      setShowIncidentModal(false);
      setIncidentForm({ severity: "medium", category: "runtime_error", root_cause: "", remediation: "" });
      await fetchData();
    } catch {
      setError("Failed to create incident.");
    } finally {
      setIncidentLoading(false);
    }
  };

  // ── Filtered runs ──
  const filteredRuns = runs.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.agent_name.toLowerCase().includes(q) || r.task_objective?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    }
    return true;
  });

  const criticalCount = runs.filter((r) => r.severity === "critical" || ["FAILED", "POLICY_BLOCKED", "QUARANTINED", "ESCALATED"].includes(r.status)).length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">

      {/* ── Realtime Degraded Banner ── */}
      {realtimeDegraded && (
        <div className="mb-4 p-3 rounded-xl flex items-center justify-between text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Degraded mode — realtime updates unavailable. Last synced: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
          <button onClick={fetchData} className="text-xs px-2.5 py-1 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1">
            <RefreshCcw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Top Command Bar ── */}
      <div className="mb-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-0.5">Agent Operations</h1>
          <p className="text-[#666] text-sm">Live supervision · Runtime intervention · Incident response · Evidence capture</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Context selectors */}
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-7 pr-3 py-1.5 text-xs text-[#aaa] appearance-none focus:outline-none focus:border-[#444]">
              <option value="">All Brands</option>
              {[...new Set(runs.map((r) => r.brand_name).filter(Boolean))].sort().map((b) => (
                <option key={b} value={b!}>{b}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Globe className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-7 pr-3 py-1.5 text-xs text-[#aaa] appearance-none focus:outline-none focus:border-[#444]">
              <option value="">All Envs</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
          {/* Incident shortcut */}
          <button
            onClick={() => setShowIncidentModal(true)}
            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
          >
            <Siren className="w-3.5 h-3.5" /> New Incident
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400">
            <Radio className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-refresh 30s</span>
          </div>
          <button
            onClick={fetchData}
            className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#555] hover:text-white transition-all group"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </div>

      {/* ── Global Search ── */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-[#444] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search runs by agent name, objective, or Run ID…"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#444] transition-colors"
        />
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl flex items-center justify-between gap-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-rose-400/60 hover:text-rose-400"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Operational Health Strip ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
          {[
            { label: "Active Runs",    val: stats.active_runs,    icon: <Activity className="w-3.5 h-3.5" />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Queued",         val: stats.queued_tasks,   icon: <Clock className="w-3.5 h-3.5" />,    color: "text-amber-400",   bg: "bg-amber-500/10"  },
            { label: "Failed",         val: stats.failed_runs,    icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400",      bg: "bg-red-500/10"    },
            { label: "Policy Blocks",  val: stats.policy_blocks,  icon: <Ban className="w-3.5 h-3.5" />,     color: "text-rose-400",     bg: "bg-rose-500/10"   },
            { label: "Open Incidents", val: stats.open_incidents, icon: <Ticket className="w-3.5 h-3.5" />,  color: "text-orange-400",   bg: "bg-orange-500/10" },
            { label: "Escalations",    val: stats.escalations ?? 0, icon: <ArrowUpRight className="w-3.5 h-3.5" />, color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "SLA Breaches",   val: stats.sla_breaches ?? 0, icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-rose-400", bg: "bg-rose-500/10" },
            { label: "Avg Trust",      val: `${stats.avg_trust_score ?? 0}%`, icon: <ShieldCheck className="w-3.5 h-3.5" />, color: (stats.avg_trust_score ?? 0) >= 80 ? "text-emerald-400" : "text-amber-400", bg: (stats.avg_trust_score ?? 0) >= 80 ? "bg-emerald-500/10" : "bg-amber-500/10" },
          ].map((card) => (
            <div key={card.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 flex items-center gap-2.5">
              <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-base font-bold leading-none ${card.color}`}>{card.val}</p>
                <p className="text-[9px] text-[#555] mt-0.5 truncate">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Critical Items Alert ── */}
      {criticalCount > 0 && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400 text-sm">
            <Siren className="w-4 h-4" />
            <span>{criticalCount} critical item{criticalCount > 1 ? "s" : ""} require immediate attention</span>
          </div>
          <button onClick={() => setStatusFilter("FAILED")} className="text-xs px-2.5 py-1 border border-rose-500/30 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors">
            Open Critical Items
          </button>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0 mb-5 border-b border-[#2a2a2a]">
        {[
          { id: "runs",      label: "Agent Runs",  icon: <Bot className="w-3.5 h-3.5" />,           count: runs.length         },
          { id: "queues",    label: "Task Queue",  icon: <Clock className="w-3.5 h-3.5" />,          count: queues.length       },
          { id: "incidents", label: "Incidents",   icon: <AlertTriangle className="w-3.5 h-3.5" />,  count: incidents.length    },
          { id: "analytics", label: "Analytics",   icon: <BarChart3 className="w-3.5 h-3.5" />,      count: 0                   },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "border-indigo-500 text-white" : "border-transparent text-[#555] hover:text-[#aaa]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-[#555]"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: AGENT RUNS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "runs" && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#555]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-1.5 text-xs text-[#aaa] focus:outline-none focus:border-[#444]"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-[#555]">
                <SeverityDot severity="critical" /><span>Critical</span>
                <span className="mx-1.5" />
                <SeverityDot severity="warning" /><span>Warning</span>
                <span className="mx-1.5" />
                <SeverityDot severity="normal" /><span>Normal</span>
              </div>
              <div className="flex items-center border border-[#2a2a2a] rounded-xl overflow-hidden">
                <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-[#aaa]"} transition-colors`}><List className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode("card")} className={`p-1.5 ${viewMode === "card" ? "bg-[#2a2a2a] text-white" : "text-[#555] hover:text-[#aaa]"} transition-colors`}><LayoutGrid className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#555] gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="text-sm">Loading agent runs…</span>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold mb-1">No Active Runs</p>
              <p className="text-[#555] text-sm mb-4">Agent operations are clear. No runs match the current filter.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={() => setStatusFilter("SCHEDULED")} className="text-xs px-3 py-1.5 border border-[#2a2a2a] rounded-xl text-[#666] hover:text-white hover:border-[#444] transition-colors flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" />Scheduled Runs</button>
                <a href="/agents/studio" className="text-xs px-3 py-1.5 border border-[#2a2a2a] rounded-xl text-[#666] hover:text-white hover:border-[#444] transition-colors flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" />Agent Catalog</a>
                <button onClick={() => setStatusFilter("COMPLETED")} className="text-xs px-3 py-1.5 border border-[#2a2a2a] rounded-xl text-[#666] hover:text-white hover:border-[#444] transition-colors flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Recent Completed</button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            /* ── List View ── */
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 border-b border-[#2a2a2a] text-[10px] font-semibold text-[#444] uppercase tracking-wider">
                <span>Run</span>
                <span>Status</span>
                <span>Policy</span>
                <span>Evidence</span>
                <span>SLA</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-[#1f1f1f]">
                {filteredRuns.map((run) => {
                  const statusCfg = STATUS_CONFIG[run.status] || { label: run.status, color: "text-[#888]", bg: "bg-white/5", border: "border-white/10", dot: "bg-gray-400", severity: "normal" };
                  const sla = formatTimeRemaining(run.due_at);
                  return (
                    <div key={run.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3.5 items-center hover:bg-white/[0.02] transition-colors ${run.severity === "critical" ? "border-l-2 border-l-rose-500/50" : run.severity === "warning" ? "border-l-2 border-l-orange-500/30" : ""}`}>
                      {/* Run info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <SeverityDot severity={statusCfg.severity} />
                          <span className="text-sm font-semibold text-white truncate">{run.agent_name}</span>
                          <span className="text-[10px] font-mono text-[#3a3a3a] shrink-0">{shortId(run.id)}</span>
                          <CopyButton text={run.id} />
                        </div>
                        <p className="text-xs text-[#555] truncate pl-4">{run.task_objective || run.workflow_name}</p>
                        <div className="flex items-center gap-2 mt-1 pl-4 flex-wrap">
                          {run.brand_name && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#555] border border-[#2a2a2a]">{run.brand_name}</span>}
                          {run.channel && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f1f1f] text-[#555] border border-[#2a2a2a]">{run.channel}</span>}
                          {run.owner_name && <span className="text-[9px] text-[#444]">@{run.owner_name}</span>}
                          <span className="text-[9px] text-[#3a3a3a]">{timeAgo(run.last_event_at)}</span>
                        </div>
                      </div>
                      {/* Status */}
                      <div><StatusBadge status={run.status} /></div>
                      {/* Policy */}
                      <div><PolicyBadge result={run.policy_result} /></div>
                      {/* Evidence */}
                      <div><EvidenceBadge status={run.evidence_status} /></div>
                      {/* SLA */}
                      <div>
                        {sla.label ? (
                          <span className={`text-xs font-medium ${sla.overdue ? "text-rose-400" : "text-[#666]"}`}>
                            {sla.label}
                          </span>
                        ) : <span className="text-[#333]">—</span>}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleViewRun(run)} className="p-1.5 hover:bg-white/5 rounded-lg text-[#555] hover:text-white transition-colors" title="View Run Detail"><Eye className="w-3.5 h-3.5" /></button>
                        {run.status === "RUNNING" && (
                          <button
                            onClick={() => checkStaleAndAct(run.id, { type: "pause", runId: run.id, label: "Pause Run", description: `Pause "${run.agent_name}"?`, impactPreview: "Agent will halt at current step. In-progress tool calls may be interrupted.", confirmLabel: "Pause Run", confirmClass: "bg-amber-500 hover:bg-amber-600" })}
                            className="p-1.5 hover:bg-amber-500/10 rounded-lg text-amber-400 hover:text-amber-300 transition-colors" title="Pause"><Pause className="w-3.5 h-3.5" /></button>
                        )}
                        {run.status === "PAUSED" && (
                          <button
                            onClick={() => checkStaleAndAct(run.id, { type: "resume", runId: run.id, label: "Resume Run", description: `Resume "${run.agent_name}"? Policy and dependency checks will run.`, confirmLabel: "Resume Run", confirmClass: "bg-emerald-500 hover:bg-emerald-600" })}
                            className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors" title="Resume"><Play className="w-3.5 h-3.5" /></button>
                        )}
                        {["RUNNING", "QUEUED", "PAUSED", "SCHEDULED"].includes(run.status) && (
                          <button
                            onClick={() => checkStaleAndAct(run.id, { type: "stop", runId: run.id, label: "Stop Run", description: `Stop "${run.agent_name}"?`, impactPreview: "Downstream deliveries will be cancelled. Output will be invalidated.", confirmLabel: "Stop Run" })}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors" title="Stop"><Square className="w-3.5 h-3.5" /></button>
                        )}
                        {run.status === "FAILED" && (
                          <button
                            onClick={() => checkStaleAndAct(run.id, { type: "retry", runId: run.id, label: "Retry Run", description: `Retry "${run.agent_name}"? Original failure evidence is preserved. A new linked attempt will be created.`, confirmLabel: "Retry Run", confirmClass: "bg-blue-500 hover:bg-blue-600", requireReason: false } as typeof confirmAction)}
                            className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-400 hover:text-blue-300 transition-colors" title="Retry"><RotateCcw className="w-3.5 h-3.5" /></button>
                        )}
                        {["RUNNING", "COMPLETED", "FAILED"].includes(run.status) && (
                          <button
                            onClick={() => checkStaleAndAct(run.id, { type: "quarantine", runId: run.id, label: "Quarantine Output", description: `Quarantine "${run.agent_name}" output?`, impactPreview: "Output locked. Publishing blocked. Visibility restricted. Evidence event created.", confirmLabel: "Quarantine", confirmClass: "bg-rose-600 hover:bg-rose-700" })}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors" title="Quarantine"><ShieldX className="w-3.5 h-3.5" /></button>
                        )}
                        <button
                          onClick={() => checkStaleAndAct(run.id, { type: "escalate", runId: run.id, label: "Escalate", description: `Escalate "${run.agent_name}"? An escalation record with severity and notification routing will be created.`, confirmLabel: "Escalate", confirmClass: "bg-orange-500 hover:bg-orange-600" })}
                          className="p-1.5 hover:bg-orange-500/10 rounded-lg text-orange-400 hover:text-orange-300 transition-colors" title="Escalate"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Card View ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRuns.map((run) => {
                const sla = formatTimeRemaining(run.due_at);
                return (
                  <div key={run.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 hover:border-[#333] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityDot severity={STATUS_CONFIG[run.status]?.severity || "normal"} />
                          <p className="text-sm font-bold text-white truncate">{run.agent_name}</p>
                        </div>
                        <p className="text-xs text-[#555] truncate pl-4">{run.task_objective || run.workflow_name}</p>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <PolicyBadge result={run.policy_result} />
                      <EvidenceBadge status={run.evidence_status} />
                      {sla.label && <span className={`text-[10px] font-medium ${sla.overdue ? "text-rose-400" : "text-[#555]"}`}>{sla.label}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#444]">
                        {run.brand_name && <span>{run.brand_name}</span>}
                        {run.channel && <><span>·</span><span>{run.channel}</span></>}
                        <span>·</span><span>{timeAgo(run.last_event_at)}</span>
                      </div>
                      <button onClick={() => handleViewRun(run)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: TASK QUEUE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "queues" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#555]">{queues.length} item{queues.length !== 1 ? "s" : ""} in queue</p>
          </div>
          {queues.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold mb-1">Queue Empty</p>
              <p className="text-[#555] text-sm">No pending tasks in the queue.</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-[#2a2a2a] text-[10px] font-semibold text-[#444] uppercase tracking-wider">
                <span>Task</span>
                <span>Priority</span>
                <span>Assignee</span>
                <span>SLA</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-[#1f1f1f]">
                {queues.map((item) => {
                  const sla = formatTimeRemaining(item.due_at);
                  return (
                    <div key={item.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3.5 items-center hover:bg-white/[0.02] transition-colors ${item.sla_breached ? "border-l-2 border-l-rose-500/50" : ""}`}>
                      <div>
                        <p className="text-sm font-medium text-white">{item.queue_type.replace(/_/g, " ")}</p>
                        <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded mt-1 ${item.status === "PENDING" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {item.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-white px-2 py-0.5 rounded bg-[#1f1f1f] border border-[#2a2a2a]">{item.priority}</span>
                      <div>
                        {item.assignee_name ? (
                          <span className="text-xs text-[#888]">{item.assignee_name}</span>
                        ) : (
                          <span className="text-xs text-amber-400">Unassigned</span>
                        )}
                        {item.claimed_by && <p className="text-[9px] text-[#444]">Claimed: {item.claimed_by}</p>}
                      </div>
                      <div>
                        {sla.label ? (
                          <span className={`text-xs ${sla.overdue ? "text-rose-400 font-semibold" : "text-[#666]"}`}>{sla.label}</span>
                        ) : <span className="text-[#333]">—</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleQueueAssign(item)} className="p-1.5 hover:bg-white/5 rounded-lg text-[#555] hover:text-white transition-colors" title="Assign"><UserCheck className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleQueueHold(item)} className="p-1.5 hover:bg-amber-500/10 rounded-lg text-amber-400/70 hover:text-amber-400 transition-colors" title="Hold"><Pause className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleQueueEscalate(item)} className="p-1.5 hover:bg-orange-500/10 rounded-lg text-orange-400/70 hover:text-orange-400 transition-colors" title="Escalate"><ArrowUpRight className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleQueueCancel(item)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400/70 hover:text-rose-400 transition-colors" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: INCIDENTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "incidents" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#555]">{incidents.length} open incident{incidents.length !== 1 ? "s" : ""}</p>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <Siren className="w-3.5 h-3.5" /> Create Incident
            </button>
          </div>
          {incidents.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-10 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold mb-1">No Open Incidents</p>
              <p className="text-[#555] text-sm">All operations are running within normal parameters.</p>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              <div className="divide-y divide-[#1f1f1f]">
                {incidents.map((incident) => {
                  const sevCfg = INCIDENT_SEVERITY[incident.severity] || { label: incident.severity, color: "text-gray-400", bg: "bg-white/5" };
                  return (
                    <div key={incident.id} className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <AlertTriangle className={`w-4 h-4 ${sevCfg.color} shrink-0 mt-0.5`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{incident.category.replace(/_/g, " ")}</p>
                            <p className="text-xs text-[#555] mt-0.5">
                              {incident.run_name} · Created by {incident.created_by_name} · {timeAgo(incident.created_at)}
                            </p>
                            {incident.root_cause && <p className="text-xs text-[#444] mt-1 truncate">{incident.root_cause}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sevCfg.bg} ${sevCfg.color}`}>{sevCfg.label}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${incident.status === "OPEN" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            {incident.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          {analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Failure Rate",           val: formatPercentMetric(analytics.failure_rate),                                       icon: <XCircle className="w-4 h-4" />,        color: "text-red-400",    bg: "bg-red-500/10",    trend: "down"    },
                  { label: "Retry Success Rate",     val: formatPercentMetric(analytics.retry_success_rate),                                 icon: <RotateCcw className="w-4 h-4" />,    color: "text-blue-400",   bg: "bg-blue-500/10",   trend: "up"      },
                  { label: "Policy Block Rate",      val: formatPercentMetric(analytics.policy_block_rate),                                  icon: <Ban className="w-4 h-4" />,          color: "text-rose-400",   bg: "bg-rose-500/10",   trend: "down"    },
                  { label: "Avg Review Time",        val: formatUnitMetric(analytics.avg_review_time_minutes, "m"),                          icon: <Clock className="w-4 h-4" />,        color: "text-amber-400",  bg: "bg-amber-500/10",  trend: "down"    },
                  { label: "SLA Breach Rate",        val: formatPercentMetric(analytics.sla_breach_rate),                                    icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-400", bg: "bg-orange-500/10", trend: "down"    },
                  { label: "Incident Closure Time",  val: formatUnitMetric(analytics.incident_closure_time_hours, "h"),                      icon: <Ticket className="w-4 h-4" />,       color: "text-purple-400", bg: "bg-purple-500/10", trend: "down"    },
                  { label: "Evidence Completeness",  val: formatPercentMetric(analytics.evidence_completeness_pct ?? analytics.evidence_completeness), icon: <Lock className="w-4 h-4" />,         color: "text-indigo-400", bg: "bg-indigo-500/10", trend: "up"      },
                  { label: "Throughput / Day",       val: formatUnitMetric(analytics.throughput_per_day ?? analytics.throughput, ""),         icon: <Activity className="w-4 h-4" />,     color: "text-emerald-400",bg: "bg-emerald-500/10",trend: "up"      },
                ].map((m) => (
                  <div key={m.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-7 h-7 ${m.bg} rounded-lg flex items-center justify-center ${m.color}`}>{m.icon}</div>
                      {m.trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400/50" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400/50" />}
                    </div>
                    <p className={`text-xl font-bold ${m.color}`}>{m.val}</p>
                    <p className="text-[10px] text-[#555] mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (!analytics) return;
                    const payload = { exported_at: new Date().toISOString(), metrics: analytics };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `ops-analytics-${new Date().toISOString().split("T")[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-xl text-xs hover:text-white hover:border-[#444] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export Report
                </button>
              </div>
            </>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-10 text-center">
              <BarChart3 className="w-12 h-12 text-[#2a2a2a] mx-auto mb-3" />
              <p className="text-[#555] font-medium mb-1">Analytics loading…</p>
              <p className="text-[#3a3a3a] text-sm">Throughput, failure rates, SLA metrics, evidence completeness, and escalation trends will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RUN DETAIL DRAWER
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedRun && (
        <RunDetailDrawer
          run={selectedRun}
          detail={runDetail}
          timeline={runTimeline}
          loadingDetail={loadingDetail}
          loadingTimeline={loadingTimeline}
          onClose={() => { setSelectedRun(null); setRunDetail(null); setRunTimeline([]); }}
          onCreateIncident={() => setShowIncidentModal(true)}
          onExportEvidence={(bundleId) => setEvidenceExportBundleId(bundleId)}
          exportEvidenceLoading={evidenceExportLoading}
          onApproveOutput={handleApproveOutput}
          onRejectOutput={handleRejectOutput}
          onRequestOutputChanges={handleRequestOutputChanges}
          onExportSnapshot={handleExportSnapshot}
          onEscalateForReview={handleEscalateForReview}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CONFIRM ACTION MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.label}
          description={confirmAction.description}
          impactPreview={confirmAction.impactPreview}
          requireReason={confirmAction.type !== "retry"}
          confirmLabel={confirmAction.confirmLabel}
          confirmClass={confirmAction.confirmClass}
          onConfirm={handleConfirmedAction}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading === confirmAction.runId}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          EVIDENCE EXPORT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {evidenceExportBundleId && (
        <EvidenceExportModal
          bundleId={evidenceExportBundleId}
          onConfirm={handleEvidenceExport}
          onCancel={() => setEvidenceExportBundleId(null)}
          loading={evidenceExportLoading}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE INCIDENT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-[#2a2a2a]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Siren className="w-4 h-4 text-rose-400" /> Create Incident
              </h3>
              {selectedRun && <p className="text-xs text-[#555] mt-1">Linked to: {selectedRun.agent_name}</p>}
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#555] mb-1.5">Severity <span className="text-rose-400">*</span></label>
                <select
                  value={incidentForm.severity}
                  onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#444]"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#555] mb-1.5">Category <span className="text-rose-400">*</span></label>
                <select
                  value={incidentForm.category}
                  onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#444]"
                >
                  <option value="runtime_error">Runtime Error</option>
                  <option value="policy_violation">Policy Violation</option>
                  <option value="platform_breach">Platform Breach</option>
                  <option value="hallucination">Suspected Hallucination</option>
                  <option value="brand_violation">Brand Violation</option>
                  <option value="integration_failure">Integration Failure</option>
                  <option value="unauthorized_action">Unauthorized Action</option>
                  <option value="unsafe_content">Unsafe Content Risk</option>
                  <option value="autonomy_breach">Autonomy Boundary Breach</option>
                  <option value="knowledge_grounding">Knowledge Grounding Failure</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#555] mb-1.5">Root Cause <span className="text-rose-400">*</span></label>
                <textarea
                  value={incidentForm.root_cause}
                  onChange={(e) => setIncidentForm({ ...incidentForm, root_cause: e.target.value })}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white h-20 resize-none focus:outline-none focus:border-[#444] placeholder-[#3a3a3a]"
                  placeholder="Describe what failed and why…"
                />
              </div>
              <div>
                <label className="block text-xs text-[#555] mb-1.5">Initial Remediation Plan</label>
                <textarea
                  value={incidentForm.remediation}
                  onChange={(e) => setIncidentForm({ ...incidentForm, remediation: e.target.value })}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white h-16 resize-none focus:outline-none focus:border-[#444] placeholder-[#3a3a3a]"
                  placeholder="Initial remediation steps…"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
              <button onClick={() => setShowIncidentModal(false)} className="px-4 py-1.5 bg-[#2a2a2a] text-[#aaa] rounded-xl text-sm hover:bg-[#333] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateIncident}
                disabled={!incidentForm.root_cause.trim() || incidentLoading}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {incidentLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

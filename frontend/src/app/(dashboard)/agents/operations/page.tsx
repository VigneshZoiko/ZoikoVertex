"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bot,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  Eye,
  Clock3,
  Download,
  Ban,
  Trash2,
  Search,
  ChevronDown,
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
  Minus,
  Lock,
  Unlock,
  UserCheck,
  Radio,
  CheckSquare,
  WifiOff,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import ConfirmActionModal from "@/components/ConfirmActionModal";

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
  // Who published the run: the agent (auto, after passing all checks) or the
  // human who approved it from the Approval Console.
  posted_by?: string | null;
  posted_by_type?: "agent" | "manual" | null;
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
  check_category?: string;
  remediation_path?: string;
  platform?: string;
  notes?: string;
  remediation_required: boolean;
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

interface OperationsStats {
  active_runs: number;
  successful_runs?: number;
  queued_tasks: number;
  failed_runs: number;
  policy_blocks: number;
  avg_trust_score: number;
  operations_health_score?: number;
  total_runs?: number;
  quarantined_runs?: number;
}

type RuntimeActionType = "pause" | "resume" | "stop" | "retry" | "quarantine" | "escalate" | "emergency_pause" | "restricted_mode" | "export_evidence" | "hold" | "release_hold";

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
  NOT_EVALUATED:  { label: "Not Evaluated",  color: "text-gray-400",    bg: "bg-gray-500/10"     },
  PENDING_REVIEW: { label: "Pending Review", color: "text-purple-400",  bg: "bg-purple-500/10"  },
  NOT_APPLICABLE: { label: "N/A",            color: "text-foreground-muted",      bg: "bg-surface"        },
};

// Keyed by the UPPER-CASED evidence_status. The backend stores these lower-case
// (pending, capturing, captured, partial, failed, locked, export_ready), so the
// badge normalizes the case before lookup — otherwise the indicator renders as
// raw, unstyled text.
const EVIDENCE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:      { label: "Pending",      color: "text-foreground-muted", dot: "bg-gray-400"                  },
  CAPTURING:    { label: "Capturing",    color: "text-sky-400",          dot: "bg-sky-400 animate-pulse"     },
  CAPTURED:     { label: "Captured",     color: "text-emerald-400",      dot: "bg-emerald-400"               },
  PARTIAL:      { label: "Partial",      color: "text-amber-400",        dot: "bg-amber-400"                 },
  FAILED:       { label: "Failed",       color: "text-rose-400",         dot: "bg-rose-400"                  },
  LOCKED:       { label: "Locked",       color: "text-blue-400",         dot: "bg-blue-400"                  },
  EXPORT_READY: { label: "Export Ready", color: "text-indigo-400",       dot: "bg-indigo-400"                },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:bg-surface-hover rounded text-foreground-muted hover:text-foreground transition-colors"
      title="Copy ID"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "text-foreground-muted", bg: "bg-surface", border: "border-white/10", dot: "bg-gray-400", severity: "normal" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PolicyBadge({ result }: { result: string }) {
  const cfg = POLICY_CONFIG[String(result || "").toUpperCase()] || POLICY_CONFIG.NOT_APPLICABLE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
      <Shield className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function EvidenceBadge({ status }: { status: string }) {
  const key = String(status || "").toUpperCase();
  // Normalize case before lookup so lower-case backend values match. Unknown or
  // empty values fall back to a humanized label + neutral dot so the indicator
  // always shows something legible instead of raw text or a blank cell.
  const cfg =
    EVIDENCE_CONFIG[key] ||
    { label: status ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—", color: "text-foreground-muted", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  );
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
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Bring the dialog into view automatically so the user never has to scroll
  // to find it (a transformed ancestor can otherwise offset a fixed overlay).
  useEffect(() => {
    const id = window.setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Move focus into the dialog for keyboard users.
      (textareaRef.current ?? cardRef.current)?.focus();
    }, 30);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => { if (e.key === "Escape" && !loading) onCancel(); }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div ref={cardRef} tabIndex={-1} className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl focus:outline-none">
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-foreground-muted mt-1">{description}</p>
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
              <label className="block text-xs text-foreground-muted mb-1.5">Reason <span className="text-rose-400">*</span> <span className="text-foreground-muted">(minimum 8 characters)</span></label>
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full bg-background border rounded-xl px-3 py-2 text-sm text-foreground h-20 resize-none focus:outline-none placeholder-foreground-muted ${reason.trim().length > 0 && reason.trim().length < 8 ? "border-amber-500/60 focus:border-amber-500" : "border-border focus:border-border"}`}
                placeholder="Describe reason for this action (at least 8 characters)..."
              />
              <p className={`mt-1 text-xs ${reason.trim().length < 8 ? "text-amber-400" : "text-emerald-400"}`}>
                {reason.trim().length < 8
                  ? `At least 8 characters required — ${8 - reason.trim().length} more to go (${reason.trim().length}/8).`
                  : `Reason looks good (${reason.trim().length} characters).`}
              </p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-1.5 bg-surface text-foreground-muted rounded-xl text-sm hover:bg-surface-hover hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={(requireReason && reason.trim().length < 8) || loading}
            className={`px-4 py-1.5 text-foreground rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center gap-2 ${confirmClass}`}
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
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      (textareaRef.current ?? cardRef.current)?.focus();
    }, 30);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Export Evidence Bundle"
      onKeyDown={(e) => { if (e.key === "Escape" && !loading) onCancel(); }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div ref={cardRef} tabIndex={-1} className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl focus:outline-none">
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2"><Download className="w-4 h-4 text-indigo-400" /> Export Evidence Bundle</h3>
          <p className="text-xs text-foreground-muted mt-1 font-mono">Bundle: {shortId(bundleId)}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            This export will be recorded with your identity, timestamp, and stated reason per governance requirements.
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1.5">Export Reason <span className="text-rose-400">*</span> <span className="text-foreground-muted">(minimum 8 characters)</span></label>
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full bg-background border rounded-xl px-3 py-2 text-sm text-foreground h-20 resize-none focus:outline-none placeholder-foreground-muted ${reason.trim().length > 0 && reason.trim().length < 8 ? "border-amber-500/60 focus:border-amber-500" : "border-border focus:border-border"}`}
              placeholder="Legal review, audit request, incident investigation..."
            />
            <p className={`mt-1 text-xs ${reason.trim().length < 8 ? "text-amber-400" : "text-emerald-400"}`}>
              {reason.trim().length < 8
                ? `At least 8 characters required — ${8 - reason.trim().length} more to go (${reason.trim().length}/8).`
                : `Reason looks good (${reason.trim().length} characters).`}
            </p>
          </div>
          <div className="p-4 border-t border-border flex items-center justify-end gap-2">
            <button onClick={onCancel} className="px-4 py-1.5 bg-surface text-foreground-muted rounded-xl text-sm hover:bg-surface-hover transition-colors">Cancel</button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={reason.trim().length < 8 || loading}
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-foreground rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
            >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Export Bundle
          </button>
        </div>
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
  onExportEvidence: (bundleId: string) => void;
  exportEvidenceLoading: boolean;
  onApproveOutput: (run: AgentRun) => void;
  onRejectOutput: (run: AgentRun) => void;
  onRequestOutputChanges: (run: AgentRun) => void;
  onExportSnapshot: (run: AgentRun, detail: RunDetail) => void;
  onEscalateForReview: (runId: string, reason: string) => Promise<void>;
  onRunPolicyCheck: (runId: string) => void;
  policyCheckLoading: boolean;
}

function RunDetailDrawer({
  run,
  detail,
  timeline,
  loadingDetail,
  loadingTimeline,
  onClose,
  onExportEvidence,
  exportEvidenceLoading,
  onApproveOutput,
  onRejectOutput,
  onRequestOutputChanges,
  onExportSnapshot,
  onEscalateForReview,
  onRunPolicyCheck,
  policyCheckLoading,
}: RunDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [flagStaleLoading, setFlagStaleLoading] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 30);
    return () => window.clearTimeout(id);
  }, []);
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

  const statusCfg = STATUS_CONFIG[run.status] || { label: run.status, color: "text-foreground-muted", bg: "bg-surface", border: "border-white/10", dot: "bg-gray-400", severity: "normal" };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-end z-50"
      style={{ padding: "var(--app-header-height, 64px) 1rem 1rem 1rem" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Run detail: ${run.agent_name || run.id}`}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={cardRef} tabIndex={-1} className="bg-background border border-border rounded-2xl w-full max-w-2xl h-[calc(100vh-var(--app-header-height)-1rem)] flex flex-col shadow-2xl focus:outline-none">
        {/* Drawer header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={run.status} />
              <PolicyBadge result={run.policy_result} />
              <EvidenceBadge status={run.evidence_status} />
            </div>
            <h3 className="text-base font-bold text-foreground truncate">{run.agent_name}</h3>
            <p className="text-xs text-foreground-muted truncate mt-0.5">{run.task_objective || run.workflow_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono text-foreground-muted bg-card px-1.5 py-0.5 rounded">{shortId(run.id)}</span>
              <CopyButton text={run.id} />
              {run.environment && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-foreground-muted border border-border">{run.environment}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-xl text-foreground-muted hover:text-foreground ml-4 shrink-0">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer tabs */}
        <div className="flex items-center gap-0 px-4 border-b border-border overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.id ? "border-indigo-500 text-foreground" : "border-transparent text-foreground-muted hover:text-foreground-muted"
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
                  { label: "Agent Type",       value: run.agent_type, link: run.agent_id ? `/agents/studio?id=${run.agent_id}` : undefined },
                  { label: "Agent Version",    value: run.agent_version || "—", link: run.agent_id ? `/agents/studio?id=${run.agent_id}` : undefined },
                  { label: "Workflow",         value: run.workflow_name, link: `/agents/workflows` },
                  { label: "Workflow Version", value: run.workflow_version || "—", link: `/agents/workflows` },
                  { label: "Current Step",     value: run.current_step || "—" },
                  { label: "Trigger Source",   value: run.trigger_source || "—" },
                  { label: "Owner",            value: run.owner_name },
                  { label: "Priority",         value: String(run.priority) },
                  { label: "Brand",            value: run.brand_name || "—" },
                  { label: "Channel",          value: run.channel || "—" },
                  { label: "Campaign",         value: run.campaign_name || "—" },
                  { label: "Environment",      value: run.environment || "—" },
                  { label: "Started",          value: run.started_at ? new Date(run.started_at).toLocaleString() : "—" },
                  { label: "Due",              value: run.due_at ? new Date(run.due_at).toLocaleString() : "—" },
                ].map((row) => (
                  <div key={row.label} className="bg-card rounded-xl p-3 border border-border">
                    <p className="text-[10px] text-foreground-muted mb-0.5">{row.label}</p>
                    {row.link ? (
                      <a href={row.link} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium truncate underline underline-offset-2 decoration-[#333] hover:decoration-indigo-500/40 block">{row.value}</a>
                    ) : (
                      <p className="text-xs text-foreground font-medium truncate">{row.value}</p>
                    )}
                  </div>
                ))}
              </div>
              {run.next_action && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-[10px] text-indigo-400 mb-0.5 font-semibold uppercase tracking-wide">Next Action</p>
                  <p className="text-sm text-foreground">{run.next_action}</p>
                </div>
              )}
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab === "timeline" && (
            <div>
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-12 gap-3 text-foreground-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-sm">Loading timeline…</span>
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-center text-foreground-muted text-sm py-12">No events recorded for this run.</p>
              ) : (
                <div className="relative space-y-0">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="flex items-start gap-3 pb-4">
                      <div className="flex flex-col items-center shrink-0 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background z-10" />
                        {i < timeline.length - 1 && <span className="w-px flex-1 bg-surface mt-1 h-full min-h-[1.5rem]" />}
                      </div>
                      <div className="flex-1 bg-card rounded-xl p-3 border border-border">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-foreground font-semibold">{event.event_type.replace(/\./g, " → ")}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-mono text-foreground-muted">{shortId(event.id)}</span>
                            <CopyButton text={event.id} />
                          </div>
                        </div>
                        <p className="text-[10px] text-foreground-muted mt-0.5">
                          {event.actor_name}{event.actor_type && ` (${event.actor_type})`}
                          {event.previous_state && ` · ${event.previous_state} → ${event.new_state}`}
                        </p>
                        {event.reason && <p className="text-xs text-foreground-muted mt-1">{event.reason}</p>}
                        <p className="text-[10px] text-foreground-muted mt-1.5">{new Date(event.created_at).toLocaleString()}</p>
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
                <div className="flex items-center justify-center py-12 gap-2 text-foreground-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-sm">Loading inputs…</span>
                </div>
              ) : detail?.inputs ? (
                Object.entries(detail.inputs).map(([key, val]) => (
                  <div key={key} className="bg-card border border-border rounded-xl p-3">
                    <p className="text-[10px] text-foreground-muted mb-1 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{typeof val === "string" ? val : JSON.stringify(val, null, 2)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground-muted text-center py-12">No input data available.</p>
              )}
            </div>
          )}

          {/* ── PROMPT ── */}
          {activeTab === "prompt" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-foreground-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.prompt_template ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-semibold text-foreground">Prompt Template</span>
                    </div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 font-mono text-xs text-foreground-muted whitespace-pre-wrap max-h-64 overflow-y-auto">
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
                <p className="text-sm text-foreground-muted text-center py-12">No prompt data available.</p>
              )}
            </div>
          )}

          {/* ── KNOWLEDGE ── */}
          {activeTab === "knowledge" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-foreground-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.knowledge_sources?.length ? (
                detail.knowledge_sources.map((ks, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground">{ks.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${ks.confidence >= 80 ? "bg-emerald-500/10 text-emerald-400" : ks.confidence >= 60 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {ks.confidence}% confidence
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-foreground-muted">
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
                <p className="text-sm text-foreground-muted text-center py-12">No knowledge sources accessed.</p>
              )}
            </div>
          )}

          {/* ── POLICY ── */}
          {activeTab === "policy" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground-muted">Policy & platform-safety checks</p>
                <button
                  onClick={() => onRunPolicyCheck(run.id)}
                  disabled={policyCheckLoading}
                  className="px-2.5 py-1 text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {policyCheckLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  Run Policy Check
                </button>
              </div>
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-foreground-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.policy_results?.length ? (
                detail.policy_results.map((pr) => {
                  const outcomeKey = String(pr.outcome || "").toUpperCase();
                  const polCfg = POLICY_CONFIG[outcomeKey] || POLICY_CONFIG.NOT_APPLICABLE;
                  return (
                    <div key={pr.id} className={`bg-card border rounded-xl p-4 ${outcomeKey === "BLOCKED" ? "border-rose-500/30" : outcomeKey === "WARNING" ? "border-amber-500/30" : "border-border"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${polCfg.bg} ${polCfg.color}`}>{polCfg.label}</span>
                        <span className="text-[10px] text-foreground-muted">{new Date(pr.created_at).toLocaleString()}</span>
                      </div>
                      {pr.failed_rule && (
                        <p className="text-xs text-foreground mb-1"><span className="text-foreground-muted">Failed rule:</span> {pr.failed_rule}</p>
                      )}
                      {pr.check_category && (
                        <p className="text-xs text-foreground mb-1"><span className="text-foreground-muted">Category:</span> {pr.check_category}</p>
                      )}
                      {pr.platform && (
                        <p className="text-xs text-foreground mb-1"><span className="text-foreground-muted">Platform:</span> {pr.platform}</p>
                      )}
                      {pr.remediation_path && (
                        <p className="text-xs text-amber-300 mb-1"><span className="text-foreground-muted">Remediation:</span> {pr.remediation_path}</p>
                      )}
                      {(pr.notes || pr.policy_version) && (
                        <p className="text-[10px] text-foreground-muted">Source policy: {pr.notes || "policy"} {pr.policy_version && `v${pr.policy_version}`}</p>
                      )}
                      {pr.remediation_required && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => onEscalateForReview(run.id, `Policy violation sent to reviewer: ${pr.check_category || pr.failed_rule || 'policy check'}`)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" />Send to reviewer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="w-10 h-10 text-emerald-400/20 mx-auto mb-2" />
                  <p className="text-sm text-foreground-muted">No policy results available.</p>
                </div>
              )}
            </div>
          )}

          {/* ── OUTPUT ── */}
          {activeTab === "output" && (
            <div className="space-y-3">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-foreground-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : detail?.output_snapshot ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">Generated Output</span>
                    {detail.output_status && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface text-foreground-muted border border-border">{detail.output_status}</span>
                    )}
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4 text-xs text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
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
                      className="px-3 py-1.5 text-xs bg-surface border border-border text-foreground-muted rounded-lg hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Snapshot
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-foreground-muted text-center py-12">No output available yet.</p>
              )}
            </div>
          )}

          {/* ── EVIDENCE ── */}
          {activeTab === "evidence" && (
            <div className="space-y-4">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12 gap-2 text-foreground-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
              ) : (
                <>
                  {detail?.evidence_bundle ? (
                    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-semibold text-foreground">Evidence Bundle</span>
                        </div>
                        <EvidenceBadge status={detail.evidence_bundle.status} />
                      </div>
                      {detail.evidence_bundle.hash && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground-muted">Hash:</span>
                          <span className="font-mono text-[10px] text-foreground-muted">{detail.evidence_bundle.hash}</span>
                          <CopyButton text={detail.evidence_bundle.hash} />
                        </div>
                      )}
                      {detail.evidence_bundle.id && (
                        <a href={`/evidence/evidence-vault/items/${detail.evidence_bundle.id}`} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2 decoration-[#333] hover:decoration-indigo-500/40">
                          <ArrowRight className="w-3 h-3" /> Open in Evidence Vault
                        </a>
                      )}
                      {detail.evidence_bundle.locked_at && (
                        <p className="text-[10px] text-foreground-muted">Locked: {new Date(detail.evidence_bundle.locked_at).toLocaleString()}</p>
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
                    <div className="bg-card border border-amber-500/20 rounded-xl p-4 text-center">
                      <AlertTriangle className="w-8 h-8 text-amber-400/30 mx-auto mb-2" />
                      <p className="text-sm text-amber-400">Evidence capture incomplete</p>
                      <p className="text-xs text-foreground-muted mt-1">Missing artifacts detected. A remediation task may be required.</p>
                    </div>
                  )}
                  {detail?.approval_chain?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-foreground-muted mb-2 uppercase tracking-wide">Approval Chain</p>
                      <div className="space-y-2">
                        {detail.approval_chain.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl p-3">
                            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-foreground">{a.actor} <span className="text-foreground-muted">·</span> <span className="text-emerald-400">{a.action}</span></p>
                              {a.reason && <p className="text-[10px] text-foreground-muted mt-0.5">{a.reason}</p>}
                              <p className="text-[10px] text-foreground-muted mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
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
        <div className="p-4 border-t border-border flex items-center justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 bg-surface text-foreground-muted rounded-xl text-xs hover:bg-surface-hover transition-colors">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);
  const initialLoad = useRef(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [realtimeDegraded, setRealtimeDegraded] = useState(false);

  // ── Context bar state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [envFilter, setEnvFilter] = useState("");

  // ── Tabs and filters ──
  const [activeTab, setActiveTab] = useState<"runs" | "queues">("runs");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  // Doc 6 §2/§3: queue segmentation by type (approval, failed, retry, human-review, publishing, exception …)
  const [queueTypeFilter, setQueueTypeFilter] = useState<string>("ALL");

  // ── Pagination + sorting (server-side; bounds rendered rows) ──
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [sortBy, setSortBy] = useState<"created_at" | "last_event_at" | "due_at" | "priority" | "severity" | "status">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Saved operational views (persisted filter sets) ──
  type SavedView = { name: string; status: string; brand: string; env: string; search: string; sortBy: string; sortDir: "asc" | "desc"; dateFrom: string; dateTo: string };
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem("ops_saved_views"); if (raw) setSavedViews(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);
  const persistViews = useCallback((views: SavedView[]) => {
    setSavedViews(views);
    try { localStorage.setItem("ops_saved_views", JSON.stringify(views)); } catch { /* ignore */ }
  }, []);
  const applySavedView = (name: string) => {
    const v = savedViews.find((x) => x.name === name);
    if (!v) return;
    setStatusFilter(v.status);
    setBrandFilter(v.brand);
    setEnvFilter(v.env);
    setSearchQuery(v.search);
    setSortBy(v.sortBy as typeof sortBy);
    setSortDir(v.sortDir);
    setDateFrom(v.dateFrom);
    setDateTo(v.dateTo);
  };
  const saveCurrentView = () => setShowSaveViewModal(true);
  const handleSaveViewConfirm = (value?: string) => {
    const name = value?.trim();
    if (!name) return;
    setShowSaveViewModal(false);
    const view: SavedView = {
      name, status: statusFilter, brand: brandFilter, env: envFilter,
      search: searchQuery, sortBy, sortDir, dateFrom, dateTo,
    };
    persistViews([...savedViews.filter((x) => x.name !== name), view]);
    flashNotice(`Saved view "${name}".`);
  };

  // ── Run detail state ──
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runTimeline, setRunTimeline] = useState<RunEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // ── Action modals ──
  const [confirmAction, setConfirmAction] = useState<{
    type: "pause" | "resume" | "stop" | "retry" | "quarantine" | "escalate" | "emergency_pause" | "restricted_mode" | "assign" | "start" | "remove" | "hold" | "release_hold" | "export_evidence" | "export_output_snapshot";
    runId: string;
    label: string;
    description: string;
    impactPreview?: string;
    confirmLabel: string;
    confirmClass?: string;
    requireReason?: boolean;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Evidence export ──
  const [evidenceExportBundleId, setEvidenceExportBundleId] = useState<string | null>(null);
  const [evidenceExportLoading, setEvidenceExportLoading] = useState(false);

  // ── Policy check ──
  const [policyCheckLoading, setPolicyCheckLoading] = useState(false);

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
      const params: Record<string, string> = {
        ...scopedParams,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        // include the whole "to" day
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.date_to = end.toISOString();
      }

      const [statsRes, runsRes, queuesRes] = await Promise.allSettled([
        api.getOperationsStatsScoped(scopedParams).catch(() => null),
        api.listAgentRuns(params).catch(() => null),
        api.listQueues(scopedParams).catch(() => null),
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
        if (typeof runsRes.value.total === "number") setTotalRuns(runsRes.value.total);
      }
      if (queuesRes.status === "fulfilled" && queuesRes.value?.items) setQueues(queuesRes.value.items);

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
  }, [statusFilter, brandFilter, envFilter, searchQuery, page, sortBy, sortDir, dateFrom, dateTo]);

  // Reset to the first page whenever a filter, search, sort, or date range
  // changes so the user never lands on an out-of-range offset.
  useEffect(() => {
    setPage(0);
  }, [statusFilter, brandFilter, envFilter, searchQuery, sortBy, sortDir, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    const safeFetch = () => { if (!cancelled && document.visibilityState === 'visible') fetchData(); };
    setLoading(true);
    safeFetch();
    const interval = setInterval(safeFetch, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [fetchData]);

  useEffect(() => {
    const controller = new AbortController();
    let closed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let buffer = "";

    const scheduleReconnect = () => {
      if (closed || controller.signal.aborted) return;
      // Exponential backoff (1s,2s,4s… capped 30s) so a transient drop
      // re-establishes the stream instead of waiting on the 30s poll.
      const delay = Math.min(30000, 1000 * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(connectOperationsStream, delay);
    };

    // Parse SSE frames; refresh only on a typed `operations` event (ignore
    // heartbeat/connected control frames).
    const handleChunk = (chunk: string) => {
      buffer += chunk;
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const eventLine = frame.split("\n").find((l) => l.startsWith("event:"));
        const eventName = eventLine?.slice("event:".length).trim();
        if (eventName === "operations") void fetchData();
      }
    };

    async function connectOperationsStream() {
      if (closed || controller.signal.aborted) return;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setRealtimeDegraded(true);
          scheduleReconnect();
          return;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/api/v1/operations/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          setRealtimeDegraded(true);
          scheduleReconnect();
          return;
        }
        setRealtimeDegraded(false);
        attempt = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!closed && !controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          handleChunk(decoder.decode(value, { stream: true }));
        }
        if (!closed && !controller.signal.aborted) {
          setRealtimeDegraded(true);
          scheduleReconnect();
        }
      } catch {
        if (!closed && !controller.signal.aborted) {
          setRealtimeDegraded(true);
          scheduleReconnect();
        }
      }
    }

    connectOperationsStream();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
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

  // ── Run an on-demand policy check, then refresh the run detail (§8) ──
  const handleRunPolicyCheck = async (runId: string) => {
    setPolicyCheckLoading(true);
    try {
      const res = await api.runPolicyCheck(runId);
      const summary = (res as any)?.summary
        ? String((res as any).summary).replace(/_/g, " ")
        : "completed";
      // Refresh the drawer (policy results + run state may have changed).
      const fresh = await api.getRunDetail(runId).catch(() => null);
      if (fresh) setRunDetail(fresh);
      await fetchData();
      flashNotice(`Policy check ${summary}.`);
    } catch (err: any) {
      setError(err?.message || "Policy check failed.");
    } finally {
      setPolicyCheckLoading(false);
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
        case "retry":         await api.retryRun(confirmAction.runId, reason); break;
        case "quarantine":    await api.quarantineRun(confirmAction.runId, reason); break;
        case "escalate":      await api.escalateRun(confirmAction.runId, reason); break;
        case "emergency_pause": await api.emergencyPause(confirmAction.runId, reason); break;
        case "restricted_mode": await api.restrictedMode(confirmAction.runId, reason); break;
        case "start":         await api.startRun(confirmAction.runId, reason); break;
        case "remove":        await api.deleteRun(confirmAction.runId); break;
        case "hold":          await api.holdRun(confirmAction.runId, reason); break;
        case "release_hold":  await api.releaseHoldRun(confirmAction.runId, reason); break;
        case "export_evidence": await api.exportEvidence(confirmAction.runId, reason); break;
        case "export_output_snapshot": await api.exportOutputSnapshot(confirmAction.runId, reason); break;
      }
      const wasRemoved = confirmAction.type === "remove";
      const actionLabel = confirmAction.type.replace(/_/g, " ");
      setConfirmAction(null);
      if (wasRemoved) setRunDetail(null);
      await fetchData();
      flashNotice(wasRemoved ? "Run archived; history and evidence preserved." : `Action "${actionLabel}" applied successfully.`);
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
      flashNotice("Evidence bundle export recorded.");
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
      flashNotice("Queue item assigned.");
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
      const res = await api.holdRun(item.run_id, "Held from task queue");
      if (!res?.success) throw new Error(res?.error || "Hold failed");
      await fetchData();
    } catch (err: any) {
      setError(err?.message || "Failed to hold queue item.");
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

  // Doc 6 §2/§10: resolve a queue item with a recorded resolution note.
  const handleQueueResolve = async (item: QueueItem) => {
    const notes = window.prompt("Resolution note (recorded on the queue item):", "");
    if (notes === null) return; // cancelled
    try {
      const res = await api.resolveQueueItem(item.id, notes.trim() || undefined);
      if (!res?.success) throw new Error(res?.error || "Resolve failed");
      await fetchData();
      flashNotice("Queue item resolved.");
    } catch (err: any) {
      setError(err?.message || "Failed to resolve queue item.");
    }
  };

  // Doc 6 §2/§7: retry a failed/retry queue item through the governed retry path
  // (duplicate-publication guard + retry-limit are enforced server-side).
  const handleQueueRetry = async (item: QueueItem) => {
    if (!item.run_id) {
      setError("This queue item is not linked to a runnable task.");
      return;
    }
    const reason = window.prompt("Reason for retry (required, min 8 chars):", "");
    if (reason === null) return;
    if (reason.trim().length < 8) {
      setError("A reason of at least 8 characters is required to retry.");
      return;
    }
    try {
      const res = await api.retryRun(item.run_id, reason.trim());
      if (!res?.success) throw new Error(res?.error || "Retry failed");
      await fetchData();
      flashNotice("Retry attempt created.");
    } catch (err: any) {
      setError(err?.message || "Failed to retry queue item.");
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
    (run: AgentRun, _detail?: RunDetail) => {
      checkStaleAndAct(run.id, {
        type: "export_output_snapshot",
        runId: run.id,
        label: "Export Output Snapshot",
        description: "Export the output snapshot to the evidence vault? This will be recorded in the audit trail.",
        impactPreview: "Creates an immutable evidence record linked to this run.",
        requireReason: true,
        confirmLabel: "Export Snapshot",
      } as typeof confirmAction);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Doc 6 §2 — export the currently filtered operational run log to CSV.
  const handleExportFilteredRuns = () => {
    if (!filteredRuns.length) {
      setError("No runs to export with the current filters.");
      return;
    }
    const cols: { key: keyof AgentRun; label: string }[] = [
      { key: "id", label: "Run ID" },
      { key: "agent_name", label: "Agent" },
      { key: "agent_type", label: "Type" },
      { key: "workflow_name", label: "Workflow" },
      { key: "status", label: "Status" },
      { key: "severity", label: "Severity" },
      { key: "policy_result", label: "Policy" },
      { key: "evidence_status", label: "Evidence" },
      { key: "owner_name", label: "Owner" },
      { key: "brand_name", label: "Brand" },
      { key: "channel", label: "Channel" },
      { key: "environment", label: "Environment" },
      { key: "created_at", label: "Created" },
      { key: "due_at", label: "Due" },
      { key: "last_event_at", label: "Last Event" },
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = cols.map((c) => esc(c.label)).join(",");
    const rows = filteredRuns.map((r) => cols.map((c) => esc(r[c.key])).join(","));
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operations-runs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    flashNotice(`Exported ${filteredRuns.length} filtered run(s) to CSV.`);
  };

  // ── Filtered runs ──
  // Filtering, search, and sorting are performed server-side (and paginated),
  // so the current page of runs is rendered as-is. Kept as `filteredRuns` to
  // preserve the existing render bindings.
  const filteredRuns = runs;
  const totalPages = Math.max(1, Math.ceil(totalRuns / PAGE_SIZE));


  // Doc 6 §2/§3 — queue segmentation derived values (hoisted out of JSX).
  const queueTypes = Array.from(new Set(queues.map((q) => q.queue_type))).sort();
  const visibleQueues = queueTypeFilter === "ALL" ? queues : queues.filter((q) => q.queue_type === queueTypeFilter);
  const isRetryableQueueItem = (item: QueueItem) => /fail|retry|error/i.test(item.queue_type);

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
          <h1 className="text-2xl font-bold text-foreground mb-0.5">Agent Operations</h1>
          <p className="text-foreground-muted text-sm">Live supervision · Runtime intervention · Evidence capture</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-400">
            <Radio className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-refresh 30s</span>
          </div>
          <button
            onClick={fetchData}
            className="p-2 bg-card border border-border rounded-xl text-foreground-muted hover:text-foreground transition-all group"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </div>

      {/* ── Global Search ── */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search runs by agent name, objective, or Run ID…"
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-foreground-muted focus:outline-none focus:border-border transition-colors"
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

      {/* ── Success Notice ── */}
      {notice && (
        <div role="status" aria-live="polite" className="mb-4 p-3.5 rounded-xl flex items-center justify-between gap-3 text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {notice}
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-400/60 hover:text-emerald-400" aria-label="Dismiss"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Operational Health Strip ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
          {[
            { label: "Successful Runs", val: stats.successful_runs ?? 0, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Queued",         val: stats.queued_tasks,   icon: <Clock className="w-3.5 h-3.5" />,    color: "text-amber-400",   bg: "bg-amber-500/10"  },
            { label: "Failed",         val: stats.failed_runs,    icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400",      bg: "bg-red-500/10"    },
            { label: "Policy Blocks",  val: stats.policy_blocks,  icon: <Ban className="w-3.5 h-3.5" />,     color: "text-rose-400",     bg: "bg-rose-500/10"   },

            { label: "Ops Health",     val: `${stats.operations_health_score ?? stats.avg_trust_score ?? 0}%`, icon: <ShieldCheck className="w-3.5 h-3.5" />, color: (stats.operations_health_score ?? stats.avg_trust_score ?? 0) >= 80 ? "text-emerald-400" : "text-amber-400", bg: (stats.operations_health_score ?? stats.avg_trust_score ?? 0) >= 80 ? "bg-emerald-500/10" : "bg-amber-500/10" },
          ].map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
              <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-base font-bold leading-none ${card.color}`}>{card.val}</p>
                <p className="text-[9px] text-foreground-muted mt-0.5 truncate">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0 mb-5 border-b border-border">
        {[
          { id: "runs",      label: "Agent Runs",  icon: <Bot className="w-3.5 h-3.5" />,           count: runs.length         },
          { id: "queues",    label: "Task Queue",  icon: <Clock className="w-3.5 h-3.5" />,          count: queues.length       },

        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "border-indigo-500 text-foreground" : "border-transparent text-foreground-muted hover:text-foreground-muted"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 text-[9px] rounded-full ${activeTab === tab.id ? "bg-indigo-500/20 text-indigo-400" : "bg-surface text-foreground-muted"}`}>
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
              <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
                <SeverityDot severity="critical" /><span>Critical</span>
                <span className="mx-1.5" />
                <SeverityDot severity="warning" /><span>Warning</span>
                <span className="mx-1.5" />
                <SeverityDot severity="normal" /><span>Normal</span>
              </div>
              <button
                onClick={handleExportFilteredRuns}
                title="Export the currently filtered runs to CSV"
                className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:border-border transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <div className="flex items-center border border-border rounded-xl overflow-hidden">
                <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "bg-surface text-foreground" : "text-foreground-muted hover:text-foreground-muted"} transition-colors`}><List className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode("card")} className={`p-1.5 ${viewMode === "card" ? "bg-surface text-foreground" : "text-foreground-muted hover:text-foreground-muted"} transition-colors`}><LayoutGrid className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-foreground-muted gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="text-sm">Loading agent runs…</span>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold mb-1">No Active Runs</p>
              <p className="text-foreground-muted text-sm mb-4">Agent operations are clear. No runs match the current filter.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <a href="/agents/studio" className="text-xs px-3 py-1.5 border border-border rounded-xl text-foreground-muted hover:text-foreground hover:border-border transition-colors flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" />Agent Catalog</a>
              </div>
            </div>
          ) : viewMode === "list" ? (
            /* ── List View ── */
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 items-center border-b border-border text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
                <span>Run</span>
                <span>Status</span>
                <span>Policy</span>
                <span>Evidence</span>
                <span>Posted By</span>
              </div>
              <div className="divide-y divide-border">
                {filteredRuns.map((run) => {
                  const statusCfg = STATUS_CONFIG[run.status] || { label: run.status, color: "text-foreground-muted", bg: "bg-surface", border: "border-white/10", dot: "bg-gray-400", severity: "normal" };
                  return (
                    <div key={run.id} onClick={() => handleViewRun(run)} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3.5 items-start hover:bg-surface-hover transition-colors cursor-pointer ${run.severity === "critical" ? "border-l-2 border-l-rose-500/50" : run.severity === "warning" ? "border-l-2 border-l-orange-500/30" : ""}`}>
                      {/* Run info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <SeverityDot severity={statusCfg.severity} />
                          <span className="text-sm font-semibold text-foreground truncate">{run.agent_name}</span>
                          <span className="text-[10px] font-mono text-foreground-muted shrink-0">{shortId(run.id)}</span>
                          <CopyButton text={run.id} />
                        </div>
                        <p className="text-xs text-foreground-muted truncate pl-4">{run.task_objective || run.workflow_name}</p>
                        <div className="flex items-center gap-2 mt-1 pl-4 flex-wrap">
                          {run.brand_name && <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-foreground-muted border border-border">{run.brand_name}</span>}
                          {run.channel && <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-foreground-muted border border-border">{run.channel}</span>}
                          {run.owner_name && <span className="text-[9px] text-foreground-muted">@{run.owner_name}</span>}
                          <span className="text-[9px] text-foreground-muted">{timeAgo(run.last_event_at)}</span>
                        </div>
                      </div>
                      {/* Status */}
                      <div><StatusBadge status={run.status} /></div>
                      {/* Policy */}
                      <div><PolicyBadge result={run.policy_result} /></div>
                      {/* Evidence — show the violation/flag reason when the run was blocked or flagged */}
                      <div>
                        {run.next_action && ["blocked", "warning"].includes(String(run.policy_result || "").toLowerCase()) ? (
                          <span
                            title={run.next_action}
                            className={`inline-flex items-start gap-1 text-[10px] leading-tight font-medium ${String(run.policy_result).toLowerCase() === "blocked" ? "text-rose-400" : "text-amber-400"} line-clamp-2`}
                          >
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{run.next_action}</span>
                          </span>
                        ) : (
                          <EvidenceBadge status={run.evidence_status} />
                        )}
                      </div>
                      {/* Posted By — agent (auto-published) or the human approver */}
                      <div>
                        {run.posted_by ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${run.posted_by_type === "manual" ? "text-indigo-400" : "text-emerald-400"}`} title={run.posted_by_type === "manual" ? "Approved from the Approval Console" : "Auto-published by agent"}>
                            {run.posted_by_type === "manual" ? <UserCheck className="w-3 h-3 shrink-0" /> : <Bot className="w-3 h-3 shrink-0" />}
                            <span className="truncate">{run.posted_by}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-foreground-muted">—</span>
                        )}
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
                  <div key={run.id} className="bg-card border border-border rounded-2xl p-4 hover:border-border transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityDot severity={STATUS_CONFIG[run.status]?.severity || "normal"} />
                          <p className="text-sm font-bold text-foreground truncate">{run.agent_name}</p>
                        </div>
                        <p className="text-xs text-foreground-muted truncate pl-4">{run.task_objective || run.workflow_name}</p>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <PolicyBadge result={run.policy_result} />
                      <EvidenceBadge status={run.evidence_status} />
                      {sla.label && <span className={`text-[10px] font-medium ${sla.overdue ? "text-rose-400" : "text-foreground-muted"}`}>{sla.label}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground-muted">
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

          {/* Pagination */}
          {!loading && totalRuns > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-foreground-muted">
              <span>
                {totalRuns === 0 ? "No runs" : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalRuns)} of ${totalRuns}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground-muted hover:text-foreground hover:border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-foreground-muted">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                  disabled={page + 1 >= totalPages}
                  className="px-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground-muted hover:text-foreground hover:border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: TASK QUEUE
      ══════════════════════════════════════════════════════════════════════ */}
      {/* Doc 6 §2/§3 — queue segmentation by type. Tabs derive from the live
          queue_type values, so approval / failed / retry / human-review /
          publishing / exception items are each addressable, with per-type counts. */}
      {activeTab === "queues" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-foreground-muted">{visibleQueues.length} item{visibleQueues.length !== 1 ? "s" : ""}{queueTypeFilter !== "ALL" ? ` · ${queueTypeFilter.replace(/_/g, " ")}` : " in queue"}</p>
          </div>
          {/* Queue type tabs */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
            <button
              onClick={() => setQueueTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${queueTypeFilter === "ALL" ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" : "bg-card text-foreground-muted border-border hover:text-foreground"}`}
            >
              All <span className="ml-1 text-[10px] opacity-70">{queues.length}</span>
            </button>
            {queueTypes.map((qt) => {
              const count = queues.filter((q) => q.queue_type === qt).length;
              return (
                <button
                  key={qt}
                  onClick={() => setQueueTypeFilter(qt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${queueTypeFilter === qt ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/25" : "bg-card text-foreground-muted border-border hover:text-foreground"}`}
                >
                  {qt.replace(/_/g, " ")} <span className="ml-1 text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          {visibleQueues.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/20 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold mb-1">Queue Empty</p>
              <p className="text-foreground-muted text-sm">No pending tasks in this queue.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_90px_150px_110px_150px] gap-4 px-4 py-2.5 border-b border-border text-[10px] font-semibold text-foreground-muted uppercase tracking-wider">
                <span>Task</span>
                <span>Priority</span>
                <span>Assignee</span>
                <span>SLA</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-border">
                {visibleQueues.map((item) => {
                  const sla = formatTimeRemaining(item.due_at);
                  const resolved = ["resolved", "cancelled"].includes(String(item.status).toLowerCase());
                  return (
                    <div key={item.id} className={`grid grid-cols-[1fr_90px_150px_110px_150px] gap-4 px-4 py-3.5 items-center hover:bg-surface-hover transition-colors ${item.sla_breached ? "border-l-2 border-l-rose-500/50" : ""}`}>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.queue_type.replace(/_/g, " ")}</p>
                        <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded mt-1 ${resolved ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                          {item.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-foreground px-2 py-0.5 rounded bg-surface border border-border">{item.priority}</span>
                      <div>
                        {item.assignee_name ? (
                          <span className="text-xs text-foreground-muted">{item.assignee_name}</span>
                        ) : (
                          <span className="text-xs text-amber-400">Unassigned</span>
                        )}
                        {item.claimed_by && <p className="text-[9px] text-foreground-muted">Claimed: {item.claimed_by}</p>}
                      </div>
                      <div>
                        {sla.label ? (
                          <span className={`text-xs ${sla.overdue ? "text-rose-400 font-semibold" : "text-foreground-muted"}`}>{sla.label}</span>
                        ) : <span className="text-foreground-muted">—</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleQueueAssign(item)} disabled={resolved} className="p-1.5 hover:bg-surface-hover rounded-lg text-foreground-muted hover:text-foreground transition-colors disabled:opacity-30" title={item.assignee_name ? "Reassign / claim" : "Assign"}><UserCheck className="w-3.5 h-3.5" /></button>
                        {isRetryableQueueItem(item) && (
                          <button onClick={() => handleQueueRetry(item)} disabled={resolved} className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-400/70 hover:text-blue-400 transition-colors disabled:opacity-30" title="Retry"><RotateCcw className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => handleQueueHold(item)} disabled={resolved} className="p-1.5 hover:bg-amber-500/10 rounded-lg text-amber-400/70 hover:text-amber-400 transition-colors disabled:opacity-30" title="Hold"><Pause className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleQueueResolve(item)} disabled={resolved} className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-400/70 hover:text-emerald-400 transition-colors disabled:opacity-30" title="Resolve with note"><CheckSquare className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleQueueCancel(item)} disabled={resolved} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400/70 hover:text-rose-400 transition-colors disabled:opacity-30" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>
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
          onExportEvidence={(bundleId) => setEvidenceExportBundleId(bundleId)}
          exportEvidenceLoading={evidenceExportLoading}
          onApproveOutput={handleApproveOutput}
          onRejectOutput={handleRejectOutput}
          onRequestOutputChanges={handleRequestOutputChanges}
          onExportSnapshot={handleExportSnapshot}
          onEscalateForReview={handleEscalateForReview}
          onRunPolicyCheck={handleRunPolicyCheck}
          policyCheckLoading={policyCheckLoading}
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
          requireReason={confirmAction.requireReason ?? true}
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

      <ConfirmActionModal
        open={showSaveViewModal}
        mode="prompt"
        variant="default"
        title="Save Current Filter View"
        message="Enter a name for the current filter set to reuse later."
        confirmLabel="Save"
        promptPlaceholder="View name..."
        onConfirm={handleSaveViewConfirm}
        onCancel={() => setShowSaveViewModal(false)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import {
  MessageSquareCode,
  ShieldCheck,
  Zap,
  History,
  Search,
  Clock,
  Lock,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  GitBranch,
  BookOpen,
  Wrench,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Archive,
  Eye,
  Play,
  PauseCircle,
  Download,
  CheckCircle2,
  XCircle,
  CircleDot,
  ArrowRight,
  Cpu,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";
import { EvaluationDashboard } from "@/features/prompt-governance/EvaluationDashboard";
import { AdversarialDashboard } from "@/features/prompt-governance/AdversarialDashboard";
import { DriftDashboard } from "@/features/prompt-governance/DriftDashboard";


// ─── Types ────────────────────────────────────────────────────────────────────

type LifecycleStatus =
  | "DRAFT"
  | "INTERNAL_TEST"
  | "REVIEW_REQUESTED"
  | "APPROVED_STAGING"
  | "PRODUCTION_PENDING"
  | "PRODUCTION_ACTIVE"
  | "PAUSED"
  | "RETIRED"
  | "ARCHIVED";

type RiskTier = "TIER_1_LOW" | "TIER_2_MEDIUM" | "TIER_3_HIGH" | "TIER_4_CRITICAL";

type PromptType =
  | "system"
  | "agent_role"
  | "task"
  | "channel"
  | "tool_use"
  | "escalation"
  | "refusal"
  | "safety"
  | "localization";

interface PromptVersion {
  version_number: string;
  body_hash: string;
  created_by: string;
  change_summary: string;
  created_at: string;
  immutable: boolean;
}

interface TestResult {
  suite_name: string;
  pass_fail: "PASS" | "FAIL" | "PENDING";
  score: number;
  run_at: string;
  environment: string;
}

interface ApprovalRecord {
  reviewer_role: string;
  decision: "APPROVED" | "REJECTED" | "PENDING" | "CHANGES_REQUESTED";
  timestamp: string;
  notes: string;
}

interface PromptRecord {
  id: string;
  name: string;
  prompt_type: PromptType;
  owner: string;
  linked_agent: string;
  linked_workflow: string;
  workflow_node: string;
  autonomy_level: string;
  review_requirement: string;
  risk_tier: RiskTier;
  status: LifecycleStatus;
  active_version: string;
  active_version_id?: string;
  last_test: TestResult | null;
  approvals: ApprovalRecord[];
  last_deployed: string;
  description: string;
  knowledge_sources: string[];
  linked_knowledge_sources?: { id: string; title: string; match_action?: string | null }[];
  tools_permitted: string[];
  updated_at?: string;
  metadata?: Record<string, any>;
}

interface HitlRule {
  id: string;
  trigger: string;
  action: string;
  route_to_role: string;
  enabled: boolean;
}

interface AuditStats {
  total?: number;
  today?: number;
  errors?: number;
  warnings?: number;
}

interface ApprovalStats {
  counts?: {
    pending_governance?: number;
    total_pending?: number;
    production_pending?: number;
  };
}

type ActiveTab = "registry" | "test_center" | "approvals" | "evidence";
type FilterStatus = "ALL" | LifecycleStatus;

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_META: Record<RiskTier, { label: string; color: string; bg: string; border: string; dot: string }> = {
  TIER_1_LOW: { label: "Tier 1 — Low", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  TIER_2_MEDIUM: { label: "Tier 2 — Medium", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-500" },
  TIER_3_HIGH: { label: "Tier 3 — High", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", dot: "bg-orange-500" },
  TIER_4_CRITICAL: { label: "Tier 4 — Critical", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", dot: "bg-rose-500" },
};

const STATUS_META: Record<LifecycleStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT: { label: "Draft", color: "text-foreground-muted", bg: "bg-surface", icon: CircleDot },
  INTERNAL_TEST: { label: "Internal Test", color: "text-blue-400", bg: "bg-blue-500/10", icon: FlaskConical },
  REVIEW_REQUESTED: { label: "Review Requested", color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
  APPROVED_STAGING: { label: "Approved — Staging", color: "text-teal-400", bg: "bg-teal-500/10", icon: CheckCircle2 },
  PRODUCTION_PENDING: { label: "Production Pending", color: "text-indigo-400", bg: "bg-indigo-500/10", icon: ArrowRight },
  PRODUCTION_ACTIVE: { label: "Production Active", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Zap },
  PAUSED: { label: "Paused", color: "text-orange-400", bg: "bg-orange-500/10", icon: PauseCircle },
  RETIRED: { label: "Retired", color: "text-rose-400", bg: "bg-rose-500/10", icon: XCircle },
  ARCHIVED: { label: "Archived", color: "text-foreground-muted", bg: "bg-surface", icon: Archive },
};

const LIFECYCLE_STAGES: LifecycleStatus[] = [
  "DRAFT",
  "INTERNAL_TEST",
  "REVIEW_REQUESTED",
  "APPROVED_STAGING",
  "PRODUCTION_PENDING",
  "PRODUCTION_ACTIVE",
  "PAUSED",
  "RETIRED",
  "ARCHIVED",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

// Backend enums return lowercase values (e.g. `tier_2_medium`, `approved_for_staging`).
// The UI maps above are keyed by the wizard's uppercase shortforms. Normalize defensively
// so badges don't crash when the API returns canonical DB enum values.
const RISK_TIER_FROM_DB: Record<string, RiskTier> = {
  tier_1_low: "TIER_1_LOW",
  tier_2_medium: "TIER_2_MEDIUM",
  tier_3_high: "TIER_3_HIGH",
  tier_4_critical: "TIER_4_CRITICAL",
};
const STATUS_FROM_DB: Record<string, LifecycleStatus> = {
  draft: "DRAFT",
  internal_test: "INTERNAL_TEST",
  review_requested: "REVIEW_REQUESTED",
  approved_for_staging: "APPROVED_STAGING",
  production_pending: "PRODUCTION_PENDING",
  production_active: "PRODUCTION_ACTIVE",
  paused: "PAUSED",
  retired: "RETIRED",
  archived: "ARCHIVED",
};
function normalizeRiskTier(v: string | undefined): RiskTier {
  if (!v) return "TIER_1_LOW";
  const upper = v.toUpperCase() as RiskTier;
  if (upper in RISK_META) return upper;
  return RISK_TIER_FROM_DB[v.toLowerCase()] || "TIER_1_LOW";
}
function normalizeStatus(v: string | undefined): LifecycleStatus {
  if (!v) return "DRAFT";
  const upper = v.toUpperCase() as LifecycleStatus;
  if (upper in STATUS_META) return upper;
  return STATUS_FROM_DB[v.toLowerCase()] || "DRAFT";
}

function StatusBadge({ status }: { status: LifecycleStatus | string }) {
  const meta = STATUS_META[normalizeStatus(status)];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${meta.color} ${meta.bg} border border-border`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function RiskBadge({ tier }: { tier: RiskTier | string }) {
  const meta = RISK_META[normalizeRiskTier(tier)];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${meta.color} ${meta.bg} border ${meta.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function TestBadge({ result }: { result: TestResult | null }) {
  if (!result) return <span className="text-[10px] text-foreground-muted italic">No test run</span>;
  const colors = result.pass_fail === "PASS" ? "text-emerald-400 bg-emerald-500/10" : result.pass_fail === "FAIL" ? "text-rose-400 bg-rose-500/10" : "text-foreground-muted bg-surface";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${colors} border border-border`}>
      {result.pass_fail === "PASS" ? <CheckCircle2 className="w-3 h-3" /> : result.pass_fail === "FAIL" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {result.pass_fail} · {result.score}%
    </span>
  );
}

function ApprovalChain({ approvals, riskTier }: { approvals: ApprovalRecord[]; riskTier: RiskTier }) {
  const required = riskTier === "TIER_4_CRITICAL" ? 3 : riskTier === "TIER_3_HIGH" ? 2 : riskTier === "TIER_2_MEDIUM" ? 1 : 0;
  const completed = approvals.filter((a) => a.decision === "APPROVED").length;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.max(required, approvals.length) }).map((_, i) => {
        const a = approvals[i];
        const color = !a ? "bg-surface" : a.decision === "APPROVED" ? "bg-emerald-500" : a.decision === "REJECTED" ? "bg-rose-500" : a.decision === "PENDING" ? "bg-amber-500/40 border border-amber-500" : "bg-surface";
        return <div key={i} className={`w-2.5 h-2.5 rounded-full ${color}`} title={a ? `${a.reviewer_role}: ${a.decision}` : "Required"} />;
      })}
      <span className="text-[10px] text-foreground-muted ml-1">{completed}/{required}</span>
    </div>
  );
}

// ─── Simplified status for Prompt Governance Registry ────────────────────────

// A prompt counts as "working" (live, green) when it is active AND has governed
// a post within this window. `last_used_at` / `working_since` are stamped by the
// backend each time the prompt classifies a post, so the green state appears
// while the prompt does real work and settles back to "Active" once idle.
const WORKING_WINDOW_MS = 5 * 60 * 1000;
function isPromptWorking(p: PromptRecord): boolean {
  if (normalizeStatus(p.status) !== "PRODUCTION_ACTIVE") return false;
  const ts = p.metadata?.working_since || p.metadata?.last_used_at;
  if (!ts) return false;
  const used = new Date(ts).getTime();
  if (Number.isNaN(used)) return false;
  return Date.now() - used < WORKING_WINDOW_MS;
}

function SimplifiedStatusBadge({ p }: { p: PromptRecord }) {
  const s = normalizeStatus(p.status);
  const isFailed = p.last_test?.pass_fail === "FAIL";
  const isBlocked = isFailed || (p.metadata?.block_count || 0) > 0;
  if (["RETIRED", "ARCHIVED"].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-border">
        <XCircle className="w-3 h-3" />
        Retired
      </span>
    );
  }
  if (s === "PRODUCTION_ACTIVE") {
    // Live: actively governing a post right now → solid green indicator.
    if (isPromptWorking(p)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white bg-green-500 border border-green-400/50 shadow-[0_0_12px_rgba(34,197,94,0.45)]">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Working
        </span>
      );
    }
    // Active but idle: deployed and ready, not currently processing.
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-border">
        <Zap className="w-3 h-3" />
        Active
      </span>
    );
  }
  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-border">
        <AlertTriangle className="w-3 h-3" />
        Blocked/Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-foreground-muted bg-surface border border-border">
      <CircleDot className="w-3 h-3" />
      Draft
    </span>
  );
}

// ─── Tab: Registry (system-governed only) ─────────────────────────────────────

function RegistryTab({
  prompts,
  onViewPrompt,
  onRetirePrompt,
  onActivatePrompt,
  canManage,
}: {
  prompts: PromptRecord[];
  onViewPrompt: (p: PromptRecord) => void;
  onRetirePrompt: (p: PromptRecord) => void;
  onActivatePrompt: (p: PromptRecord) => void;
  canManage: boolean;
}) {
  const purposeFor = useCallback((p: PromptRecord): string => {
    const def = SYSTEM_PROMPT_DEFS.find((d) => d.name.toLowerCase() === p.name.toLowerCase());
    return def?.purpose || p.description || "—";
  }, []);

  const formatDateTime = useCallback((ts: string | undefined | null): string => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }, []);

  const failedBlockedCount = useCallback((p: PromptRecord): number => {
    return (p.metadata?.block_count || 0) + (p.metadata?.fail_count || 0);
  }, []);

  // Knowledge Base sources the prompt actually consulted on its last run. Falls
  // back to any statically bound sources, then to "—" when the prompt needs no KB.
  const kbSourceFor = useCallback((p: PromptRecord): { label: string; extra: number } | null => {
    const dynamic = p.linked_knowledge_sources || [];
    if (dynamic.length > 0) {
      return { label: dynamic[0].title || "Source", extra: dynamic.length - 1 };
    }
    const bound = p.knowledge_sources || [];
    if (bound.length > 0) {
      return { label: bound[0], extra: bound.length - 1 };
    }
    return null;
  }, []);

  return (
    <div className="p-6">
      {/* Table — scrolls horizontally on narrow viewports; each column keeps a
          comfortable min width so headers/values never collide. */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left table-fixed min-w-[1260px]">
          <colgroup>
            <col style={{ width: "170px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "130px" }} />
            <col style={{ width: "130px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "110px" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-card/60">
              {[
                { label: "Prompt Name", width: "170px" },
                { label: "Purpose", width: "190px" },
                { label: "Workflow Name", width: "130px" },
                { label: "Linked Agent", width: "130px" },
                { label: "Knowledge Source", width: "150px" },
                { label: "Last Used", width: "150px" },
                { label: "Status", width: "110px" },
                { label: "Failed / Blocked", width: "120px" }
              ].map((h) => (
                <th key={h.label} style={{ width: h.width }} className="py-4 px-3 text-[10px] font-black text-foreground-muted uppercase tracking-widest text-center">{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {prompts.map((p) => {
              const s = normalizeStatus(p.status);
              const retired = ["RETIRED", "ARCHIVED"].includes(s);
              return (
              <tr key={p.id} className="hover:bg-surface/40 transition-colors">
                <td className="py-4 px-3">
                  <div className="text-sm font-bold text-foreground whitespace-normal break-words line-clamp-2" title={p.name}>{p.name}</div>
                </td>
                <td className="py-4 px-3">
                  <span className="text-xs text-foreground-muted leading-relaxed line-clamp-2">{purposeFor(p)}</span>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="text-xs text-foreground-muted truncate block max-w-[120px] mx-auto">{p.linked_workflow !== "—" && p.linked_workflow !== "" ? p.linked_workflow : <span className="italic text-foreground-muted">Pending workflow</span>}</span>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="text-xs text-foreground-muted truncate block max-w-[120px] mx-auto">{p.linked_agent !== "—" && p.linked_agent !== "" ? p.linked_agent : <span className="italic text-foreground-muted">Not linked</span>}</span>
                </td>
                <td className="py-4 px-3 text-center">
                  {(() => {
                    const kb = kbSourceFor(p);
                    if (!kb) return <span className="text-xs italic text-foreground-muted">—</span>;
                    return (
                      <span className="text-xs text-foreground-muted truncate block max-w-[130px] mx-auto" title={kb.label}>
                        {kb.label}
                        {kb.extra > 0 && <span className="text-foreground-muted"> +{kb.extra}</span>}
                      </span>
                    );
                  })()}
                </td>
                <td className="py-4 px-3 text-center">
                  <span className="text-[11px] text-foreground-muted whitespace-nowrap">{formatDateTime(p.metadata?.last_used_at) || formatDateTime(p.last_deployed) || "—"}</span>
                </td>
                <td className="py-4 px-3 text-center"><SimplifiedStatusBadge p={p} /></td>
                <td className="py-4 px-3 text-center">
                  <span className="text-xs text-foreground-muted">{failedBlockedCount(p) > 0 ? failedBlockedCount(p) : "—"}</span>
                </td>
              </tr>
              );
            })}
            {prompts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-20 text-center text-sm text-foreground-muted">No system prompts available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Approvals ────────────────────────────────────────────────────────────

function ApprovalsTab({ prompts, approvalStats, onApprovalAction, canWaive, onWaive, onExportPromptEvidence }: {
  prompts: PromptRecord[]; approvalStats: ApprovalStats | null;
  onApprovalAction: (versionId: string, decision: string, comments?: string, reasonCategory?: string) => void;
  canWaive: boolean; onWaive: (versionId: string, justification: string) => void;
  onExportPromptEvidence?: (prompt: PromptRecord, context: string) => void;
}) {
  const [approvalModal, setApprovalModal] = useState<{
    mode: 'confirm' | 'prompt';
    versionId: string;
    promptName: string;
    decision: string;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info' | 'default';
    confirmLabel?: string;
    promptPlaceholder?: string;
  } | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ versionId: string; promptName: string; title: string } | null>(null);
  const [waiveModal, setWaiveModal] = useState<{ versionId: string; promptName: string } | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [detailPrompt, setDetailPrompt] = useState<PromptRecord | null>(null);

  const pending = prompts.filter((p) => p.status === "REVIEW_REQUESTED" || p.status === "PRODUCTION_PENDING");

  // KPI data
  const today = new Date().toDateString();
  const allApprovals = prompts.flatMap((p) => p.approvals);
  const approvedToday = allApprovals.filter((a) => a.decision === "APPROVED" && a.timestamp && new Date(a.timestamp).toDateString() === today).length;
  const rejectedToday = allApprovals.filter((a) => a.decision === "REJECTED" && a.timestamp && new Date(a.timestamp).toDateString() === today).length;

  const handleApprovalConfirm = (value?: string) => {
    if (!approvalModal) return;
    const { versionId, decision, mode } = approvalModal;
    if (mode === 'confirm') {
      onApprovalAction(versionId, decision);
    } else {
      onApprovalAction(versionId, decision, (value || '').trim());
    }
    setApprovalModal(null);
  };

  const APPROVAL_MATRIX = [
    { tier: "Tier 1 — Low", color: "text-emerald-400", requirements: "Prompt owner approval only.", roles: ["PROMPT_OWNER"] },
    { tier: "Tier 2 — Medium", color: "text-amber-400", requirements: "Owner + brand reviewer.", roles: ["PROMPT_OWNER", "BRAND_REVIEWER"] },
    { tier: "Tier 3 — High", color: "text-orange-400", requirements: "Owner + brand + compliance reviewer.", roles: ["PROMPT_OWNER", "BRAND_REVIEWER", "COMPLIANCE_REVIEWER"] },
    { tier: "Tier 4 — Critical", color: "text-rose-400", requirements: "Three-key: Owner + compliance + security or executive approver.", roles: ["PROMPT_OWNER", "COMPLIANCE_REVIEWER", "SECURITY_ADMIN"] },
  ];

  const reviewStageLabel = (s: LifecycleStatus) =>
    s === "REVIEW_REQUESTED" ? "Governance Review" : s === "PRODUCTION_PENDING" ? "Production Approval" : s;

  return (
    <div className="space-y-8">
      {/* A. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Reviews", value: pending.length, color: "text-amber-400" },
          { label: "Approved Today", value: approvedToday, color: "text-emerald-400" },
          { label: "Rejected Today", value: rejectedToday, color: "text-rose-400" },
          { label: "Average Review Time", value: "—", color: "text-foreground-muted" },
        ].map((k) => (
          <div key={k.label} className="bg-background border border-border rounded-2xl p-5 text-center">
            <div className={`text-3xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* B. Review Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Review Queue</h3>
          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-black">
            {approvalStats?.counts?.total_pending ?? pending.length} Awaiting Action
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-foreground-muted bg-background border border-border rounded-2xl">No pending reviews available.</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {["Prompt", "Submitted By", "Risk Tier", "Review Stage", "Submitted Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="py-3 px-5 text-[10px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pending.map((p) => (
                    <tr key={p.id} className="hover:bg-surface/30 transition-colors">
                      <td className="py-4 px-5"><span className="text-sm font-bold text-foreground max-w-[200px] truncate block">{p.name}</span></td>
                      <td className="py-4 px-5"><span className="text-[11px] text-foreground">{p.owner}</span></td>
                      <td className="py-4 px-5"><RiskBadge tier={p.risk_tier} /></td>
                      <td className="py-4 px-5"><span className="text-[10px] text-foreground-muted">{reviewStageLabel(normalizeStatus(p.status))}</span></td>
                      <td className="py-4 px-5"><span className="text-[10px] text-foreground-muted whitespace-nowrap">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}</span></td>
                      <td className="py-4 px-5"><StatusBadge status={p.status} /></td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1">
                          <button
                            title="View Details"
                            onClick={() => setDetailPrompt(detailPrompt?.id === p.id ? null : p)}
                            className="p-2 bg-background border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-border transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Approve"
                            onClick={() => {
                              if (!p.active_version_id) return;
                              setApprovalModal({
                                mode: 'confirm', versionId: p.active_version_id, promptName: p.name,
                                decision: 'APPROVED', title: `Approve "${p.name}"?`,
                                message: 'This will move the prompt to APPROVED status and make it eligible for production deployment. This action is recorded in the Evidence Vault.',
                                variant: 'info', confirmLabel: 'Approve',
                              });
                            }}
                            disabled={!p.active_version_id}
                            className="p-2 bg-background border border-border rounded-lg text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 transition-all disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Reject"
                            onClick={() => { if (p.active_version_id) setRejectionModal({ versionId: p.active_version_id, promptName: p.name, title: `Reject "${p.name}"` }); }}
                            disabled={!p.active_version_id}
                            className="p-2 bg-background border border-border rounded-lg text-rose-400 hover:text-rose-300 hover:border-rose-500/30 transition-all disabled:opacity-40"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* C. Review Detail Panel */}
            {detailPrompt && (
              <div className="bg-card border border-indigo-500/20 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-indigo-500/5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">{detailPrompt.name}</span>
                    <RiskBadge tier={detailPrompt.risk_tier} />
                    <StatusBadge status={detailPrompt.status} />
                  </div>
                  <button
                    onClick={() => setDetailPrompt(null)}
                    className="p-1.5 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:border-border transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Risk Tier", value: RISK_META[normalizeRiskTier(detailPrompt.risk_tier)].label },
                      { label: "Owner", value: detailPrompt.owner },
                      { label: "Review Stage", value: reviewStageLabel(normalizeStatus(detailPrompt.status)) },
                    ].map((f) => (
                      <div key={f.label} className="p-3 bg-background border border-border rounded-xl">
                        <div className="text-[9px] text-foreground-muted uppercase tracking-widest">{f.label}</div>
                        <div className="text-[11px] text-white font-bold mt-1">{f.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-foreground-muted leading-relaxed">{detailPrompt.description || "—"}</div>

                  {/* Approval Chain */}
                  <div>
                    <div className="text-[10px] text-foreground-muted uppercase tracking-widest font-black mb-2">Approval Chain</div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <ApprovalChain approvals={detailPrompt.approvals} riskTier={detailPrompt.risk_tier} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {detailPrompt.approvals.length === 0 && (
                        <span className="text-[10px] text-foreground-muted italic">No decisions recorded yet.</span>
                      )}
                      {detailPrompt.approvals.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${a.decision === "APPROVED" ? "bg-emerald-500" : a.decision === "REJECTED" ? "bg-rose-500" : "bg-amber-500/40 border border-amber-500"}`} />
                          <span className="text-[10px] text-foreground-muted">{a.reviewer_role}</span>
                          <span className={`text-[10px] font-bold ${a.decision === "APPROVED" ? "text-emerald-400" : a.decision === "REJECTED" ? "text-rose-400" : "text-amber-400"}`}>
                            {a.decision === "APPROVED" ? "Approved" : a.decision === "REJECTED" ? "Rejected" : a.decision === "PENDING" ? "Pending" : a.decision}
                          </span>
                          {a.notes && <span className="text-[9px] text-foreground-muted italic">— {a.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision History */}
                  <div>
                    <div className="text-[10px] text-foreground-muted uppercase tracking-widest font-black mb-2">Decision History</div>
                    {detailPrompt.approvals.length === 0 ? (
                      <p className="text-[10px] text-foreground-muted italic">No review history yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-card/60">
                              {["Reviewer", "Decision", "Date", "Notes"].map((h) => (
                                <th key={h} className="py-2.5 px-4 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {detailPrompt.approvals.map((a, i) => (
                              <tr key={i}>
                                <td className="py-3 px-4 text-[11px] text-foreground">{a.reviewer_role}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${a.decision === "APPROVED" ? "text-emerald-400" : a.decision === "REJECTED" ? "text-rose-400" : "text-amber-400"}`}>
                                    {a.decision === "APPROVED" ? <CheckCircle2 className="w-3 h-3" /> : a.decision === "REJECTED" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                    {a.decision}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[10px] text-foreground-muted whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleString() : "—"}</td>
                                <td className="py-3 px-4 text-[10px] text-foreground-muted max-w-[200px] truncate">{a.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* D. Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => {
                        if (!detailPrompt.active_version_id) return;
                        setApprovalModal({
                          mode: 'confirm', versionId: detailPrompt.active_version_id, promptName: detailPrompt.name,
                          decision: 'APPROVED', title: `Approve "${detailPrompt.name}"?`,
                          message: 'This will move the prompt to APPROVED status and make it eligible for production deployment. This action is recorded in the Evidence Vault.',
                          variant: 'info', confirmLabel: 'Approve',
                        });
                      }}
                      disabled={!detailPrompt.active_version_id}
                      className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >Approve</button>
                    <button
                      disabled={!detailPrompt.active_version_id}
                      onClick={() => { if (detailPrompt.active_version_id) setRejectionModal({ versionId: detailPrompt.active_version_id, promptName: detailPrompt.name, title: `Request Changes for "${detailPrompt.name}"` }); }}
                      className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-50"
                    >Request Changes</button>
                    <button
                      onClick={() => { if (detailPrompt.active_version_id) setRejectionModal({ versionId: detailPrompt.active_version_id, promptName: detailPrompt.name, title: `Reject "${detailPrompt.name}"` }); }}
                      disabled={!detailPrompt.active_version_id}
                      className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-500/20 transition-all disabled:opacity-50"
                    >Reject</button>
                    {canWaive && (
                      <button
                        onClick={() => { if (detailPrompt.active_version_id) setWaiveModal({ versionId: detailPrompt.active_version_id, promptName: detailPrompt.name }); }}
                        disabled={!detailPrompt.active_version_id}
                        title="Waive outstanding review requirements with justification (governance override)"
                        className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      ><ShieldCheck className="w-3 h-3" /> Waive</button>
                    )}
                    {onExportPromptEvidence && (
                      <button
                        onClick={() => onExportPromptEvidence(detailPrompt, "reviews")}
                        className="px-4 py-2 bg-surface border border-border text-foreground-muted text-[10px] font-black uppercase tracking-widest rounded-lg hover:text-foreground hover:border-border transition-all flex items-center gap-1.5"
                      ><Download className="w-3 h-3" /> View Evidence</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approval Matrix — reference material, collapsed under Advanced */}
      <div className="space-y-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setMatrixOpen((v) => !v)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground transition-all"
        >
          <Wrench className="w-3.5 h-3.5" />
          Advanced — Risk-Based Approval Matrix
          {matrixOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {matrixOpen && (
          <>
            <div className="space-y-2">
              {APPROVAL_MATRIX.map((row) => (
                <div key={row.tier} className="flex items-start gap-4 p-4 bg-background border border-border rounded-2xl">
                  <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${row.color} min-w-[140px]`}>{row.tier}</span>
                  <span className="text-[10px] text-foreground-muted flex-1">{row.requirements}</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {row.roles.map((r) => (
                      <span key={r} className="text-[9px] font-black text-foreground-muted bg-surface border border-border px-2 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-foreground-muted leading-relaxed">
              Users may not approve their own prompt for production when the risk tier requires independent review. Every override must capture approver, reason, policy basis, expiration, and affected scope. Approval status is invalidated when risk-impacting sections change after approval.
            </p>
          </>
        )}
      </div>

      <ConfirmActionModal
        open={!!approvalModal}
        mode={approvalModal?.mode || 'confirm'}
        variant={approvalModal?.variant || 'danger'}
        title={approvalModal?.title || ''}
        message={approvalModal?.message || ''}
        confirmLabel={approvalModal?.confirmLabel}
        promptPlaceholder={approvalModal?.promptPlaceholder}
        onConfirm={handleApprovalConfirm}
        onCancel={() => setApprovalModal(null)}
      />

      {rejectionModal && (
        <RejectionModal
          title={rejectionModal.title}
          promptName={rejectionModal.promptName}
          onConfirm={(category, notes) => { onApprovalAction(rejectionModal.versionId, 'REJECTED', notes, category); setRejectionModal(null); }}
          onCancel={() => setRejectionModal(null)}
        />
      )}

      <ConfirmActionModal
        open={!!waiveModal}
        mode="confirm"
        variant="warning"
        requireReason
        reasonPlaceholder="Justification for waiving review requirements (policy basis, why it is safe)…"
        title={waiveModal ? `Waive review for "${waiveModal.promptName}"` : ''}
        message="Waiving completes the review chain under governance override and records an immutable audit event. Hard safety/compliance gates cannot be waived."
        confirmLabel="Waive with Justification"
        onConfirm={(value) => { if (waiveModal) { onWaive(waiveModal.versionId, (value || '').trim()); setWaiveModal(null); } }}
        onCancel={() => setWaiveModal(null)}
      />
    </div>
  );
}

// ─── Tab: Evidence ─────────────────────────────────────────────────────────────
// Governance audit and traceability view. Read-only decisions, runtime traces,
// evidence receipts, and audit entries.

const EVIDENCE_DECISION_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: CheckCircle2 },
  REVIEWED: { label: "Reviewed", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", icon: Eye },
  BLOCKED: { label: "Blocked", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25", icon: XCircle },
  REJECTED: { label: "Rejected", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25", icon: XCircle },
  WAIVED: { label: "Waived", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", icon: AlertTriangle },
  CHANGES_REQUESTED: { label: "Changes Requested", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", icon: AlertTriangle },
};

function EvidenceTab({
  prompts,
  auditStats,
  onExportPromptEvidence,
}: {
  prompts: PromptRecord[];
  auditStats: AuditStats | null;
  onExportPromptEvidence: (prompt: PromptRecord, context: string) => void;
}) {
  // Sub-tab navigation removed — the Evidence tab shows the Governance Decisions view only.
  const section: string = "decisions";

  const productionPrompts = prompts.filter((p) => p.status === "PRODUCTION_ACTIVE");
  const deployedPrompts = prompts.filter((p) => p.last_deployed);
  const allApprovals = prompts.flatMap((p) => p.approvals);

  // KPI data
  const totalDecisions = allApprovals.length;
  const approvedCount = allApprovals.filter((a) => a.decision === "APPROVED").length;
  const reviewedCount = allApprovals.filter((a) => a.decision === "PENDING" || a.decision === "CHANGES_REQUESTED").length;
  const blockedCount = allApprovals.filter((a) => a.decision === "REJECTED").length;
  const evidenceReceiptsCount = productionPrompts.length;
  const governanceEventsCount = auditStats?.total ?? allApprovals.length;
  const runtimeEvidenceCount = deployedPrompts.length;
  const auditEntriesCount = allApprovals.length;

  const hasAnyEvidence = totalDecisions > 0 || runtimeEvidenceCount > 0 || evidenceReceiptsCount > 0 || governanceEventsCount > 0;

  // Decisions derived from approvals
  const decisions = allApprovals.map((a, i) => ({
    id: `dec-${i}`,
    type: a.decision === "APPROVED" ? "Approved" as const : a.decision === "REJECTED" ? "Rejected" as const : a.decision === "CHANGES_REQUESTED" ? "Changes Requested" as const : "Reviewed" as const,
    actor: a.reviewer_role,
    role: a.reviewer_role,
    timestamp: a.timestamp,
    reason: a.notes || "—",
    result: a.decision,
  }));

  return (
    <div className="space-y-6">
      {hasAnyEvidence ? (
        <>
          {/* KPI summary strip — 2×4 grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Decisions", value: totalDecisions, color: "text-foreground" },
              { label: "Approvals", value: approvedCount, color: "text-emerald-400" },
              { label: "Reviews", value: reviewedCount, color: "text-blue-400" },
              { label: "Blocks", value: blockedCount, color: "text-rose-400" },
              { label: "Evidence Receipts", value: evidenceReceiptsCount, color: "text-indigo-400" },
              { label: "Governance Events", value: governanceEventsCount, color: "text-amber-400" },
              { label: "Runtime Evidence", value: runtimeEvidenceCount, color: "text-cyan-400" },
              { label: "Audit Entries", value: auditEntriesCount, color: "text-foreground" },
            ].map((k) => (
              <div key={k.label} className="bg-background border border-border rounded-2xl p-3 text-center">
                <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
                <div className="text-[8px] font-black text-foreground-muted uppercase tracking-widest mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* 1. Governance Decisions */}
          {section === "decisions" && (
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <div className="p-8 text-center text-sm text-foreground-muted bg-background border border-border rounded-2xl">No governance decisions recorded yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-card/60">
                        {["Decision", "Actor / Reviewer", "Role", "Timestamp", "Reason / Notes", "Result"].map((h) => (
                          <th key={h} className="py-3 px-4 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {decisions.map((d) => {
                        const meta = EVIDENCE_DECISION_META[d.result] || EVIDENCE_DECISION_META.REVIEWED;
                        const DIcon = meta.icon;
                        return (
                          <tr key={d.id} className="hover:bg-surface/30 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${meta.color} ${meta.bg} border ${meta.border}`}>
                                <DIcon className="w-3 h-3" />
                                {d.type}
                              </span>
                            </td>
                            <td className="py-3 px-4"><span className="text-[11px] text-foreground">{d.actor}</span></td>
                            <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted">{d.role}</span></td>
                            <td className="py-3 px-4 whitespace-nowrap"><span className="text-[10px] text-foreground-muted">{d.timestamp ? new Date(d.timestamp).toLocaleString() : "—"}</span></td>
                            <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted max-w-[220px] truncate block" title={d.reason}>{d.reason}</span></td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. Runtime Evidence */}
          {section === "runtime" && (
            <div className="space-y-3">
              {runtimeEvidenceCount === 0 ? (
                <div className="p-8 text-center text-sm text-foreground-muted bg-background border border-border rounded-2xl">No runtime evidence available yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-card/60">
                        {["Prompt Version", "Model Used", "Knowledge Retrieved", "Tool Calls", "Policy Result", "Output Status", "Timestamp", "Evidence ID"].map((h) => (
                          <th key={h} className="py-3 px-3 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deployedPrompts.map((p) => (
                        <tr key={p.id} className="hover:bg-surface/30 transition-colors">
                          <td className="py-3 px-3"><span className="text-xs font-bold text-foreground max-w-[140px] truncate block" title={p.name}>{p.name}</span></td>
                          <td className="py-3 px-3"><span className="text-[10px] text-foreground-muted">{p.metadata?.model || "claude-sonnet-4-20250514"}</span></td>
                          <td className="py-3 px-3"><span className="text-[10px] text-foreground-muted">{p.knowledge_sources.length > 0 ? `${p.knowledge_sources.length} source(s)` : "—"}</span></td>
                          <td className="py-3 px-3"><span className="text-[10px] text-foreground-muted">{p.tools_permitted.length > 0 ? `${p.tools_permitted.length} tool(s)` : "—"}</span></td>
                          <td className="py-3 px-3"><StatusBadge status={p.status} /></td>
                          <td className="py-3 px-3"><span className="text-[10px] text-foreground-muted">{p.status === "PRODUCTION_ACTIVE" ? "Active" : p.status === "PAUSED" ? "Paused" : p.status === "RETIRED" ? "Retired" : "—"}</span></td>
                          <td className="py-3 px-3 whitespace-nowrap"><span className="text-[10px] text-foreground-muted">{p.last_deployed ? new Date(p.last_deployed).toLocaleString() : "—"}</span></td>
                          <td className="py-3 px-3">
                            <span className="text-[9px] font-mono text-foreground-muted">—</span>
                            <button
                              onClick={() => onExportPromptEvidence(p, "evidence_tab")}
                              className="ml-2 p-1 bg-background border border-border rounded text-foreground-muted hover:text-foreground hover:border-border transition-all"
                              title="Export evidence"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. Evidence Receipts */}
          {section === "receipts" && (
            <div className="space-y-3">
              {evidenceReceiptsCount === 0 ? (
                <div className="p-8 text-center text-sm text-foreground-muted bg-background border border-border rounded-2xl">No evidence receipts available yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-card/60">
                        {["Evidence ID", "Receipt Type", "Evidence Hash", "Created At", "Environment", "Scope"].map((h) => (
                          <th key={h} className="py-3 px-4 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productionPrompts.map((p) => (
                        <tr key={p.id} className="hover:bg-surface/30 transition-colors">
                          <td className="py-3 px-4"><span className="text-[10px] font-mono text-foreground-muted">—</span></td>
                          <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted">Governance Receipt</span></td>
                          <td className="py-3 px-4"><span className="text-[10px] font-mono text-foreground-muted">—</span></td>
                          <td className="py-3 px-4 whitespace-nowrap"><span className="text-[10px] text-foreground-muted">{p.last_deployed ? new Date(p.last_deployed).toLocaleString() : "—"}</span></td>
                          <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted">{p.status === "PRODUCTION_ACTIVE" ? "Production" : "Staging"}</span></td>
                          <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted">Prompt: {p.name}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Audit Entries */}
          {section === "audit" && (
            <div className="space-y-3">
              {auditEntriesCount === 0 ? (
                <div className="p-8 text-center text-sm text-foreground-muted bg-background border border-border rounded-2xl">No audit entries available yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-card/60">
                        {["Event Type", "Actor", "Timestamp", "Affected Object", "Summary"].map((h) => (
                          <th key={h} className="py-3 px-4 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allApprovals.map((a, i) => {
                        const meta = EVIDENCE_DECISION_META[a.decision] || EVIDENCE_DECISION_META.REVIEWED;
                        const AIcon = meta.icon;
                        const affected = prompts.find((p) => p.approvals.includes(a));
                        return (
                          <tr key={i} className="hover:bg-surface/30 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
                                <AIcon className="w-3 h-3" />
                                {a.decision}
                              </span>
                            </td>
                            <td className="py-3 px-4"><span className="text-[11px] text-foreground">{a.reviewer_role}</span></td>
                            <td className="py-3 px-4 whitespace-nowrap"><span className="text-[10px] text-foreground-muted">{a.timestamp ? new Date(a.timestamp).toLocaleString() : "—"}</span></td>
                            <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted max-w-[160px] truncate block">{affected?.name || "—"}</span></td>
                            <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted max-w-[200px] truncate block" title={a.notes}>{a.notes || "—"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="text-center py-16">
          <ShieldCheck className="w-10 h-10 text-foreground-muted mx-auto mb-4" />
          <div className="text-base font-bold text-foreground">No Evidence Recorded</div>
          <p className="text-[12px] text-foreground-muted mt-2 max-w-sm mx-auto">This prompt has not generated governance evidence yet. Evidence will appear after approvals, reviews, runtime checks, audit events, or governed executions.</p>
        </div>
      )}
    </div>
  );
}

// ─── Guardrails Governance ───────────────────────────────────────────────────
// Governance-focused rule management surface. Policies, constraints, and
// enforcement actions applied to the prompt. Read-only for non-governance users.

type GovernanceRuleCategory = "safety" | "compliance" | "brand" | "knowledge";
type GovernanceRuleStatus = "active" | "inactive" | "retired";
type GovernanceMatchAction = "approve" | "review" | "block";

interface GovernanceRule {
  id: string;
  name: string;
  category: GovernanceRuleCategory;
  status: GovernanceRuleStatus;
  matchAction: GovernanceMatchAction;
  lastUpdated: string;
  ruleSource?: string;
  policySource?: string;
  policyVersion?: string;
  lastModifiedBy?: string;
}

const RULE_CATEGORY_META: Record<GovernanceRuleCategory, { label: string; color: string; bg: string; border: string }> = {
  safety: { label: "Safety", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
  compliance: { label: "Compliance", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  brand: { label: "Brand", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25" },
  knowledge: { label: "Knowledge", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
};

const RULE_STATUS_META: Record<GovernanceRuleStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: CheckCircle2 },
  inactive: { label: "Inactive", color: "text-foreground-muted", bg: "bg-surface", border: "border-slate-700", icon: XCircle },
  retired: { label: "Retired", color: "text-foreground-muted", bg: "bg-surface", border: "border-border", icon: Archive },
};

const MATCH_ACTION_META: Record<GovernanceMatchAction, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  approve: { label: "Approve", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: CheckCircle2 },
  review: { label: "Review", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", icon: AlertTriangle },
  block: { label: "Block", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25", icon: XCircle },
};

const RULE_CATEGORY_LIST: { id: GovernanceRuleCategory; label: string }[] = [
  { id: "safety", label: "Safety" },
  { id: "compliance", label: "Compliance" },
  { id: "brand", label: "Brand" },
  { id: "knowledge", label: "Knowledge" },
];

const RULE_STATUS_LIST: { id: GovernanceRuleStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
  { id: "retired", label: "Retired" },
];

const MATCH_ACTION_LIST: { id: GovernanceMatchAction; label: string }[] = [
  { id: "approve", label: "Approve" },
  { id: "review", label: "Review" },
  { id: "block", label: "Block" },
];

const GOVERNANCE_ROLES = ["ADMIN", "GOVERNANCE_ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "COMPLIANCE_REVIEWER", "SECURITY_REVIEWER"];

function canGovern(role: string): boolean {
  return GOVERNANCE_ROLES.includes(String(role || "").toUpperCase().replace(/\s+/g, "_"));
}

function GuardrailGovernanceTab({
  promptId,
  versionId,
  role,
}: {
  promptId: string;
  versionId?: string;
  role: string;
}) {
  const [rules, setRules] = useState<GovernanceRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userCanGovern = canGovern(role);

  // Map old guardrail_json categories to new governance categories.
  const CATEGORY_MAP: Record<string, GovernanceRuleCategory> = {
    policy_rule: "compliance",
    prohibited_instruction: "safety",
    claim_rule: "knowledge",
    safety_block: "safety",
    escalation_trigger: "compliance",
    refusal_rule: "safety",
  };

  const MATCH_MAP: Record<string, GovernanceMatchAction> = {
    policy_rule: "review",
    prohibited_instruction: "block",
    claim_rule: "review",
    safety_block: "block",
    escalation_trigger: "review",
    refusal_rule: "block",
  };

  useEffect(() => {
    if (!versionId) return;
    setLoading(true);
    setError(null);
    api.get(`/api/v1/prompts/${promptId}/versions/${versionId}`)
      .then((res) => {
        const gj = res?.data?.guardrails_json;
        const parsed = typeof gj === "string" ? (() => { try { return JSON.parse(gj); } catch { return null; } })() : gj;
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rules) ? parsed.rules : [];
        const mapped: GovernanceRule[] = list.map((g: any, i: number) => {
          const oldCat: string = g?.category || "policy_rule";
          return {
            id: g?.id || `rule-${i}`,
            name: String(g?.rule || g?.name || "Untitled Rule").slice(0, 80),
            category: g?.governance_category || CATEGORY_MAP[oldCat] || "compliance",
            status: g?.enabled !== false ? "active" : "inactive" as GovernanceRuleStatus,
            matchAction: g?.match_action || MATCH_MAP[oldCat] || "review",
            lastUpdated: g?.updated_at || g?.last_updated || "",
            ruleSource: g?.rule_source || g?.source || undefined,
            policySource: g?.policy_source || undefined,
            policyVersion: g?.policy_version || undefined,
            lastModifiedBy: g?.last_modified_by || g?.modified_by || undefined,
          };
        });
        setRules(mapped);
      })
      .catch(() => setError("Failed to load guardrails."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptId, versionId]);

  const saveRules = async (updated: GovernanceRule[]) => {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/v1/prompts/versions/${versionId}/guardrails`, {
        guardrails: {
          rules: updated.map((r) => ({
            id: r.id,
            name: r.name,
            rule: r.name,
            governance_category: r.category,
            enabled: r.status === "active",
            match_action: r.matchAction,
            status: r.status,
            updated_at: new Date().toISOString(),
          })),
        },
      });
    } catch {
      setError("Failed to persist governance rule changes. Changes may not survive refresh.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: GovernanceRuleStatus) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
    setRules(updated);
    saveRules(updated);
  };

  const handleActionChange = (id: string, newAction: GovernanceMatchAction) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, matchAction: newAction } : r));
    setRules(updated);
    saveRules(updated);
  };

  // KPI calculations
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.status === "active").length;
  const reviewRules = rules.filter((r) => r.matchAction === "review").length;
  const blockRules = rules.filter((r) => r.matchAction === "block").length;

  if (!versionId) {
    return (
      <div className="text-center py-10">
        <ShieldCheck className="w-8 h-8 text-foreground-muted mx-auto mb-3" />
        <div className="text-sm font-bold text-foreground">No Guardrails Configured</div>
        <p className="text-[11px] text-foreground-muted mt-2 max-w-md mx-auto">This prompt currently has no active governance rules. Add governance policies from Policy Center to enable safety, compliance, brand, and knowledge enforcement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Rules", value: totalRules, color: "text-foreground" },
          { label: "Active Rules", value: activeRules, color: "text-emerald-400" },
          { label: "Review Rules", value: reviewRules, color: "text-amber-400" },
          { label: "Block Rules", value: blockRules, color: "text-rose-400" },
        ].map((k) => (
          <div key={k.label} className="bg-background border border-border rounded-2xl p-4 text-center">
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-[9px] font-black text-foreground-muted uppercase tracking-widest mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Save indicator */}
      {saving && (
        <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-black uppercase tracking-widest">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-foreground-muted justify-center"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading guardrails…</span></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-10">
          <ShieldCheck className="w-8 h-8 text-foreground-muted mx-auto mb-3" />
          <div className="text-sm font-bold text-foreground">No Guardrails Configured</div>
          <p className="text-[11px] text-foreground-muted mt-2 max-w-md mx-auto">This prompt currently has no active governance rules. Add governance policies from Policy Center to enable safety, compliance, brand, and knowledge enforcement.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-card/60">
                {["Rule Name", "Category", "Status", "Match Action", "Last Updated"].map((h) => (
                  <th key={h} className="py-3 px-4 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map((r) => {
                const catMeta = RULE_CATEGORY_META[r.category];
                const statMeta = RULE_STATUS_META[r.status];
                const actMeta = MATCH_ACTION_META[r.matchAction];
                const StatIcon = statMeta.icon;
                const ActIcon = actMeta.icon;
                return (
                  <tr key={r.id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-xs font-bold text-foreground max-w-[200px] truncate" title={r.name}>{r.name}</div>
                      {(r.ruleSource || r.policySource) && (
                        <div className="text-[9px] text-foreground-muted mt-0.5">
                          {r.ruleSource && <span>Source: {r.ruleSource}</span>}
                          {r.policySource && <span>{r.ruleSource ? " · " : ""}Policy: {r.policySource}{r.policyVersion ? ` v${r.policyVersion}` : ""}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${catMeta.color} ${catMeta.bg} border ${catMeta.border}`}>
                        {catMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {userCanGovern ? (
                        <select
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.id, e.target.value as GovernanceRuleStatus)}
                          className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none focus:border-indigo-500"
                          disabled={saving}
                        >
                          {RULE_STATUS_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statMeta.color} ${statMeta.bg} border ${statMeta.border}`}>
                          <StatIcon className="w-3 h-3" />
                          {statMeta.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {userCanGovern ? (
                        <select
                          value={r.matchAction}
                          onChange={(e) => handleActionChange(r.id, e.target.value as GovernanceMatchAction)}
                          className="bg-card border border-border rounded-lg px-2 py-1.5 text-[10px] text-foreground outline-none focus:border-indigo-500"
                          disabled={saving}
                        >
                          {MATCH_ACTION_LIST.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${actMeta.color} ${actMeta.bg} border ${actMeta.border}`}>
                          <ActIcon className="w-3 h-3" />
                          {actMeta.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] text-foreground-muted whitespace-nowrap">{r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : "—"}</span>
                      {r.lastModifiedBy && <div className="text-[9px] text-foreground-muted">{r.lastModifiedBy}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Knowledge Sources Connected ─────────────────────────────────────────────
// Governance visibility panel for Knowledge Base dependencies connected to
// this prompt. Read-only. Shows source governance metadata.

interface GovernanceKnowledgeSource {
  id: string;
  name: string;
  category: string;
  status: "active" | "retired";
  matchAction: "approve" | "review" | "block";
  retrievalMode: "mandatory" | "optional" | "blocked";
  citationRequired: boolean;
  freshnessRule: string;
  collectionName?: string;
  documentType?: string;
  sourceOwner?: string;
  lastUpdated?: string;
  freshnessThreshold?: string;
  restrictedSource?: boolean;
}

const KNOWN_SOURCE_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: CheckCircle2 },
  retired: { label: "Retired", color: "text-foreground-muted", bg: "bg-surface", border: "border-border", icon: Archive },
};

const SOURCE_MATCH_ACTION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approve: { label: "Approve", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  review: { label: "Review", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  block: { label: "Block", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
};

const RETRIEVAL_MODE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  mandatory: { label: "Mandatory", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  optional: { label: "Optional", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  blocked: { label: "Blocked", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
};

function KnowledgeSourcesTab({ prompt }: { prompt: PromptRecord }) {
  const [sources, setSources] = useState<GovernanceKnowledgeSource[]>([]);
  const [loading, setLoading] = useState(false);
  const gov = deriveGovernance(prompt);
  const govCat = gov.category !== "—" ? gov.category : "Knowledge";

  useEffect(() => {
    setLoading(true);
    // Try fetching enriched governance source data from the backend.
    api.get(`/api/v1/prompts/${prompt.id}/governance-sources`)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setSources(res.data.map((s: any) => ({
            id: s.id || s.name || `src-${Math.random().toString(36).slice(2, 8)}`,
            name: s.name || s.source_name || "Unknown Source",
            category: s.category || s.governance_category || govCat,
            status: (s.status === "retired" ? "retired" : "active") as "active" | "retired",
            matchAction: (s.match_action || s.matchAction || "review") as "approve" | "review" | "block",
            retrievalMode: (s.retrieval_mode || s.retrievalMode || "optional") as "mandatory" | "optional" | "blocked",
            citationRequired: s.citation_required !== false && s.citationRequired !== false,
            freshnessRule: s.freshness_rule || s.freshnessRule || "—",
            collectionName: s.collection_name || s.collectionName || undefined,
            documentType: s.document_type || s.documentType || undefined,
            sourceOwner: s.source_owner || s.sourceOwner || undefined,
            lastUpdated: s.last_updated || s.lastUpdated || undefined,
            freshnessThreshold: s.freshness_threshold || s.freshnessThreshold || undefined,
            restrictedSource: s.restricted_source === true || s.restrictedSource === true,
          })));
        }
      })
      .catch(() => { /* fall through to bridge */ })
      .finally(() => setLoading(false));
  }, [prompt.id, govCat]);

  // Bridge: if API returned nothing, derive from prompt.knowledge_sources.
  const displaySources: GovernanceKnowledgeSource[] = sources.length > 0 ? sources : prompt.knowledge_sources.map((name, i) => ({
    id: `ks-${i}`,
    name,
    category: govCat,
    status: "active" as const,
    matchAction: "review" as const,
    retrievalMode: "optional" as const,
    citationRequired: true,
    freshnessRule: "—",
    collectionName: undefined,
    documentType: undefined,
    sourceOwner: undefined,
    lastUpdated: undefined,
    freshnessThreshold: undefined,
    restrictedSource: undefined,
  }));

  const sourceCount = displaySources.length;
  const activeSources = displaySources.filter((s) => s.status === "active").length;
  const retiredSources = displaySources.filter((s) => s.status === "retired").length;
  const citationRequiredCount = displaySources.filter((s) => s.citationRequired).length;

  return (
    <div className="space-y-5">
      {/* KPI summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Source Count", value: sourceCount, color: "text-foreground" },
          { label: "Active Sources", value: activeSources, color: "text-emerald-400" },
          { label: "Retired Sources", value: retiredSources, color: "text-foreground-muted" },
          { label: "Citation Required", value: citationRequiredCount, color: "text-amber-400" },
        ].map((k) => (
          <div key={k.label} className="bg-background border border-border rounded-2xl p-4 text-center">
            <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
            <div className="text-[9px] font-black text-foreground-muted uppercase tracking-widest mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-foreground-muted justify-center"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading knowledge sources…</span></div>
      ) : displaySources.length === 0 ? (
        <div className="text-center py-10">
          <BookOpen className="w-8 h-8 text-foreground-muted mx-auto mb-3" />
          <div className="text-sm font-bold text-foreground">No Knowledge Sources Connected</div>
          <p className="text-[11px] text-foreground-muted mt-2 max-w-md mx-auto">This prompt currently has no governed Knowledge Base sources connected. Connect approved sources from Knowledge Base to enable grounded, citation-aware prompt execution.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-card/60">
                {["Source Name", "Category", "Status", "Match Action", "Retrieval Mode", "Citation", "Freshness Rule"].map((h) => (
                  <th key={h} className="py-3 px-3 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displaySources.map((s) => {
                const statMeta = KNOWN_SOURCE_STATUS_META[s.status] || KNOWN_SOURCE_STATUS_META.active;
                const actMeta = SOURCE_MATCH_ACTION_META[s.matchAction] || SOURCE_MATCH_ACTION_META.review;
                const retMeta = RETRIEVAL_MODE_META[s.retrievalMode] || RETRIEVAL_MODE_META.optional;
                const StatIcon = statMeta.icon;
                return (
                  <tr key={s.id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-foreground max-w-[180px] truncate" title={s.name}>{s.name}</span>
                      </div>
                      {(s.collectionName || s.documentType) && (
                        <div className="text-[9px] text-foreground-muted mt-0.5 ml-5.5">
                          {s.collectionName && <span>Collection: {s.collectionName}</span>}
                          {s.documentType && <span>{s.collectionName ? " · " : ""}{s.documentType}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[10px] text-foreground-muted font-bold">{s.category}</span>
                      {s.restrictedSource && (
                        <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 uppercase tracking-widest">Restricted</span>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statMeta.color} ${statMeta.bg} border ${statMeta.border}`}>
                        <StatIcon className="w-3 h-3" />
                        {statMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${actMeta.color} ${actMeta.bg} border ${actMeta.border}`}>
                        {actMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${retMeta.color} ${retMeta.bg} border ${retMeta.border}`}>
                        {retMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.citationRequired ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25" : "text-foreground-muted bg-surface border border-border"}`}>
                        {s.citationRequired ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {s.citationRequired ? "Required" : "Not Required"}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[10px] text-foreground-muted">{s.freshnessRule !== "—" ? s.freshnessRule : "—"}</span>
                      {(s.lastUpdated || s.sourceOwner) && (
                        <div className="text-[9px] text-foreground-muted mt-0.5">
                          {s.sourceOwner && <span>Owner: {s.sourceOwner}</span>}
                          {s.lastUpdated && <span>{s.sourceOwner ? " · " : ""}{new Date(s.lastUpdated).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Governance Activity Log ─────────────────────────────────────────────────
// Read-only governance lifecycle timeline. Shows what happened to the prompt
// from a governance perspective.

const ACTIVITY_EVENT_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  created: { label: "Created", color: "text-indigo-400", icon: Plus },
  submitted: { label: "Submitted", color: "text-blue-400", icon: ArrowRight },
  approved: { label: "Approved", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-rose-400", icon: XCircle },
  changes_requested: { label: "Changes Requested", color: "text-amber-400", icon: AlertTriangle },
  waived: { label: "Waived", color: "text-amber-400", icon: ShieldCheck },
  paused: { label: "Paused", color: "text-orange-400", icon: PauseCircle },
  resumed: { label: "Resumed", color: "text-emerald-400", icon: Play },
  retired: { label: "Retired", color: "text-foreground-muted", icon: Archive },
  source_added: { label: "Source Added", color: "text-emerald-400", icon: BookOpen },
  source_retired: { label: "Source Retired", color: "text-foreground-muted", icon: BookOpen },
  guardrail_updated: { label: "Guardrail Updated", color: "text-rose-400", icon: ShieldCheck },
  workflow_binding_updated: { label: "Workflow Binding Updated", color: "text-indigo-400", icon: GitBranch },
  agent_binding_updated: { label: "Agent Binding Updated", color: "text-cyan-400", icon: Cpu },
  evidence_exported: { label: "Evidence Exported", color: "text-amber-400", icon: Download },
  runtime_violation: { label: "Runtime Violation", color: "text-rose-400", icon: ShieldAlert },
  review_completed: { label: "Review Completed", color: "text-blue-400", icon: Eye },
};

function GovernanceActivityLog({
  prompt,
  auditEvents,
  loading,
}: {
  prompt: PromptRecord;
  auditEvents: any[];
  loading: boolean;
}) {
  // Derive governance events from the prompt record as a supplement.
  const derivedEvents = useMemo(() => {
    const events: {
      id: string;
      type: string;
      actor: string;
      role: string;
      timestamp: string;
      summary: string;
      result: string;
      relatedEvidenceId?: string;
    }[] = [];

    // From approvals
    prompt.approvals.forEach((a, i) => {
      const eventType = a.decision === "APPROVED" ? "approved" : a.decision === "REJECTED" ? "rejected" : a.decision === "CHANGES_REQUESTED" ? "changes_requested" : "review_completed";
      events.push({
        id: `appr-${i}`,
        type: eventType,
        actor: a.reviewer_role,
        role: a.reviewer_role,
        timestamp: a.timestamp,
        summary: a.notes || `Decision: ${a.decision}`,
        result: a.decision,
      });
    });

    // From status
    if (prompt.status === "PAUSED") {
      events.push({
        id: "status-paused",
        type: "paused",
        actor: "system",
        role: "system",
        timestamp: prompt.updated_at || prompt.last_deployed || "",
        summary: "Prompt paused by governance action",
        result: "PAUSED",
      });
    }
    if (prompt.status === "PRODUCTION_ACTIVE") {
      events.push({
        id: "status-active",
        type: "resumed",
        actor: "system",
        role: "system",
        timestamp: prompt.last_deployed || prompt.updated_at || "",
        summary: "Prompt is production active",
        result: "ACTIVE",
      });
    }
    if (prompt.status === "RETIRED") {
      events.push({
        id: "status-retired",
        type: "retired",
        actor: "system",
        role: "system",
        timestamp: prompt.updated_at || "",
        summary: "Prompt retired from active use",
        result: "RETIRED",
      });
    }

    // From knowledge sources
    if (prompt.knowledge_sources.length > 0) {
      events.push({
        id: "ks-added",
        type: "source_added",
        actor: "system",
        role: "system",
        timestamp: prompt.updated_at || "",
        summary: `${prompt.knowledge_sources.length} Knowledge Base source(s) connected`,
        result: "CONNECTED",
      });
    }

    return events;
  }, [prompt]);

  // Merge backend audit events and derived events, sorted by timestamp desc.
  const allEvents = useMemo(() => {
    const mappedAudit = auditEvents.map((e: any, i: number) => {
      const rawType = String(e.event_type || e.action || "event").replace(/^prompt\./, "").replace(/[._]/g, "_").toLowerCase();
      return {
        id: e.id || `audit-${i}`,
        type: rawType,
        actor: e.actor_name || e.actor_id || e.created_by || "—",
        role: e.actor_role || e.actor_name || "—",
        timestamp: e.created_at || e.timestamp || "",
        summary: e.reason || e.description || "—",
        result: e.result || e.status || "—",
        relatedEvidenceId: e.evidence_id || undefined,
      };
    });

    const combined = [...mappedAudit, ...derivedEvents];
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return combined;
  }, [auditEvents, derivedEvents]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-xs text-foreground-muted">Loading governance history…</span>
        </div>
      ) : allEvents.length === 0 ? (
        <div className="text-center py-10">
          <History className="w-8 h-8 text-foreground-muted mx-auto mb-3" />
          <div className="text-sm font-bold text-foreground">No Governance Activity Yet</div>
          <p className="text-[11px] text-foreground-muted mt-2 max-w-md mx-auto">Governance lifecycle events will appear here after reviews, approvals, source changes, guardrail updates, runtime violations, pauses, resumes, or evidence exports.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-card/60">
                {["Event Type", "Actor", "Role", "Timestamp", "Summary", "Result / Status", "Evidence ID"].map((h) => (
                  <th key={h} className="py-3 px-4 text-[9px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allEvents.map((ev) => {
                const meta = ACTIVITY_EVENT_META[ev.type] || ACTIVITY_EVENT_META.created;
                const AIcon = meta.icon;
                return (
                  <tr key={ev.id} className="hover:bg-surface/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
                        <AIcon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4"><span className="text-[11px] text-foreground">{ev.actor}</span></td>
                    <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted">{ev.role}</span></td>
                    <td className="py-3 px-4 whitespace-nowrap"><span className="text-[10px] text-foreground-muted">{ev.timestamp ? new Date(ev.timestamp).toLocaleString() : "—"}</span></td>
                    <td className="py-3 px-4"><span className="text-[10px] text-foreground-muted max-w-[220px] truncate block" title={ev.summary}>{ev.summary}</span></td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-background border border-border text-foreground">{ev.result}</span>
                    </td>
                    <td className="py-3 px-4"><span className="text-[9px] font-mono text-foreground-muted">{ev.relatedEvidenceId || "—"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── A3: Inline Pre-Submit Validation (Doc 3 §12) ───────────────────────────────
// Computes blocking/warning checks from REAL data: the prompt record + the live
// governance snapshot (degraded dependencies + approval validity). No fakes.

type ValidationLevel = "pass" | "warning" | "blocking";
interface ValidationCheck { key: string; label: string; level: ValidationLevel; detail: string; }

function PreSubmitValidation({ prompt, onResult }: { prompt: PromptRecord; onResult: (hasBlocking: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [advChecksOpen, setAdvChecksOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/api/v1/prompts/${prompt.id}/governance-snapshot`)
      .then((res) => { if (!cancelled) setSnapshot(res?.success ? res.data : null); })
      .catch(() => { if (!cancelled) setSnapshot(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [prompt.id]);

  const checks = useMemo<ValidationCheck[]>(() => {
    const degraded: any[] = Array.isArray(snapshot?.degraded_dependencies) ? snapshot.degraded_dependencies : [];
    const typeOf = (d: any) => String(d?.dependency_type || d?.type || "").toLowerCase();
    const knowledgeDegraded = degraded.filter((d) => ["knowledge", "collection"].includes(typeOf(d)));
    const toolDegraded = degraded.filter((d) => typeOf(d) === "tool");
    const approvalInvalidated = snapshot?.approval_validity?.invalidated === true;
    const hasRejected = prompt.approvals.some((a) => a.decision === "REJECTED");
    const ownerMissing = !prompt.owner || ["unknown", "—", ""].includes(String(prompt.owner).toLowerCase());
    const riskMissing = !prompt.risk_tier;

    // "Variables Tested" was removed — the platform is no longer centered on
    // user-authored prompt templates. "Knowledge bindings available" is the only
    // primary check; the rest are governance gates surfaced under Advanced.
    return [
      { key: "knowledge", label: "Knowledge bindings available", level: knowledgeDegraded.length ? "blocking" : "pass", detail: knowledgeDegraded.length ? `${knowledgeDegraded.length} knowledge source(s) unavailable.` : "All bound knowledge sources available." },
      { key: "owner", label: "Owner assigned", level: ownerMissing ? "blocking" : "pass", detail: ownerMissing ? "Assign an owner before submitting for review." : String(prompt.owner) },
      { key: "risk", label: "Risk tier set", level: riskMissing ? "blocking" : "pass", detail: riskMissing ? "Set a risk tier." : RISK_META[normalizeRiskTier(prompt.risk_tier)].label },
      { key: "tools", label: "Tools approved & available", level: toolDegraded.length ? "blocking" : "pass", detail: toolDegraded.length ? `${toolDegraded.length} tool binding(s) unapproved or unavailable.` : "No unapproved tools." },
      { key: "approval", label: "No approval conflicts", level: approvalInvalidated ? "blocking" : hasRejected ? "warning" : "pass", detail: approvalInvalidated ? (snapshot?.approval_validity?.reason || "Approval invalidated by a risk-impacting change.") : hasRejected ? "A prior reviewer rejected this version." : "No approval conflicts." },
    ];
  }, [snapshot, prompt]);

  const primaryChecks = useMemo(() => checks.filter((c) => c.key === "knowledge"), [checks]);
  const advancedChecks = useMemo(() => checks.filter((c) => c.key !== "knowledge"), [checks]);

  const hasBlocking = checks.some((c) => c.level === "blocking");
  useEffect(() => { if (!loading) onResult(hasBlocking); }, [loading, hasBlocking, onResult]);

  const ICON: Record<ValidationLevel, { icon: React.ElementType; cls: string }> = {
    pass: { icon: CheckCircle2, cls: "text-emerald-400" },
    warning: { icon: AlertTriangle, cls: "text-amber-400" },
    blocking: { icon: XCircle, cls: "text-rose-400" },
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${hasBlocking ? "border-rose-500/20 bg-rose-500/5" : "border-emerald-500/15 bg-emerald-500/5"}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className={`w-3.5 h-3.5 ${hasBlocking ? "text-rose-400" : "text-emerald-400"}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Pre-Submit Validation</span>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-foreground-muted" />}
        <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${hasBlocking ? "text-rose-400" : "text-emerald-400"}`}>{hasBlocking ? "Blocked" : "Ready"}</span>
      </div>
      <div className="space-y-1.5">
        {primaryChecks.map((c) => {
          const { icon: Icon, cls } = ICON[c.level];
          return (
            <div key={c.key} className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cls}`} />
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-foreground">{c.label}</span>
                <span className="text-[10px] text-foreground-muted"> — {c.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Owner / Risk / Tools / Approval gates remain enforced but are collapsed. */}
      <button
        type="button"
        onClick={() => setAdvChecksOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground transition-all"
      >
        {advChecksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Advanced checks
        {advancedChecks.some((c) => c.level === "blocking") && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
      </button>
      {advChecksOpen && (
        <div className="space-y-1.5 pl-1">
          {advancedChecks.map((c) => {
            const { icon: Icon, cls } = ICON[c.level];
            return (
              <div key={c.key} className="flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cls}`} />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-foreground">{c.label}</span>
                  <span className="text-[10px] text-foreground-muted"> — {c.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {hasBlocking && <p className="text-[10px] text-rose-400/80 leading-relaxed">Resolve the blocking items above before submitting for review. Warnings do not block submission.</p>}
    </div>
  );
}

// ─── A4: Post-Deployment Confirmation (Doc 3 §12) ────────────────────────────────
function DeploymentConfirmation({ data, prompt, onClose }: {
  data: any;
  prompt: PromptRecord;
  onClose: () => void;
}) {
  const [affectedAgents, setAffectedAgents] = useState<string[]>([]);
  const [affectedWorkflows, setAffectedWorkflows] = useState<string[]>([]);

  useEffect(() => {
    api.get(`/api/v1/prompts/${prompt.id}/graph`)
      .then((res) => {
        const edges: any[] = Array.isArray(res?.data?.edges) ? res.data.edges : [];
        const byType = (t: string) => Array.from(new Set(edges
          .filter((e) => String(e?.dependency_type || "").toLowerCase() === t)
          .map((e) => String(e?.dependency_name || e?.target || "").trim())
          .filter(Boolean)));
        setAffectedAgents(byType("agent"));
        setAffectedWorkflows(byType("workflow").concat(byType("workflow_node")));
      })
      .catch(() => { /* fall back to prompt-level links below */ });
  }, [prompt.id]);

  const agents = affectedAgents.length ? affectedAgents : (data.linked_agent && data.linked_agent !== "—" ? [data.linked_agent] : []);
  const workflows = affectedWorkflows.length ? affectedWorkflows : (data.linked_workflow && data.linked_workflow !== "—" ? [data.linked_workflow] : []);

  const rows: { label: string; value: string }[] = [
    { label: "Environment / Scope", value: String(data.environment || "—").toUpperCase() },
    { label: "Deployed At", value: data.deployed_at ? new Date(data.deployed_at).toLocaleString() : "—" },
    { label: "Deployed By", value: data.deployed_by || "—" },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-emerald-500/25 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-foreground">Deployment Confirmed</h3>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{prompt.name}</span>
            <RiskBadge tier={prompt.risk_tier} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.label} className="p-3 bg-background border border-border rounded-xl">
                <div className="text-[9px] text-foreground-muted uppercase tracking-widest">{r.label}</div>
                <div className="text-[11px] text-white font-bold mt-1 break-words">{r.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-foreground-muted uppercase tracking-widest font-black mb-2">Affected Agents</div>
            {agents.length ? (
              <div className="flex flex-wrap gap-2">{agents.map((a) => <span key={a} className="inline-flex items-center gap-1 text-[10px] text-foreground bg-background border border-border px-2 py-1 rounded-lg"><Cpu className="w-3 h-3 text-indigo-400" />{a}</span>)}</div>
            ) : <p className="text-[10px] text-foreground-muted italic">No agents directly bound to this prompt.</p>}
          </div>
          <div>
            <div className="text-[10px] text-foreground-muted uppercase tracking-widest font-black mb-2">Affected Workflows</div>
            {workflows.length ? (
              <div className="flex flex-wrap gap-2">{workflows.map((w) => <span key={w} className="inline-flex items-center gap-1 text-[10px] text-foreground bg-background border border-border px-2 py-1 rounded-lg"><GitBranch className="w-3 h-3 text-amber-400" />{w}</span>)}</div>
            ) : <p className="text-[10px] text-foreground-muted italic">No workflows directly bound to this prompt.</p>}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {data.evidence_id && (
              <a href={`/evidence/evidence-vault/items/${data.evidence_id}`} className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-border text-foreground-muted text-[10px] font-black uppercase tracking-widest rounded-lg hover:text-foreground hover:border-border transition-all">
                <ArrowRight className="w-3 h-3" /> Evidence Vault
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── A5: Structured Rejection Modal (Doc 3 §7) ───────────────────────────────────
const REJECTION_CATEGORIES: { id: string; label: string }[] = [
  { id: "safety", label: "Safety" },
  { id: "compliance", label: "Compliance" },
  { id: "brand", label: "Brand" },
  { id: "quality", label: "Quality" },
  { id: "legal", label: "Legal" },
  { id: "security", label: "Security" },
  { id: "missing_evidence", label: "Missing Evidence" },
  { id: "failed_test", label: "Failed Test" },
  { id: "approval_conflict", label: "Approval Conflict" },
  { id: "other", label: "Other" },
];

function RejectionModal({ title, promptName, onConfirm, onCancel }: {
  title: string;
  promptName: string;
  onConfirm: (category: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const valid = category && notes.trim().length >= 4;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-rose-500/25 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button onClick={onCancel} className="text-foreground-muted hover:text-foreground transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[11px] text-foreground-muted">{promptName}</p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest ml-1">Reason Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-3 text-white outline-none focus:border-rose-500 transition-all text-xs">
              <option value="">Select a category…</option>
              {REJECTION_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-foreground-muted uppercase tracking-widest ml-1">Actionable Notes *</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe the specific change required…" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted outline-none focus:border-rose-500 transition-all h-24 resize-none text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-surface transition-all">Cancel</button>
            <button onClick={() => onConfirm(category, notes.trim())} disabled={!valid} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-500 disabled:opacity-50 transition-all">Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt Detail Drawer ──────────────────────────────────────────────────────

function PromptDetailDrawer({
  prompt,
  onClose,
  onLifecycleAction,
  onVersionAction,
  onExportEvidence,
  role,
}: {
  prompt: PromptRecord;
  onClose: () => void;
  onLifecycleAction: (id: string, action: string) => void;
  onVersionAction: (versionId: string, action: string, extra?: any) => void;
  onExportEvidence: (prompt: PromptRecord, context: string) => void;
  role: string;
}) {
  const PRIMARY_DRAWER_TABS: { id: "overview" | "guardrails" | "knowledge" | "history"; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "guardrails", label: "Guardrails" },
    { id: "knowledge", label: "Knowledge Sources Connected" },
    { id: "history", label: "Governance Activity Log" },
  ];
  const [drawerTab, setDrawerTab] = useState<"overview" | "guardrails" | "knowledge" | "history">("overview");
  const [submitBlocked, setSubmitBlocked] = useState(false);
  const showPreSubmit = ["DRAFT", "INTERNAL_TEST", "REVIEW_REQUESTED"].includes(normalizeStatus(prompt.status));
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditFetched, setAuditFetched] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const gov = deriveGovernance(prompt);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset cached drawer state when a different prompt opens.
  useEffect(() => {
    drawerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    setAuditEvents([]);
    setAuditFetched(false);
  }, [prompt.id]);

  // Governance Activity Timeline tab → governance lifecycle events from the prompt audit trail.
  useEffect(() => {
    if (drawerTab === "history" && !auditFetched && !loadingAudit) {
      setLoadingAudit(true);
      api.get(`/api/v1/prompts/${prompt.id}/audit`)
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) setAuditEvents(res.data);
        })
        .catch(() => {})
        .finally(() => {
          setAuditFetched(true);
          setLoadingAudit(false);
        });
    }
  }, [drawerTab, prompt.id, auditFetched, loadingAudit]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={drawerRef} className="w-full max-w-2xl bg-card border-l border-border overflow-y-auto flex flex-col">
        {/* Drawer header */}
        <div className="p-6 border-b border-border space-y-4 sticky top-0 bg-card z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-lg font-black text-white">{prompt.name}</div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={prompt.status} />
                <RiskBadge tier={prompt.risk_tier} />
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl border border-border text-foreground-muted hover:text-foreground hover:border-border transition-all">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {PRIMARY_DRAWER_TABS.map((t) => (
              <button key={t.id} onClick={() => setDrawerTab(t.id)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${drawerTab === t.id ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-foreground-muted hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {drawerTab === "overview" && (
            <>
              <div className="space-y-1">
                <div className="text-[10px] text-foreground-muted uppercase tracking-widest font-black">Purpose</div>
                <div className="text-sm text-foreground leading-relaxed">{prompt.description || "—"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Current Status", value: STATUS_META[normalizeStatus(prompt.status)].label },
                  { label: "Linked Agent", value: prompt.linked_agent },
                  { label: "Linked Workflow", value: prompt.linked_workflow },
                  { label: "Workflow Node", value: prompt.workflow_node },
                  { label: "Autonomy Level", value: prompt.autonomy_level },
                  { label: "Review Requirement", value: prompt.review_requirement },
                  { label: "Governance Category", value: gov.category },
                  { label: "Current Match Action", value: gov.action },
                  { label: "Last Governance Check", value: prompt.last_test ? `${prompt.last_test.pass_fail} · ${new Date(prompt.last_test.run_at).toLocaleDateString()}` : "Not yet checked" },
                  { label: "Last Used", value: prompt.metadata?.last_used_at ? new Date(prompt.metadata.last_used_at).toLocaleString() : (prompt.last_deployed ? new Date(prompt.last_deployed).toLocaleString() : "—") },
                ].map((f) => (
                  <div key={f.label} className="p-3 bg-background border border-border rounded-xl">
                    <div className="text-[9px] text-foreground-muted uppercase tracking-widest">{f.label}</div>
                    <div className="text-xs text-white font-bold mt-1">{f.value}</div>
                  </div>
                ))}
                <div className="p-3 bg-background border border-border rounded-xl col-span-3 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-foreground-muted uppercase tracking-widest">Runtime Status</div>
                    <div className="text-xs text-white font-bold mt-1">{
                      prompt.status === "PRODUCTION_ACTIVE" ? "Active" :
                      prompt.status === "PAUSED" ? "Paused" :
                      STATUS_META[normalizeStatus(prompt.status)].label
                    }</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {prompt.status === "PRODUCTION_ACTIVE" && (
                      <button onClick={() => onLifecycleAction(prompt.id, 'retire')} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-500/20 transition-all">Retire</button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {drawerTab === "knowledge" && (
            <KnowledgeSourcesTab prompt={prompt} />
          )}

          {drawerTab === "guardrails" && (
            <GuardrailGovernanceTab promptId={prompt.id} versionId={prompt.active_version_id} role={role} />
          )}

          {drawerTab === "history" && (
            <GovernanceActivityLog prompt={prompt} auditEvents={auditEvents} loading={loadingAudit} />
          )}
        </div>

        {/* Lifecycle actions */}
        <div className="p-6 border-t border-border space-y-3 sticky bottom-0 bg-card">
          {showPreSubmit && <PreSubmitValidation prompt={prompt} onResult={setSubmitBlocked} />}
          <div className="flex flex-wrap gap-2">
            {prompt.status === "DRAFT" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'run_tests')} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Run Tests</button>
            )}
            {prompt.status === "INTERNAL_TEST" && (
              <button
                onClick={() => { if (!submitBlocked) onLifecycleAction(prompt.id, 'submit_review'); }}
                disabled={submitBlocked}
                title={submitBlocked ? "Resolve the blocking validation items above before submitting." : "Submit for review"}
                className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >Submit for Review</button>
            )}
            {prompt.status === "APPROVED_STAGING" && (
              <button onClick={() => prompt.active_version_id && onVersionAction(prompt.active_version_id, 'deploy_production')} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500/20 transition-all disabled:opacity-50" disabled={!prompt.active_version_id}>Request Production Approval</button>
            )}
            {prompt.status === "PRODUCTION_PENDING" && (
              <button onClick={() => onLifecycleAction(prompt.id, 'commission')} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Commission
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

// ─── Test Center ────────────────────────────────────────────────────────────
// Paste a post description → run it through the governed runtime decision
// pipeline → see which of the five possibilities it lands in and whether the
// system would APPROVE / REVIEW / BLOCK it, with KB evidence and reasoning.

const DECISION_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  APPROVE: { label: "Approve", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2 },
  REVIEW: { label: "Review", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle },
  BLOCK: { label: "Block", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: XCircle },
};

const TEST_PLATFORMS = ["linkedin", "twitter", "facebook", "instagram", "threads", "youtube"];

function GovernanceTestCenterTab({
  prompts,
  onRunTests,
}: {
  prompts: PromptRecord[];
  onRunTests: (versionId: string) => void;
}) {
  // Sub-tab navigation: Overview KPIs + the governed test / eval / drift surfaces.
  const [section, setSection] = useState<string>("overview");
  const SECTIONS: { id: string; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "test_runs", label: "Test Runs" },
    { id: "adversarial", label: "Adversarial" },
    { id: "evaluation", label: "Evaluation" },
    { id: "drift", label: "Drift" },
    { id: "simulation", label: "Policy Simulation" },
  ];

  // ── KPI data ──
  // Driven by prompt.metadata, which the runtime governance pipeline reliably
  // stamps on every real post check (usage_count / block_count / fail_count /
  // last_decision) — the same source the Registry uses. This makes blocked /
  // flagged posts show here, instead of depending only on last_test.
  const activity = prompts.map((p) => {
    const m = p.metadata || {};
    const uses = (m.usage_count as number) || 0;
    const blocks = ((m.block_count as number) || 0) + ((m.fail_count as number) || 0);
    const decision = (m.last_decision as string) ||
      (p.last_test?.pass_fail === "FAIL" ? "BLOCK" : p.last_test?.pass_fail === "PASS" ? "APPROVE" : null);
    const reason = (m.last_reason as string) || "";
    const lastUsed = (m.last_used_at as string) || p.last_test?.run_at || null;
    return { p, uses, blocks, decision, reason, lastUsed };
  });
  const totalTests = activity.reduce((s, a) => s + a.uses, 0) || prompts.filter((p) => p.last_test).length;
  const failed = activity.reduce((s, a) => s + a.blocks, 0);
  const passRate = totalTests > 0 ? Math.max(0, Math.round(((totalTests - failed) / totalTests) * 100)) : 0;
  const runRows = activity.filter((a) => a.uses > 0 || a.blocks > 0 || a.decision);

  const KPI_CARDS = [
    { label: "Total Checks", value: totalTests, color: "text-foreground" },
    { label: "Pass Rate", value: `${passRate}%`, color: "text-emerald-400" },
    { label: "Blocked / Failed", value: failed, color: "text-rose-400" },
    { label: "Drift Alerts", value: "0", color: "text-foreground-muted" },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-border pb-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              section === s.id
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25"
                : "text-foreground-muted border border-transparent hover:text-foreground hover:bg-surface"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Overview — KPI Cards */}
      {section === "overview" && (
        <div className="grid grid-cols-4 gap-4">
          {KPI_CARDS.map((k) => (
            <div key={k.label} className="bg-background border border-border rounded-2xl p-5 text-center">
              <div className={`text-3xl font-black ${k.color}`}>{k.value}</div>
              <div className="text-[10px] font-black text-foreground-muted uppercase tracking-widest mt-1">{k.label}</div>
            </div>
          ))}
          {totalTests === 0 && failed === 0 && (
            <div className="col-span-4 p-8 text-center text-sm text-foreground-muted bg-card border border-border rounded-2xl">
              No governance checks recorded yet. Publish a post to run the governed checks.
            </div>
          )}
        </div>
      )}

      {/* Test Runs */}
      {section === "test_runs" && (
        <div className="space-y-3">
          {runRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground-muted bg-card border border-border rounded-2xl">
              No governance checks recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    {["Prompt", "Last Decision", "Blocked / Failed", "Checks", "Last Reason", "Last Run", "Action"].map((h) => (
                      <th key={h} className="py-3 px-5 text-[10px] font-black text-foreground-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runRows.map(({ p, uses, blocks, decision, reason, lastUsed }) => {
                    const dec = String(decision || "").toUpperCase();
                    const decCfg = dec === "BLOCK"
                      ? { label: "Blocked", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
                      : dec === "REVIEW"
                        ? { label: "Review", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
                        : dec === "APPROVE"
                          ? { label: "Passed", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
                          : { label: "—", cls: "bg-surface text-foreground-muted border-border" };
                    return (
                      <tr key={p.id} className="hover:bg-surface/30 transition-colors">
                        <td className="py-4 px-5"><span className="text-sm font-bold text-foreground max-w-[200px] truncate block">{p.name}</span></td>
                        <td className="py-4 px-5"><span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${decCfg.cls}`}>{decCfg.label}</span></td>
                        <td className="py-4 px-5"><span className={`text-[11px] font-bold ${blocks > 0 ? "text-rose-400" : "text-foreground-muted"}`}>{blocks > 0 ? blocks : "—"}</span></td>
                        <td className="py-4 px-5"><span className="text-[11px] font-bold text-foreground">{uses || "—"}</span></td>
                        <td className="py-4 px-5"><span className="text-[10px] text-foreground-muted max-w-[260px] truncate block" title={reason}>{reason || "—"}</span></td>
                        <td className="py-4 px-5"><span className="text-[10px] text-foreground-muted whitespace-nowrap">{lastUsed ? new Date(lastUsed).toLocaleDateString() : "—"}</span></td>
                        <td className="py-4 px-5">
                          <button
                            onClick={() => p.active_version_id && onRunTests(p.active_version_id)}
                            disabled={!p.active_version_id}
                            className="p-2 bg-background border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Run Tests"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adversarial Testing */}
      {section === "adversarial" && <AdversarialDashboard embedded />}

      {/* Evaluation Runs */}
      {section === "evaluation" && <EvaluationDashboard embedded />}

      {/* Drift Monitoring */}
      {section === "drift" && <DriftDashboard embedded />}

      {/* Policy Simulation */}
      {section === "simulation" && <PolicySimulationSection prompts={prompts} />}
    </div>
  );
}

// ─── Policy Simulation Sub-section ─────────────────────────────────────────

function PolicySimulationSection({ prompts }: { prompts: PromptRecord[] }) {
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [promptId, setPromptId] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!description.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.classifyTestDescription({
        description: description.trim(),
        platform,
        prompt_id: promptId || undefined,
      });
      if (res?.success && res.data) setResult(res.data);
      else setError(res?.error || "Governance test failed.");
    } catch (e: any) {
      setError(e.message || "Governance test failed.");
    } finally {
      setRunning(false);
    }
  };

  const decisionMeta = result ? DECISION_META[result.decision] || DECISION_META.REVIEW : null;
  const DecisionIcon = decisionMeta?.icon || FlaskConical;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-foreground-muted">Post description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="e.g. Our new supplement cures diabetes in 30 days, clinically proven by 200 studies…"
          className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-indigo-500/50 resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-foreground-muted mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-indigo-500/50 capitalize"
            >
              {TEST_PLATFORMS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-foreground-muted mb-2">Linked prompt (optional)</label>
            <select
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-indigo-500/50"
            >
              <option value="">— none —</option>
              {prompts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={run}
          disabled={running || !description.trim()}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Running governance…" : "Run governance test"}
        </button>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] text-rose-400">
            <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Result */}
      <div className="bg-card border border-border rounded-3xl p-6">
        {!result ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center gap-3 text-foreground-muted">
            <FlaskConical className="w-10 h-10" />
            <p className="text-xs max-w-xs">Run a test to see the governance decision, the matched possibility, knowledge-base evidence, and the step-by-step reasoning.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className={`rounded-2xl border ${decisionMeta!.border} ${decisionMeta!.bg} p-5 flex items-start gap-4`}>
              <DecisionIcon className={`w-8 h-8 shrink-0 ${decisionMeta!.color}`} />
              <div className="space-y-1">
                <div className={`text-2xl font-black tracking-tight ${decisionMeta!.color}`}>{decisionMeta!.label}</div>
                <div className="text-[11px] font-black uppercase tracking-widest text-foreground-muted">
                  Possibility {result.possibility.id} — {result.possibility.label}
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed pt-1">{result.reason}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background border border-border rounded-xl p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted mb-1.5">Triggered Policy</div>
                <div className="text-xs text-foreground font-bold">{result.governed_prompt.label}</div>
              </div>
              <div className="bg-background border border-border rounded-xl p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted mb-1.5">Expected Action</div>
                <div className="text-xs text-foreground font-bold">{decisionMeta!.label}</div>
              </div>
              <div className="bg-background border border-border rounded-xl p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted mb-1.5">Actual Action</div>
                <div className="text-xs text-foreground font-bold">{result.risk.level} · {Math.round(result.risk.score)}/100</div>
              </div>
              <div className="bg-background border border-border rounded-xl p-4">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted mb-1.5">Result</div>
                <div className="text-xs text-foreground font-bold">{result.decision}</div>
              </div>
            </div>

            {Object.entries(result.risk.categories || {}).some(([, v]) => v) && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(result.risk.categories).filter(([, v]) => v).map(([k]) => (
                  <span key={k} className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest">{k}</span>
                ))}
              </div>
            )}

            {result.knowledge.checked && (
              <div className="bg-background border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted">
                  <BookOpen className="w-3.5 h-3.5" /> Knowledge Base — {result.knowledge.status}
                </div>
                {result.knowledge.matches?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {result.knowledge.matches.map((m: any) => (
                      <li key={m.id} className="text-xs text-foreground flex items-start gap-2">
                        <FileCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
                        <span>
                          {m.title}
                          {m.citation_reference && <span className="text-foreground-muted"> — {m.citation_reference}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-foreground-muted">No supporting knowledge source found for this claim.</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted">Decision trace</div>
              {result.steps.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-[11px]">
                  <span className="w-5 h-5 rounded-md bg-surface border border-border flex items-center justify-center text-foreground-muted font-black text-[9px] shrink-0">{s.step}</span>
                  <span className="text-foreground-muted">{s.name}</span>
                  <ArrowRight className="w-3 h-3 text-foreground-muted" />
                  <span className="text-foreground font-bold">{s.result}</span>
                </div>
              ))}
            </div>

            {result.evidence_event_id && (
              <div className="flex items-center gap-2 text-[10px] text-foreground-muted pt-1 border-t border-border">
                <History className="w-3.5 h-3.5" /> Evidence event recorded: <span className="font-mono text-foreground-muted">{String(result.evidence_event_id).slice(0, 18)}…</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function mapBackendPrompt(b: any): PromptRecord {
  const def = SYSTEM_PROMPT_DEFS.find((d) => d.name === (b.name || b.prompt_name));
  return {
    id: b.id,
    name: b.name || b.prompt_name || 'Untitled',
    prompt_type: b.prompt_type || 'system',
    owner: b.owner_name || b.created_by || 'Unknown',
    linked_agent: b.linked_agent || b.agent_id || def?.linked_agent || '—',
    linked_workflow: b.linked_workflow || b.workflow_id || def?.linked_workflow || '—',
    workflow_node: b.workflow_node || b.workflow_step || '—',
    autonomy_level: b.autonomy_level || b.governance_level || '—',
    review_requirement: b.review_requirement || b.approval_requirement || '—',
    risk_tier: b.risk_tier || 'TIER_2_MEDIUM',
    // Normalize the raw DB enum (e.g. "production_active") to the canonical
    // uppercase LifecycleStatus so every `p.status === "PRODUCTION_ACTIVE"`
    // comparison (KPI counts, Evidence tab, drawer controls) works correctly.
    status: normalizeStatus(b.status),
    active_version: b.active_version || b.current_version || 'v0.0',
    active_version_id: b.active_version_id || b.current_version_id || undefined,
    last_test: b.last_test || null,
    approvals: b.approvals || [],
    last_deployed: b.last_deployed || b.last_deployed_at || '',
    description: b.description || b.prompt_description || '',
    knowledge_sources: b.knowledge_sources || [],
    linked_knowledge_sources: b.metadata?.linked_knowledge_sources || b.linked_knowledge_sources || [],
    tools_permitted: b.tools_permitted || [],
    updated_at: b.updated_at || b.updated || '',
    metadata: b.metadata || {},
  };
}

// The 5 governed prompts map to a governance category + default match action.
// Derived from the prompt's seeded workflow_possibility (metadata) or its name,
// so the Overview tab can state the category/action without a new backend field.
const GOV_CATEGORY_LABELS: Record<string, string> = {
  BASIC_POST: "Basic Content",
  FACTUAL_CLAIM_NO_KB: "Claim Validation",
  FACTUAL_CLAIM_KB_FOUND: "Knowledge Verification",
  HIGH_RISK_CLAIM: "High-Risk Review",
  POLICY_VIOLATION: "Policy / Safety",
};
const GOV_CATEGORY_ACTION: Record<string, string> = {
  BASIC_POST: "Approve",
  FACTUAL_CLAIM_NO_KB: "Review",
  FACTUAL_CLAIM_KB_FOUND: "Review",
  HIGH_RISK_CLAIM: "Review / Block",
  POLICY_VIOLATION: "Block",
};
function deriveGovernance(p: PromptRecord): { category: string; action: string } {
  const key = String(p.metadata?.workflow_possibility?.key || "");
  if (key && GOV_CATEGORY_LABELS[key]) return { category: GOV_CATEGORY_LABELS[key], action: GOV_CATEGORY_ACTION[key] };
  const n = p.name.toLowerCase();
  if (n.includes("policy") || n.includes("safety")) return { category: "Policy / Safety", action: "Block" };
  if (n.includes("high-risk") || n.includes("high risk")) return { category: "High-Risk Review", action: "Review / Block" };
  if (n.includes("knowledge")) return { category: "Knowledge Verification", action: "Review" };
  if (n.includes("claim")) return { category: "Claim Validation", action: "Review" };
  if (n.includes("basic") || n.includes("content")) return { category: "Basic Content", action: "Approve" };
  return { category: "—", action: "—" };
}

// ─── 5 System-Governed Prompts ──────────────────────────────────────────────────
const GOVERNANCE_AGENT = "Governance Agent";
const GOVERNANCE_WORKFLOW = "Post Governance Workflow";
const SYSTEM_PROMPT_DEFS: { name: string; purpose: string; key: string; risk: RiskTier; linked_agent: string; linked_workflow: string }[] = [
  { name: "Basic Content Generator",        purpose: "Handles normal/basic post descriptions with no factual claims or policy risks.",                                                               key: "BASIC_POST",             risk: "TIER_1_LOW",     linked_agent: "Content Review Agent",      linked_workflow: GOVERNANCE_WORKFLOW },
  { name: "Factual Claim Validator",         purpose: "Detects product claims, pricing claims, numerical claims, guarantee language, and performance claims.",                                          key: "FACTUAL_CLAIM_NO_KB",    risk: "TIER_2_MEDIUM", linked_agent: "Claim Detection Agent",     linked_workflow: GOVERNANCE_WORKFLOW },
  { name: "Knowledge Verification Prompt",   purpose: "Verifies factual claims against approved Knowledge Base sources.",                                                                              key: "FACTUAL_CLAIM_KB_FOUND", risk: "TIER_2_MEDIUM", linked_agent: "KB Verification Agent",     linked_workflow: GOVERNANCE_WORKFLOW },
  { name: "High-Risk Review Prompt",         purpose: "Handles medical, legal, financial, compliance, HR, privacy, or security-sensitive claims.",                                                     key: "HIGH_RISK_CLAIM",        risk: "TIER_4_CRITICAL", linked_agent: GOVERNANCE_AGENT,            linked_workflow: GOVERNANCE_WORKFLOW },
  { name: "Policy Violation Prompt",         purpose: "Detects violence, harassment, hate speech, abuse, offensive content, prohibited language, and platform/safety violations.",                     key: "POLICY_VIOLATION",       risk: "TIER_3_HIGH",   linked_agent: "Policy Enforcement Agent",  linked_workflow: GOVERNANCE_WORKFLOW },
];

const SYSTEM_PROMPT_NAMES = new Set(SYSTEM_PROMPT_DEFS.map((d) => d.name.toLowerCase()));

function isSystemGoverned(p: PromptRecord): boolean {
  return p.metadata?.system_governed === true || SYSTEM_PROMPT_NAMES.has(p.name.toLowerCase());
}

export default function PromptsPage() {
  const { role } = useRoleContext();
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [activeTab, setActiveTab] = useState<ActiveTab>("registry");
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [approvalStats, setApprovalStats] = useState<ApprovalStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptRecord | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptStats, setPromptStats] = useState<any>(null);
  // A4 post-deployment confirmation state.
  const [deployConfirm, setDeployConfirm] = useState<{ data: any; prompt: PromptRecord } | null>(null);
  // A6 — only governance-override roles may waive review requirements.
  const canWaive = ["ADMIN", "GOVERNANCE_ADMIN", "WORKSPACE_OWNER", "SUPERADMIN"].includes(String(role || "").toUpperCase().replace(/\s+/g, "_"));
  // The platform governs 5 system prompts; only governance admins manage lifecycle.
  // Normal users get read-only registry actions.
  const canManagePrompts = canWaive;

  const fetchPrompts = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setPromptsLoading(true);
    try {
      const [promptsRes, statsRes] = await Promise.all([
        api.get("/api/v1/prompts").catch(() => ({ success: false, data: null })),
        api.get("/api/v1/prompts/stats").catch(() => ({ success: false, data: null })),
      ]);
      if (promptsRes?.success && Array.isArray(promptsRes.data)) {
        setPrompts(promptsRes.data.map(mapBackendPrompt));
      } else {
        setPrompts([]);
      }
      if (statsRes?.success) {
        setPromptStats(statsRes.data);
      }
    } catch {
      // non-critical
    } finally {
      if (!opts?.silent) setPromptsLoading(false);
    }
  }, []);

  // Seed the 5 system-governed prompts if any are missing from the backend.
  // This runs once after prompts are loaded and only creates missing entries.
  const seededRef = useRef(false);
  useEffect(() => {
    if (promptsLoading || seededRef.current || prompts.length === 0) return;
    seededRef.current = true;
    const existingNames = new Set(prompts.map((p) => p.name.toLowerCase()));
    const missing = SYSTEM_PROMPT_DEFS.filter((d) => !existingNames.has(d.name.toLowerCase()));
    if (missing.length === 0) return;
    Promise.all(
      missing.map((d) =>
        api.post("/api/v1/prompts", {
          name: d.name,
          description: d.purpose,
          prompt_type: "system",
          risk_tier: d.risk,
          status: "PRODUCTION_ACTIVE",
          linked_agent: d.linked_agent,
          linked_workflow: d.linked_workflow,
          last_deployed: new Date().toISOString(),
          metadata: { system_governed: true, workflow_possibility: { key: d.key } },
        }).catch(() => {}),
      ),
    ).then(() => { seededRef.current = true; fetchPrompts(); });
  }, [prompts, promptsLoading, fetchPrompts]);

  const handleLifecycleAction = async (id: string, action: string) => {
    try {
      const endpointMap: Record<string, string> = {
        pause: `/api/v1/prompts/${id}/pause`,
        resume: `/api/v1/prompts/${id}/resume`,
        archive: `/api/v1/prompts/${id}/archive`,
        retire: `/api/v1/prompts/${id}/retire`,
        reactivate: `/api/v1/prompts/${id}/reactivate`,
        submit_review: `/api/v1/prompts/${id}/submit-review`,
        clone: `/api/v1/prompts/${id}/clone`,
        commission: `/api/v1/prompts/${id}/commission`,
      };
      const endpoint = endpointMap[action];
      if (!endpoint) return;
      const res = await api.post(endpoint, {});
      if (res.success) fetchPrompts();
    } catch (e: any) {
      setError(e.message || `Failed to ${action} prompt`);
    }
  };

  const handleVersionAction = async (versionId: string, action: string, extra?: any) => {
    try {
      const endpointMap: Record<string, string> = {
        approve: `/api/v1/prompts/versions/${versionId}/approve`,
        reject: `/api/v1/prompts/versions/${versionId}/reject`,
        deploy_staging: `/api/v1/prompts/versions/${versionId}/deploy`,
        deploy_production: `/api/v1/prompts/versions/${versionId}/deploy`,
        run_tests: `/api/v1/prompts/versions/${versionId}/tests/run`,
      };
      const endpoint = endpointMap[action];
      if (!endpoint) return;
      const body = action === 'deploy_staging' ? { environment: 'staging' }
        : action === 'deploy_production' ? { environment: 'production' }
        : extra || {};
      const res = await api.post(endpoint, body);
      if (res.success) {
        // A4: surface a structured post-deployment confirmation using real
        // response data instead of an alert.
        if ((action === 'deploy_staging' || action === 'deploy_production') && res.data && selectedPrompt) {
          setDeployConfirm({ data: res.data, prompt: selectedPrompt });
        }
        fetchPrompts();
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || `Version action failed: ${action}`);
    }
  };

  const handleApprovalAction = async (versionId: string, decision: string, comments?: string, reasonCategory?: string) => {
    try {
      const endpoint = decision === 'APPROVED'
        ? `/api/v1/prompts/versions/${versionId}/approve`
        : `/api/v1/prompts/versions/${versionId}/reject`;
      const reviewer_role = role
        ? role.toUpperCase().replace(/\s+/g, '_')
        : 'PROMPT_OWNER';
      const payload: Record<string, unknown> = { comments, reviewer_role };
      if (decision !== 'APPROVED' && reasonCategory) payload.reason_category = reasonCategory;
      const res = await api.post(endpoint, payload);
      if (res.success) {
        fetchPrompts();
        setSelectedPrompt(null);
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || `Approval action failed`);
    }
  };

  // A6 — waive outstanding review requirements with justification (override roles only).
  const handleWaive = async (versionId: string, justification: string) => {
    try {
      const reviewer_role = role ? role.toUpperCase().replace(/\s+/g, '_') : undefined;
      const res = await api.post(`/api/v1/prompts/versions/${versionId}/waive`, { justification, reviewer_role });
      if (res.success) {
        fetchPrompts();
        setSelectedPrompt(null);
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (e: any) {
      setError(e.message || `Waive failed`);
    }
  };

  const downloadJson = useCallback((filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPromptEvidence = useCallback(
    async (prompt: PromptRecord, context: string) => {
      const reason = window.prompt("Enter a reason for this evidence export:");
      if (!reason || reason.length < 8) {
        alert("A reason of at least 8 characters is required for evidence export.");
        return;
      }
      try {
        const res = await api.post(`/api/v1/prompts/${prompt.id}/evidence/export`, {
          reason,
          disclosure_mode: "governance_review",
        });
        if (res?.success === false) {
          throw new Error(res.error || res.data?.error?.message || "Evidence export failed");
        }
        alert("Evidence export created successfully. Check the Evidence Vault for the sealed package.");
      } catch (err: any) {
        alert("Evidence export failed: " + (err?.message || "Unknown error"));
      }
    },
    [],
  );

  const handleAuditExport = useCallback(() => {
    downloadJson("prompt-governance-audit-export.json", {
      exported_at: new Date().toISOString(),
      prompt_stats: promptStats,
      audit_stats: auditStats,
      approval_stats: approvalStats,
      prompts,
    });
  }, [approvalStats, auditStats, downloadJson, promptStats, prompts]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [auditRes, approvalsRes] = await Promise.all([
          api.get("/api/v1/governance/audit/stats"),
          api.get("/api/v1/approvals/stats"),
        ]);
        if (auditRes.success) setAuditStats(auditRes.data || null);
        if (approvalsRes.success) setApprovalStats(approvalsRes.data || null);
      } catch {
        setError("Live governance data could not be fully loaded. Displaying cached registry data.");
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchPrompts();
    // Light poll so the live "Working" (green) state appears and clears on its
    // own as prompts govern posts — silent so it never flashes the loader.
    const poll = setInterval(() => fetchPrompts({ silent: true }), 15000);
    return () => clearInterval(poll);
  }, [fetchPrompts]);

  // Only the 5 system-governed prompts are visible in the registry.
  // All custom/legacy prompts are hidden but not deleted — they remain in backend tables.
  const systemPrompts = prompts.filter(isSystemGoverned);
  // Computed health metrics
  const productionCount = systemPrompts.filter((p) => p.status === "PRODUCTION_ACTIVE").length;
  // Pending review = prompts explicitly awaiting review OR whose last runtime
  // governance decision flagged the content for review.
  const draftsPending = systemPrompts.filter(
    (p) => p.status === "REVIEW_REQUESTED" || String(p.metadata?.last_decision || "").toUpperCase() === "REVIEW",
  ).length;
  // Aggregate the SAME signal the per-row Failed/Blocked column shows
  // (metadata block_count + fail_count) so the card and rows never disagree.
  // Fall back to the last_test FAIL flag for prompts with no metadata counters.
  const failedTests = systemPrompts.reduce((sum, p) => {
    const counted = (p.metadata?.block_count || 0) + (p.metadata?.fail_count || 0);
    return sum + (counted > 0 ? counted : p.last_test?.pass_fail === "FAIL" ? 1 : 0);
  }, 0);

  return (
    <div className="p-6 xl:p-8 max-w-screen-2xl mx-auto space-y-8 pb-32 bg-background min-h-screen">

      {/* Header */}
      <div className="relative overflow-hidden bg-card border border-indigo-500/20 rounded-[3rem] p-10 xl:p-14 shadow-[0_0_80px_rgba(99,102,241,0.1)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/8 blur-[150px] rounded-full -mr-60 -mt-60" />
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/15 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em]">
              <Lock className="w-3.5 h-3.5" />
              Prompt Governance Center — Layer 1 Authority Control
            </div>
            <h1 className="text-5xl xl:text-6xl font-black text-foreground tracking-tighter leading-none">
              Prompt <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-500 italic">Governance.</span>
            </h1>
            <p className="text-base text-foreground-muted leading-relaxed font-medium">
              Governance state, rules, knowledge sources, evidence, and audit history for every governed prompt used by agents, workflows, tools, and knowledge-grounded tasks inside ZoikoVertex.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "registry" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Search prompts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56 bg-background border border-border rounded-2xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            )}
            <button
              onClick={handleAuditExport}
              className="px-6 py-3 bg-surface border border-border hover:border-slate-600 text-foreground hover:text-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Evidence
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3.5 text-sm text-amber-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="text-[11px]">{error}</span>
        </div>
      )}

      {/* Health summary strip — four headline metrics; clicking filters the registry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: "Total Prompts", value: systemPrompts.length, icon: MessageSquareCode, color: "text-foreground" },
          { label: "Active Prompts", value: productionCount, icon: Zap, color: "text-emerald-400" },
          { label: "Pending Review", value: draftsPending, icon: Clock, color: "text-amber-400" },
          { label: "Blocked / Failed Tests", value: failedTests, icon: AlertTriangle, color: "text-rose-400" },
        ] as const).map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => setActiveTab("registry")}
              className="text-left bg-card border border-border rounded-2xl p-5 hover:border-indigo-500/30 transition-all cursor-pointer focus:outline-none focus:border-indigo-500/50"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-foreground-muted">{stat.label}</div>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
        {activeTab === "registry" && (
          <RegistryTab
            prompts={systemPrompts}
            onViewPrompt={setSelectedPrompt}
            onRetirePrompt={(p) => handleLifecycleAction(p.id, "retire")}
            onActivatePrompt={(p) => handleLifecycleAction(p.id, "reactivate")}
            canManage={canManagePrompts}
          />
        )}
      </div>

      {/* A4 — post-deployment confirmation */}
      {deployConfirm && (
        <DeploymentConfirmation
          data={deployConfirm.data}
          prompt={deployConfirm.prompt}
          onClose={() => setDeployConfirm(null)}
        />
      )}
    </div>
  );
}

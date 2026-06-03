"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw, CheckCircle2, XCircle, RotateCcw, ShieldAlert,
  ArrowUpRight, AlertCircle, Clock,
  Layers, ShieldCheck, BarChart2, Search,
  FileText, MessageSquare, UserCheck, UserPlus, Flag,
  AlertTriangle, Info, Download, ExternalLink, Eye,
  History, Pen, Send, Play,
  User, Calendar, Clock3, Gavel,
  Sparkles, Ban, Zap, StopCircle,
  ClipboardList, Settings
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ReviewItem {
  id: string;
  title: string;
  item_type: string;
  source_module: string;
  campaign?: string;
  platform?: string;
  content_snapshot: Record<string, unknown>;
  submitted_by: string;
  assigned_to?: string;
  assigned_team?: string;
  status: string;
  priority: string;
  risk_level: string;
  risk_category?: string;
  confidence_score?: number;
  validation_status: string;
  policy_flag_status: string;
  source_grounding_status?: string;
  decision_eligibility_state?: string;
  due_at?: string;
  submitted_at: string;
  reviewed_at?: string;
  approved_at?: string;
  rejected_at?: string;
  escalated_at?: string;
  released_at?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  pending_review: number;
  assigned_to_me: number;
  high_critical_risk: number;
  due_today: number;
  awaiting_revision: number;
  escalated: number;
  approved_today: number;
}

interface ValidationArea {
  area: string;
  status: "Passed" | "Warning" | "Failed";
}

interface AuditEntry {
  id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  previous_value?: string;
  new_value?: string;
}

interface NoteEntry {
  id: string;
  note_body: string;
  created_by: string;
  created_at: string;
  replies?: NoteEntry[];
}

interface PolicyFlag {
  id: string;
  rule: string;
  severity: string;
  summary: string;
}

interface EligibilityState {
  state: string;
  can_approve: boolean;
  can_reject: boolean;
  can_request_revision: boolean;
  can_escalate: boolean;
  can_override: boolean;
  reason?: string;
}

// ─── Config Maps ───────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { label: string; dot: string; badge: string; border: string; color: string }> = {
  LOW:     { label: "Low",     dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",  border: "border-l-emerald-500", color: "text-emerald-400" },
  MEDIUM:  { label: "Medium",  dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",      border: "border-l-amber-500",  color: "text-amber-400" },
  HIGH:    { label: "High",    dot: "bg-orange-400",  badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",    border: "border-l-orange-500", color: "text-orange-400" },
  CRITICAL:{ label: "Critical",dot: "bg-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20",             border: "border-l-red-500",    color: "text-red-400" },
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW:   { label: "Pending Review",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ASSIGNED:         { label: "Assigned",          color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  IN_REVIEW:        { label: "In Review",         color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  AWAITING_REVISION:{ label: "Awaiting Revision", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  RESUBMITTED:      { label: "Resubmitted",       color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  APPROVED:         { label: "Approved",          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED:         { label: "Rejected",          color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  ESCALATED:        { label: "Escalated",         color: "bg-red-500/10 text-red-400 border-red-500/20" },
  BLOCKED:          { label: "Blocked",           color: "bg-red-600/10 text-red-500 border-red-600/20" },
  EXPIRED:          { label: "Expired",           color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  RELEASED:         { label: "Released",          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ARCHIVED:         { label: "Archived",          color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "text-gray-400" },
  NORMAL: { label: "Normal", color: "text-blue-400" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  URGENT: { label: "Urgent", color: "text-red-400" },
};

const BADGE_CONFIG: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  AI_GENERATED:    { label: "AI Generated",    color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: <Sparkles className="w-2.5 h-2.5" /> },
  HUMAN_EDITED:    { label: "Human Edited",    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",     icon: <Pen className="w-2.5 h-2.5" /> },
  POLICY_FLAGGED:  { label: "Policy Flagged",  color: "bg-red-500/10 text-red-400 border-red-500/20",        icon: <Flag className="w-2.5 h-2.5" /> },
  VALIDATION_FAILED:{label: "Validation Failed",color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  ESCALATED:       { label: "Escalated",       color: "bg-red-500/10 text-red-400 border-red-500/20",        icon: <ArrowUpRight className="w-2.5 h-2.5" /> },
  DUE_SOON:        { label: "Due Soon",        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",  icon: <Clock className="w-2.5 h-2.5" /> },
  OVERDUE:         { label: "Overdue",         color: "bg-red-500/10 text-red-400 border-red-500/20",         },
  BLOCKED:         { label: "Blocked",         color: "bg-red-600/10 text-red-500 border-red-600/20",        icon: <Ban className="w-2.5 h-2.5" /> },
  RESUBMITTED:     { label: "Resubmitted",     color: "bg-purple-500/10 text-purple-400 border-purple-500/20", },
};

const VALIDATION_AREAS: { key: string; label: string }[] = [
  { key: "brand_voice",        label: "Brand Voice" },
  { key: "policy_compliance",  label: "Policy Compliance" },
  { key: "claim_safety",       label: "Claim Safety" },
  { key: "tone",               label: "Tone" },
  { key: "sensitive_content",  label: "Sensitive Content" },
  { key: "platform_readiness", label: "Platform Readiness" },
  { key: "approval_rule_match",label: "Approval Rule Match" },
  { key: "source_grounding",   label: "Source Grounding" },
];

const FILTER_TABS = [
  { key: "all",             label: "All Items" },
  { key: "assigned_to_me",  label: "Assigned to Me" },
  { key: "high_risk",       label: "High Risk" },
  { key: "due_today",       label: "Due Today" },
  { key: "pending",         label: "Pending" },
  { key: "in_review",       label: "In Review" },
  { key: "revision",        label: "Awaiting Revision" },
  { key: "escalated",       label: "Escalated" },
  { key: "approved",        label: "Approved" },
  { key: "rejected",        label: "Rejected" },
  { key: "released",        label: "Released" },
  { key: "blocked",         label: "Blocked" },
];

const TAB_FILTER_MAP: Record<string, string[]> = {
  all:             [],
  assigned_to_me:  [],  // handled via JS filter
  high_risk:       [],  // handled via JS filter
  due_today:       [],  // handled via JS filter
  pending:         ["PENDING_REVIEW", "ASSIGNED"],
  in_review:       ["IN_REVIEW"],
  revision:        ["AWAITING_REVISION"],
  escalated:       ["ESCALATED"],
  approved:        ["APPROVED", "RELEASED"],
  rejected:        ["REJECTED"],
  released:        ["RELEASED"],
  blocked:         ["BLOCKED", "EXPIRED"],
};

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  "Social Post":    <MessageSquare className="w-3.5 h-3.5" />,
  "Campaign Asset": <Layers className="w-3.5 h-3.5" />,
  "Inbox Reply":    <Send className="w-3.5 h-3.5" />,
  "Agent Action":   <Zap className="w-3.5 h-3.5" />,
  "Workflow Output":<Play className="w-3.5 h-3.5" />,
  "Policy-Flagged Item": <Flag className="w-3.5 h-3.5" />,
  "Validation Failed Item": <AlertTriangle className="w-3.5 h-3.5" />,
};

const METRIC_CARDS = [
  { key: "pending_review",    label: "Pending Review",   icon: <BarChart2 className="w-4 h-4" />,        color: "text-blue-400" },
  { key: "assigned_to_me",    label: "Assigned to Me",   icon: <UserCheck className="w-4 h-4" />,         color: "text-indigo-400" },
  { key: "high_critical_risk",label: "High/Critical Risk",icon: <ShieldAlert className="w-4 h-4" />,      color: "text-rose-400" },
  { key: "due_today",         label: "Due Today",         icon: <Calendar className="w-4 h-4" />,          color: "text-amber-400" },
  { key: "awaiting_revision", label: "Awaiting Revision", icon: <RotateCcw className="w-4 h-4" />,        color: "text-orange-400" },
  { key: "escalated",         label: "Escalated",         icon: <ArrowUpRight className="w-4 h-4" />,     color: "text-red-400" },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function getSLAStatus(dueAt?: string): { label: string; color: string; badge?: string } {
  if (!dueAt) return { label: "No SLA", color: "text-gray-500" };
  const diff = new Date(dueAt).getTime() - Date.now();
  const hours = diff / 3600000;
  if (hours < 0) return { label: "Overdue", color: "text-red-400", badge: "Overdue" };
  if (hours < 24) return { label: `${Math.floor(hours)}h remaining`, color: "text-amber-400", badge: "Due Soon" };
  if (hours < 48) return { label: `${Math.floor(hours / 24)}d remaining`, color: "text-amber-400" };
  return { label: `${Math.floor(hours / 24)}d remaining`, color: "text-emerald-400" };
}

function getItemBadges(item: ReviewItem): string[] {
  const badges: string[] = [];
  if (item.item_type === "Social Post" && !item.assigned_to) badges.push("AI_GENERATED");
  if (item.assigned_to) badges.push("HUMAN_EDITED");
  if (item.policy_flag_status === "Flagged") badges.push("POLICY_FLAGGED");
  if (item.validation_status === "Failed") badges.push("VALIDATION_FAILED");
  if (item.status === "ESCALATED") badges.push("ESCALATED");
  if (item.due_at) {
    const diff = new Date(item.due_at).getTime() - Date.now();
    if (diff < 0) badges.push("OVERDUE");
    else if (diff < 86400000) badges.push("DUE_SOON");
  }
  if (item.status === "BLOCKED") badges.push("BLOCKED");
  if (item.status === "RESUBMITTED") badges.push("RESUBMITTED");
  return badges;
}

function getEligibilityIcon(state?: string): React.ReactNode {
  switch (state) {
    case "Eligible for Approval": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case "Review Required":       return <Eye className="w-3.5 h-3.5 text-amber-400" />;
    case "Elevated Approval Required": return <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />;
    case "Revision Required":     return <RotateCcw className="w-3.5 h-3.5 text-orange-400" />;
    case "Escalation Required":   return <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />;
    case "Blocked":               return <Ban className="w-3.5 h-3.5 text-red-400" />;
    case "Override Eligible":     return <Gavel className="w-3.5 h-3.5 text-amber-400" />;
    case "Override Prohibited":   return <StopCircle className="w-3.5 h-3.5 text-red-400" />;
    default:                      return <Info className="w-3.5 h-3.5 text-gray-400" />;
  }
}

// ─── Review Action Bar ─────────────────────────────────────────────────────────

function ReviewActionBar({
  item, eligibility, userRole, actionLoading, feedback,
  onAction, onFeedbackChange, onAssign
}: {
  item: ReviewItem | null;
  eligibility: EligibilityState | null;
  userRole: string;
  actionLoading: string | null;
  feedback: string;
  onAction: (action: string) => void;
  onFeedbackChange: (v: string) => void;
  onAssign: (userId: string) => void;
}) {
  if (!item) return null;
  const isTerminal = ["APPROVED", "REJECTED", "RELEASED", "EXPIRED", "ARCHIVED"].includes(item.status);

  const btn = (key: string, label: string, icon: React.ReactNode, style: string, disabled?: boolean) => (
    <button
      key={key}
      onClick={() => onAction(key)}
      disabled={actionLoading === key || disabled}
      title={disabled && eligibility?.reason ? eligibility.reason : ""}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        style === "primary"
          ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
          : style === "danger"
          ? "bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20"
          : style === "warning"
          ? "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/20"
          : "bg-white/5 hover:bg-white/10 text-[#aaa] border border-white/10"
      }`}
    >
      {actionLoading === key ? <RefreshCcw className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );

  const canApprove = eligibility?.can_approve ?? false;
  const canReject = eligibility?.can_reject ?? false;
  const canRevise = eligibility?.can_request_revision ?? false;
  const canEscalate = eligibility?.can_escalate ?? false;
  const canOverride = eligibility?.can_override ?? false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!isTerminal && (
          <>
            {btn("approve", "Approve", <CheckCircle2 className="w-3.5 h-3.5" />, "primary", !canApprove)}
            {btn("reject", "Reject", <XCircle className="w-3.5 h-3.5" />, "danger", !canReject)}
            {btn("request_revision", "Request Revision", <RotateCcw className="w-3.5 h-3.5" />, "warning", !canRevise)}
            {btn("escalate", "Escalate", <ArrowUpRight className="w-3.5 h-3.5" />, "warning", !canEscalate)}
            {canOverride && btn("override", "Override", <Gavel className="w-3.5 h-3.5" />, "primary")}
            {btn("block", "Block", <Ban className="w-3.5 h-3.5" />, "danger")}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAssign(item.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all bg-white/5 hover:bg-white/10 text-[#aaa] border border-white/10"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Assign
        </button>
        <button onClick={() => onAction("download")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all bg-white/5 hover:bg-white/10 text-[#aaa] border border-white/10">
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button onClick={() => window.open(`/source/${item.source_module}/${item.id}`, "_blank")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all bg-white/5 hover:bg-white/10 text-[#aaa] border border-white/10">
          <ExternalLink className="w-3.5 h-3.5" />
          Open Source
        </button>
      </div>

      {["reject", "request_revision", "escalate", "override"].includes(actionLoading?.replace(item.id, "") || "") && (
        <textarea
          placeholder="Add a required note for this action…"
          value={feedback}
          onChange={e => onFeedbackChange(e.target.value)}
          rows={2}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-xs text-white placeholder-[#555] outline-none focus:border-indigo-500/50 resize-none"
        />
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  // Data state
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string>("reviewer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detail state
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<ReviewItem | null>(null);
  const [validationAreas, setValidationAreas] = useState<ValidationArea[]>([]);
  const [policyFlags, setPolicyFlags] = useState<PolicyFlag[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityState | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<AuditEntry[]>([]);

  // UI state
  const [filter, setFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comparisonTab, setComparisonTab] = useState("submitted");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [noteDialogItemId, setNoteDialogItemId] = useState<string | null>(null);
  const [noteDialogText, setNoteDialogText] = useState("");

  const selectedItem = items.find(i => i.id === selectedId) || null;

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, sRes, cRes] = await Promise.all([
        api.get("/api/v1/review-queue"),
        api.get("/api/v1/review-queue/stats"),
        api.get("/api/v1/user/context"),
      ]);
      if (qRes.success) setItems(qRes.data || qRes.items || []);
      if (sRes.success) setStats(sRes.data || sRes);
      if (cRes.success && cRes.data?.role) setUserRole(cRes.data.role);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Queue could not be loaded.";
      setError(msg);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchDetail = useCallback(async (itemId: string) => {
    setDetailLoading(true);
    try {
      const [dRes, vRes, pRes, aRes, nRes, eRes, rRes] = await Promise.all([
        api.get(`/api/v1/review-queue/items/${itemId}`),
        api.get(`/api/v1/review-queue/items/${itemId}/validation`),
        api.get(`/api/v1/review-queue/items/${itemId}/policy-flags`),
        api.get(`/api/v1/review-queue/items/${itemId}/audit-log`),
        api.get(`/api/v1/review-queue/items/${itemId}/notes`),
        api.get(`/api/v1/review-queue/items/${itemId}/eligibility`),
        api.get(`/api/v1/review-queue/items/${itemId}/revision-history`),
      ]);
      if (dRes.success) setDetailItem(dRes.data || dRes.item || dRes);
      if (vRes.success) setValidationAreas(vRes.data || vRes.areas || []);
      if (pRes.success) setPolicyFlags(pRes.data || pRes.flags || []);
      if (aRes.success) setAuditTrail(aRes.data || aRes.entries || []);
      if (nRes.success) setNotes(nRes.data || nRes.notes || []);
      if (eRes.success) setEligibility(eRes.data || eRes.eligibility || null);
      if (rRes.success) setRevisionHistory(rRes.data || rRes.history || []);
      if (!vRes.success) setValidationAreas([]);
      if (!pRes.success) setPolicyFlags([]);
    } catch {
      setMessage({ type: "error", text: "Failed to load item details." });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else { setDetailItem(null); setValidationAreas([]); setPolicyFlags([]); setAuditTrail([]); setNotes([]); setEligibility(null); }
  }, [selectedId, fetchDetail]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAction = async (action: string, idParam?: string) => {
    const targetId = idParam || selectedId;
    if (!targetId) return;
    setActionLoading(action);
    setMessage(null);
    try {
      const result = await api.post(`/api/v1/review-queue/items/${targetId}/action`, {
        action,
        reason: feedback || undefined,
      });
      if (result.success) {
        setMessage({ type: "success", text: `${action.replace(/_/g, " ")} successful.` });
        setFeedback("");
        const qRes = await api.get("/api/v1/review-queue");
        if (qRes.success) setItems(qRes.data || qRes.items || []);
        const sRes = await api.get("/api/v1/review-queue/stats");
        if (sRes.success) setStats(sRes.data || sRes);
        if (selectedId) await fetchDetail(selectedId);
      } else {
        setMessage({ type: "error", text: result.error || `Failed to ${action}.` });
      }
    } catch {
      setMessage({ type: "error", text: `Failed to ${action}. Please try again.` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedId) return;
    setActionLoading("assign");
    try {
      const result = await api.patch(`/api/v1/review-queue/items/${selectedId}/assign`, {
        approver_id: "me",
      });
      if (result.success) {
        setMessage({ type: "success", text: "Assigned to you." });
        fetchAll();
        if (selectedId) fetchDetail(selectedId);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to assign." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!selectedId || !feedback.trim()) return;
    setActionLoading("note");
    try {
      await api.post(`/api/v1/review-queue/items/${selectedId}/notes`, { note_body: feedback });
      setMessage({ type: "success", text: "Note added." });
      setFeedback("");
      if (selectedId) fetchDetail(selectedId);
    } catch {
      setMessage({ type: "error", text: "Failed to add note." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (bulkSelected.size === 0) return;
    setActionLoading(`bulk_${action}`);
    setMessage(null);
    try {
      const result = await api.post(`/api/v1/review-queue/bulk/${action}`, {
        item_ids: Array.from(bulkSelected),
      });
      if (result.success) {
        setMessage({ type: "success", text: `Bulk ${action} completed for ${bulkSelected.size} items.` });
        setBulkSelected(new Set());
        setBulkMode(false);
        fetchAll();
      } else {
        setMessage({ type: "error", text: result.error || `Bulk ${action} failed.` });
      }
    } catch {
      setMessage({ type: "error", text: `Bulk ${action} failed. Please try again.` });
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Filtering & Search ────────────────────────────────────────────────────

  let filteredItems = items;

  if (metricFilter === "assigned_to_me") {
    filteredItems = filteredItems.filter(i => i.assigned_to === "me");
  } else if (metricFilter === "high_critical_risk") {
    filteredItems = filteredItems.filter(i => i.risk_level === "HIGH" || i.risk_level === "CRITICAL");
  } else if (metricFilter === "due_today") {
    filteredItems = filteredItems.filter(i => {
      if (!i.due_at) return false;
      const due = new Date(i.due_at);
      const now = new Date();
      return due.toDateString() === now.toDateString();
    });
  } else if (metricFilter === "awaiting_revision") {
    filteredItems = filteredItems.filter(i => i.status === "AWAITING_REVISION");
  } else if (metricFilter === "escalated") {
    filteredItems = filteredItems.filter(i => i.status === "ESCALATED");
  } else if (metricFilter === "pending_review") {
    filteredItems = filteredItems.filter(i => i.status === "PENDING_REVIEW");
  }

  if (filter !== "all") {
    if (filter === "assigned_to_me") {
      filteredItems = filteredItems.filter(i => i.assigned_to === "me");
    } else if (filter === "high_risk") {
      filteredItems = filteredItems.filter(i => i.risk_level === "HIGH" || i.risk_level === "CRITICAL");
    } else if (filter === "due_today") {
      filteredItems = filteredItems.filter(i => {
        if (!i.due_at) return false;
        return new Date(i.due_at).toDateString() === new Date().toDateString();
      });
    } else if (filter === "approved") {
      filteredItems = filteredItems.filter(i => i.status === "APPROVED" || i.status === "RELEASED");
    } else if (filter === "rejected") {
      filteredItems = filteredItems.filter(i => i.status === "REJECTED");
    } else if (filter === "released") {
      filteredItems = filteredItems.filter(i => i.status === "RELEASED");
    } else {
      const statuses = TAB_FILTER_MAP[filter] || [];
      if (statuses.length > 0) {
        filteredItems = filteredItems.filter(i => statuses.includes(i.status));
      }
    }
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(i =>
      i.title?.toLowerCase().includes(q) ||
      i.campaign?.toLowerCase().includes(q) ||
      i.platform?.toLowerCase().includes(q) ||
      i.submitted_by?.toLowerCase().includes(q) ||
      i.assigned_to?.toLowerCase().includes(q) ||
      i.item_type?.toLowerCase().includes(q) ||
      i.source_module?.toLowerCase().includes(q) ||
      i.risk_category?.toLowerCase().includes(q)
    );
  }

  const sortedItems = [...filteredItems].sort((a, b) => {
    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const aRisk = riskOrder[a.risk_level as keyof typeof riskOrder] ?? 99;
    const bRisk = riskOrder[b.risk_level as keyof typeof riskOrder] ?? 99;
    if (aRisk !== bRisk) return aRisk - bRisk;
    if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
  });

  // ─── Render Helpers ────────────────────────────────────────────────────────

  function renderContentPreview(item: ReviewItem) {
    const type = item.item_type || "Social Post";
    switch (type) {
      case "Social Post":
        return (
          <div className="space-y-3">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-[#ccc] leading-relaxed">{(item.content_snapshot?.copy as string) || item.title}</p>
              {(item.content_snapshot?.hashtags as string[])?.length > 0 && (
                <p className="text-xs text-indigo-400 mt-2">{(item.content_snapshot?.hashtags as string[])?.join(" ")}</p>
              )}
              {(item.content_snapshot?.mentions as string[])?.length > 0 && (
                <p className="text-xs text-cyan-400 mt-1">{(item.content_snapshot?.mentions as string[])?.join(", ")}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#666]">
              <span>Platform: {item.platform || "—"}</span>
              {!!item.content_snapshot?.scheduled_at && (
                <><span>•</span><span>Scheduled: {formatDate(item.content_snapshot?.scheduled_at as string)}</span></>
              )}
            </div>
          </div>
        );
      case "Inbox Reply":
        return (
          <div className="space-y-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">Original Message</p>
              <p className="text-xs text-[#999]">{(item.content_snapshot?.original_message as string) || "Original message not available"}</p>
            </div>
            <div className="bg-indigo-500/5 rounded-xl p-3 border border-indigo-500/20">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">AI Draft</p>
              <p className="text-sm text-[#ccc]">{(item.content_snapshot?.ai_draft as string) || item.title}</p>
            </div>
          </div>
        );
      case "Agent Action":
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-xs"><span className="text-[#888]">Agent:</span><span className="text-white">{(item.content_snapshot?.agent_name as string) || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Task:</span><span className="text-white">{(item.content_snapshot?.task as string) || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Proposed Action:</span><span className="text-white">{(item.content_snapshot?.proposed_action as string) || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Affected Module:</span><span className="text-white">{item.source_module}</span></div>
          </div>
        );
      case "Campaign Asset":
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-xs"><span className="text-[#888]">Campaign:</span><span className="text-white">{item.campaign || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Objective:</span><span className="text-white">{(item.content_snapshot?.objective as string) || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Audience:</span><span className="text-white">{(item.content_snapshot?.audience as string) || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">CTA:</span><span className="text-white">{(item.content_snapshot?.cta as string) || "—"}</span></div>
          </div>
        );
      case "Workflow Output":
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-xs"><span className="text-[#888]">Workflow:</span><span className="text-white">{item.source_module}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Trigger:</span><span className="text-white">{(item.content_snapshot?.triggering_event as string) || "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#888]">Output:</span><span className="text-white">{(item.content_snapshot?.output as string) || item.title}</span></div>
          </div>
        );
      default:
        return <p className="text-sm text-[#ccc]">{item.title}</p>;
    }
  }

  function renderComparisonTab(tab: string) {
    const content = detailItem?.content_snapshot || {};
    switch (tab) {
      case "submitted":
        return (
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-2">Submitted Output</p>
            <p className="text-sm text-[#ccc] leading-relaxed">{(content.submitted_output as string) || detailItem?.title || "No content"}</p>
          </div>
        );
      case "original":
        return (
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-2">Original Request</p>
            <p className="text-sm text-[#999] leading-relaxed italic">{(content.original_request as string) || "Original request not available"}</p>
          </div>
        );
      case "ai_draft":
        return (
          <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/20">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI Draft</p>
            <p className="text-sm text-[#ccc]">{(content.ai_draft as string) || detailItem?.title || "No AI draft available"}</p>
          </div>
        );
      case "human_edits":
        return (
          <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Human Edits</p>
            <p className="text-sm text-[#ccc]">{(content.human_edits as string) || "No human edits recorded"}</p>
          </div>
        );
      case "validation":
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Validation Results</p>
            {validationAreas.length > 0 ? validationAreas.map((va, i) => (
              <div key={va.area} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2 border border-white/5">
                <span className="text-xs text-[#aaa]">{va.area.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  va.status === "Passed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  va.status === "Warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>{va.status}</span>
              </div>
            )) : <p className="text-xs text-[#555]">No validation results.</p>}
          </div>
        );
      case "policy":
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Policy Flags</p>
            {policyFlags.length > 0 ? policyFlags.map(pf => (
              <div key={pf.id} className="bg-red-500/5 rounded-lg p-3 border border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Flag className="w-3 h-3 text-red-400" />
                  <span className="text-xs font-semibold text-red-400">{pf.rule}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{pf.severity}</span>
                </div>
                <p className="text-[11px] text-[#999]">{pf.summary}</p>
              </div>
            )) : <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> No policy flags</p>}
          </div>
        );
      case "revision_history":
        return (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Revision History</p>
            {revisionHistory.length > 0 ? revisionHistory.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 bg-white/[0.02] rounded-lg p-3 border border-white/5">
                <RotateCcw className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[#aaa]">{entry.action?.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-[#555]">{formatDate(entry.performed_at)} by {entry.performed_by?.slice(0, 8)}</p>
                </div>
              </div>
            )) : <p className="text-xs text-[#555]">No revision history.</p>}
          </div>
        );
      default:
        return <p className="text-xs text-[#555]">Select a tab to view content.</p>;
    }
  }

  // ─── JSX ────────────────────────────────────────────────────────────────────

  if (error && !initialLoadDone) {
    return (
      <div className="max-w-5xl mx-auto pb-16 px-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <p className="text-white font-semibold mb-1">Review Queue could not be loaded</p>
          <p className="text-[#666] text-sm mb-4">Try again or contact support if the issue persists.</p>
          <p className="text-[#555] text-xs mb-4">Error: {error}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 px-4">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Review Queue</h1>
          <p className="text-[#888] text-sm">Review, approve, reject, revise, or escalate AI-generated outputs, campaign assets, engagement replies, and policy-sensitive work before they move forward.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="group relative">
            <button disabled={!selectedId}
              onClick={() => selectedId && handleAction("assign", selectedId)}
              className={`p-2 bg-[var(--card)] border rounded-xl transition-all ${
                selectedId ? "text-[#888] hover:text-white hover:border-[var(--card-border)]" : "text-[#555] cursor-not-allowed"
              }`}>
              <UserPlus className="w-3.5 h-3.5" />
            </button>
            <div className="absolute top-full mt-1.5 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-[10px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-44">
              {selectedId ? "Assign a reviewer to the selected item" : "Select an item to assign a reviewer"}
            </div>
          </div>
          <div className="group relative">
            <button
              onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
              className={`p-2 bg-[var(--card)] border rounded-xl transition-all ${
                bulkMode ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/5" : "border-[var(--border)] text-[#888] hover:text-white hover:border-[var(--card-border)]"
              }`}>
              <ClipboardList className="w-3.5 h-3.5" />
            </button>
            <div className="absolute top-full mt-1.5 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-[10px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-44">
              {bulkMode ? "Exit bulk selection mode" : "Select multiple items to perform bulk actions"}
            </div>
          </div>
          <div className="group relative">
            <button disabled={!selectedId}
              onClick={() => selectedId && handleAction("export", selectedId)}
              className={`p-2 bg-[var(--card)] border rounded-xl transition-all ${
                selectedId ? "text-[#888] hover:text-white hover:border-[var(--card-border)]" : "text-[#555] cursor-not-allowed"
              }`}>
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="absolute top-full mt-1.5 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-[10px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-44">
              Export the selected item
            </div>
          </div>
          <div className="group relative">
            <button disabled
              className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#555] cursor-not-allowed transition-all">
              <Settings className="w-3.5 h-3.5" />
            </button>
            <div className="absolute top-full mt-1.5 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-[10px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-44">
              Admin only: configure review queue settings
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white hover:border-[var(--card-border)] transition-all group ml-1"
            title="Refresh Queue"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>
        </div>
      </div>

      {/* ─── Toast ──────────────────────────────────────────────────────────── */}
      {message && (
        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ─── Metric Cards ───────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {METRIC_CARDS.map(mc => {
            const val = stats[mc.key as keyof Stats] ?? 0;
            const isActive = metricFilter === mc.key;
            return (
              <button
                key={mc.key}
                onClick={() => setMetricFilter(isActive ? null : mc.key)}
                className={`bg-[var(--card)] border rounded-xl p-3 flex items-center gap-3 text-left transition-all ${
                  isActive
                    ? "border-indigo-500/40 bg-indigo-500/5"
                    : "border-[var(--border)] hover:border-[var(--card-border)]"
                }`}
              >
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">{mc.icon}</div>
                <div>
                  <p className={`text-lg font-bold ${mc.color}`}>{val}</p>
                  <p className="text-[9px] text-[#666] font-medium uppercase tracking-wider leading-tight">{mc.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 3-Panel Layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 min-h-[calc(100vh-320px)]">
        {/* ─── Left Panel ──────────────────────────────────────────────────── */}
        <div className="w-[340px] shrink-0 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              type="text"
              placeholder="Search items, campaigns, reviewers…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-[var(--card)] border border-[var(--border)] text-white placeholder-[#555] outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Bulk Mode Bar */}
          {bulkMode && bulkSelected.size > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <span className="text-[10px] text-indigo-300 font-semibold whitespace-nowrap">{bulkSelected.size} selected</span>
              <div className="flex gap-1 ml-auto">
                <button onClick={() => { setBulkSelected(new Set()); setBulkMode(false); }} className="px-2 py-1 text-[9px] font-bold text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={() => setBulkSelected(new Set())} className="px-2 py-1 text-[9px] font-bold text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-all">Deselect All</button>
                <button disabled={actionLoading === "bulk_approve"} onClick={() => handleBulkAction("approve")} className="px-2 py-1 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all">Approve</button>
                <button disabled={actionLoading === "bulk_reject"} onClick={() => handleBulkAction("reject")} className="px-2 py-1 text-[9px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">Reject</button>
                <button onClick={() => handleBulkAction("assign")} className="px-2 py-1 text-[9px] font-bold text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all">Assign</button>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); setMetricFilter(null); }}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  filter === tab.key && !metricFilter
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-[#666] hover:text-[#aaa] border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center py-16 text-[#666] gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Loading queue…</p>
              </div>
            ) : error ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">Failed to load queue</p>
                <p className="text-[#666] text-[11px] mb-3">{error}</p>
                <button onClick={fetchAll} className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/30 transition-all">
                  Retry
                </button>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <div className={`w-12 h-12 ${filter === "rejected" || filter === "blocked" ? "bg-rose-500/10" : filter === "escalated" ? "bg-amber-500/10" : filter === "approved" || filter === "released" ? "bg-emerald-500/10" : "bg-white/5"} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                  {filter === "approved" || filter === "released" ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> :
                   filter === "rejected" ? <XCircle className="w-6 h-6 text-rose-400" /> :
                   filter === "blocked" ? <AlertTriangle className="w-6 h-6 text-rose-400" /> :
                   filter === "escalated" ? <AlertTriangle className="w-6 h-6 text-amber-400" /> :
                   <CheckCircle2 className="w-6 h-6 text-[#555]" />}
                </div>
                <p className="text-white font-semibold text-sm mb-1">
                  {metricFilter === "assigned_to_me" ? "No items assigned to you." :
                   filter === "assigned_to_me" ? "No items assigned to you." :
                   metricFilter === "high_critical_risk" ? "No high-risk items in review." :
                   filter === "high_risk" ? "No high-risk items in review." :
                   filter === "due_today" ? "Nothing due today." :
                   filter === "approved" ? "No approved items." :
                   filter === "rejected" ? "No rejected items." :
                   filter === "released" ? "No released items." :
                   filter === "blocked" ? "No blocked items." :
                   filter === "escalated" ? "No escalated items." :
                   filter === "revision" ? "No items awaiting revision." :
                   "No items waiting for review."}
                </p>
                <p className="text-[#666] text-[11px] mb-3">
                  {filter === "assigned_to_me" || metricFilter === "assigned_to_me"
                    ? "When review items are assigned to you, they will appear here."
                    : filter === "high_risk" || metricFilter === "high_critical_risk"
                    ? "High-risk and critical items will appear here when governance rules require elevated review."
                    : filter === "due_today"
                    ? "Items with a due date of today will appear here."
                    : filter === "approved"
                    ? "Review items that have been approved will appear here."
                    : filter === "rejected"
                    ? "Review items that have been rejected will appear here."
                    : filter === "released"
                    ? "Review items that have been released to the next stage will appear here."
                    : filter === "blocked"
                    ? "Items blocked or expired due to policy or validation failure will appear here."
                    : filter === "escalated"
                    ? "Items escalated for higher-level review will appear here."
                    : filter === "revision"
                    ? "Items sent back for revision will appear here once they are flagged."
                    : metricFilter === "awaiting_revision"
                    ? "Items awaiting revision will appear here after a reviewer requests changes."
                    : metricFilter === "escalated"
                    ? "Items escalated for higher-level review will appear here."
                    : metricFilter === "pending_review"
                    ? "Items pending human review will appear here once they enter the review queue."
                    : "Items that require human review, approval, revision, or escalation will appear here."}
                </p>
                {(metricFilter || filter !== "all") && (
                  <button
                    onClick={() => { setMetricFilter(null); setFilter("all"); }}
                    className="text-indigo-400 text-[11px] hover:underline font-semibold"
                  >
                    {metricFilter === "assigned_to_me" || filter === "assigned_to_me" ? "View All Items" :
                     metricFilter === "pending_review" || filter === "pending" ? "View All Items" :
                     "Clear filters"}
                  </button>
                )}
              </div>
            ) : (
              sortedItems.map(item => {
                const risk = RISK_CONFIG[item.risk_level as keyof typeof RISK_CONFIG] || RISK_CONFIG.LOW;
                const stage = STAGE_CONFIG[item.status] || { label: item.status, color: "bg-white/5 text-[#888] border-white/10" };
                const priority = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.NORMAL;
                const sla = getSLAStatus(item.due_at);
                const badges = getItemBadges(item);
                const isSelected = selectedId === item.id;

                const isBulkChecked = bulkSelected.has(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (bulkMode) {
                        const next = new Set(bulkSelected);
                        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                        setBulkSelected(next);
                      } else {
                        setSelectedId(isSelected ? null : item.id);
                      }
                    }}
                    className={`w-full text-left bg-[var(--card)] border rounded-xl p-3 transition-all duration-150 hover:border-[var(--card-border)] border-l-4 ${risk.border} ${
                      isSelected ? "border-indigo-500/40 border-l-indigo-500 bg-indigo-500/[0.02]" : "border-[var(--border)]"
                    } ${isBulkChecked ? "border-indigo-500/60 bg-indigo-500/5" : ""}`}
                  >
                    {/* Title + Type */}
                    <div className="flex items-start gap-2 mb-1.5">
                      {bulkMode && (
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isBulkChecked ? "bg-indigo-500 border-indigo-500" : "border-[#555]"
                        }`}>
                          {isBulkChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <span className="shrink-0 mt-0.5 text-[#666]">{ITEM_TYPE_ICONS[item.item_type] || <FileText className="w-3.5 h-3.5" />}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-[#555]">{item.item_type}</span>
                          <span className="text-[9px] text-[#555]">•</span>
                          <span className="text-[9px] text-[#555]">{item.source_module}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status + Risk + Priority */}
                    <div className="flex flex-wrap items-center gap-1 mb-1.5">
                      <span className={`px-1.5 py-[1px] rounded border text-[9px] font-bold ${stage.color}`}>{stage.label}</span>
                      <span className={`px-1.5 py-[1px] rounded border text-[9px] font-bold flex items-center gap-1 ${risk.badge}`}>
                        <span className={`w-1 h-1 rounded-full ${risk.dot}`} />
                        {risk.label}
                      </span>
                      <span className={`text-[9px] font-bold ${priority.color}`}>{priority.label}</span>
                    </div>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {badges.map(b => {
                          const cfg = BADGE_CONFIG[b];
                          if (!cfg) return null;
                          return (
                            <span key={b} className={`inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded border text-[8px] font-bold ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[9px] text-[#555]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">by {item.submitted_by?.slice(0, 8)}</span>
                        {item.assigned_to && (
                          <span className="flex items-center gap-0.5 shrink-0">
                            <User className="w-2.5 h-2.5" />
                            {item.assigned_to.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{formatShortDate(item.submitted_at)}</span>
                        {sla.badge && (
                          <span className={`font-bold ${
                            sla.badge === "Overdue" ? "text-red-400" : "text-amber-400"
                          }`}>{sla.badge}</span>
                        )}
                      </div>
                    </div>

                    {/* Validation + Policy status */}
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[var(--border)]/50">
                      <span className={`text-[8px] font-bold px-1 py-[1px] rounded-full border ${
                        item.validation_status === "Passed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        item.validation_status === "Failed" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        Val: {item.validation_status || "N/A"}
                      </span>
                      <span className={`text-[8px] font-bold px-1 py-[1px] rounded-full border ${
                        item.policy_flag_status === "Flagged" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        item.policy_flag_status === "Clear" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}>
                        Policy: {item.policy_flag_status || "N/A"}
                      </span>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[var(--border)]/50">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedId(item.id); }}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                      >
                        <Eye className="w-2.5 h-2.5" /> Open
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleAction("assign", item.id); }}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-[#888] hover:bg-white/10 transition-all"
                      >
                        <UserPlus className="w-2.5 h-2.5" /> Assign
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setNoteDialogItemId(item.id); }}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-[#888] hover:bg-white/10 transition-all"
                      >
                        <Pen className="w-2.5 h-2.5" /> Note
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Center Panel ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!selectedItem ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl h-full min-h-[400px] flex flex-col items-center justify-center p-12">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <Eye className="w-7 h-7 text-[#555]" />
              </div>
              <p className="text-white font-semibold mb-1">Select an item to review</p>
              <p className="text-[#666] text-sm">Choose an item from the queue to view its content, validation, and governance details.</p>
            </div>
          ) : detailLoading ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl h-full min-h-[400px] flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#666]">Loading item details…</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden h-full">
              {/* Review Header */}
              <div className="p-4 border-b border-[var(--border)]/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">{detailItem?.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#666]">
                      <span>{detailItem?.item_type}</span>
                      <span>•</span>
                      <span>{detailItem?.source_module}</span>
                      {detailItem?.campaign && <><span>•</span><span>{detailItem.campaign}</span></>}
                      {detailItem?.platform && <><span>•</span><span>{detailItem.platform}</span></>}
                    </div>
                  </div>
                  {detailItem && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(detailItem as ReviewItem).risk_level && (
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                          RISK_CONFIG[(detailItem as ReviewItem).risk_level as keyof typeof RISK_CONFIG]?.badge || ""
                        }`}>
                          {RISK_CONFIG[(detailItem as ReviewItem).risk_level as keyof typeof RISK_CONFIG]?.label || (detailItem as ReviewItem).risk_level} Risk
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                        STAGE_CONFIG[(detailItem as ReviewItem).status]?.color || ""
                      }`}>
                        {STAGE_CONFIG[(detailItem as ReviewItem).status]?.label || (detailItem as ReviewItem).status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[10px] text-[#666] flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {detailItem?.submitted_by?.slice(0, 8) || "—"}</span>
                  {detailItem?.assigned_to && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {detailItem.assigned_to.slice(0, 8)}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Submitted {formatShortDate(detailItem?.submitted_at)}</span>
                  {detailItem?.due_at && (
                    <span className={`flex items-center gap-1 ${getSLAStatus(detailItem.due_at).color}`}>
                      <Clock3 className="w-3 h-3" /> Due {formatShortDate(detailItem.due_at)}
                    </span>
                  )}
                </div>

                {/* Eligibility */}
                {eligibility && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                    {getEligibilityIcon(eligibility.state)}
                    <span className="text-[#888]">{eligibility.state}</span>
                    {eligibility.reason && <span className="text-[#666]">— {eligibility.reason}</span>}
                  </div>
                )}
              </div>

              {/* Content Preview */}
              <div className="p-4 border-b border-[var(--border)]/50">
                <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-2">Content Preview</p>
                {detailItem && renderContentPreview(detailItem)}
              </div>

              {/* Comparison Tabs */}
              <div className="p-4 border-b border-[var(--border)]/50">
                <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                  {[
                    { key: "submitted", label: "Submitted Output" },
                    { key: "original", label: "Original Request" },
                    { key: "ai_draft", label: "AI Draft" },
                    { key: "human_edits", label: "Human Edits" },
                    { key: "validation", label: "Validation Results" },
                    { key: "policy", label: "Policy Flags" },
                    { key: "revision_history", label: "Revision History" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setComparisonTab(tab.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        comparisonTab === tab.key
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "text-[#666] hover:text-[#aaa] border border-transparent"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {renderComparisonTab(comparisonTab)}
              </div>

              {/* Review Action Bar */}
              <div className="p-4">
                <ReviewActionBar
                  item={detailItem}
                  eligibility={eligibility}
                  userRole={userRole}
                  actionLoading={actionLoading}
                  feedback={feedback}
                  onAction={handleAction}
                  onFeedbackChange={setFeedback}
                  onAssign={() => handleAssignToMe()}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Panel ──────────────────────────────────────────────────── */}
        <div className="w-[320px] shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Risk Summary Card */}
          {detailItem && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Risk Summary</h4>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#888]">Overall Risk</span>
                  <span className={`font-bold ${RISK_CONFIG[(detailItem as ReviewItem).risk_level as keyof typeof RISK_CONFIG]?.color || "text-white"}`}>
                    {(detailItem as ReviewItem).risk_level || "Unknown"}
                  </span>
                </div>
                {detailItem.risk_category && (
                  <div className="flex justify-between">
                    <span className="text-[#888]">Category</span>
                    <span className="text-white text-right max-w-[180px]">{detailItem.risk_category}</span>
                  </div>
                )}
                {detailItem.confidence_score !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[#888]">Confidence</span>
                    <span className="text-white">{(detailItem.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                )}
                {eligibility?.state && (
                  <div className="flex justify-between">
                    <span className="text-[#888]">Eligibility</span>
                    <span className="text-white text-right max-w-[180px]">{eligibility.state}</span>
                  </div>
                )}
              </div>

              {policyFlags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]/50 space-y-1.5">
                  <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Detected Issues</p>
                  {policyFlags.slice(0, 3).map((pf, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />
                      <span className="text-[#999] truncate">{pf.rule}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Summary Card */}
          {detailItem && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Validation Summary</h4>
              </div>
              <div className="space-y-1.5">
                {VALIDATION_AREAS.map(va => {
                  const area = validationAreas.find(a => a.area === va.key);
                  const status = area?.status || "Pending";
                  return (
                    <div key={va.key} className="flex items-center justify-between">
                      <span className="text-[10px] text-[#888]">{va.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded-full border ${
                        status === "Passed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        status === "Warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        status === "Failed" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assignment Card */}
          {detailItem && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Assignment</h4>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#888]">Assigned To</span>
                  <span className="text-white">{detailItem.assigned_to?.slice(0, 12) || "Unassigned"}</span>
                </div>
                {detailItem.assigned_team && (
                  <div className="flex justify-between">
                    <span className="text-[#888]">Team</span>
                    <span className="text-white">{detailItem.assigned_team}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#888]">Submitted By</span>
                  <span className="text-white">{detailItem.submitted_by?.slice(0, 12)}</span>
                </div>
                {detailItem.due_at && (
                  <div className="flex justify-between">
                    <span className="text-[#888]">Due Date</span>
                    <span className={`${getSLAStatus(detailItem.due_at).color}`}>{formatDate(detailItem.due_at)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[var(--border)]/50">
                <button
                  onClick={handleAssignToMe}
                  disabled={actionLoading === "assign"}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-2.5 h-2.5" /> Assign to Me
                </button>
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-[#888] hover:bg-white/10 border border-white/10 transition-all">
                  <UserPlus className="w-2.5 h-2.5" /> Reassign
                </button>
              </div>
            </div>
          )}

          {/* Reviewer Notes */}
          {detailItem && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Reviewer Notes</h4>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {notes.length === 0 ? (
                  <p className="text-[10px] text-[#555] italic">No notes yet.</p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-white/[0.02] rounded-lg p-2.5 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-[#aaa]">{note.created_by?.slice(0, 8)}</span>
                        <span className="text-[9px] text-[#555]">{formatTimeAgo(note.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-[#ccc] leading-relaxed">{note.note_body}</p>
                      {note.replies && note.replies.length > 0 && (
                        <div className="mt-2 ml-3 pl-2 border-l border-white/10 space-y-1">
                          {note.replies.map(reply => (
                            <div key={reply.id} className="text-[10px]">
                              <span className="text-[#888]">{reply.created_by?.slice(0, 8)}</span>
                              <span className="text-[#555] ml-1">{reply.note_body}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  placeholder="Add a note…"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={2}
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-[11px] text-white placeholder-[#555] outline-none focus:border-indigo-500/50 resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={actionLoading === "note" || !feedback.trim()}
                  className="px-2.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold transition-all shrink-0 self-end"
                >
                  {actionLoading === "note" ? <RefreshCcw className="w-3 h-3 animate-spin" /> : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Audit Timeline */}
          {detailItem && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-3.5 h-3.5 text-purple-400" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Audit Timeline</h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditTrail.length === 0 ? (
                  <p className="text-[10px] text-[#555] italic">No audit entries yet.</p>
                ) : (
                  auditTrail.map((entry, i) => (
                    <div key={entry.id || i} className="flex items-start gap-2.5">
                      <div className="relative flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-500/50 mt-1.5" />
                        {i < auditTrail.length - 1 && <div className="w-px h-full bg-[var(--border)]/50 absolute top-3" />}
                      </div>
                      <div className="min-w-0 pb-2">
                        <p className="text-[11px] text-[#aaa] font-medium">{entry.action?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                        <p className="text-[9px] text-[#555]">
                          {formatTimeAgo(entry.performed_at)} by {entry.performed_by?.slice(0, 8)}
                        </p>
                        {(entry.previous_value || entry.new_value) && (
                          <p className="text-[9px] text-[#666] mt-0.5">
                            {entry.previous_value} → {entry.new_value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Empty right panel state */}
          {!detailItem && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-5 h-5 text-[#555]" />
              </div>
              <p className="text-white text-xs font-semibold mb-1">No Item Selected</p>
              <p className="text-[#666] text-[10px]">Select an item from the queue to view governance details.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Note Dialog ─────────────────────────────────────────────────── */}
      {noteDialogItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setNoteDialogItemId(null); setNoteDialogText(""); }}>
          <div className="bg-[#0a0a0a] border border-[#2d2d2d] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-4">Add Note</h3>
            <textarea value={noteDialogText} onChange={e => setNoteDialogText(e.target.value)}
              rows={4} className="w-full p-3 bg-[#111] border border-[#2d2d2d] rounded-lg text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40 resize-none"
              placeholder="Enter your note..." />
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#2d2d2d]">
              <button onClick={() => { setNoteDialogItemId(null); setNoteDialogText(""); }} className="px-4 py-2 bg-[#161616] hover:bg-[#1a1a1a] text-[#888] rounded-lg text-xs font-medium">Cancel</button>
              <button onClick={() => { if (noteDialogText.trim() && noteDialogItemId) { handleAction("add-note", noteDialogItemId); setNoteDialogItemId(null); setNoteDialogText(""); } }} disabled={!noteDialogText.trim() || actionLoading === "add-note"} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-medium">Add Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

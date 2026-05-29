"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ArrowUpRight,
  RefreshCcw, AlertCircle, Search, Filter,
  ChevronRight, UserPlus, ShieldCheck, FileText, MessageSquare,
  Eye, EyeOff, Download, Settings,
  Flag, Activity, ThumbsUp,
  ThumbsDown, MessageCircle,
  HelpCircle, Info, ExternalLink,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

// ─── Types ────────────────────────────────────────────────────────────────

type ApprovalStatus = "PENDING_APPROVAL" | "IN_REVIEW" | "WAITING_ON_OTHERS" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "ESCALATED" | "CONDITIONAL_APPROVAL" | "BLOCKED" | "CANCELLED" | "COMPLETED" | "ARCHIVED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ItemType = "SOCIAL_POST" | "INBOX_REPLY" | "CAMPAIGN_ASSET" | "AGENT_ACTION" | "WORKFLOW_OUTPUT" | "VALIDATION_OVERRIDE" | "EXCEPTION_OUTCOME" | "RESTRICTED_OPERATION" | "COMPLIANCE_SENSITIVE_ITEM" | "PUBLISHING_ACTION";
type EligibilityState = "APPROVAL_ELIGIBLE" | "REJECTION_ELIGIBLE" | "CHANGES_REQUEST_ELIGIBLE" | "CONDITIONAL_APPROVAL_ELIGIBLE" | "ESCALATION_REQUIRED" | "WAITING_ON_PRIOR_STAGE" | "MISSING_REQUIRED_APPROVER" | "VALIDATION_BLOCKED" | "REVALIDATION_REQUIRED" | "PERMISSION_DENIED" | "ALREADY_DECIDED" | "WORKFLOW_COMPLETED";
type TabId = "queue" | "assigned" | "waiting" | "approved" | "rejected" | "changes" | "escalated" | "overdue" | "conditional" | "completed";
type WorkspaceTabId = "summary" | "preview" | "validation" | "grounding" | "risk" | "path" | "history" | "evidence" | "comments" | "next-destination";

interface ApprovalItem {
  id: string; title: string; item_type: ItemType; source_module: string;
  campaign?: string; platform?: string; approval_status: ApprovalStatus;
  approval_stage?: string; required_approval_level: number;
  assigned_approver_id?: string; submitted_by: string; submitter_name?: string;
  validation_status?: string; risk_level: RiskLevel;
  due_at?: string; sla_status?: string; last_activity?: string;
  next_action?: string; created_at: string;
}

interface ApprovalDecision {
  id: string; approver_id: string; approver_name?: string;
  decision: string; decision_reason?: string; decision_note?: string;
  condition_text?: string; condition_owner?: string; condition_due_at?: string;
  decided_at: string;
}

interface MetricCardDef {
  id: string; label: string; count: number; icon: React.ElementType; color: string; filterTab?: TabId;
}

interface AlertDef {
  id: string; type: string; message: string; severity: "critical" | "warning" | "info";
}

// ─── Badge Configs ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ApprovalStatus, { color: string; bg: string }> = {
  PENDING_APPROVAL:       { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  IN_REVIEW:              { color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/30" },
  WAITING_ON_OTHERS:      { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  APPROVED:               { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  REJECTED:               { color: "text-rose-400",  bg: "bg-rose-500/10 border-rose-500/30" },
  CHANGES_REQUESTED:      { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  ESCALATED:              { color: "text-red-400",   bg: "bg-red-500/10 border-red-500/30" },
  CONDITIONAL_APPROVAL:   { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  BLOCKED:                { color: "text-rose-400",  bg: "bg-rose-500/10 border-rose-500/30" },
  CANCELLED:              { color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/30" },
  COMPLETED:              { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  ARCHIVED:               { color: "text-slate-600", bg: "bg-slate-500/5 border-slate-500/20" },
};

const RISK_DOT: Record<RiskLevel, string> = {
  LOW: "bg-emerald-400", MEDIUM: "bg-amber-400", HIGH: "bg-orange-400", CRITICAL: "bg-red-400",
};

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  SOCIAL_POST: "Social Post", INBOX_REPLY: "Inbox Reply", CAMPAIGN_ASSET: "Campaign Asset",
  AGENT_ACTION: "Agent Action", WORKFLOW_OUTPUT: "Workflow Output",
  VALIDATION_OVERRIDE: "Validation Override", EXCEPTION_OUTCOME: "Exception Outcome",
  RESTRICTED_OPERATION: "Restricted Operation", COMPLIANCE_SENSITIVE_ITEM: "Compliance-Sensitive",
  PUBLISHING_ACTION: "Publishing Action",
};

const TAB_LABELS: Record<TabId, string> = {
  queue: "Approval Queue", assigned: "Assigned to Me", waiting: "Waiting on Others",
  approved: "Approved", rejected: "Rejected", changes: "Changes Requested",
  escalated: "Escalated", overdue: "Overdue", conditional: "Conditional Approvals",
  completed: "Completed",
};

const WORKSPACE_TAB_LABELS: Record<WorkspaceTabId, string> = {
  summary: "Approval Summary", preview: "Content/Item Preview",
  validation: "Validation Results", grounding: "Source Grounding",
  risk: "Risk & Compliance", path: "Approval Path",
  history: "Decision History", evidence: "Evidence",
  comments: "Comments", "next-destination": "Next Destination",
};

const ELIGIBILITY_LABEL: Record<EligibilityState, { label: string; color: string }> = {
  APPROVAL_ELIGIBLE:            { label: "Approval Eligible",       color: "text-emerald-400" },
  REJECTION_ELIGIBLE:           { label: "Rejection Eligible",      color: "text-rose-400" },
  CHANGES_REQUEST_ELIGIBLE:     { label: "Changes Request Eligible", color: "text-orange-400" },
  CONDITIONAL_APPROVAL_ELIGIBLE:{ label: "Conditional Eligible",   color: "text-purple-400" },
  ESCALATION_REQUIRED:          { label: "Escalation Required",    color: "text-red-400" },
  WAITING_ON_PRIOR_STAGE:       { label: "Waiting on Prior Stage", color: "text-amber-400" },
  MISSING_REQUIRED_APPROVER:    { label: "Missing Approver",       color: "text-rose-400" },
  VALIDATION_BLOCKED:           { label: "Validation Blocked",     color: "text-red-400" },
  REVALIDATION_REQUIRED:        { label: "Revalidation Required",  color: "text-amber-400" },
  PERMISSION_DENIED:            { label: "Permission Denied",      color: "text-rose-400" },
  ALREADY_DECIDED:              { label: "Already Decided",        color: "text-slate-500" },
  WORKFLOW_COMPLETED:           { label: "Workflow Completed",     color: "text-emerald-400" },
};

// ─── Mock Data ───────────────────────────────────────────────────────────

const MOCK_ITEMS: ApprovalItem[] = [
  { id: "ai1", title: "Q2 LinkedIn Campaign — Executive Summary", item_type: "SOCIAL_POST", source_module: "Media Engine", campaign: "Q2 Brand Campaign", platform: "LinkedIn", approval_status: "PENDING_APPROVAL", required_approval_level: 3, submitted_by: "harsha@zoikovertex.com", submitter_name: "Harsha", validation_status: "Passed", risk_level: "HIGH", due_at: new Date(Date.now() + 7200000).toISOString(), sla_status: "On Track", last_activity: "2h ago", next_action: "Manager Review", created_at: "2026-05-22T08:00:00Z" },
  { id: "ai2", title: "Legal Threat Response — Twitter DM", item_type: "INBOX_REPLY", source_module: "Inbox & Engagement", platform: "X", approval_status: "IN_REVIEW", required_approval_level: 4, assigned_approver_id: "user-legal", submitted_by: "naresh@zoikovertex.com", submitter_name: "Naresh", validation_status: "Warning", risk_level: "CRITICAL", due_at: new Date(Date.now() + 3600000).toISOString(), sla_status: "Due Soon", last_activity: "30m ago", next_action: "Legal Review", created_at: "2026-05-22T06:00:00Z" },
  { id: "ai3", title: "Summer Sale — Facebook Carousel", item_type: "CAMPAIGN_ASSET", source_module: "Campaigns", campaign: "Summer Sale 2026", platform: "Instagram", approval_status: "WAITING_ON_OTHERS", required_approval_level: 2, submitted_by: "admin@zoikovertex.com", submitter_name: "Admin", validation_status: "Passed", risk_level: "MEDIUM", due_at: new Date(Date.now() + 86400000).toISOString(), sla_status: "On Track", last_activity: "4h ago", next_action: "Compliance Sign-Off", created_at: "2026-05-21T14:00:00Z" },
  { id: "ai4", title: "AI Agent Action — Auto-Reply to Complaint", item_type: "AGENT_ACTION", source_module: "Agent Studio", platform: "All", approval_status: "APPROVED", required_approval_level: 3, assigned_approver_id: "user-agent-mgr", submitted_by: "system@zoikovertex.com", submitter_name: "System", validation_status: "Passed", risk_level: "HIGH", last_activity: "1h ago", next_action: "Execute", created_at: "2026-05-22T04:00:00Z" },
  { id: "ai5", title: "Brand-Sensitive Inbox Reply — Zoiko", item_type: "INBOX_REPLY", source_module: "Inbox & Engagement", platform: "LinkedIn", approval_status: "REJECTED", required_approval_level: 3, submitted_by: "harsha@zoikovertex.com", submitter_name: "Harsha", validation_status: "Failed", risk_level: "HIGH", last_activity: "3h ago", next_action: "Revise", created_at: "2026-05-21T10:00:00Z" },
  { id: "ai6", title: "Restricted Mode — Emergency Broadcast", item_type: "RESTRICTED_OPERATION", source_module: "Agent Operations", platform: "All", approval_status: "ESCALATED", required_approval_level: 5, submitted_by: "ops@zoikovertex.com", submitter_name: "Operations", validation_status: "Passed", risk_level: "CRITICAL", due_at: new Date(Date.now() + 1800000).toISOString(), sla_status: "Overdue", last_activity: "10m ago", next_action: "Executive Decision", created_at: "2026-05-22T02:00:00Z" },
  { id: "ai7", title: "YouTube Sponsorship Script", item_type: "CAMPAIGN_ASSET", source_module: "Campaigns", campaign: "Sponsorship Q3", platform: "YouTube", approval_status: "CHANGES_REQUESTED", required_approval_level: 2, submitted_by: "naresh@zoikovertex.com", submitter_name: "Naresh", validation_status: "Warning", risk_level: "MEDIUM", due_at: new Date(Date.now() + 259200000).toISOString(), sla_status: "On Track", last_activity: "1d ago", next_action: "Submit Revision", created_at: "2026-05-20T09:00:00Z" },
  { id: "ai8", title: "Workflow Output — Campaign Report", item_type: "WORKFLOW_OUTPUT", source_module: "AI Workflow Orchestration", campaign: "Monthly Report", approval_status: "CONDITIONAL_APPROVAL", required_approval_level: 2, submitted_by: "system@zoikovertex.com", submitter_name: "System", validation_status: "Passed", risk_level: "LOW", last_activity: "5h ago", next_action: "Condition Met", created_at: "2026-05-21T16:00:00Z" },
  { id: "ai9", title: "Compliance Override — Policy Flag", item_type: "VALIDATION_OVERRIDE", source_module: "Validation Desk", platform: "All", approval_status: "BLOCKED", required_approval_level: 4, submitted_by: "validator@zoikovertex.com", submitter_name: "Validator", validation_status: "Failed", risk_level: "HIGH", due_at: new Date(Date.now() - 3600000).toISOString(), sla_status: "Breached", last_activity: "6h ago", next_action: "Revalidate", created_at: "2026-05-21T08:00:00Z" },
  { id: "ai10", title: "TikTok Trend Post — Product Launch", item_type: "SOCIAL_POST", source_module: "Media Engine", campaign: "Product Launch", platform: "TikTok", approval_status: "PENDING_APPROVAL", required_approval_level: 1, submitted_by: "creator@zoikovertex.com", submitter_name: "Creator", validation_status: "Passed", risk_level: "LOW", last_activity: "20m ago", next_action: "Auto-Approve", created_at: "2026-05-22T10:00:00Z" },
];

const MOCK_METRICS: MetricCardDef[] = [
  { id: "m1", label: "Pending Approval", count: 8, icon: Clock, color: "text-blue-400", filterTab: "queue" },
  { id: "m2", label: "Assigned to Me", count: 3, icon: UserPlus, color: "text-indigo-400", filterTab: "assigned" },
  { id: "m3", label: "Approved Today", count: 12, icon: CheckCircle2, color: "text-emerald-400", filterTab: "approved" },
  { id: "m4", label: "Changes Requested", count: 5, icon: AlertTriangle, color: "text-orange-400", filterTab: "changes" },
  { id: "m5", label: "Escalated", count: 2, icon: ArrowUpRight, color: "text-red-400", filterTab: "escalated" },
  { id: "m6", label: "Overdue", count: 4, icon: AlertCircle, color: "text-rose-400", filterTab: "overdue" },
];

const MOCK_ALERTS: AlertDef[] = [
  { id: "al1", type: "Critical Approvals Pending", message: "3 high-risk items past their SLA deadline require immediate attention", severity: "critical" },
  { id: "al2", type: "SLA Breach", message: "Emergency Broadcast approval overdue — executive escalation required", severity: "critical" },
  { id: "al3", type: "Validation Failure Present", message: "Validation Desk returned FAILED for 2 pending approvals", severity: "warning" },
  { id: "al4", type: "Missing Approver", message: "Legal Threat Response has no assigned approver", severity: "warning" },
  { id: "al5", type: "Blocked Approval Path", message: "Compliance Override has no valid approval path configured", severity: "warning" },
  { id: "al6", type: "Restricted Operations Mode", message: "Restricted mode is active — all approvals require executive sign-off", severity: "info" },
];

const MOCK_DECISIONS: ApprovalDecision[] = [
  { id: "d1", approver_id: "user-1", approver_name: "Harsha", decision: "APPROVED", decision_note: "LGTM", decided_at: "2026-05-22T09:00:00Z" },
  { id: "d2", approver_id: "user-2", approver_name: "Naresh", decision: "REJECTED", decision_reason: "Content does not align with brand guidelines", decided_at: "2026-05-21T15:00:00Z" },
  { id: "d3", approver_id: "user-3", approver_name: "Legal Bot", decision: "CHANGES_REQUESTED", decision_reason: "Legal disclaimer must be added", condition_owner: "user-1", condition_due_at: "2026-05-25T00:00:00Z", decided_at: "2026-05-21T10:00:00Z" },
];

const MOCK_PATH = {
  path_type: "SEQUENTIAL" as const, current_stage: 2, total_stages: 4,
  stages: [
    { order: 1, label: "Manager Review", role: "Campaign Manager", status: "COMPLETED", completed_by: "Harsha", completed_at: "2026-05-22T08:00:00Z" },
    { order: 2, label: "Legal Review", role: "Legal", status: "IN_PROGRESS", assigned: "Naresh" },
    { order: 3, label: "Compliance", role: "Compliance", status: "PENDING" },
    { order: 4, label: "Executive Sign-Off", role: "Executive", status: "PENDING" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; return `${m}m ago`;
}

function slaColor(status?: string): string {
  if (status === "Breached") return "text-rose-400"; if (status === "Overdue" || status === "Due Soon") return "text-red-400"; return "text-emerald-400";
}

function Badge({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_BADGE[status] ?? { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>{status.replace(/_/g, " ")}</span>;
}

function RiskDot({ risk }: { risk: RiskLevel }) {
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${RISK_DOT[risk] ?? "bg-slate-500"}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { role, isSuperAdmin } = useRoles();
  const canDecide = isSuperAdmin || ['APPROVER', 'VALIDATOR', 'GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER'].includes(role ?? '');
  const canAssign = isSuperAdmin || ['GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER'].includes(role ?? '');

  const [items, setItems] = useState<ApprovalItem[]>(MOCK_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>("summary");
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [search, setSearch] = useState("");
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState<Set<string>>(new Set());
  const [eligibility, setEligibility] = useState<EligibilityState>("APPROVAL_ELIGIBLE");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [commentText, setCommentText] = useState("");

  const selectedItem = items.find(i => i.id === selectedId) || null;

  const handleAction = async (action: string, id: string) => {
    try {
      const result = await api.post(`/api/v1/approvals-v2/items/${id}/${action}`, {});
      if (result.success) {
        fetchItems();
        setMessage({ type: "success", text: `${action} action completed on ${id}` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.error || `${action} failed` });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch {
      setMessage({ type: "error", text: `${action} action failed — network error` });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(bulkSelected);
    try {
      const result = await api.post(`/api/v1/approvals-v2/bulk/${action}`, { ids });
      if (result.success) {
        fetchItems();
        setMessage({ type: "success", text: `Bulk ${action} completed for ${ids.length} items` });
        setBulkSelected(new Set());
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: result.error || `Bulk ${action} failed` });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch {
      setMessage({ type: "error", text: `Bulk ${action} failed — network error` });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await api.get("/api/v1/approvals-v2/items");
      if (result.success) setItems(result.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load approvals"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const dismissAlert = (id: string) => {
    const next = new Set(alertDismissed); next.add(id); setAlertDismissed(next);
  };

  const visibleAlerts = MOCK_ALERTS.filter(a => !alertDismissed.has(a.id));

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    if (q && !item.title.toLowerCase().includes(q) && !item.source_module.toLowerCase().includes(q)) return false;
    switch (activeTab) {
      case "queue": return item.approval_status === "PENDING_APPROVAL";
      case "assigned": return item.assigned_approver_id === "me" || item.approval_status === "IN_REVIEW";
      case "waiting": return item.approval_status === "WAITING_ON_OTHERS";
      case "approved": return item.approval_status === "APPROVED";
      case "rejected": return item.approval_status === "REJECTED";
      case "changes": return item.approval_status === "CHANGES_REQUESTED";
      case "escalated": return item.approval_status === "ESCALATED";
      case "overdue": return item.sla_status === "Breached" || item.sla_status === "Overdue";
      case "conditional": return item.approval_status === "CONDITIONAL_APPROVAL";
      case "completed": return ["APPROVED", "REJECTED", "COMPLETED"].includes(item.approval_status);
      default: return true;
    }
  }).filter(item => {
    if (filterStatus && item.approval_status !== filterStatus) return false;
    if (filterRisk && item.risk_level !== filterRisk) return false;
    if (filterModule && item.source_module !== filterModule) return false;
    return true;
  });

  const activeMetrics = MOCK_METRICS.map(m => ({
    ...m,
    count: m.filterTab ? items.filter(i => {
      switch (m.filterTab) {
        case "queue": return i.approval_status === "PENDING_APPROVAL";
        case "assigned": return i.approval_status === "IN_REVIEW";
        case "approved": return i.approval_status === "APPROVED";
        case "changes": return i.approval_status === "CHANGES_REQUESTED";
        case "escalated": return i.approval_status === "ESCALATED";
        case "overdue": return i.sla_status === "Breached" || i.sla_status === "Overdue";
        default: return false;
      }
    }).length : m.count,
  }));

  const decisions = selectedId === "ai1" ? MOCK_DECISIONS : [];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#0e0e0e]">
      {/* ─── Alert Strip ─────────────────────────────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 pb-1 overflow-x-auto shrink-0">
          {visibleAlerts.map(a => (
            <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs shrink-0 border ${
              a.severity === "critical" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" :
              a.severity === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-300" :
              "bg-blue-500/10 border-blue-500/20 text-blue-300"
            }`}>
              {a.severity === "critical" ? <AlertCircle className="w-3 h-3 shrink-0" /> :
               a.severity === "warning" ? <AlertTriangle className="w-3 h-3 shrink-0" /> : <Info className="w-3 h-3 shrink-0" />}
              <span className="font-medium whitespace-nowrap">{a.type}:</span>
              <span className="opacity-80 whitespace-nowrap">{a.message}</span>
              <button onClick={() => dismissAlert(a.id)} className="opacity-40 hover:opacity-100 ml-1">
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d2d] shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">Approvals</h1>
            <p className="text-[11px] text-[#888]">Review and authorize content, actions, and workflow outputs</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { label: "Approve Selected", icon: ThumbsUp, key: "bulk_approve", needsDecide: true,  disabledTooltip: canDecide ? "Select items in the queue to enable bulk approval" : "Requires Approver role or above" },
            { label: "Assign",           icon: UserPlus, key: "assign",        needsAssign: true,  disabledTooltip: canAssign ? "Select an item to assign an approver" : "Requires Admin or Governance Lead role" },
            { label: "Request Changes",  icon: MessageCircle, key: "request_changes", needsDecide: true, disabledTooltip: canDecide ? "Select an item to request changes" : "Requires Approver role or above" },
            { label: "Escalate",         icon: ArrowUpRight, key: "escalate",  needsDecide: true,  disabledTooltip: canDecide ? "Select an item eligible for escalation" : "Requires Approver role or above" },
            { label: "Export",           icon: Download, key: "export",        needsDecide: false, disabledTooltip: "Select an item to export its approval record" },
            { label: "Settings",         icon: Settings, key: "settings",      needsDecide: false, disabledTooltip: "Approval configuration settings" },
          ].map(btn => {
            const roleBlocked = (btn.needsDecide && !canDecide) || (btn.needsAssign && !canAssign);
            const isDisabled = roleBlocked || btn.key === "settings" ? true :
              btn.key === "bulk_approve" ? bulkSelected.size === 0 :
              !selectedItem;
            return (
              <div key={btn.label} className="group relative">
                <button disabled={isDisabled}
                  onClick={() => {
                    if (roleBlocked) return;
                    if (btn.key === "bulk_approve" && bulkSelected.size > 0) {
                      Array.from(bulkSelected).forEach(id => handleAction("approve", id));
                      setBulkSelected(new Set()); setBulkMode(false);
                    } else if (selectedId) {
                      handleAction(btn.key, selectedId);
                    }
                  }}
                  className={`p-2 border rounded-lg transition-all ${
                    isDisabled ? "bg-[#161616] border-[#2d2d2d] text-[#555] cursor-not-allowed" : "bg-[#161616] border-[#2d2d2d] text-[#888] hover:text-white hover:border-[#444]"
                  }`}>
                  <btn.icon className="w-3.5 h-3.5" />
                </button>
                <div className="absolute top-full mt-1 right-0 bg-[#1a1a1a] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-[10px] text-[#888] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-xl max-w-48">
                  {btn.disabledTooltip}
                </div>
              </div>
            );
          })}
          <button onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
            className={`p-2 border rounded-lg transition-all ml-1 ${
              bulkMode ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-[#161616] border-[#2d2d2d] text-[#888] hover:text-white"
            }`}>
            <ClipboardList className="w-3.5 h-3.5" />
          </button>
          <button onClick={fetchItems} className="p-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-[#888] hover:text-white ml-1">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ──────────────────────────────────────────────── */}
      <div className="flex gap-2.5 px-4 py-3 overflow-x-auto shrink-0 border-b border-[#1a1a1a]">
        {activeMetrics.map(m => (
          <button key={m.id} onClick={() => m.filterTab && setActiveTab(m.filterTab)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#111] border border-[#2d2d2d] rounded-xl hover:border-[#444] transition-colors min-w-[140px] shrink-0">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div className="text-left">
              <p className={`text-lg font-bold ${m.color}`}>{m.count}</p>
              <p className="text-[10px] text-[#666] font-medium">{m.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1a1a1a] overflow-x-auto shrink-0">
        {(Object.entries(TAB_LABELS) as [TabId, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === id ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20" : "text-[#666] hover:text-white hover:bg-white/5"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-2 p-2.5 rounded-lg flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}
      {message && (
        <div className={`mx-4 mt-2 p-2.5 rounded-lg flex items-center gap-2 text-xs shrink-0 ${
          message.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ─── Search + Filter Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, source module..."
            className="w-full bg-[#111] border border-[#2d2d2d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
            showFilters ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" : "bg-[#161616] border-[#2d2d2d] text-[#666]"
          }`}>
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
        <button onClick={() => setShowLeft(!showLeft)}
          className={`p-1.5 rounded-lg border text-xs ${showLeft ? "bg-[#161616] border-[#2d2d2d] text-[#888]" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowRight(!showRight)}
          className={`p-1.5 rounded-lg border text-xs ${showRight ? "bg-[#161616] border-[#2d2d2d] text-[#888]" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"}`}>
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Filter Drawer ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending</option><option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Risk Levels</option>
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Modules</option>
            <option value="Media Engine">Media Engine</option>
            <option value="Inbox & Engagement">Inbox & Engagement</option>
            <option value="Campaigns">Campaigns</option>
            <option value="Agent Studio">Agent Studio</option>
          </select>
        </div>
      )}

      {/* ─── 3-Panel Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel — Item Cards ─────────────────────────────────── */}
        {showLeft && (
          <div className="w-80 shrink-0 border-r border-[#1a1a1a] overflow-y-auto bg-[#0a0a0a]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[#555] text-xs">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-[#555] gap-2 px-4 text-center">
                {activeTab === "queue" ? <><Activity className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">Approval queue is empty</p><p className="text-[10px]">Items requiring your approval will appear here.</p></> :
                 activeTab === "assigned" ? <><UserPlus className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No assigned approvals</p><p className="text-[10px]">Approval items assigned to you will appear here.</p></> :
                 activeTab === "waiting" ? <><Clock className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No items waiting on others</p><p className="text-[10px]">Items awaiting approval from other reviewers will appear here.</p></> :
                 activeTab === "approved" ? <><CheckCircle2 className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No approved items</p><p className="text-[10px]">Approved approval items will appear here.</p></> :
                 activeTab === "rejected" ? <><XCircle className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No rejected items</p><p className="text-[10px]">Rejected approval items will appear here.</p></> :
                 activeTab === "changes" ? <><MessageCircle className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No changes requested</p><p className="text-[10px]">Items where changes were requested will appear here.</p></> :
                 activeTab === "escalated" ? <><ArrowUpRight className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No escalated items</p><p className="text-[10px]">Escalated approval items will appear here.</p></> :
                 activeTab === "overdue" ? <><AlertTriangle className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No overdue approvals</p><p className="text-[10px]">Overdue approval items will appear here.</p></> :
                 activeTab === "conditional" ? <><ShieldCheck className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No conditional approvals</p><p className="text-[10px]">Conditionally approved items will appear here.</p></> :
                 activeTab === "completed" ? <><CheckCircle2 className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No completed approvals</p><p className="text-[10px]">Completed approval items will appear here.</p></> :
                 <><CheckCircle2 className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No items found</p><p className="text-[10px]">No approvals match the current filter</p></>}
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {filteredItems.map(item => {
                  const isBulkChecked = bulkSelected.has(item.id);
                  return (
                  <button key={item.id} onClick={() => {
                      if (bulkMode) {
                        const n = new Set(bulkSelected);
                        if (n.has(item.id)) n.delete(item.id); else n.add(item.id);
                        setBulkSelected(n);
                      } else {
                        setSelectedId(item.id);
                      }
                    }}
                    className={`w-full text-left p-3 hover:bg-white/[0.02] transition-colors ${
                      isBulkChecked ? "bg-indigo-500/10 border-l-2 border-indigo-500" : selectedId === item.id ? "bg-indigo-500/5 border-l-2 border-indigo-500" : "border-l-2 border-transparent"
                    }`}>
                    <div className="flex items-start gap-2">
                      {bulkMode && (
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isBulkChecked ? "bg-indigo-500 border-indigo-500" : "border-[#555]"}`}>
                          {isBulkChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      <RiskDot risk={item.risk_level} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#ccc] line-clamp-1">{item.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge status={item.approval_status} />
                          <span className="text-[10px] text-[#555]">{ITEM_TYPE_LABEL[item.item_type]}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#555]">
                          <span>{item.source_module}</span>
                          {item.platform && <><span>·</span><span>{item.platform}</span></>}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-[#555]">{timeAgo(item.created_at)}</span>
                          {item.sla_status && (
                            <span className={`text-[10px] font-medium ${slaColor(item.sla_status)}`}>{item.sla_status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* ── Center Panel — Workspace ────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedItem ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3">
              <ClipboardList className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Select an approval item</p>
              <p className="text-xs">Choose an item from the left panel to view its details</p>
            </div>
          ) : (
            <>
              {/* Item header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] shrink-0">
                <div className="flex items-center gap-3">
                  <RiskDot risk={selectedItem.risk_level} />
                  <div>
                    <h2 className="text-sm font-bold text-white">{selectedItem.title}</h2>
                    <p className="text-[10px] text-[#555]">
                      {ITEM_TYPE_LABEL[selectedItem.item_type]} · {selectedItem.source_module}
                      {selectedItem.platform && <> · {selectedItem.platform}</>}
                      {selectedItem.campaign && <> · {selectedItem.campaign}</>}
                    </p>
                  </div>
                </div>
                <Badge status={selectedItem.approval_status} />
              </div>

              {/* Workspace tabs */}
              <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#1a1a1a] overflow-x-auto shrink-0">
                {(Object.entries(WORKSPACE_TAB_LABELS) as [WorkspaceTabId, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setWorkspaceTab(id)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                      workspaceTab === id ? "bg-indigo-500/15 text-indigo-300" : "text-[#555] hover:text-white"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Workspace content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {workspaceTab === "summary" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Item Details</p>
                      <div className="space-y-2.5">
                        {[
                          ["Type", ITEM_TYPE_LABEL[selectedItem.item_type]],
                          ["Source Module", selectedItem.source_module],
                          ["Platform", selectedItem.platform || "—"],
                          ["Campaign", selectedItem.campaign || "—"],
                          ["Submitted By", selectedItem.submitter_name || selectedItem.submitted_by],
                          ["Approval Level", `Level ${selectedItem.required_approval_level}`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-[#777]">{k}</span>
                            <span className="text-[#ccc]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Status</p>
                      <div className="space-y-2.5">
                        {[
                          ["Status", selectedItem.approval_status.replace(/_/g, " ")],
                          ["Validation", selectedItem.validation_status || "—"],
                          ["Risk Level", selectedItem.risk_level],
                          ["SLA", selectedItem.sla_status || "—"],
                          ["Due", selectedItem.due_at ? timeAgo(selectedItem.due_at) : "—"],
                          ["Last Activity", selectedItem.last_activity || "—"],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-[#777]">{k}</span>
                            <span className="text-[#ccc]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Approval Path — {MOCK_PATH.path_type}</p>
                      <div className="flex items-center gap-2">
                        {MOCK_PATH.stages.map((s, i) => (
                          <div key={s.order} className="flex-1">
                            <div className={`p-2.5 rounded-lg border text-center text-[10px] ${
                              s.status === "COMPLETED" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
                              s.status === "IN_PROGRESS" ? "bg-blue-500/10 border-blue-500/30 text-blue-300" :
                              "bg-[#0a0a0a] border-[#2d2d2d] text-[#555]"
                            }`}>
                              <p className="font-bold">{s.label}</p>
                              <p className="mt-0.5">{s.role}{s.assigned ? ` (${s.assigned})` : ""}</p>
                              {s.completed_by && <p className="mt-0.5 opacity-60">by {s.completed_by}</p>}
                            </div>
                            {i < MOCK_PATH.stages.length - 1 && (
                              <div className="flex justify-center py-1"><ChevronRight className="w-3 h-3 text-[#444]" /></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {workspaceTab === "history" && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Decision History</p>
                    {decisions.length === 0 ? (
                      <p className="text-xs text-[#555]">No decisions recorded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {decisions.map(d => (
                          <div key={d.id} className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-lg border border-[#2d2d2d]">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              d.decision === "APPROVED" ? "bg-emerald-500/10" :
                              d.decision === "REJECTED" ? "bg-rose-500/10" : "bg-orange-500/10"
                            }`}>
                              {d.decision === "APPROVED" ? <ThumbsUp className="w-3 h-3 text-emerald-400" /> :
                               d.decision === "REJECTED" ? <ThumbsDown className="w-3 h-3 text-rose-400" /> :
                               <MessageCircle className="w-3 h-3 text-orange-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{d.approver_name}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  d.decision === "APPROVED" ? "text-emerald-400 bg-emerald-500/10" :
                                  d.decision === "REJECTED" ? "text-rose-400 bg-rose-500/10" : "text-orange-400 bg-orange-500/10"
                                }`}>{d.decision.replace(/_/g, " ")}</span>
                              </div>
                              {d.decision_reason && <p className="text-[10px] text-[#888] mt-1">{d.decision_reason}</p>}
                              {d.condition_text && <p className="text-[10px] text-purple-400 mt-1">Condition: {d.condition_text}</p>}
                              <p className="text-[10px] text-[#555] mt-1">{timeAgo(d.decided_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {workspaceTab === "comments" && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Comments</p>
                    <div className="flex gap-2 mb-4">
                      <input value={commentText} onChange={e => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-[#0a0a0a] border border-[#2d2d2d] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
                      <button onClick={() => { if (commentText.trim() && selectedId) { handleAction("comment", selectedId); setCommentText(""); } }}
                        className="px-3 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-500/30">Send</button>
                    </div>
                    <p className="text-xs text-[#555] text-center py-4">No comments yet. Be the first to add feedback.</p>
                  </div>
                )}

                {(workspaceTab === "preview" || workspaceTab === "validation" || workspaceTab === "grounding" || workspaceTab === "risk") && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#555]">Content preview and detailed analysis available when source module provides data</p>
                  </div>
                )}

                {(workspaceTab === "evidence" || workspaceTab === "next-destination" || workspaceTab === "path") && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#555]">This tab will display data once the approval workflow progresses</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right Panel — Decision Panel ────────────────────────────── */}
        {showRight && selectedItem && (
          <div className="w-72 shrink-0 border-l border-[#1a1a1a] overflow-y-auto bg-[#0a0a0a]">
            <div className="p-3 space-y-3">
              {/* Eligibility */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Eligibility</p>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Approval Eligible</span>
                </div>
              </div>

              {/* Decision Controls */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Decision</p>
                {canDecide ? (
                  <div className="space-y-1.5">
                    <button onClick={() => selectedId && handleAction("approve", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500/15 text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => selectedId && handleAction("reject", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-rose-500/15 text-rose-300 rounded-lg text-xs font-medium hover:bg-rose-500/25 transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button onClick={() => selectedId && handleAction("request-changes", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-orange-500/15 text-orange-300 rounded-lg text-xs font-medium hover:bg-orange-500/25 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> Request Changes
                    </button>
                    <button onClick={() => selectedId && handleAction("conditional-approve", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500/15 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-500/25 transition-colors">
                      <Flag className="w-3.5 h-3.5" /> Approve with Conditions
                    </button>
                    <button onClick={() => selectedId && handleAction("escalate", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-red-500/15 text-red-300 rounded-lg text-xs font-medium hover:bg-red-500/25 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#555] py-2 text-center">
                    Read-only — your role cannot make decisions on approval items.
                  </p>
                )}
              </div>

              {/* Secondary Actions */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Actions</p>
                <div className="space-y-1.5">
                  {canAssign && (
                    <button onClick={() => selectedId && handleAction("assign", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                      <UserPlus className="w-3 h-3" /> Assign
                    </button>
                  )}
                  {canAssign && (
                    <button onClick={() => selectedId && handleAction("reassign", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                      <RefreshCcw className="w-3 h-3" /> Reassign
                    </button>
                  )}
                  <button onClick={() => selectedId && handleAction("export", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                    <FileText className="w-3 h-3" /> Export
                  </button>
                  <button onClick={() => { if (selectedItem) window.open(`/source/${selectedItem.source_module}/${selectedId}`, "_blank"); }} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                    <ExternalLink className="w-3 h-3" /> View Source
                  </button>
                </div>
              </div>

              {/* Path Progress */}
              {MOCK_PATH.stages.length > 0 && (
                <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Path Progress</p>
                  <div className="space-y-2">
                    {MOCK_PATH.stages.map(s => (
                      <div key={s.order} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          s.status === "COMPLETED" ? "bg-emerald-400" :
                          s.status === "IN_PROGRESS" ? "bg-blue-400 animate-pulse" : "bg-[#333]"
                        }`} />
                        <span className={`text-[10px] ${s.status === "COMPLETED" ? "text-emerald-300" : s.status === "IN_PROGRESS" ? "text-blue-300" : "text-[#555]"}`}>
                          {s.label} · {s.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Activity</p>
                <div className="space-y-2">
                  {[
                    { event: "Submitted for approval", time: "2h ago" },
                    { event: "Assigned to Campaign Manager", time: "1h 45m ago" },
                    { event: "Manager review started", time: "1h ago" },
                  ].map((a, i) => (
                    <div key={`act-${i}`} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/50 mt-1 shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#888]">{a.event}</p>
                        <p className="text-[9px] text-[#555]">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

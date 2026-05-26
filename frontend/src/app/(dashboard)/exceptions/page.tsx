"use client";

import { useState, useCallback, useEffect } from "react";
import {
  AlertOctagon, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Clock, Search, Filter, RefreshCcw, AlertCircle, ArrowUpRight,
  UserPlus, Settings, FileText, Download, Eye, EyeOff, Info,
  MessageSquare, Shield,
  Activity, Flag, Users,
  ExternalLink, ShieldCheck,
  Check, ListChecks,
} from "lucide-react";
import { api } from "@/lib/api";

type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ExceptionStatus = "NEW" | "TRIAGE" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_ON_SOURCE" | "WAITING_ON_VALIDATION" | "WAITING_ON_APPROVAL" | "ESCALATED" | "OVERRIDE_REQUESTED" | "OVERRIDE_APPROVED" | "OVERRIDE_DENIED" | "BLOCKED" | "RESOLVED" | "CLOSED" | "ARCHIVED" | "CANCELLED";
type ExceptionCategory = "VALIDATION_BLOCK" | "APPROVAL_BLOCK" | "RULE_CONFLICT" | "CALLBACK_FAILURE" | "INTEGRATION_FAILURE" | "POLICY_BREACH" | "EVIDENCE_GAP" | "QUALITY_FAILURE" | "SENSITIVE_ENGAGEMENT" | "AGENT_SAFETY" | "RESTRICTED_OPERATION" | "SLA_BREACH" | "MANUAL_OVERRIDE_REQUEST" | "UNKNOWN";
type TabId = "all" | "assigned" | "critical" | "overdue" | "escalated" | "resolved";
type WorkspaceTabId = "summary" | "blockers" | "remediation" | "escalation" | "override" | "evidence" | "audit" | "actions";

interface ExceptionCase {
  id: string; exception_title: string; exception_category: ExceptionCategory;
  exception_status: ExceptionStatus; severity: ExceptionSeverity;
  risk_level: string; source_module: string; source_entity_type?: string;
  exception_owner_id?: string; created_by: string;
  due_at?: string; restricted_mode: boolean;
  current_blocker?: string; workflow_impact?: string;
  recommended_route?: string; required_authority: number;
  created_at: string; updated_at: string;
}

interface MetricCardDef {
  id: string; label: string; count: number; icon: React.ElementType; color: string; filterTab?: TabId;
}

interface AlertDef {
  id: string; type: string; message: string; severity: "critical" | "warning" | "info";
}

const SEVERITY_BADGE: Record<ExceptionSeverity, { color: string; bg: string }> = {
  LOW: { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  MEDIUM: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  HIGH: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  CRITICAL: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "New", TRIAGE: "Triage", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
  WAITING_ON_SOURCE: "Waiting on Source", WAITING_ON_VALIDATION: "Waiting on Validation",
  WAITING_ON_APPROVAL: "Waiting on Approval", ESCALATED: "Escalated",
  OVERRIDE_REQUESTED: "Override Requested", OVERRIDE_APPROVED: "Override Approved",
  OVERRIDE_DENIED: "Override Denied", BLOCKED: "Blocked",
  RESOLVED: "Resolved", CLOSED: "Closed", ARCHIVED: "Archived", CANCELLED: "Cancelled",
};

const CATEGORY_LABEL: Record<string, string> = {
  VALIDATION_BLOCK: "Validation Block", APPROVAL_BLOCK: "Approval Block",
  RULE_CONFLICT: "Rule Conflict", CALLBACK_FAILURE: "Callback Failure",
  INTEGRATION_FAILURE: "Integration Failure", POLICY_BREACH: "Policy Breach",
  EVIDENCE_GAP: "Evidence Gap", QUALITY_FAILURE: "Quality Failure",
  SENSITIVE_ENGAGEMENT: "Sensitive Engagement", AGENT_SAFETY: "Agent Safety",
  RESTRICTED_OPERATION: "Restricted Operation", SLA_BREACH: "SLA Breach",
  MANUAL_OVERRIDE_REQUEST: "Manual Override", UNKNOWN: "Unknown",
};

const TAB_LABELS: Record<TabId, string> = {
  all: "All Exceptions", assigned: "Assigned to Me", critical: "Critical",
  overdue: "Overdue", escalated: "Escalated", resolved: "Resolved",
};

const WORKSPACE_TABS: Record<WorkspaceTabId, string> = {
  summary: "Exception Summary", blockers: "Blocker Analysis",
  remediation: "Remediation Plan", escalation: "Escalation History",
  override: "Override Control", evidence: "Evidence",
  audit: "Audit Trail", actions: "Actions",
};

// ─── Mock Data ───────────────────────────────────────────────────────────

const MOCK_CASES: ExceptionCase[] = [
  { id: "ec1", exception_title: "Validation Block — High-Risk LinkedIn Post", exception_category: "VALIDATION_BLOCK", exception_status: "NEW", severity: "HIGH", risk_level: "HIGH", source_module: "Media Engine", required_authority: 3, created_by: "system", created_at: "2026-05-22T08:00:00Z", updated_at: "2026-05-22T08:00:00Z", due_at: new Date(Date.now() + 7200000).toISOString(), current_blocker: "Content flagged for policy violation: misleading claims", workflow_impact: "Blocking publication of Q2 LinkedIn campaign", recommended_route: "Send to Validation Desk", restricted_mode: false },
  { id: "ec2", exception_title: "Callback Failure — Inbox Reply Webhook", exception_category: "CALLBACK_FAILURE", exception_status: "TRIAGE", severity: "CRITICAL", risk_level: "CRITICAL", source_module: "Inbox & Engagement", required_authority: 4, created_by: "system", created_at: "2026-05-22T06:30:00Z", updated_at: "2026-05-22T07:00:00Z", due_at: new Date(Date.now() + 1800000).toISOString(), current_blocker: "Source module callback delivery failed after 3 retries", workflow_impact: "Legal threat response not delivered to source system", recommended_route: "Retry callback or escalate", restricted_mode: false },
  { id: "ec3", exception_title: "Rule Conflict — Overlapping Approval Rules", exception_category: "RULE_CONFLICT", exception_status: "ASSIGNED", severity: "HIGH", risk_level: "HIGH", source_module: "Approval Rules", required_authority: 3, exception_owner_id: "user-admin", created_by: "system", created_at: "2026-05-21T14:00:00Z", updated_at: "2026-05-22T09:00:00Z", current_blocker: "High-Risk LinkedIn Post rule conflicts with Legal Threat Reply rule", workflow_impact: "Items may be routed to wrong approval path", recommended_route: "Resolve rule conflict in Approval Rules module", restricted_mode: false },
  { id: "ec4", exception_title: "Restricted Mode — Emergency Broadcast", exception_category: "RESTRICTED_OPERATION", exception_status: "ESCALATED", severity: "CRITICAL", risk_level: "CRITICAL", source_module: "Agent Operations", required_authority: 5, created_by: "ops", created_at: "2026-05-22T02:00:00Z", updated_at: "2026-05-22T04:00:00Z", due_at: new Date(Date.now() - 3600000).toISOString(), current_blocker: "Executive approval required — no approver assigned", workflow_impact: "Emergency broadcast cannot proceed without executive sign-off", recommended_route: "Escalate to Executive", restricted_mode: true },
  { id: "ec5", exception_title: "Evidence Gap — Quality Audit Findings", exception_category: "EVIDENCE_GAP", exception_status: "IN_PROGRESS", severity: "MEDIUM", risk_level: "MEDIUM", source_module: "Quality Audit", required_authority: 2, exception_owner_id: "user-qa", created_by: "qa", created_at: "2026-05-21T10:00:00Z", updated_at: "2026-05-22T10:00:00Z", current_blocker: "Missing evidence package for corrective action verification", workflow_impact: "Quality audit cannot be closed without evidence", recommended_route: "Collect evidence from source module", restricted_mode: false },
  { id: "ec6", exception_title: "Policy Breach — Brand Guidelines Violation", exception_category: "POLICY_BREACH", exception_status: "OVERRIDE_REQUESTED", severity: "HIGH", risk_level: "HIGH", source_module: "Campaigns", required_authority: 4, created_by: "compliance", created_at: "2026-05-20T16:00:00Z", updated_at: "2026-05-22T08:00:00Z", current_blocker: "Campaign asset uses competitor trademark without authorization", workflow_impact: "Campaign paused pending override decision", recommended_route: "Override request submitted — awaiting authority decision", restricted_mode: false },
  { id: "ec7", exception_title: "SLA Breach — Overdue Approval Response", exception_category: "SLA_BREACH", exception_status: "RESOLVED", severity: "MEDIUM", risk_level: "LOW", source_module: "Approvals", required_authority: 2, created_by: "system", created_at: "2026-05-19T08:00:00Z", updated_at: "2026-05-21T10:00:00Z", current_blocker: "Approval item sat in queue for 6h beyond SLA", workflow_impact: "Delayed publication by 4 hours", recommended_route: "Resolved — SLA policy updated", restricted_mode: false },
];

const MOCK_METRICS: MetricCardDef[] = [
  { id: "m1", label: "Open Exceptions", count: 5, icon: AlertOctagon, color: "text-orange-400", filterTab: "all" },
  { id: "m2", label: "Critical", count: 2, icon: ShieldAlert, color: "text-rose-400", filterTab: "critical" },
  { id: "m3", label: "Assigned to Me", count: 2, icon: UserPlus, color: "text-indigo-400", filterTab: "assigned" },
  { id: "m4", label: "Overdue", count: 1, icon: Clock, color: "text-red-400", filterTab: "overdue" },
  { id: "m5", label: "Escalated", count: 1, icon: ArrowUpRight, color: "text-amber-400", filterTab: "escalated" },
  { id: "m6", label: "Resolved", count: 1, icon: CheckCircle2, color: "text-emerald-400", filterTab: "resolved" },
];

const MOCK_ALERTS: AlertDef[] = [
  { id: "al1", type: "Critical Exception Open", message: "Callback Failure requires immediate triage — SLA breached", severity: "critical" },
  { id: "al2", type: "Restricted Mode Active", message: "Emergency Broadcast requires executive approval with restricted mode", severity: "critical" },
  { id: "al3", type: "SLA Breach", message: "Emergency Broadcast is overdue by 1 hour", severity: "warning" },
  { id: "al4", type: "Override Pending", message: "Policy Breach override decision awaiting authority", severity: "warning" },
  { id: "al5", type: "Missing Owner", message: "Validation Block has no assigned owner", severity: "info" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; return `${m}m ago`;
}

function SeverityBadge({ severity }: { severity: ExceptionSeverity }) {
  const cfg = SEVERITY_BADGE[severity] ?? SEVERITY_BADGE.MEDIUM;
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>{severity}</span>;
}

function SeverityDot({ severity }: { severity: ExceptionSeverity }) {
  const colors = { LOW: "bg-slate-500", MEDIUM: "bg-amber-400", HIGH: "bg-orange-400", CRITICAL: "bg-rose-400" };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[severity] ?? "bg-slate-500"}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ExceptionsPage() {
  const [cases, setCases] = useState<ExceptionCase[]>(MOCK_CASES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTabId>("summary");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState<Set<string>>(new Set());

  const selectedCase = cases.find(c => c.id === selectedId) || null;

  const fetchCases = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await api.get("/api/v1/exceptions/cases");
      if (result.success) setCases(result.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load exceptions"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleCreateException = async () => {
    const title = prompt("Exception title:");
    if (!title) return;
    try {
      const result = await api.post("/api/v1/exceptions/cases", { exception_title: title });
      if (result.success) { fetchCases(); setSelectedId(result.data.id); }
      else { setError(result.error || "Failed to create exception"); }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to create exception"); }
  };

  const handleExceptionAction = async (action: string, id: string) => {
    try {
      const result = await api.post(`/api/v1/exceptions/cases/${id}/${action}`, {});
      if (result.success) fetchCases();
      else { setError(result.error || `${action} failed`); }
    } catch (e) { setError(e instanceof Error ? e.message : `${action} failed`); }
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(bulkSelected);
    try {
      const result = await api.post("/api/v1/exceptions/bulk", { action, ids });
      if (result.success) { fetchCases(); setBulkSelected(new Set()); }
      else { setError(result.error || `Bulk ${action} failed`); }
    } catch (e) { setError(e instanceof Error ? e.message : `Bulk ${action} failed`); }
  };

  const toggleBulkItem = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const dismissAlert = (id: string) => {
    const next = new Set(alertDismissed); next.add(id); setAlertDismissed(next);
  };

  const visibleAlerts = MOCK_ALERTS.filter(a => !alertDismissed.has(a.id));

  const filteredCases = cases.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.exception_title.toLowerCase().includes(q) && !c.source_module.toLowerCase().includes(q)) return false;
    switch (activeTab) {
      case "all": return !["RESOLVED", "CLOSED", "ARCHIVED", "CANCELLED"].includes(c.exception_status);
      case "assigned": return c.exception_owner_id !== undefined;
      case "critical": return c.severity === "CRITICAL";
      case "overdue": return c.due_at ? new Date(c.due_at) < new Date() : false;
      case "escalated": return c.exception_status === "ESCALATED";
      case "resolved": return c.exception_status === "RESOLVED" || c.exception_status === "CLOSED";
      default: return true;
    }
  }).filter(c => {
    if (filterSeverity && c.severity !== filterSeverity) return false;
    if (filterCategory && c.exception_category !== filterCategory) return false;
    if (filterModule && c.source_module !== filterModule) return false;
    return true;
  });

  const activeMetrics = MOCK_METRICS.map(m => ({
    ...m,
    count: cases.filter(c => {
      switch (m.filterTab) {
        case "all": return !["RESOLVED", "CLOSED", "ARCHIVED", "CANCELLED"].includes(c.exception_status);
        case "critical": return c.severity === "CRITICAL";
        case "assigned": return c.exception_owner_id !== undefined;
        case "overdue": return c.due_at ? new Date(c.due_at) < new Date() : false;
        case "escalated": return c.exception_status === "ESCALATED";
        case "resolved": return c.exception_status === "RESOLVED" || c.exception_status === "CLOSED";
        default: return false;
      }
    }).length,
  }));

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
            <h1 className="text-lg font-bold text-white">Exceptions</h1>
            <p className="text-[11px] text-[#888]">Manage governance exceptions, blockers, and overrides across all modules</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { label: "Create Exception", icon: AlertOctagon, key: "create", disabledTooltip: "Create a new exception case manually" },
            { label: "Assign", icon: UserPlus, key: "assign", disabledTooltip: "Select an exception to assign an owner" },
            { label: "Escalate", icon: ArrowUpRight, key: "escalate", disabledTooltip: "Select an exception eligible for escalation" },
            { label: "Send to Validation", icon: ShieldCheck, key: "to_validation", disabledTooltip: "Select an exception to route to Validation Desk" },
            { label: "Send to Approvals", icon: CheckCircle2, key: "to_approvals", disabledTooltip: "Select an exception to route to Approvals" },
            { label: "Send to Quality Audit", icon: Activity, key: "to_audit", disabledTooltip: "Select an exception to route to Quality Audit" },
            { label: "Export", icon: Download, key: "export", disabledTooltip: "Select an exception to export its record" },
            { label: "Settings", icon: Settings, key: "settings", disabledTooltip: "Exception configuration settings (admin only)" },
          ].map(btn => {
            const isDisabled = btn.key === "settings" ? true : btn.key === "create" ? false : !selectedId;
            return (
              <div key={btn.label} className="group relative">
                <button disabled={isDisabled}
                  onClick={() => {
                    if (btn.key === "create") handleCreateException();
                    else if (selectedId) handleExceptionAction(btn.key, selectedId);
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
          <button onClick={fetchCases} className="p-2 bg-[#161616] border border-[#2d2d2d] rounded-lg text-[#888] hover:text-white ml-2">
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

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1a1a1a] overflow-x-auto shrink-0">
        {(Object.entries(TAB_LABELS) as [TabId, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === id ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "text-[#666] hover:text-white hover:bg-white/5"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-2 p-2.5 rounded-lg flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* ─── Search + Filters ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, source module..."
            className="w-full bg-[#111] border border-[#2d2d2d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-indigo-500/40" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
            showFilters ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-[#161616] border-[#2d2d2d] text-[#666]"
          }`}>
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
        <button onClick={() => setBulkMode(!bulkMode)}
          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
            bulkMode ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-[#161616] border-[#2d2d2d] text-[#666]"
          }`}>
          <ListChecks className="w-3.5 h-3.5" /> Bulk
        </button>
        <button onClick={() => setShowLeft(!showLeft)}
          className={`p-1.5 rounded-lg border text-xs ${showLeft ? "bg-[#161616] border-[#2d2d2d] text-[#888]" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowRight(!showRight)}
          className={`p-1.5 rounded-lg border text-xs ${showRight ? "bg-[#161616] border-[#2d2d2d] text-[#888]" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0 flex-wrap">
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Severities</option>
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Categories</option>
            <option value="VALIDATION_BLOCK">Validation Block</option>
            <option value="APPROVAL_BLOCK">Approval Block</option>
            <option value="RULE_CONFLICT">Rule Conflict</option>
            <option value="CALLBACK_FAILURE">Callback Failure</option>
            <option value="POLICY_BREACH">Policy Breach</option>
            <option value="EVIDENCE_GAP">Evidence Gap</option>
            <option value="QUALITY_FAILURE">Quality Failure</option>
            <option value="SLA_BREACH">SLA Breach</option>
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Modules</option>
            <option value="Media Engine">Media Engine</option>
            <option value="Inbox & Engagement">Inbox & Engagement</option>
            <option value="Approval Rules">Approval Rules</option>
            <option value="Quality Audit">Quality Audit</option>
            <option value="Review Queue">Review Queue</option>
            <option value="Validation Desk">Validation Desk</option>
            <option value="Exceptions">Exceptions</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]">
            <option value="">All Statuses</option>
            <option value="NEW">New</option><option value="TRIAGE">Triage</option>
            <option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option><option value="BLOCKED">Blocked</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <input type="date" placeholder="From"
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]" />
          <input type="date" placeholder="To"
            className="bg-[#111] border border-[#2d2d2d] rounded-lg px-2.5 py-1.5 text-xs text-[#aaa]" />
          <span className="text-[10px] text-[#444]">date range</span>
        </div>
      )}

      {/* ─── 3-Panel Layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel — Case Cards ──────────────────────────────────── */}
        {showLeft && (
          <div className="w-80 shrink-0 border-r border-[#1a1a1a] overflow-y-auto bg-[#0a0a0a]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[#555] text-xs">Loading...</div>
            ) : filteredCases.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-[#555] gap-2">
                {(() => {
                  const emptyStateConfig: Record<TabId, { icon: any; title: string; desc: string }> = {
                    all: { icon: ShieldCheck, title: "No exceptions", desc: "No active governance exceptions across all modules" },
                    assigned: { icon: Users, title: "No assigned exceptions", desc: "You have no exception cases assigned to you" },
                    critical: { icon: ShieldAlert, title: "No critical exceptions", desc: "No critical-severity exceptions at this time" },
                    overdue: { icon: Clock, title: "No overdue items", desc: "All exception cases are within their SLA" },
                    escalated: { icon: ArrowUpRight, title: "No escalated items", desc: "No exceptions have been escalated" },
                    resolved: { icon: CheckCircle2, title: "No resolved exceptions", desc: "No exception cases have been resolved yet" },
                  };
                  const config = emptyStateConfig[activeTab];
                  const Icon = config.icon;
                  return <><Icon className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">{config.title}</p><p className="text-[10px] text-center max-w-[200px]">{config.desc}</p></>;
                })()}
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {filteredCases.map(c => (
                  <div key={c.id} className="group">
                    <button onClick={() => { if (!bulkMode) setSelectedId(c.id); }}
                      className={`w-full text-left p-3 hover:bg-white/[0.02] transition-colors flex items-start gap-2 ${
                        !bulkMode && selectedId === c.id ? "bg-rose-500/5 border-l-2 border-rose-500" : "border-l-2 border-transparent"
                      }`}>
                      {bulkMode && (
                        <div className="pt-0.5" onClick={e => { e.stopPropagation(); toggleBulkItem(c.id); }}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            bulkSelected.has(c.id) ? "bg-rose-500 border-rose-500" : "border-[#444] hover:border-[#666]"
                          }`}>
                            {bulkSelected.has(c.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      )}
                      <SeverityDot severity={c.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#ccc] line-clamp-1">{c.exception_title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <SeverityBadge severity={c.severity} />
                          <span className="text-[10px] text-[#555]">{STATUS_LABEL[c.exception_status] || c.exception_status}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#555]">
                          <span>{c.source_module}</span>
                          <span>·</span>
                          <span>{CATEGORY_LABEL[c.exception_category] || c.exception_category}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-[#555]">{timeAgo(c.created_at)}</span>
                          {c.restricted_mode && (
                            <span className="text-[10px] font-medium text-rose-400">Restricted</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {bulkMode && bulkSelected.size > 0 && (
              <div className="sticky bottom-0 left-0 right-0 p-2 bg-[#161616] border-t border-[#2d2d2d] flex items-center gap-2">
                <span className="text-[10px] text-[#888] whitespace-nowrap">{bulkSelected.size} selected</span>
                {["Assign", "Escalate", "Resolve", "Archive"].map(action => (
                  <button key={action} onClick={() => handleBulkAction(action)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 whitespace-nowrap">
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Center Panel — Workspace ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedCase ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#555] gap-3">
              <AlertOctagon className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Select an exception case</p>
              <p className="text-xs">Choose a case from the left panel to view its details</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a1a1a] shrink-0">
                <div className="flex items-center gap-3">
                  <SeverityDot severity={selectedCase.severity} />
                  <div>
                    <h2 className="text-sm font-bold text-white">{selectedCase.exception_title}</h2>
                    <p className="text-[10px] text-[#555]">
                      {CATEGORY_LABEL[selectedCase.exception_category]} · {selectedCase.source_module}
                      {selectedCase.restricted_mode && <span className="text-rose-400 ml-2"><ShieldAlert className="w-3 h-3 inline mr-0.5" /> Restricted Mode</span>}
                    </p>
                  </div>
                </div>
                <SeverityBadge severity={selectedCase.severity} />
              </div>

              <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#1a1a1a] overflow-x-auto shrink-0">
                {(Object.entries(WORKSPACE_TABS) as [WorkspaceTabId, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setWorkspaceTab(id)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                      workspaceTab === id ? "bg-rose-500/15 text-rose-300" : "text-[#555] hover:text-white"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {workspaceTab === "summary" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Case Details</p>
                      <div className="space-y-2.5">
                        {[
                          ["Category", CATEGORY_LABEL[selectedCase.exception_category]],
                          ["Status", STATUS_LABEL[selectedCase.exception_status] || selectedCase.exception_status],
                          ["Severity", selectedCase.severity],
                          ["Risk Level", selectedCase.risk_level],
                          ["Source Module", selectedCase.source_module],
                          ["Authority Required", `Level ${selectedCase.required_authority}`],
                          ["Restricted Mode", selectedCase.restricted_mode ? "Active" : "Inactive"],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-[#777]">{k}</span>
                            <span className="text-[#ccc]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Impact</p>
                      {selectedCase.workflow_impact ? (
                        <p className="text-xs text-[#ccc]">{selectedCase.workflow_impact}</p>
                      ) : (
                        <p className="text-xs text-[#555]">No workflow impact recorded</p>
                      )}
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mt-4 mb-2">Current Blocker</p>
                      {selectedCase.current_blocker ? (
                        <p className="text-xs text-rose-300">{selectedCase.current_blocker}</p>
                      ) : (
                        <p className="text-xs text-[#555]">No blocker recorded</p>
                      )}
                      {selectedCase.recommended_route && (
                        <>
                          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mt-4 mb-2">Recommended Route</p>
                          <p className="text-xs text-emerald-300">{selectedCase.recommended_route}</p>
                        </>
                      )}
                    </div>
                    <div className="col-span-2 bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Timeline</p>
                      <div className="space-y-2">
                        {[
                          { event: "Created", time: timeAgo(selectedCase.created_at) },
                          ...(selectedCase.due_at ? [{ event: "Due", time: timeAgo(selectedCase.due_at) }] : []),
                          { event: "Last Updated", time: timeAgo(selectedCase.updated_at) },
                        ].map((t, i) => (
                          <div key={`tl-${i}`} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/50" />
                            <span className="text-[10px] text-[#888]">{t.event}</span>
                            <span className="text-[10px] text-[#555] ml-auto">{t.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {workspaceTab === "blockers" && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-3">Blockers</p>
                    <div className="p-3 bg-[#0a0a0a] border border-[#2d2d2d] rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-rose-300">{selectedCase.current_blocker || "No blocker identified"}</p>
                          <p className="text-[10px] text-[#555] mt-1">Blocker analysis expands when the source module provides detailed data</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(workspaceTab === "remediation" || workspaceTab === "evidence" || workspaceTab === "audit" || workspaceTab === "actions") && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#555]">Remediation plan, evidence, audit trail, and actions will display when the case progresses through the workflow</p>
                  </div>
                )}

                {(workspaceTab === "escalation" || workspaceTab === "override") && (
                  <div className="bg-[#111] border border-[#2d2d2d] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#555]">Escalation history and override controls are available when the case is escalated or an override is requested</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right Panel — Actions Panel ──────────────────────────────── */}
        {showRight && selectedCase && (
          <div className="w-72 shrink-0 border-l border-[#1a1a1a] overflow-y-auto bg-[#0a0a0a]">
            <div className="p-3 space-y-3">
              {/* Status */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Status</p>
                <div className="flex items-center gap-2">
                  <SeverityDot severity={selectedCase.severity} />
                  <span className="text-xs font-medium text-white">{STATUS_LABEL[selectedCase.exception_status] || selectedCase.exception_status}</span>
                </div>
                {selectedCase.due_at && (
                  <p className={`text-[10px] mt-1.5 ${new Date(selectedCase.due_at) < new Date() ? "text-rose-400" : "text-[#777]"}`}>
                    Due {timeAgo(selectedCase.due_at)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Actions</p>
                <div className="space-y-1.5">
                  <button onClick={() => selectedId && handleExceptionAction("resolve", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500/15 text-emerald-300 rounded-lg text-xs font-medium hover:bg-emerald-500/25">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </button>
                  <button onClick={() => selectedId && handleExceptionAction("escalate", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-rose-500/15 text-rose-300 rounded-lg text-xs font-medium hover:bg-rose-500/25">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                  </button>
                  <button onClick={() => selectedId && handleExceptionAction("request-override", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-amber-500/15 text-amber-300 rounded-lg text-xs font-medium hover:bg-amber-500/25">
                    <Flag className="w-3.5 h-3.5" /> Request Override
                  </button>
                  <button onClick={() => selectedId && handleExceptionAction("send-to-validation", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500/15 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/25">
                    <Shield className="w-3.5 h-3.5" /> Send to Validation
                  </button>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Manage</p>
                <div className="space-y-1.5">
                  <button onClick={() => selectedId && handleExceptionAction("assign-owner", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                    <UserPlus className="w-3 h-3" /> Assign Owner
                  </button>
                  <button onClick={() => { if (selectedId) { const note = prompt("Enter note:"); if (note) handleExceptionAction("add-note", selectedId); } }} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                    <MessageSquare className="w-3 h-3" /> Add Note
                  </button>
                  <button onClick={() => selectedId && handleExceptionAction("export", selectedId)} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                    <FileText className="w-3 h-3" /> Export Record
                  </button>
                  <button onClick={() => { if (selectedCase) window.open(`/source/${selectedCase.source_module}/${selectedId}`, "_blank"); }} className="w-full flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] text-[#888] rounded-lg text-xs hover:text-white border border-[#2d2d2d]">
                    <ExternalLink className="w-3 h-3" /> View Source Module
                  </button>
                </div>
              </div>

              {/* Quick Info */}
              <div className="bg-[#111] border border-[#2d2d2d] rounded-lg p-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">Details</p>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between"><span className="text-[#555]">Owner</span><span className="text-[#888]">{selectedCase.exception_owner_id ? "Assigned" : "Unassigned"}</span></div>
                  <div className="flex justify-between"><span className="text-[#555]">Authority</span><span className="text-[#888]">Level {selectedCase.required_authority}</span></div>
                  <div className="flex justify-between"><span className="text-[#555]">Module</span><span className="text-[#888]">{selectedCase.source_module}</span></div>
                  <div className="flex justify-between"><span className="text-[#555]">Created</span><span className="text-[#888]">{timeAgo(selectedCase.created_at)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

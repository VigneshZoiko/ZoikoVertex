"use client";

import { useState, useCallback, useEffect } from "react";
import {
  AlertOctagon, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Clock, Search, RefreshCcw, AlertCircle, ArrowUpRight,
  UserPlus, FileText, Download, Eye, EyeOff, Info,
  MessageSquare, Shield, Activity, Flag, ChevronDown, Check, Trash
} from "lucide-react";
import { api } from "@/lib/api";

type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ExceptionStatus = "NEW" | "TRIAGE" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_ON_SOURCE" | "WAITING_ON_VALIDATION" | "WAITING_ON_APPROVAL" | "ESCALATED" | "OVERRIDE_REQUESTED" | "OVERRIDE_APPROVED" | "OVERRIDE_DENIED" | "BLOCKED" | "RESOLVED" | "CLOSED" | "ARCHIVED" | "CANCELLED";
type ExceptionCategory = "VALIDATION_BLOCK" | "APPROVAL_BLOCK" | "RULE_CONFLICT" | "CALLBACK_FAILURE" | "INTEGRATION_FAILURE" | "POLICY_BREACH" | "EVIDENCE_GAP" | "QUALITY_FAILURE" | "SENSITIVE_ENGAGEMENT" | "AGENT_SAFETY" | "RESTRICTED_OPERATION" | "SLA_BREACH" | "MANUAL_OVERRIDE_REQUEST" | "UNKNOWN";

type TabId = "active" | "assigned" | "escalated" | "resolved";
type WorkspaceTabId = "details" | "remediation" | "evidence";

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

const SEVERITY_BADGE: Record<ExceptionSeverity, { color: string; bg: string }> = {
  LOW: { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  MEDIUM: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  HIGH: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  CRITICAL: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" },
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "New", TRIAGE: "Triage", ASSIGNED: "Assigned", IN_PROGRESS: "In Progress",
  WAITING_ON_SOURCE: "Wait Source", WAITING_ON_VALIDATION: "Wait Validation",
  WAITING_ON_APPROVAL: "Wait Approval", ESCALATED: "Escalated",
  OVERRIDE_REQUESTED: "Override Req", OVERRIDE_APPROVED: "Override Appr",
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

const FILTER_TABS = [
  { key: "active", label: "Active Exceptions" },
  { key: "assigned", label: "Assigned to Me" },
  { key: "escalated", label: "Escalated" },
  { key: "resolved", label: "Resolved" },
];

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; return `${m}m ago`;
}

export default function ExceptionsPage() {
  const [cases, setCases] = useState<ExceptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<WorkspaceTabId>("details");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const selectedCase = cases.find(c => c.id === selectedId) || null;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/api/v1/exceptions/cases");
      if (result.success) {
        const data = (result.data || []) as ExceptionCase[];
        setCases(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load exceptions.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (action: string) => {
    if (!selectedId) return;
    setActionLoading(action);
    setMessage(null);
    setShowMoreActions(false);
    try {
      const result = await api.post(`/api/v1/exceptions/cases/${selectedId}/${action}`, {
        note: feedbackText || undefined
      });
      if (result.success) {
        setMessage({ type: "success", text: `Case ${action} successful.` });
        setFeedbackText("");
        fetchCases();
      } else {
        setMessage({ type: "error", text: result.error || `${action} failed` });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error occurred." });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCases = cases.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.exception_title.toLowerCase().includes(q) && !c.source_module.toLowerCase().includes(q)) return false;
    switch (activeTab) {
      case "active": return !["RESOLVED", "CLOSED", "ARCHIVED", "CANCELLED"].includes(c.exception_status);
      case "assigned": return c.exception_owner_id !== undefined;
      case "escalated": return c.exception_status === "ESCALATED";
      case "resolved": return ["RESOLVED", "CLOSED"].includes(c.exception_status);
      default: return true;
    }
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Stats
  const openCount = cases.filter(c => !["RESOLVED", "CLOSED", "ARCHIVED", "CANCELLED"].includes(c.exception_status)).length;
  const criticalCount = cases.filter(c => c.severity === "CRITICAL" && !["RESOLVED", "CLOSED"].includes(c.exception_status)).length;
  const resolvedCount = cases.filter(c => ["RESOLVED", "CLOSED"].includes(c.exception_status)).length;

  return (
    <div className="pb-16 px-4">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Governance Exceptions</h1>
          <p className="text-[11px] text-[#666]">Track rule overrides, webhook callback failures, and manual validation override requests.</p>
        </div>
        <button
          onClick={fetchCases}
          className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white transition-all"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* ─── Toast Message ─────────────────────────────────────────────────── */}
      {message && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ─── Minimal Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">{openCount}</p>
            <p className="text-[9px] text-[#555] font-semibold uppercase tracking-wider leading-none">Open Exceptions</p>
          </div>
        </div>
        <div className="bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">{criticalCount}</p>
            <p className="text-[9px] text-[#555] font-semibold uppercase tracking-wider leading-none">Critical Exceptions</p>
          </div>
        </div>
        <div className="bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">{resolvedCount}</p>
            <p className="text-[9px] text-[#555] font-semibold uppercase tracking-wider leading-none">Resolved Cases</p>
          </div>
        </div>
      </div>

      {/* ─── 3-Panel Layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* ─── Left Panel: Minimal List ────────────────────────────────────── */}
        <div className="w-[300px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
            <input
              type="text"
              placeholder="Search exceptions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#111] border border-[var(--border)] text-gray-900 dark:text-white placeholder-[#555] focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          <div className="flex gap-1 border-b border-[#2d2d2d] pb-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabId)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    : "text-[#666] hover:text-[#999]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-10 text-[#555] gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px]">Loading...</p>
              </div>
            ) : sortedCases.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 text-center text-[#555] text-xs">
                No exceptions in this filter.
              </div>
            ) : (
              sortedCases.map(c => {
                const isSelected = selectedId === c.id;
                const severityCfg = SEVERITY_BADGE[c.severity] || { color: "text-[#aaa]", bg: "bg-white/5" };

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(isSelected ? null : c.id)}
                    className={`w-full text-left bg-[#111] border rounded-xl p-3 hover:border-[#333] transition-all border-l-4 ${
                      isSelected ? "border-indigo-500 bg-indigo-500/[0.02] border-l-indigo-500" : "border-[var(--border)] border-l-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate flex-1">{c.exception_title}</p>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-[0.5px] rounded text-[8px] font-bold ${severityCfg.bg} ${severityCfg.color}`}>
                        {c.severity}
                      </span>
                      <span className="px-1.5 py-[0.5px] rounded border border-white/10 bg-white/5 text-[8px] text-[#ccc] font-bold">
                        {STATUS_LABEL[c.exception_status] || c.exception_status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#555] mt-2">
                      <span>{c.source_module}</span>
                      <span>{timeAgo(c.created_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Center Panel: Focus Workspace ───────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-[#111] border border-[var(--border)] rounded-2xl p-5 min-h-[450px]">
          {!selectedId || !selectedCase ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-[#555]">
              <AlertOctagon className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-semibold">Select an exception case to review details and take action</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="border-b border-[#2d2d2d] pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{selectedCase.exception_title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#555]">
                    <span>{CATEGORY_LABEL[selectedCase.exception_category]}</span>
                    <span>•</span>
                    <span>{selectedCase.source_module}</span>
                    {selectedCase.restricted_mode && <span className="text-rose-400 font-bold">• Restricted Mode Active</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${SEVERITY_BADGE[selectedCase.severity]?.bg} ${SEVERITY_BADGE[selectedCase.severity]?.color}`}>
                    {selectedCase.severity} Severity
                  </span>
                </div>
              </div>

              {/* Blocker Analysis Box */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-[#ccc] leading-relaxed">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Current Blocker / Exception Details</p>
                <p className="text-[#aaa]">{selectedCase.current_blocker || "No blocker logged for this case."}</p>
                {selectedCase.workflow_impact && (
                  <p className="text-[10px] text-rose-300 mt-2 font-medium">
                    Workflow Impact: {selectedCase.workflow_impact}
                  </p>
                )}
              </div>

              {/* Actions strip (Consolidated) */}
              <div className="pt-2 flex items-center gap-2 flex-wrap relative">
                {selectedCase.exception_status !== "RESOLVED" && selectedCase.exception_status !== "CLOSED" && (
                  <>
                    <button
                      disabled={actionLoading === "resolve"}
                      onClick={() => handleAction("resolve")}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5"
                    >
                      {actionLoading === "resolve" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Acknowledge Exception
                    </button>

                    <button
                      disabled={actionLoading === "escalate"}
                      onClick={() => handleAction("escalate")}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-black border border-rose-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      {actionLoading === "escalate" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      Flag for Governance Review
                    </button>
                  </>
                )}

                {/* More Options Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2d2d2d] rounded-xl text-xs font-bold text-[#888] hover:text-white flex items-center gap-1.5"
                  >
                    Actions <ChevronDown className="w-3 h-3" />
                  </button>

                  {showMoreActions && (
                    <div className="absolute top-full left-0 mt-1 bg-[#161616] border border-[#2d2d2d] rounded-xl shadow-xl py-1 z-50 w-44">
                      <button onClick={() => handleAction("request-override")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" /> Request Override
                      </button>
                      <button onClick={() => handleAction("send-to-validation")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-blue-400 font-semibold flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Send to Validation
                      </button>
                      <button onClick={() => handleAction("to_approvals")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Route to Approvals
                      </button>
                      <button onClick={() => handleAction("export")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export Case Record
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback text area */}
              {selectedCase.exception_status !== "RESOLVED" && selectedCase.exception_status !== "CLOSED" && (
                <textarea
                  placeholder="Provide resolution log, justification notes, or escalation rationale..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  rows={2}
                  className="w-full bg-[#181818] border border-[#2d2d2d] rounded-lg p-2.5 text-xs text-gray-900 dark:text-white placeholder-[#555] focus:outline-none focus:border-indigo-500/40 resize-none mt-2"
                />
              )}
            </div>
          )}
        </div>

        {/* ─── Right Panel: Single Tabbed Card (Details, Remediation, Evidence) ── */}
        {selectedId && selectedCase && (
          <div className="w-[300px] shrink-0 bg-[#111] border border-[var(--border)] rounded-2xl p-4 min-h-[450px] flex flex-col">
            <div className="flex gap-2 border-b border-[#2d2d2d] pb-2 mb-3 shrink-0">
              <button
                onClick={() => setDetailTab("details")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  detailTab === "details" ? "bg-white/5 text-gray-900 dark:text-white" : "text-[#555]"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setDetailTab("remediation")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  detailTab === "remediation" ? "bg-white/5 text-gray-900 dark:text-white" : "text-[#555]"
                }`}
              >
                Remediation
              </button>
              <button
                onClick={() => setDetailTab("evidence")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  detailTab === "evidence" ? "bg-white/5 text-gray-900 dark:text-white" : "text-[#555]"
                }`}
              >
                Logs
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] scrollbar-none space-y-4">
              {detailTab === "details" && (
                <div className="space-y-4">
                  <div className="space-y-2 text-[10px] text-[#888]">
                    <div className="flex justify-between"><span>Category</span><span className="text-gray-900 dark:text-white font-medium">{CATEGORY_LABEL[selectedCase.exception_category]}</span></div>
                    <div className="flex justify-between"><span>Source Module</span><span className="text-gray-900 dark:text-white font-medium">{selectedCase.source_module}</span></div>
                    <div className="flex justify-between"><span>Owner ID</span><span className="text-gray-900 dark:text-white font-medium">{selectedCase.exception_owner_id || "Unassigned"}</span></div>
                    <div className="flex justify-between"><span>Authority Level</span><span className="text-gray-900 dark:text-white font-medium">Stage {selectedCase.required_authority}</span></div>
                    <div className="flex justify-between"><span>Created By</span><span className="text-gray-900 dark:text-white font-medium">{selectedCase.created_by}</span></div>
                  </div>
                </div>
              )}

              {detailTab === "remediation" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Recommended Route</h4>
                  <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg text-[10px] text-[#ccc]">
                    <p>{selectedCase.recommended_route || "No standard recommendation available."}</p>
                  </div>
                  {selectedCase.restricted_mode && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-[10px] text-rose-300">
                      <p className="font-semibold mb-0.5">Restricted Mode Policy</p>
                      <p className="opacity-80">This operation requires high-tier executive authority validation.</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === "evidence" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Audit Log & Trace</h4>
                  <div className="space-y-3">
                    <div className="text-[10px] flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <div>
                        <p className="text-[#ccc] font-medium leading-tight">Exception Triggered</p>
                        <p className="text-[8px] text-[#555]">{timeAgo(selectedCase.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-[10px] flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#555] mt-1 shrink-0" />
                      <div>
                        <p className="text-[#ccc] font-medium leading-tight">Last Activity Logged</p>
                        <p className="text-[8px] text-[#555]">{timeAgo(selectedCase.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

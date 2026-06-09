"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ArrowUpRight,
  RefreshCcw, AlertCircle, Search, Filter,
  UserPlus, ShieldCheck, FileText, MessageSquare,
  Eye, Download, Settings,
  Activity, ThumbsUp, ThumbsDown, ChevronDown, Check, Trash
} from "lucide-react";
import { api } from "@/lib/api";
import { useRoles } from "@/lib/hooks/useRoles";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ApprovalStatus = "PENDING_APPROVAL" | "IN_REVIEW" | "WAITING_ON_OTHERS" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "ESCALATED" | "CONDITIONAL_APPROVAL" | "BLOCKED" | "CANCELLED" | "COMPLETED" | "ARCHIVED";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ItemType = "SOCIAL_POST" | "INBOX_REPLY" | "CAMPAIGN_ASSET" | "AGENT_ACTION" | "WORKFLOW_OUTPUT" | "VALIDATION_OVERRIDE" | "EXCEPTION_OUTCOME" | "RESTRICTED_OPERATION" | "COMPLIANCE_SENSITIVE_ITEM" | "PUBLISHING_ACTION";

type TabId = "queue" | "assigned" | "revision" | "completed";
type WorkspaceTabId = "overview" | "policy" | "timeline";

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

// â”€â”€â”€ Config Maps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_BADGE: Record<ApprovalStatus, { color: string; bg: string }> = {
  PENDING_APPROVAL:       { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
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

const RISK_BADGE: Record<RiskLevel, string> = {
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  SOCIAL_POST: "Social Post", INBOX_REPLY: "Inbox Reply", CAMPAIGN_ASSET: "Campaign Asset",
  AGENT_ACTION: "Agent Action", WORKFLOW_OUTPUT: "Workflow Output",
  VALIDATION_OVERRIDE: "Validation Override", EXCEPTION_OUTCOME: "Exception Outcome",
  RESTRICTED_OPERATION: "Restricted Operation", COMPLIANCE_SENSITIVE_ITEM: "Compliance-Sensitive",
  PUBLISHING_ACTION: "Publishing Action",
};

const FILTER_TABS = [
  { key: "queue", label: "Approval Queue" },
  { key: "assigned", label: "Assigned to Me" },
  { key: "revision", label: "Changes Requested" },
  { key: "completed", label: "Completed" },
];

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; return `${m}m ago`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "â€”";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function slaColor(status?: string): string {
  if (status === "Breached") return "text-rose-400";
  if (status === "Overdue" || status === "Due Soon") return "text-red-400";
  return "text-emerald-400";
}

export default function ApprovalsPage() {
  const { role, isSuperAdmin } = useRoles();
  const canDecide = isSuperAdmin || ['APPROVER', 'VALIDATOR', 'GOVERNANCE_ADMIN', 'ADMIN', 'WORKSPACE_OWNER'].includes(role ?? '');

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<WorkspaceTabId>("overview");
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const selectedItem = items.find(i => i.id === selectedId) || null;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/api/v1/approvals-v2/items");
      if (result.success) {
        const approvalItems = (result.data || []) as ApprovalItem[];
        setItems(approvalItems);
        if (approvalItems.length > 0 && !selectedId) {
          setSelectedId(approvalItems[0].id);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load approvals queue.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (action: string) => {
    if (!selectedId) return;
    setActionLoading(action);
    setMessage(null);
    setShowMoreActions(false);
    try {
      const result = await api.post(`/api/v1/approvals-v2/items/${selectedId}/${action}`, {
        note: feedbackText || undefined
      });
      if (result.success) {
        setMessage({ type: "success", text: `Approval ${action} completed.` });
        setFeedbackText("");
        fetchItems();
      } else {
        setMessage({ type: "error", text: result.error || `${action} action failed` });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error occurred." });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    if (q && !item.title.toLowerCase().includes(q) && !item.source_module.toLowerCase().includes(q)) return false;
    switch (activeTab) {
      case "queue": return item.approval_status === "PENDING_APPROVAL" || item.approval_status === "IN_REVIEW" || item.approval_status === "WAITING_ON_OTHERS";
      case "assigned": return item.assigned_approver_id === "me" || item.approval_status === "IN_REVIEW";
      case "revision": return item.approval_status === "CHANGES_REQUESTED";
      case "completed": return ["APPROVED", "REJECTED", "COMPLETED", "CANCELLED", "ARCHIVED"].includes(item.approval_status);
      default: return true;
    }
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Calculate stats
  const pendingCount = items.filter(i => ["PENDING_APPROVAL", "IN_REVIEW", "WAITING_ON_OTHERS"].includes(i.approval_status)).length;
  const overdueCount = items.filter(i => i.sla_status === "Breached" || i.sla_status === "Overdue").length;
  const approvedTodayCount = items.filter(i => i.approval_status === "APPROVED").length;

  return (
    <div className="pb-16 px-4">
      {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Approvals Console</h1>
          <p className="text-[11px] text-zinc-500">Review, escalate, request revision, and authorize content assets and automated agent actions.</p>
        </div>
        <button
          onClick={fetchItems}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* â”€â”€â”€ Toast Message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* â”€â”€â”€ Minimal Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{pendingCount}</p>
            <p className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider leading-none">Awaiting Approval</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{overdueCount}</p>
            <p className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider leading-none">Overdue Approvals</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{approvedTodayCount}</p>
            <p className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider leading-none">Approved Today</p>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ 3-Panel Layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-4 items-start">
        {/* â”€â”€â”€ Left Panel: Minimal List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="w-[300px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search approvalsâ€¦"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          <div className="flex gap-1 border-b border-zinc-800 pb-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabId)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    : "text-zinc-500 hover:text-[#999]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 scrollbar-none">
            {loading ? (
              <div className="flex flex-col items-center py-10 text-zinc-600 gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px]">Loading...</p>
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-600 text-xs">
                No items in this filter.
              </div>
            ) : (
              sortedItems.map(item => {
                const statusConfig = STATUS_BADGE[item.approval_status] || { color: "text-[#aaa]", bg: "bg-white/5" };
                const isSelected = selectedId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(isSelected ? null : item.id)}
                    className={`w-full text-left bg-zinc-900 border rounded-lg p-3 hover:border-zinc-700 transition-all border-l-4 ${
                      isSelected ? "border-indigo-500 bg-indigo-500/[0.02] border-l-indigo-500" : "border-zinc-800 border-l-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <p className="text-xs font-semibold text-white truncate flex-1">{item.title}</p>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-[0.5px] rounded text-[8px] font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                        {item.approval_status.replace(/_/g, " ")}
                      </span>
                      <span className={`px-1.5 py-[0.5px] rounded border text-[8px] font-bold ${RISK_BADGE[item.risk_level] || ""}`}>
                        {item.risk_level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-zinc-600 mt-2">
                      <span>{ITEM_TYPE_LABEL[item.item_type]}</span>
                      <span>{item.due_at ? formatDate(item.due_at) : "No Due"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* â”€â”€â”€ Center Panel: Focus Workspace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg p-5 min-h-[450px]">
          {!selectedId || !selectedItem ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-zinc-600">
              <ShieldCheck className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-semibold">Select an approval request to authorize or decline</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="border-b border-zinc-800 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white mb-0.5">{selectedItem.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                    <span>{ITEM_TYPE_LABEL[selectedItem.item_type]}</span>
                    <span>â€¢</span>
                    <span>{selectedItem.source_module}</span>
                    {selectedItem.platform && <span>â€¢ {selectedItem.platform}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${STATUS_BADGE[selectedItem.approval_status]?.bg} ${STATUS_BADGE[selectedItem.approval_status]?.color}`}>
                    {selectedItem.approval_status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Universal Preview Box */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-zinc-300 leading-relaxed">
                <p className="font-semibold text-white mb-1">Authorization Details</p>
                <p className="text-[#aaa]">{selectedItem.title}</p>
                {selectedItem.due_at && (
                  <p className="text-[10px] text-amber-400 mt-3 font-semibold">
                    Deadline: Due {new Date(selectedItem.due_at).toLocaleDateString()} ({timeAgo(selectedItem.due_at)})
                  </p>
                )}
              </div>

              {/* Action Buttons Panel (Simplified to Authorize / Decline) */}
              <div className="pt-2 flex items-center gap-2 flex-wrap relative">
                {canDecide && (
                  <>
                    <button
                      disabled={actionLoading === "approve"}
                      onClick={() => handleAction("approve")}
                      className="px-4 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      {actionLoading === "approve" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Authorize
                    </button>

                    <button
                      disabled={actionLoading === "reject"}
                      onClick={() => handleAction("reject")}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-black border border-rose-500/20 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      {actionLoading === "reject" ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Decline
                    </button>
                  </>
                )}

                {/* More Options Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5"
                  >
                    Options <ChevronDown className="w-3 h-3" />
                  </button>

                  {showMoreActions && (
                    <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-50 w-44">
                      {canDecide && (
                        <>
                          <button onClick={() => handleAction("request_changes")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-orange-400 font-semibold flex items-center gap-1.5">
                            <RefreshCcw className="w-3.5 h-3.5" /> Request Changes
                          </button>
                          <button onClick={() => handleAction("escalate")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                          </button>
                          <button onClick={() => handleAction("conditional_approve")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-purple-400 font-semibold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> Conditional Approve
                          </button>
                        </>
                      )}
                      <button onClick={() => handleAction("export")} className="w-full text-left px-3.5 py-2 hover:bg-white/5 text-xs text-[#aaa] font-semibold flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export Record
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action feedback notes */}
              {selectedItem.approval_status !== "APPROVED" && selectedItem.approval_status !== "REJECTED" && (
                <textarea
                  placeholder="Provide decision notes, conditions, or requested revision feedback..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 resize-none mt-2"
                />
              )}
            </div>
          )}
        </div>

        {/* â”€â”€â”€ Right Panel: Single Tabbed Card (Details, Policy, Timeline) â”€â”€ */}
        {selectedId && selectedItem && (
          <div className="w-[300px] shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-h-[450px] flex flex-col">
            {/* Tab Header */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2 mb-3 shrink-0">
              <button
                onClick={() => setDetailTab("overview")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  detailTab === "overview" ? "bg-white/5 text-white" : "text-zinc-600"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDetailTab("policy")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  detailTab === "policy" ? "bg-white/5 text-white" : "text-zinc-600"
                }`}
              >
                Policy
              </button>
              <button
                onClick={() => setDetailTab("timeline")}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  detailTab === "timeline" ? "bg-white/5 text-white" : "text-zinc-600"
                }`}
              >
                Timeline
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto max-h-[400px] scrollbar-none space-y-4">
              {detailTab === "overview" && (
                <div className="space-y-4">
                  <div className="space-y-2 text-[10px] text-zinc-500">
                    <div className="flex justify-between"><span>Submitted By</span><span className="text-white font-medium">{selectedItem.submitter_name || selectedItem.submitted_by}</span></div>
                    <div className="flex justify-between"><span>Assigned Approver</span><span className="text-white font-medium">{selectedItem.assigned_approver_id || "Unassigned"}</span></div>
                    <div className="flex justify-between"><span>Level Required</span><span className="text-white font-medium">Stage {selectedItem.required_approval_level}</span></div>
                    <div className="flex justify-between"><span>SLA Status</span><span className={`font-semibold ${slaColor(selectedItem.sla_status)}`}>{selectedItem.sla_status || "Standard"}</span></div>
                    {selectedItem.campaign && <div className="flex justify-between"><span>Campaign</span><span className="text-white font-medium truncate max-w-[150px]">{selectedItem.campaign}</span></div>}
                  </div>
                </div>
              )}

              {detailTab === "policy" && (
                <div className="space-y-4">
                  <div className="space-y-2 text-[10px]">
                    <h4 className="font-bold text-white uppercase tracking-wider">Automated Checks</h4>
                    <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                      <span className="text-zinc-500">Compliance Status</span>
                      <span className={`text-[8px] font-bold px-1.5 py-[0.5px] rounded border ${
                        selectedItem.validation_status === "Passed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>{selectedItem.validation_status || "Pending"}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                      <span className="text-zinc-500">Risk Scoring</span>
                      <span className={`text-[8px] font-bold px-1.5 py-[0.5px] rounded ${RISK_BADGE[selectedItem.risk_level]}`}>{selectedItem.risk_level}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "timeline" && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Approval Journey</h4>
                  <div className="space-y-3">
                    <div className="text-[10px] flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <p className="text-zinc-300 font-medium leading-tight">Submitted</p>
                        <p className="text-[8px] text-zinc-600">{timeAgo(selectedItem.created_at)} by {selectedItem.submitted_by?.slice(0, 8)}</p>
                      </div>
                    </div>
                    {selectedItem.last_activity && (
                      <div className="text-[10px] flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                        <div>
                          <p className="text-zinc-300 font-medium leading-tight">Last Activity</p>
                          <p className="text-[8px] text-zinc-600">{selectedItem.last_activity}</p>
                        </div>
                      </div>
                    )}
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


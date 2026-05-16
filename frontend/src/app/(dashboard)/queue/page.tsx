"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCcw, CheckCircle2, XCircle, RotateCcw, ShieldAlert,
  ArrowUpRight, ChevronDown, ChevronUp, AlertCircle, Clock,
  Layers, ShieldCheck, BarChart2, Lock
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Intent {
  id: string;
  content: string;
  platform: string;
  status: string;
  risk_level: string;
  risk_score: number;
  risk_factors: string[];
  feedback: string | null;
  created_at: string;
  media_url: string | null;
  creator: { full_name: string; email: string } | null;
}

interface Stats {
  pending_review: number;
  pending_validation: number;
  pending_authorization: number;
  pending_governance: number;
  returned: number;
  blocked: number;
  total_pending: number;
}

// ─── Config Maps ──────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { label: string; dot: string; badge: string; border: string }> = {
  LOW:        { label: "Low",        dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", border: "border-l-emerald-500" },
  STANDARD:   { label: "Standard",   dot: "bg-blue-400",    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",         border: "border-l-blue-500" },
  ELEVATED:   { label: "Elevated",   dot: "bg-amber-400",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",      border: "border-l-amber-500" },
  HIGH:       { label: "High",       dot: "bg-orange-400",  badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",   border: "border-l-orange-500" },
  RESTRICTED: { label: "Restricted", dot: "bg-red-400",     badge: "bg-red-500/10 text-red-400 border-red-500/20",            border: "border-l-red-500" },
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW:        { label: "Needs Review",       color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  PENDING_MANAGER:       { label: "Needs Review",       color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  PENDING_VALIDATION:    { label: "Validation Required", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PENDING_AUTHORIZATION: { label: "Awaiting Auth",      color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  PENDING_ADMIN:         { label: "Awaiting Auth",      color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  PENDING_GOVERNANCE:    { label: "Governance Review",  color: "bg-red-500/10 text-red-400 border-red-500/20" },
  RETURNED:              { label: "Returned",           color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  IN_REVISION:           { label: "In Revision",        color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  BLOCKED:               { label: "Blocked",            color: "bg-red-500/10 text-red-400 border-red-500/20" },
  GOVERNANCE_BLOCKED:    { label: "Blocked",            color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const FILTER_STATUSES: Record<string, string[]> = {
  all:           [],
  review:        ["PENDING_REVIEW", "PENDING_MANAGER"],
  validation:    ["PENDING_VALIDATION"],
  authorization: ["PENDING_AUTHORIZATION", "PENDING_ADMIN"],
  governance:    ["PENDING_GOVERNANCE"],
  returned:      ["RETURNED", "IN_REVISION"],
  blocked:       ["BLOCKED", "GOVERNANCE_BLOCKED"],
};

function timeInQueue(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m ago`;
}

// ─── Action Button Config ─────────────────────────────────────────────────────

function getActions(status: string, role: string): { key: string; label: string; style: string; icon?: React.ReactNode }[] {
  const r = role.toUpperCase();

  const returnBtn = { key: "return_revision", label: "Return", style: "btn-amber", icon: <RotateCcw className="w-3.5 h-3.5" /> };
  const rejectBtn = { key: "reject",          label: "Reject",  style: "btn-red",   icon: <XCircle className="w-3.5 h-3.5" /> };
  const blockBtn  = { key: "block",           label: "Block",   style: "btn-red",   icon: <Lock className="w-3.5 h-3.5" /> };
  const escalBtn  = { key: "escalate",        label: "Escalate", style: "btn-amber", icon: <ArrowUpRight className="w-3.5 h-3.5" /> };

  if (["RETURNED", "IN_REVISION"].includes(status)) {
    return [{ key: "approve", label: "Resubmit", style: "btn-primary", icon: <CheckCircle2 className="w-3.5 h-3.5" /> }];
  }

  if (r === "VALIDATOR" && status === "PENDING_VALIDATION") {
    return [returnBtn, rejectBtn, { key: "validate", label: "Validate", style: "btn-primary", icon: <ShieldCheck className="w-3.5 h-3.5" /> }];
  }

  if (r === "APPROVER" && ["PENDING_AUTHORIZATION", "PENDING_ADMIN"].includes(status)) {
    return [{ key: "reject", label: "Decline", style: "btn-red", icon: <XCircle className="w-3.5 h-3.5" /> }, blockBtn, { key: "authorize", label: "Authorize", style: "btn-primary", icon: <CheckCircle2 className="w-3.5 h-3.5" /> }];
  }

  if (r === "GOVERNANCE_ADMIN" && status === "PENDING_GOVERNANCE") {
    return [blockBtn, { key: "authorize", label: "Final Authorize", style: "btn-primary", icon: <CheckCircle2 className="w-3.5 h-3.5" /> }];
  }

  if (["ADMIN", "WORKSPACE_OWNER"].includes(r)) {
    return [returnBtn, rejectBtn, blockBtn, { key: "approve", label: "Approve All", style: "btn-primary", icon: <CheckCircle2 className="w-3.5 h-3.5" /> }];
  }

  // Default reviewer/manager
  return [returnBtn, rejectBtn, escalBtn, { key: "approve", label: "Approve →", style: "btn-primary", icon: <CheckCircle2 className="w-3.5 h-3.5" /> }];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReviewQueue() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueResult, statsResult, ctxResult] = await Promise.all([
        api.get("/api/v1/approvals/queue"),
        api.get("/api/v1/approvals/stats"),
        api.get("/api/v1/user/context"),
      ]);
      if (queueResult.success) setIntents(queueResult.data || []);
      if (statsResult.success) setStats(statsResult.data.counts);
      if (ctxResult.success) setUserRole(ctxResult.data.role);
    } catch {
      setMessage({ type: "error", text: "Failed to load approval queue." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (intentId: string, action: string) => {
    const feedback = feedbackMap[intentId] || undefined;
    setActionLoading(intentId + action);
    setMessage(null);
    try {
      const result = await api.post(`/api/v1/approvals/items/${intentId}/action`, { action, feedback });
      if (result.success) {
        setIntents(prev => prev.filter(i => i.id !== intentId));
        const labels: Record<string, string> = {
          approve: "Approved", validate: "Validated", authorize: "Authorized",
          reject: "Rejected", return_revision: "Returned for revision", block: "Blocked", escalate: "Escalated",
        };
        setMessage({ type: "success", text: `${labels[action] || action} successfully.` });
        // refresh stats
        const sr = await api.get("/api/v1/approvals/stats");
        if (sr.success) setStats(sr.data.counts);
      }
    } catch {
      setMessage({ type: "error", text: `Failed to ${action}. Please try again.` });
    } finally {
      setActionLoading(null);
    }
  };

  const displayedIntents = filter === "all"
    ? intents
    : intents.filter(i => FILTER_STATUSES[filter]?.includes(i.status));

  const roleLabel = userRole
    ? { MANAGER: "Review & Edit", REVIEWER: "Review Queue", VALIDATOR: "Validation Desk",
        APPROVER: "Authorization Queue", GOVERNANCE_ADMIN: "Governance Review", ADMIN: "Approval Queue" }[userRole.toUpperCase()] || "Approval Queue"
    : "Approval Queue";

  const filters = [
    { key: "all",           label: "All",           count: stats?.total_pending ?? 0 },
    { key: "review",        label: "Needs Review",  count: stats?.pending_review ?? 0 },
    { key: "validation",    label: "Validation",    count: stats?.pending_validation ?? 0 },
    { key: "authorization", label: "Authorization", count: stats?.pending_authorization ?? 0 },
    { key: "governance",    label: "Governance",    count: stats?.pending_governance ?? 0 },
    { key: "returned",      label: "Returned",      count: stats?.returned ?? 0 },
    { key: "blocked",       label: "Blocked",       count: stats?.blocked ?? 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{roleLabel}</h1>
          <p className="text-[#888] text-sm">Content pending your action before publishing</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white hover:border-[var(--card-border)] transition-all group"
          title="Refresh"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
        </button>
      </div>

      {/* Stats Banner */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Needs Review",  val: stats.pending_review,        icon: <BarChart2 className="w-4 h-4 text-blue-400" />,   color: "text-blue-400" },
            { label: "Validation",    val: stats.pending_validation,     icon: <ShieldCheck className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
            { label: "Authorization", val: stats.pending_authorization,  icon: <CheckCircle2 className="w-4 h-4 text-purple-400" />, color: "text-purple-400" },
            { label: "Returned",      val: stats.returned,               icon: <RotateCcw className="w-4 h-4 text-orange-400" />,  color: "text-orange-400" },
          ].map(s => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">{s.icon}</div>
              <div>
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-[#666] font-medium uppercase tracking-wider">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {message && (
        <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === f.key
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-[#666] hover:text-[#aaa] border border-transparent"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                filter === f.key ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-[#888]"
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="flex flex-col items-center py-24 text-[#666] gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading approval queue…</p>
        </div>
      ) : displayedIntents.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-[#555]" />
          </div>
          <p className="text-white font-semibold mb-1">Queue is clear</p>
          <p className="text-[#666] text-sm">Nothing pending your action right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedIntents.map(intent => {
            const risk = RISK_CONFIG[intent.risk_level?.toUpperCase()] ?? RISK_CONFIG.STANDARD;
            const stage = STAGE_CONFIG[intent.status] ?? { label: intent.status, color: "bg-white/5 text-[#888] border-white/10" };
            const isExpanded = expanded === intent.id;
            const actions = getActions(intent.status, userRole || "");

            return (
              <div key={intent.id} className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--card-border)] transition-all duration-200 border-l-4 ${risk.border}`}>
                {/* Card Header */}
                <div className="p-5">
                  {/* Top Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold uppercase tracking-wider text-[#aaa]">
                        {intent.platform}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${stage.color}`}>
                        {stage.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${risk.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                        {risk.label} Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#555] text-[11px] shrink-0 ml-2">
                      <Clock className="w-3 h-3" />
                      {timeInQueue(intent.created_at)}
                    </div>
                  </div>

                  {/* Content Preview */}
                  <p className={`text-sm text-[#ccc] leading-relaxed mb-4 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {intent.content}
                  </p>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {intent.creator?.full_name?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#ccc]">{intent.creator?.full_name ?? "Unknown"}</p>
                        <p className="text-[10px] text-[#555]">Creator</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick action buttons (only when not expanded) */}
                      {!isExpanded && actions.map(btn => (
                        <button
                          key={btn.key}
                          onClick={() => handleAction(intent.id, btn.key)}
                          disabled={actionLoading === intent.id + btn.key}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 ${
                            btn.style === "btn-primary"
                              ? "bg-indigo-500 hover:bg-indigo-400 text-white"
                              : btn.style === "btn-red"
                              ? "bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20"
                              : "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/20"
                          }`}
                        >
                          {btn.icon}
                          {btn.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : intent.id)}
                        className="p-1.5 text-[#555] hover:text-[#aaa] transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]/50 space-y-4">
                      {/* Feedback from previous stage */}
                      {intent.feedback && (
                        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Previous Feedback</p>
                          <p className="text-sm text-[#ccc]">{intent.feedback}</p>
                        </div>
                      )}

                      {/* Risk Factors */}
                      {intent.risk_factors?.length > 0 && (
                        <div className="bg-white/2 border border-[var(--border)]/50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <ShieldAlert className="w-3 h-3" /> Risk Factors
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {intent.risk_factors.map((f: string) => (
                              <span key={f} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-[#888]">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback Input + Actions */}
                      <div className="space-y-2">
                        <textarea
                          placeholder="Add a note for the next reviewer or creator…"
                          value={feedbackMap[intent.id] || ""}
                          onChange={e => setFeedbackMap(prev => ({ ...prev, [intent.id]: e.target.value }))}
                          rows={3}
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 text-sm text-white placeholder-[#555] outline-none focus:border-indigo-500/50 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          {actions.map(btn => (
                            <button
                              key={btn.key}
                              onClick={() => { handleAction(intent.id, btn.key); setExpanded(null); }}
                              disabled={actionLoading === intent.id + btn.key}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50 ${
                                btn.style === "btn-primary"
                                  ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                                  : btn.style === "btn-red"
                                  ? "bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20"
                                  : "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/20"
                              }`}
                            >
                              {btn.icon}
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty filtered state */}
      {!loading && displayedIntents.length === 0 && filter !== "all" && intents.length > 0 && (
        <div className="mt-4 text-center text-[#555] text-sm">
          No items in this filter.{" "}
          <button onClick={() => setFilter("all")} className="text-indigo-400 hover:underline">Show all</button>
        </div>
      )}
    </div>
  );
}

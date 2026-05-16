"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2, XCircle, Clock, TrendingUp, BarChart2,
  ShieldCheck, RefreshCcw, AlertCircle, ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";

interface RecentDecision {
  id: string;
  content: string;
  platform: string;
  status: string;
  risk_level: string;
  created_at: string;
  creator: { full_name: string } | null;
}

interface ApprovalData {
  counts: {
    pending_review: number;
    pending_validation: number;
    pending_authorization: number;
    pending_governance: number;
    returned: number;
    blocked: number;
    total_pending: number;
    approved_this_week: number;
    rejected_this_week: number;
  };
  recent: RecentDecision[];
  approval_rate: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED:           { label: "Approved",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  REJECTED:           { label: "Rejected",   color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20" },
  BLOCKED:            { label: "Blocked",    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  GOVERNANCE_BLOCKED: { label: "Blocked",    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
};

const RISK_DOT: Record<string, string> = {
  LOW: "bg-emerald-400", STANDARD: "bg-blue-400",
  ELEVATED: "bg-amber-400", HIGH: "bg-orange-400", RESTRICTED: "bg-red-400",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

// Workflow stage flow diagram data
const WORKFLOW_STAGES = [
  { label: "Submit", color: "bg-[#1a1a2e] border-indigo-500/30 text-indigo-400" },
  { label: "Review", color: "bg-[#1a1a2e] border-blue-500/30 text-blue-400" },
  { label: "Validate", color: "bg-[#1a1a2e] border-amber-500/30 text-amber-400" },
  { label: "Authorize", color: "bg-[#1a1a2e] border-purple-500/30 text-purple-400" },
  { label: "Publish", color: "bg-[#1a1a2e] border-emerald-500/30 text-emerald-400" },
];

export default function ApprovalsPage() {
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/api/v1/approvals/stats");
      if (result.success) {
        setData(result.data);
      } else {
        setError("Failed to load approval data.");
      }
    } catch {
      setError("Failed to load approval data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalDecided = (data?.counts.approved_this_week ?? 0) + (data?.counts.rejected_this_week ?? 0);

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Approvals</h1>
          <p className="text-[#888] text-sm">Decision records, approval routing, and authorization history</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#888] hover:text-white hover:border-[var(--card-border)] transition-all group"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : "group-hover:rotate-180 transition-transform duration-500"}`} />
        </button>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-24 text-[#666] gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading approval data…</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Approved This Week",
                val: data?.counts.approved_this_week ?? 0,
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                color: "text-emerald-400",
                bg: "bg-emerald-500/5",
              },
              {
                label: "Rejected This Week",
                val: data?.counts.rejected_this_week ?? 0,
                icon: <XCircle className="w-5 h-5 text-rose-400" />,
                color: "text-rose-400",
                bg: "bg-rose-500/5",
              },
              {
                label: "Pending Right Now",
                val: data?.counts.total_pending ?? 0,
                icon: <Clock className="w-5 h-5 text-amber-400" />,
                color: "text-amber-400",
                bg: "bg-amber-500/5",
              },
              {
                label: "Approval Rate",
                val: data?.approval_rate != null ? `${data.approval_rate}%` : "—",
                icon: <TrendingUp className="w-5 h-5 text-indigo-400" />,
                color: "text-indigo-400",
                bg: "bg-indigo-500/5",
              },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-[var(--border)] rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">{s.icon}</div>
                </div>
                <p className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.val}</p>
                <p className="text-[11px] text-[#666] font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pending by Stage */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mb-4">
            <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Pending by Stage
            </h2>
            <div className="space-y-3">
              {[
                { label: "Needs Review",  val: data?.counts.pending_review ?? 0,        color: "bg-blue-500",   max: Math.max(1, data?.counts.total_pending ?? 1) },
                { label: "Validation",    val: data?.counts.pending_validation ?? 0,     color: "bg-amber-500",  max: Math.max(1, data?.counts.total_pending ?? 1) },
                { label: "Authorization", val: data?.counts.pending_authorization ?? 0,  color: "bg-purple-500", max: Math.max(1, data?.counts.total_pending ?? 1) },
                { label: "Governance",    val: data?.counts.pending_governance ?? 0,     color: "bg-red-500",    max: Math.max(1, data?.counts.total_pending ?? 1) },
                { label: "Returned",      val: data?.counts.returned ?? 0,               color: "bg-orange-500", max: Math.max(1, data?.counts.total_pending ?? 1) },
              ].map(bar => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="text-xs text-[#777] w-28 shrink-0">{bar.label}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all duration-700`}
                      style={{ width: `${Math.max(bar.val > 0 ? 4 : 0, (bar.val / bar.max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#aaa] w-5 text-right">{bar.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Two-column: Workflow diagram + Recent */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Approval Workflow Diagram */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Standard Workflow
              </h2>
              <div className="flex flex-col gap-2">
                {WORKFLOW_STAGES.map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className={`border rounded-xl px-3 py-2 flex-1 text-center text-xs font-bold ${stage.color}`}>
                      {stage.label}
                    </div>
                    {i < WORKFLOW_STAGES.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-[#444] shrink-0" />
                    )}
                    {i === WORKFLOW_STAGES.length - 1 && (
                      <div className="w-4" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]/50">
                <p className="text-[10px] text-[#555] leading-relaxed">
                  HIGH and RESTRICTED content follows the full 5-stage path. LOW risk is auto-approved after initial review.
                </p>
              </div>
            </div>

            {/* Recent Decisions */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-[#aaa] uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Recent Decisions
              </h2>
              {(data?.recent ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-8 text-[#555]">
                  <CheckCircle2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No decisions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(data?.recent ?? []).slice(0, 6).map(item => {
                    const s = STATUS_CONFIG[item.status] ?? { label: item.status, color: "text-[#888]", bg: "bg-white/5 border-white/10" };
                    const rDot = RISK_DOT[item.risk_level?.toUpperCase()] ?? "bg-[#555]";
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/2 transition-colors">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${rDot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#ccc] line-clamp-1">{item.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#555]">{item.creator?.full_name}</span>
                            <span className="text-[10px] text-[#444]">·</span>
                            <span className="text-[10px] text-[#555]">{timeAgo(item.created_at)}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.bg} ${s.color} shrink-0`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Weekly summary footer */}
          {totalDecided > 0 && (
            <div className="mt-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">This Week&apos;s Activity</p>
                  <p className="text-xs text-[#666]">{totalDecided} decisions made in the past 7 days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-400">{data?.approval_rate != null ? `${data.approval_rate}%` : "—"}</p>
                <p className="text-[11px] text-[#666]">approval rate</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

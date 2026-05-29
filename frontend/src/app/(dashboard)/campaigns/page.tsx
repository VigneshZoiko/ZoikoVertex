"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderKanban, Plus, Loader2, AlertCircle, RefreshCw, X,
  TrendingUp, Layers, Clock, CheckCircle2,
  DollarSign, Zap, Filter,
  MoreHorizontal, Pause, Play, Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRoleContext } from "@/lib/context/RoleContext";

// ── Types ────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  objective: string;
  platforms: string[];
  budget_total?: number | null;
  budget_currency?: string;
  spend_recorded?: number;
  spend_data_state?: string;
  risk_tier?: string;
  campaign_manager_name?: string;
  budget_owner_name?: string;
  start_at?: string | null;
  end_at?: string | null;
  project_count: number;
  created_at: string;
  wizard_step?: number;
  region?: string;
}

interface Stats {
  total: number;
  draft: number;
  in_review: number;
  approval_pending: number;
  active: number;
  pausing: number;
  paused: number;
  completed: number;
  risk_flags: number;
  budget_allocated: number;
  spend_recorded: number;
  needs_action: number;
}

// ── Style maps ───────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT:             "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  READY_FOR_REVIEW:  "text-blue-400 bg-blue-400/10 border-blue-400/20",
  IN_REVIEW:         "text-blue-400 bg-blue-400/10 border-blue-400/20",
  CHANGES_REQUESTED: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  APPROVED:          "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  SCHEDULED:         "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  ACTIVE:            "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PAUSING:           "text-amber-400 bg-amber-400/10 border-amber-400/20",
  PAUSED:            "text-amber-400 bg-amber-400/10 border-amber-400/20",
  COMPLETED:         "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  CLOSED:            "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  REJECTED:          "text-rose-400 bg-rose-400/10 border-rose-400/20",
  CANCELLED:         "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const RISK_STYLES: Record<string, string> = {
  low:      "text-emerald-400 bg-emerald-400/10",
  medium:   "text-amber-400 bg-amber-400/10",
  high:     "text-orange-400 bg-orange-400/10",
  critical: "text-rose-400 bg-rose-400/10",
};

const TYPE_STYLES: Record<string, string> = {
  ORGANIC:  "text-emerald-400 bg-emerald-400/10",
  PAID_ADS: "text-amber-400 bg-amber-400/10",
  EMAIL:    "text-blue-400 bg-blue-400/10",
  MIXED:    "text-purple-400 bg-purple-400/10",
};

const SPEND_STATE_STYLES: Record<string, string> = {
  PRELIMINARY: "text-amber-400",
  FINAL:       "text-emerald-400",
  STALE:       "text-zinc-500",
  VARIANCE:    "text-orange-400",
};

// Next action label per status
function nextAction(c: Campaign): string {
  if (c.status === "DRAFT" && (c.wizard_step ?? 1) < 5) return "Complete wizard";
  if (c.status === "DRAFT") return "Request approval";
  if (c.status === "READY_FOR_REVIEW") return "Awaiting approval";
  if (c.status === "IN_REVIEW") return "Awaiting approval";
  if (c.status === "CHANGES_REQUESTED") return "Request approval";
  if (c.status === "APPROVED") return "Ready to launch";
  if (c.status === "SCHEDULED") return "Launching soon";
  if (c.status === "ACTIVE") return "Monitoring";
  if (c.status === "PAUSING") return "Pause pending";
  if (c.status === "PAUSED") return "Resume or close";
  if (c.status === "COMPLETED") return "View results";
  return "—";
}

const FILTERS = ["ALL", "NEEDS ACTION", "ACTIVE", "PENDING APPROVAL", "APPROVED", "PAUSED", "DRAFT", "COMPLETED"];

export default function CampaignsPage() {
  const router = useRouter();
  const { role, isSuperAdmin } = useRoleContext();
  const canCreateCampaign = isSuperAdmin || ['ADMIN','WORKSPACE_OWNER','CAMPAIGN_MANAGER','CREATOR'].includes(role ?? '');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("NEEDS ACTION");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [camRes, statRes] = await Promise.allSettled([
        api.get("/api/v1/campaigns"),
        api.get("/api/v1/campaigns/stats"),
      ]);
      if (camRes.status  === "fulfilled") setCampaigns(camRes.value.data || []);
      if (statRes.status === "fulfilled") setStats(statRes.value.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (() => {
    if (filter === "ALL") return campaigns;
    if (filter === "NEEDS ACTION") return campaigns.filter(c =>
      ["READY_FOR_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED", "PAUSING"].includes(c.status));
    if (filter === "PENDING APPROVAL") return campaigns.filter(c =>
      ["READY_FOR_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(c.status));
    if (filter === "APPROVED") return campaigns.filter(c =>
      ["APPROVED", "SCHEDULED"].includes(c.status));
    return campaigns.filter(c => c.status === filter);
  })();

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });

  const spendPct = (c: Campaign) => {
    if (!c.budget_total || !c.spend_recorded) return null;
    return Math.round((c.spend_recorded / c.budget_total) * 100);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
              <FolderKanban className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-[52px]">
            Create and manage campaigns. Link posts, track spend, and measure performance.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCreateCampaign && (
            <button onClick={() => router.push("/campaigns/new")}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
              <Plus className="w-4 h-4" />New Campaign
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/10 rounded-lg"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Summary Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Draft",            value: stats.draft,            icon: Layers,       color: "text-zinc-400",    bg: "bg-zinc-800",        alert: false },
            { label: "Pending Approval", value: stats.in_review,        icon: Clock,        color: "text-blue-400",    bg: "bg-blue-500/10",     alert: stats.in_review > 0 },
            { label: "Approved",         value: stats.approval_pending, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10",  alert: false },
            { label: "Active",           value: stats.active,           icon: Play,         color: "text-emerald-400", bg: "bg-emerald-500/10",  alert: false },
            { label: "Pausing",          value: stats.pausing,          icon: Pause,        color: "text-amber-400",   bg: "bg-amber-500/10",    alert: stats.pausing > 0 },
            { label: "Paused",           value: stats.paused,           icon: Pause,        color: "text-amber-400",   bg: "bg-amber-500/10",    alert: false },
            { label: "Budget",           value: `$${(stats.budget_allocated / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10", alert: false },
            { label: "Needs Action",     value: stats.needs_action,     icon: Zap,          color: "text-amber-400",   bg: "bg-amber-500/10",    alert: stats.needs_action > 0 },
          ].map(({ label, value, icon: Icon, color, bg, alert }) => (
            <div key={label} className={`p-4 bg-zinc-900/40 border rounded-2xl transition-colors ${alert ? "border-amber-500/30 hover:border-amber-500/50" : "border-zinc-800 hover:border-zinc-700"}`}>
              <div className={`w-7 h-7 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => {
            const count = f === "ALL" ? campaigns.length
              : f === "NEEDS ACTION" ? (stats?.needs_action ?? 0)
              : f === "PENDING APPROVAL" ? (stats?.in_review ?? 0)
              : f === "APPROVED" ? (stats?.approval_pending ?? 0)
              : f === "ACTIVE" ? (stats?.active ?? 0)
              : f === "PAUSED" ? (stats?.paused ?? 0)
              : f === "DRAFT" ? (stats?.draft ?? 0)
              : f === "COMPLETED" ? (stats?.completed ?? 0)
              : 0;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === f ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}>
                {f.charAt(0) + f.slice(1).toLowerCase()}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-bold ${
                    filter === f ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-500"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Campaign Table ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <p className="text-zinc-600 text-sm">Loading campaigns…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <FolderKanban className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-400 font-semibold">No campaigns</p>
          <p className="text-zinc-600 text-sm mt-1 max-w-xs">
            {filter === "NEEDS ACTION" ? "No campaigns need attention right now." : "Try a different filter or create a new campaign."}
          </p>
          {canCreateCampaign && (
            <button onClick={() => router.push("/campaigns/new")}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all">
              <Plus className="w-4 h-4" />New Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_80px_110px_80px_110px_130px_110px_40px] gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
            {["Campaign", "Type", "Status", "Risk", "Budget / Spend", "Owner", "Next Action", ""].map(h => (
              <p key={h} className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate">{h}</p>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((c, i) => {
            const pct = spendPct(c);
            const spendColor = pct == null ? "" : pct >= 110 ? "text-rose-400" : pct >= 85 ? "text-amber-400" : "text-zinc-300";
            return (
              <div key={c.id}
                className={`grid grid-cols-[1fr_80px_110px_80px_110px_130px_110px_40px] gap-3 px-4 py-3.5 items-center hover:bg-zinc-900/60 transition-colors ${i < filtered.length - 1 ? "border-b border-zinc-800/60" : ""}`}>

                {/* Name */}
                <div className="min-w-0">
                  <Link href={`/campaigns/${c.id}`} className="font-semibold text-white text-sm hover:text-indigo-400 transition-colors line-clamp-1">
                    {c.name}
                  </Link>
                  <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-1">{c.objective}</p>
                </div>

                {/* Type */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit ${TYPE_STYLES[c.campaign_type] || TYPE_STYLES.ORGANIC}`}>
                  {c.campaign_type.replace("_", " ")}
                </span>

                {/* Status */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border w-fit ${STATUS_STYLES[c.status] || STATUS_STYLES.DRAFT}`}>
                  {c.status.replace(/_/g, " ")}
                </span>

                {/* Risk */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit ${RISK_STYLES[c.risk_tier || "low"]}`}>
                  {(c.risk_tier || "low").toUpperCase()}
                </span>

                {/* Budget / Spend */}
                <div className="text-xs">
                  {c.budget_total != null ? (
                    <>
                      <p className="text-zinc-300 font-semibold">${c.budget_total.toLocaleString()}</p>
                      {c.spend_recorded != null && c.spend_recorded > 0 && (
                        <p className={`text-[10px] font-medium ${spendColor}`}>
                          ${c.spend_recorded.toLocaleString()}
                          {pct != null && ` (${pct}%)`}
                          {c.spend_data_state && (
                            <span className={`ml-1 ${SPEND_STATE_STYLES[c.spend_data_state] || "text-zinc-500"}`}>
                              {c.spend_data_state.charAt(0) + c.spend_data_state.slice(1).toLowerCase()}
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-zinc-600 text-[10px]">—</p>
                  )}
                </div>

                {/* Owner */}
                <p className="text-xs text-zinc-400 truncate">
                  {c.campaign_manager_name || <span className="text-zinc-700">Unassigned</span>}
                </p>

                {/* Next Action */}
                <Link href={`/campaigns/${c.id}`}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold truncate transition-colors">
                  {nextAction(c)}
                </Link>

                {/* Menu */}
                <div className="relative">
                  <button onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {menuOpen === c.id && (
                    <div className="absolute right-0 top-8 z-20 w-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                      <Link href={`/campaigns/${c.id}`}
                        className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors">
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />View Detail
                      </Link>
                      {["DRAFT", "CHANGES_REQUESTED"].includes(c.status) && (
                        <Link href={`/campaigns/new?edit=${c.id}&step=${c.wizard_step ?? 1}`}
                          className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors">
                          <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />Continue Wizard
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}

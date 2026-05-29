"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, X,
  Target, DollarSign, Globe, FileText,
  Rocket, Pause, CheckCircle2, Clock,
  Calendar, TrendingUp, Zap, Play,
  Eye, BarChart2, ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

interface Campaign {
  id: string; name: string; description?: string;
  campaign_type: string; status: string; objective: string;
  business_rationale?: string; success_metrics?: string; region?: string;
  platforms: string[]; budget_total?: number | null; budget_daily?: number | null;
  budget_currency?: string; budget_pacing?: string;
  budget_owner_id?: string; budget_owner_name?: string;
  spend_recorded?: number; spend_data_state?: string; last_reconciled_at?: string;
  start_at?: string | null; end_at?: string | null;
  kpi_reach?: number | null; kpi_engagement?: number | null; kpi_conversions?: number | null;
  campaign_manager_id?: string; campaign_manager_name?: string;
  targeting?: Record<string, unknown>; creative?: Record<string, unknown>;
  wizard_step?: number; created_at: string; updated_at?: string; created_by?: string;
  post_limit?: number | null; auto_boost_enabled?: boolean; boost_per_post_budget?: number | null;
}

interface GateCondition { id: string; label: string; passed: boolean; reason: string | null; }
interface CampaignEvent {
  id: string; event_type: string; actor_role?: string; prev_status?: string;
  new_status?: string; metadata?: Record<string, unknown>; created_at: string;
}
interface CampaignPost {
  id: string; content: string; platform: string; status: string;
  media_urls?: string[]; created_at: string; creator_name?: string | null;
  platform_post_id?: string | null;
  auto_boost_status?: string | null; boost_id?: string | null;
}
interface CampaignBoost {
  id: string; platform: string; boost_type: 'POST' | 'CAMPAIGN'; status: string;
  objective: string; budget_total?: number; budget_daily?: number; budget_currency?: string;
  start_at?: string; end_at?: string;
  impressions: number; reach: number; clicks: number; spend_recorded: number;
  created_at: string; meta_campaign_id?: string; publish_intent_id?: string;
}
interface CampaignInsights {
  totals:      { impressions: number; reach: number; clicks: number; spend: number };
  kpis:        { ctr: number; cpm: number; cpc: number };
  kpi_targets: { reach: number | null; engagement: number | null; conversions: number | null };
  budget:      { total: number | null; currency: string; spend: number; utilization_pct: number | null };
  by_platform: { platform: string; impressions: number; reach: number; clicks: number; spend: number }[];
  by_status:   { status: string; count: number }[];
  by_objective:{ objective: string; count: number }[];
  boosts_count: number;
}
interface MetaAccount {
  id: string; platform: string; account_name: string; account_handle?: string;
  ad_account_id?: string; ad_account_name?: string;
}

interface BudgetAuth {
  id: string; status: string; requested_amount: number; requested_daily?: number;
  currency: string; justification?: string; requested_by?: string;
  budget_owner_id?: string; decision_by?: string; decision_at?: string;
  decision_note?: string; expires_at?: string; created_at: string;
}

// ── Style maps ─────────────────────────────────────────────────

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

const BOOST_STATUS_STYLES: Record<string, string> = {
  ACTIVE:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PAUSED:    "text-amber-400 bg-amber-500/10 border-amber-500/20",
  COMPLETED: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  FAILED:    "text-rose-400 bg-rose-500/10 border-rose-500/20",
  CANCELLED: "text-zinc-400 bg-zinc-800 border-zinc-700",
  PENDING:   "text-zinc-400 bg-zinc-800 border-zinc-700",
};

const SPEND_STATE: Record<string, string> = {
  PRELIMINARY: "text-amber-400", FINAL: "text-emerald-400",
  STALE: "text-zinc-500", VARIANCE: "text-orange-400",
};

const TABS = [
  { id: "overview",    label: "Overview",    icon: Target     },
  { id: "brief",       label: "Brief",       icon: FileText   },
  { id: "budget",      label: "Budget",      icon: DollarSign },
  { id: "posts",       label: "Posts",       icon: Globe      },
  { id: "insights",    label: "Insights",    icon: BarChart2  },
  { id: "boosts",      label: "Boosts",      icon: Zap        },
];

const OBJECTIVES = [
  { value: "POST_ENGAGEMENT", label: "Post Engagement" },
  { value: "REACH",           label: "Reach" },
  { value: "BRAND_AWARENESS", label: "Brand Awareness" },
  { value: "TRAFFIC",         label: "Traffic" },
  { value: "VIDEO_VIEWS",     label: "Video Views" },
];

const COUNTRY_LIST = ["AE","SA","QA","KW","BH","OM","EG","JO","IN","GB","US","DE","FR","AU","PK","NG","ZA","CA"];

function statusLabel(s: string): string {
  if (s === "READY_FOR_REVIEW") return "PENDING APPROVAL";
  if (s === "IN_REVIEW") return "UNDER REVIEW";
  if (s === "CHANGES_REQUESTED") return "REVISION NEEDED";
  return s.replace(/_/g, " ");
}

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "—";

// ── Page ──────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [events, setEvents]       = useState<CampaignEvent[]>([]);
  const [gate, setGate]           = useState<{ eligible: boolean; conditions: GateCondition[]; failed_conditions: GateCondition[] } | null>(null);
  const [posts, setPosts]         = useState<CampaignPost[]>([]);
  const [boosts, setBoosts]       = useState<CampaignBoost[]>([]);
  const [insights, setInsights]   = useState<CampaignInsights | null>(null);
  const [budgetAuth, setBudgetAuth] = useState<{ active: BudgetAuth | null; history: BudgetAuth[] } | null>(null);
  const [budgetJustification, setBudgetJustification] = useState("");
  const [budgetAuthLoading, setBudgetAuthLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading]         = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState("overview");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pauseReason, setPauseReason]     = useState("");
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [boostTarget, setBoostTarget] = useState<{ type: 'POST' | 'CAMPAIGN'; postId?: string; postContent?: string } | null>(null);

  // Phase 1 — load just the campaign so the page renders immediately
  const loadCampaign = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/api/v1/campaigns/${id}`);
      setCampaign(res.data);
    } catch {
      setError("Campaign not found");
    } finally { setLoading(false); }
  }, [id]);

  // Phase 2 — load secondary data in the background (non-blocking)
  const loadSecondary = useCallback(async () => {
    setSecondaryLoading(true);
    const [eRes, gRes, pRes, bRes, iRes, baRes] = await Promise.allSettled([
      api.get(`/api/v1/campaigns/${id}/events`),
      api.get(`/api/v1/campaigns/${id}/launch-gate`),
      api.get(`/api/v1/campaigns/${id}/posts`),
      api.get(`/api/v1/ads/boosts?campaign_id=${id}`),
      api.get(`/api/v1/campaigns/${id}/insights`),
      api.get(`/api/v1/campaigns/${id}/budget-auth`),
    ]);
    if (eRes.status === "fulfilled") setEvents(eRes.value.data || []);
    if (gRes.status === "fulfilled") setGate(gRes.value.data);
    if (pRes.status === "fulfilled") setPosts(pRes.value.data || []);
    if (bRes.status === "fulfilled") setBoosts(bRes.value.data || []);
    if (iRes.status === "fulfilled") setInsights(iRes.value.data || null);
    if (baRes.status === "fulfilled") setBudgetAuth(baRes.value.data || null);
    setSecondaryLoading(false);
  }, [id]);

  // Full refresh — used after actions (approve, launch, pause, etc.)
  const load = useCallback(async () => {
    const [cRes, eRes, gRes, pRes, bRes, iRes, baRes] = await Promise.allSettled([
      api.get(`/api/v1/campaigns/${id}`),
      api.get(`/api/v1/campaigns/${id}/events`),
      api.get(`/api/v1/campaigns/${id}/launch-gate`),
      api.get(`/api/v1/campaigns/${id}/posts`),
      api.get(`/api/v1/ads/boosts?campaign_id=${id}`),
      api.get(`/api/v1/campaigns/${id}/insights`),
      api.get(`/api/v1/campaigns/${id}/budget-auth`),
    ]);
    if (cRes.status === "fulfilled") setCampaign(cRes.value.data);
    if (eRes.status === "fulfilled") setEvents(eRes.value.data || []);
    if (gRes.status === "fulfilled") setGate(gRes.value.data);
    if (pRes.status === "fulfilled") setPosts(pRes.value.data || []);
    if (bRes.status === "fulfilled") setBoosts(bRes.value.data || []);
    if (iRes.status === "fulfilled") setInsights(iRes.value.data || null);
    if (baRes.status === "fulfilled") setBudgetAuth(baRes.value.data || null);
  }, [id]);

  useEffect(() => {
    loadCampaign().then(() => loadSecondary());
  }, [loadCampaign, loadSecondary]);

  const doAction = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(action); setError(null);
    try {
      await api.post(`/api/v1/campaigns/${id}/${action}`, body || {});
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      setError(msg?.message || msg?.error || (err instanceof Error ? err.message : "Action failed"));
    } finally { setActionLoading(null); }
  };

  const handleRequestApproval = () => doAction("submit-review");
  const handleApprove         = () => doAction("approve");
  const handleLaunch          = () => doAction("launch");
  const handlePause           = () => {
    if (pauseReason.trim()) {
      doAction("pause", { reason: pauseReason });
      setShowPauseModal(false);
      setPauseReason("");
    }
  };

  const handleBoostAction = async (boostId: string, action: "pause" | "resume" | "cancel") => {
    try {
      if (action === "cancel") await api.delete(`/api/v1/ads/boosts/${boostId}`);
      else await api.post(`/api/v1/ads/boosts/${boostId}/${action}`, {});
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Boost action failed");
    }
  };

  const handleSyncBoost = async (boostId: string) => {
    try {
      await api.post(`/api/v1/ads/boosts/${boostId}/sync`, {});
      await load();
    } catch {}
  };

  const handleRequestBudgetAuth = async () => {
    setBudgetAuthLoading("request"); setError(null);
    try {
      await api.post(`/api/v1/campaigns/${id}/budget-auth/request`, { justification: budgetJustification });
      setBudgetJustification("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally { setBudgetAuthLoading(null); }
  };

  const handleBudgetAuthDecision = async (authId: string, action: "approve" | "reject") => {
    setBudgetAuthLoading(action); setError(null);
    try {
      if (action === "approve") {
        await api.post(`/api/v1/budget-authorizations/${authId}/approve`, {});
      } else {
        if (!rejectNote.trim()) return;
        await api.post(`/api/v1/budget-authorizations/${authId}/reject`, { decision_note: rejectNote });
        setShowRejectModal(false);
        setRejectNote("");
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally { setBudgetAuthLoading(null); }
  };

  if (loading) return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-zinc-800 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-zinc-800" />
          <div className="h-7 w-72 rounded-lg bg-zinc-800" />
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-2 border-b border-zinc-800 pb-px">
        {[80, 60, 72, 56, 72, 64].map((w, i) => (
          <div key={i} className="h-9 rounded-t-lg bg-zinc-800" style={{ width: w }} />
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-800/60" />)}
      </div>
      <div className="h-48 rounded-2xl bg-zinc-800/40" />
    </div>
  );

  if (!campaign) return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="font-medium">{error || "Campaign not found"}</p>
        <button onClick={() => router.push("/campaigns")} className="ml-auto text-sm underline">Back</button>
      </div>
    </div>
  );

  const spendPct = campaign.budget_total && campaign.spend_recorded
    ? Math.round((campaign.spend_recorded / campaign.budget_total) * 100) : null;
  const isPendingApproval = ["READY_FOR_REVIEW", "IN_REVIEW"].includes(campaign.status);
  const activeBoosts = boosts.filter(b => b.status === "ACTIVE").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <Link href="/campaigns"
            className="mt-1 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLES[campaign.status] || STATUS_STYLES.DRAFT}`}>
                {statusLabel(campaign.status)}
              </span>
              <span className="text-[10px] text-zinc-600 font-medium">{campaign.campaign_type.replace("_", " ")}</span>
              {activeBoosts > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />{activeBoosts} active boost{activeBoosts > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white leading-snug">{campaign.name}</h1>
          </div>
        </div>

        {/* Action Rail */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button onClick={load} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 transition-all">
            <RefreshCw className={`w-4 h-4 ${secondaryLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          {["DRAFT", "CHANGES_REQUESTED"].includes(campaign.status) && (
            <Link href={`/campaigns/new?edit=${id}&step=${campaign.wizard_step ?? 1}`}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
              Continue Wizard
            </Link>
          )}
          {["DRAFT", "CHANGES_REQUESTED"].includes(campaign.status) && (
            <button onClick={handleRequestApproval} disabled={actionLoading === "submit-review"}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
              {actionLoading === "submit-review" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Request Approval
            </button>
          )}
          {isPendingApproval && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />Pending Approval
              </div>
              <button onClick={handleApprove} disabled={actionLoading === "approve"}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
                {actionLoading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve
              </button>
            </>
          )}
          {["APPROVED", "SCHEDULED"].includes(campaign.status) && gate?.eligible && (
            <button onClick={handleLaunch} disabled={actionLoading === "launch"}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
              {actionLoading === "launch" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Launch Campaign
            </button>
          )}
          {campaign.status === "ACTIVE" && (
            <>
              <button onClick={() => { setBoostTarget({ type: "CAMPAIGN" }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-all">
                <Zap className="w-4 h-4" />Boost Campaign
              </button>
              <button onClick={() => setShowPauseModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
                <Pause className="w-4 h-4" />Pause
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /><span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-0.5 overflow-x-auto pb-px border-b border-zinc-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all rounded-t-lg ${
              activeTab === t.id
                ? "text-white bg-zinc-900 border border-b-zinc-900 border-zinc-800 -mb-px"
                : "text-zinc-500 hover:text-zinc-300"
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
            {t.id === "boosts" && boosts.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{boosts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="space-y-4">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Budget",    value: campaign.budget_total ? `${campaign.budget_currency || "USD"} ${campaign.budget_total.toLocaleString()}` : "—", icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                { label: "Spend",     value: campaign.spend_recorded ? `${campaign.budget_currency || "USD"} ${campaign.spend_recorded.toLocaleString()}${spendPct != null ? ` (${spendPct}%)` : ""}` : "—", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "Duration",  value: campaign.start_at && campaign.end_at ? `${fmt(campaign.start_at)} – ${fmt(campaign.end_at)}` : "—", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
                { label: "Published Posts", value: String(posts.filter(p => p.status === "PUBLISHED").length), icon: Globe, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                  <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-sm font-bold text-white">{value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Active boosts summary */}
            {boosts.length > 0 && (
              <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">{boosts.length} Boost{boosts.length > 1 ? "s" : ""} Running</h3>
                  </div>
                  <button onClick={() => setActiveTab("boosts")} className="text-xs text-amber-400 hover:text-amber-300 font-semibold">View all →</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Reach",      value: boosts.reduce((s, b) => s + b.reach, 0).toLocaleString() },
                    { label: "Total Clicks",     value: boosts.reduce((s, b) => s + b.clicks, 0).toLocaleString() },
                    { label: "Ad Spend",         value: `${campaign.budget_currency || "USD"} ${boosts.reduce((s, b) => s + b.spend_recorded, 0).toFixed(2)}` },
                  ].map(k => (
                    <div key={k.label} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <p className="text-sm font-bold text-white">{k.value}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{k.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Launch gate */}
            {gate && ["APPROVED", "SCHEDULED"].includes(campaign.status) && (
              <div className={`p-5 border rounded-2xl ${gate.eligible ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/40 border-zinc-800"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {gate.eligible ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-amber-400" />}
                    <h3 className="font-bold text-white text-sm">
                      {gate.eligible ? "Launch Conditions — All Passed" : `Launch Conditions — ${gate.failed_conditions.length} Blocking`}
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-500">{gate.conditions.filter(c => c.passed).length}/{gate.conditions.length} passed</span>
                </div>
                {gate.failed_conditions.map(c => (
                  <div key={c.id} className="flex items-start gap-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl mb-2 last:mb-0">
                    <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-300 font-semibold">{c.label}</p>
                      {c.reason && <p className="text-xs text-rose-400 mt-0.5">{c.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent activity */}
            {events.length > 0 && (
              <InfoCard title="Recent Activity">
                {events.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="text-xs text-zinc-400 flex-1">{e.event_type.replace(/\./g, " → ")}</span>
                    {e.new_status && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLES[e.new_status] || "text-zinc-500 bg-zinc-800 border-zinc-700"}`}>
                        {statusLabel(e.new_status)}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-600 shrink-0">{fmt(e.created_at)}</span>
                  </div>
                ))}
              </InfoCard>
            )}
          </div>
        )}

        {/* BRIEF */}
        {activeTab === "brief" && (
          <div className="space-y-4">
            <InfoCard title="Campaign Brief">
              <InfoRow label="Name"               value={campaign.name} />
              <InfoRow label="Type"               value={campaign.campaign_type.replace("_", " ")} />
              <InfoRow label="Region"             value={campaign.region || "—"} />
              <InfoRow label="Objective"          value={campaign.objective} />
              <InfoRow label="Business Rationale" value={campaign.business_rationale || "—"} />
              <InfoRow label="Success Metrics"    value={campaign.success_metrics || "—"} />
              <InfoRow label="Campaign Manager"   value={campaign.campaign_manager_name || "—"} />
              <InfoRow label="Created"            value={fmt(campaign.created_at)} />
            </InfoCard>
            {campaign.platforms?.length > 0 && (
              <InfoCard title="Platforms">
                <div className="flex flex-wrap gap-2">
                  {campaign.platforms.map(p => (
                    <span key={p} className="text-xs px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl font-semibold">{p}</span>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        )}

        {/* BUDGET */}
        {activeTab === "budget" && (
          <div className="space-y-4">
            <InfoCard title="Budget & Schedule">
              <InfoRow label="Total Budget"  value={campaign.budget_total ? `${campaign.budget_currency || "USD"} ${campaign.budget_total.toLocaleString()}` : "—"} />
              <InfoRow label="Pacing"        value={campaign.budget_pacing || "—"} />
              <InfoRow label="Budget Owner"  value={campaign.budget_owner_name || "—"} />
              <InfoRow label="Start Date"    value={fmt(campaign.start_at)} />
              <InfoRow label="End Date"      value={fmt(campaign.end_at)} />
            </InfoCard>
            <InfoCard title="Spend Tracking">
              <div className="flex items-center justify-between mb-3">
                <InfoRow label="Spend Recorded" value={campaign.spend_recorded ? `${campaign.budget_currency || "USD"} ${campaign.spend_recorded.toLocaleString()}` : "0"} />
                {campaign.spend_data_state && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${SPEND_STATE[campaign.spend_data_state] || "text-zinc-500"}`}>
                    {campaign.spend_data_state}
                  </span>
                )}
              </div>
              {spendPct != null && (
                <div className="mt-2">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${spendPct >= 110 ? "bg-rose-500" : spendPct >= 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(spendPct, 100)}%` }} />
                  </div>
                  <p className={`text-xs mt-1 font-semibold ${spendPct >= 110 ? "text-rose-400" : spendPct >= 85 ? "text-amber-400" : "text-zinc-400"}`}>
                    {spendPct}% of budget used
                    {spendPct >= 110 && " — OVERSPEND"}
                    {spendPct >= 85 && spendPct < 110 && " — Pacing warning"}
                  </p>
                </div>
              )}
              <InfoRow label="Last Reconciled" value={fmt(campaign.last_reconciled_at)} />
            </InfoCard>

            {/* ── Budget Authorization ── */}
            <InfoCard title="Budget Authorization">
              {(() => {
                const auth = budgetAuth?.active;
                const AUTH_STYLES: Record<string, string> = {
                  PENDING:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  APPROVED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  REJECTED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                  EXPIRED:  "text-zinc-400 bg-zinc-800 border-zinc-700",
                  CANCELLED:"text-zinc-500 bg-zinc-900 border-zinc-800",
                };
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${auth ? (AUTH_STYLES[auth.status] || AUTH_STYLES.PENDING) : "text-zinc-500 bg-zinc-900 border-zinc-800"}`}>
                          {auth?.status ?? "NOT REQUESTED"}
                        </span>
                        {auth && (
                          <span className="text-xs text-zinc-500">{auth.currency} {Number(auth.requested_amount).toLocaleString()} requested</span>
                        )}
                      </div>
                      {auth?.expires_at && auth.status === "PENDING" && (
                        <span className="text-[10px] text-zinc-600">Expires {fmt(auth.expires_at)}</span>
                      )}
                    </div>

                    {auth?.status === "APPROVED" && (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                        <p className="text-xs text-emerald-400 font-semibold">Budget authorized — campaign can proceed to launch</p>
                        {auth.decision_note && <p className="text-xs text-zinc-400">{auth.decision_note}</p>}
                        <p className="text-[10px] text-zinc-600">Authorized {fmt(auth.decision_at)}</p>
                      </div>
                    )}

                    {auth?.status === "REJECTED" && (
                      <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-1">
                        <p className="text-xs text-rose-400 font-semibold">Authorization rejected</p>
                        {auth.decision_note && <p className="text-xs text-zinc-400">{auth.decision_note}</p>}
                      </div>
                    )}

                    {auth?.status === "PENDING" && (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                        <p className="text-xs text-amber-300 font-semibold">Awaiting budget owner approval</p>
                        {auth.justification && (
                          <div>
                            <p className="text-[10px] text-zinc-500 mb-1">Justification</p>
                            <p className="text-xs text-zinc-300">{auth.justification}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => handleBudgetAuthDecision(auth.id, "approve")}
                            disabled={budgetAuthLoading === "approve"}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all">
                            {budgetAuthLoading === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Approve
                          </button>
                          <button onClick={() => setShowRejectModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 text-xs font-semibold rounded-lg transition-all">
                            <X className="w-3 h-3" />Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {(!auth || ["REJECTED", "EXPIRED", "CANCELLED"].includes(auth.status)) && campaign.budget_total && (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500">
                          {auth?.status === "REJECTED" ? "Re-request with updated justification:" : "Request authorization from the budget owner:"}
                        </p>
                        <textarea
                          value={budgetJustification}
                          onChange={e => setBudgetJustification(e.target.value)}
                          placeholder="Optional: explain the business rationale for this budget…"
                          rows={3}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-indigo-500" />
                        <button onClick={handleRequestBudgetAuth} disabled={budgetAuthLoading === "request"}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all">
                          {budgetAuthLoading === "request" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                          Request Budget Authorization
                        </button>
                      </div>
                    )}

                    {!campaign.budget_total && (
                      <p className="text-xs text-zinc-600 italic">Set a budget total in the campaign wizard before requesting authorization.</p>
                    )}
                  </div>
                );
              })()}
            </InfoCard>

            {(budgetAuth?.history?.length ?? 0) > 1 && (
              <InfoCard title="Authorization History">
                <div className="space-y-2">
                  {budgetAuth!.history.map(h => (
                    <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          h.status === "APPROVED" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : h.status === "REJECTED" ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
                          : "text-zinc-500 border-zinc-700 bg-zinc-800"
                        }`}>{h.status}</span>
                        <span className="text-xs text-zinc-500">{h.currency} {Number(h.requested_amount).toLocaleString()}</span>
                        {h.decision_note && <span className="text-xs text-zinc-600 truncate max-w-xs">{h.decision_note}</span>}
                      </div>
                      <span className="text-[10px] text-zinc-600 shrink-0">{fmt(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        )}

        {/* POSTS */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            {/* Post-limit progress + auto-boost indicator */}
            {(campaign?.post_limit || campaign?.auto_boost_enabled) && (
              <div className="flex flex-col gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                {campaign.post_limit && (() => {
                  const published = posts.filter(p => p.status === "PUBLISHED").length;
                  const pct = Math.min(100, Math.round((published / campaign.post_limit) * 100));
                  return (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">Post Limit</span>
                        <span className={`font-bold ${published >= campaign.post_limit! ? "text-amber-400" : "text-zinc-200"}`}>
                          {published} / {campaign.post_limit}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${published >= campaign.post_limit! ? "bg-amber-500" : "bg-indigo-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {published >= campaign.post_limit && (
                        <p className="text-[10px] text-amber-400 mt-1.5">Post limit reached — new posts won&apos;t be auto-boosted.</p>
                      )}
                    </div>
                  );
                })()}
                {campaign.auto_boost_enabled && campaign.status === "ACTIVE" && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-boost active — {campaign.budget_currency || "USD"} {campaign.boost_per_post_budget?.toLocaleString() ?? "—"} per post</span>
                  </div>
                )}
              </div>
            )}

            <InfoCard title={`Published Posts (${posts.filter(p => p.status === "PUBLISHED").length})`}>
              <p className="text-xs text-zinc-500 mb-4">Posts published through the Publishing Hub linked to this campaign.</p>
              {posts.filter(p => p.status === "PUBLISHED").length === 0 ? (
                <div className="text-center py-10 text-zinc-600">
                  <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No published posts yet.</p>
                  <p className="text-xs mt-1">When a publisher selects this campaign and the post goes live, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.filter(p => p.status === "PUBLISHED").map(p => (
                    <div key={p.id} className="flex items-start gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase">{p.platform}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">PUBLISHED</span>
                          {/* Auto-boost status badge */}
                          {p.auto_boost_status && (() => {
                            const bMap: Record<string, string> = {
                              LIVE:          "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                              QUEUED:        "bg-blue-500/10 border-blue-500/20 text-blue-400",
                              BOOSTING:      "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
                              FAILED:        "bg-rose-500/10 border-rose-500/20 text-rose-400",
                              LOW_BALANCE:   "bg-amber-500/10 border-amber-500/20 text-amber-400",
                              LIMIT_REACHED: "bg-amber-500/10 border-amber-500/20 text-amber-400",
                              SKIPPED:       "bg-zinc-800 border-zinc-700 text-zinc-500",
                            };
                            const cls = bMap[p.auto_boost_status] ?? "bg-zinc-800 border-zinc-700 text-zinc-500";
                            return (
                              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cls}`}>
                                <Zap className="w-2.5 h-2.5" />
                                {p.auto_boost_status.replace(/_/g, " ")}
                              </span>
                            );
                          })()}
                          {p.creator_name && <span className="text-[10px] text-zinc-500">{p.creator_name}</span>}
                          <span className="text-[10px] text-zinc-600 ml-auto">{fmt(p.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2">{p.content || "—"}</p>
                      </div>
                      {/* Boost post button — only for Meta platforms with a post ID */}
                      {["facebook", "instagram"].includes(p.platform?.toLowerCase() || "") && (
                        <button
                          onClick={() => setBoostTarget({ type: "POST", postId: p.id, postContent: p.content })}
                          title={p.platform_post_id ? "Boost this post on Meta" : "Post ID not available — republish via ZoikoVertex to enable boost"}
                          disabled={!p.platform_post_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                            p.platform_post_id
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                              : "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"
                          }`}>
                          <Zap className="w-3 h-3" />Boost
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>

            {posts.filter(p => p.status !== "PUBLISHED").length > 0 && (
              <InfoCard title={`In-Progress Posts (${posts.filter(p => p.status !== "PUBLISHED").length})`}>
                <div className="space-y-3">
                  {posts.filter(p => p.status !== "PUBLISHED").map(p => (
                    <div key={p.id} className="flex items-start gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl opacity-70">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase">{p.platform}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">{p.status.replace(/_/g, " ")}</span>
                          {p.creator_name && <span className="text-[10px] text-zinc-500">{p.creator_name}</span>}
                        </div>
                        <p className="text-sm text-zinc-400 line-clamp-2">{p.content || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        )}

        {/* INSIGHTS */}
        {activeTab === "insights" && (
          <div className="space-y-5">

            {/* Sync nudge if no insights data */}
            {insights && insights.boosts_count === 0 && (
              <div className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-500 text-xs">
                <BarChart2 className="w-4 h-4 shrink-0 text-zinc-600" />
                No boost data yet. Launch this campaign and create a Meta Ads boost to start seeing metrics here.
              </div>
            )}

            {/* ── Aggregate metric cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Impressions", value: insights?.totals.impressions.toLocaleString() ?? "—", icon: Eye,       color: "text-indigo-400" },
                { label: "Reach",       value: insights?.totals.reach.toLocaleString()       ?? "—", icon: TrendingUp, color: "text-sky-400"    },
                { label: "Clicks",      value: insights?.totals.clicks.toLocaleString()      ?? "—", icon: Target,     color: "text-emerald-400" },
                { label: "Ad Spend",    value: insights ? `${insights.budget.currency} ${insights.totals.spend.toLocaleString()}` : "—", icon: DollarSign, color: "text-amber-400" },
              ].map(m => (
                <div key={m.label} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex items-start gap-3">
                  <div className={`p-2 rounded-xl bg-zinc-800 ${m.color}`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{m.value}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Calculated KPIs ── */}
            {insights && (insights.totals.impressions > 0 || insights.totals.clicks > 0) && (
              <InfoCard title="Performance Ratios">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "CTR",  value: `${insights.kpis.ctr}%`,                 sub: "Click-through rate"      },
                    { label: "CPM",  value: `${insights.budget.currency} ${insights.kpis.cpm}`, sub: "Cost per 1,000 impressions" },
                    { label: "CPC",  value: `${insights.budget.currency} ${insights.kpis.cpc}`, sub: "Cost per click"             },
                  ].map(k => (
                    <div key={k.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                      <p className="text-2xl font-bold text-white">{k.value}</p>
                      <p className="text-[10px] font-semibold text-zinc-400 mt-1">{k.label}</p>
                      <p className="text-[9px] text-zinc-600 mt-0.5">{k.sub}</p>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* ── Platform breakdown bar chart ── */}
            {insights && insights.by_platform.length > 0 && (
              <InfoCard title="Performance by Platform">
                <div className="space-y-3">
                  {insights.by_platform.map(p => {
                    const maxImpr = Math.max(...insights.by_platform.map(x => x.impressions), 1);
                    const maxClicks = Math.max(...insights.by_platform.map(x => x.clicks), 1);
                    return (
                      <div key={p.platform} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-300 capitalize">{p.platform}</span>
                          <span className="text-zinc-500">{p.impressions.toLocaleString()} impr · {p.clicks.toLocaleString()} clicks</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${Math.round((p.impressions / maxImpr) * 100)}%` }} />
                          </div>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.round((p.clicks / maxClicks) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="flex gap-1 text-[9px] text-zinc-600">
                          <span className="flex-1 flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-indigo-500 inline-block" />Impressions</span>
                          <span className="flex-1 flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-emerald-500 inline-block" />Clicks</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            )}

            {/* ── Budget utilisation ── */}
            {insights?.budget.total && (
              <InfoCard title="Budget Utilisation">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{insights.budget.currency} {insights.budget.spend.toLocaleString()} spent</span>
                    <span className="font-semibold">{insights.budget.utilization_pct ?? 0}%</span>
                    <span>of {insights.budget.currency} {insights.budget.total.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      (insights.budget.utilization_pct ?? 0) >= 110 ? "bg-rose-500"
                      : (insights.budget.utilization_pct ?? 0) >= 85 ? "bg-amber-500"
                      : "bg-emerald-500"
                    }`} style={{ width: `${Math.min(insights.budget.utilization_pct ?? 0, 100)}%` }} />
                  </div>
                </div>
              </InfoCard>
            )}

            {/* ── KPI Targets vs Actuals ── */}
            <InfoCard title="KPI Targets">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Reach Target",       target: insights?.kpi_targets.reach,       actual: insights?.totals.reach       },
                  { label: "Engagement Target",   target: insights?.kpi_targets.engagement,  actual: insights?.totals.clicks      },
                  { label: "Conversion Target",   target: insights?.kpi_targets.conversions, actual: null                          },
                ].map(k => {
                  const pct = k.target && k.actual ? Math.round((k.actual / k.target) * 100) : null;
                  return (
                    <div key={k.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                      <div>
                        <p className="text-lg font-bold text-white">{k.target?.toLocaleString() ?? "—"}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{k.label}</p>
                      </div>
                      {pct !== null && (
                        <div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-indigo-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-zinc-600 mt-1">{k.actual?.toLocaleString()} actual · {pct}%</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </InfoCard>

            {/* ── Boost status distribution ── */}
            {insights && insights.by_status.length > 0 && (
              <InfoCard title="Boost Status Distribution">
                <div className="flex flex-wrap gap-2">
                  {insights.by_status.map(s => (
                    <div key={s.status} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${BOOST_STATUS_STYLES[s.status] || BOOST_STATUS_STYLES.PENDING}`}>
                      <span>{s.status}</span>
                      <span className="text-[11px] font-bold opacity-80">{s.count}</span>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* ── Objective breakdown ── */}
            {insights && insights.by_objective.length > 0 && (
              <InfoCard title="Boosts by Objective">
                <div className="flex flex-wrap gap-2">
                  {insights.by_objective.map(o => (
                    <div key={o.objective} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
                      <span className="font-semibold">{o.objective.replace(/_/g, " ")}</span>
                      <span className="text-zinc-500 font-bold">{o.count}</span>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

          </div>
        )}

        {/* BOOSTS */}
        {activeTab === "boosts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Meta Ads boosts linked to this campaign. Sync to pull latest metrics.</p>
              {campaign.status === "ACTIVE" && (
                <button onClick={() => setBoostTarget({ type: "CAMPAIGN" })}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-all">
                  <Zap className="w-3.5 h-3.5" />New Boost
                </button>
              )}
            </div>

            {boosts.length === 0 ? (
              <div className="text-center py-16 text-zinc-600 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No boosts yet</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">
                  {campaign.status === "ACTIVE"
                    ? "Click \"New Boost\" or use the \"Boost\" button on a published post to amplify this campaign on Meta."
                    : "Launch this campaign first, then boost individual posts or the whole campaign on Meta Ads."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {boosts.map(b => (
                  <div key={b.id} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
                    {/* Boost header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${BOOST_STATUS_STYLES[b.status] || BOOST_STATUS_STYLES.PENDING}`}>
                          {b.status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 uppercase">{b.boost_type} BOOST</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">{b.platform}</span>
                        <span className="text-[10px] text-zinc-600">{b.objective.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleSyncBoost(b.id)}
                          title="Sync metrics from Meta"
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        {b.status === "ACTIVE" && (
                          <button onClick={() => handleBoostAction(b.id, "pause")}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">
                            <Pause className="w-3 h-3" />Pause
                          </button>
                        )}
                        {b.status === "PAUSED" && (
                          <button onClick={() => handleBoostAction(b.id, "resume")}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                            <Play className="w-3 h-3" />Resume
                          </button>
                        )}
                        {["ACTIVE", "PAUSED"].includes(b.status) && (
                          <button onClick={() => handleBoostAction(b.id, "cancel")}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
                            <X className="w-3 h-3" />Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Budget + dates */}
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                      <span>
                        <span className="text-zinc-300 font-semibold">
                          {b.budget_daily
                            ? `${b.budget_currency} ${b.budget_daily}/day`
                            : b.budget_total
                              ? `${b.budget_currency} ${b.budget_total} total`
                              : "—"}
                        </span>
                        {" "}budget
                      </span>
                      <span>{fmt(b.start_at)} → {fmt(b.end_at)}</span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Impressions",  value: b.impressions.toLocaleString(),       icon: Eye       },
                        { label: "Reach",        value: b.reach.toLocaleString(),              icon: BarChart2 },
                        { label: "Clicks",       value: b.clicks.toLocaleString(),             icon: Zap       },
                        { label: "Ad Spend",     value: `${b.budget_currency || "USD"} ${b.spend_recorded.toFixed(2)}`, icon: DollarSign },
                      ].map(m => (
                        <div key={m.label} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                          <p className="text-sm font-bold text-white">{m.value}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pause Modal ── */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2"><Pause className="w-4 h-4 text-amber-400" />Pause Campaign</h2>
              <button onClick={() => setShowPauseModal(false)}><X className="w-4 h-4 text-zinc-500" /></button>
            </div>
            <textarea rows={3} value={pauseReason} onChange={e => setPauseReason(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Reason for pausing…" />
            <div className="flex gap-3">
              <button onClick={() => setShowPauseModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl">Cancel</button>
              <button onClick={handlePause} disabled={!pauseReason.trim() || actionLoading === "pause"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl">
                {actionLoading === "pause" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget Reject Modal ── */}
      {showRejectModal && budgetAuth?.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2"><X className="w-4 h-4 text-rose-400" />Reject Budget Authorization</h2>
              <button onClick={() => setShowRejectModal(false)}><X className="w-4 h-4 text-zinc-500" /></button>
            </div>
            <p className="text-sm text-zinc-400">Provide a reason so the requester knows how to address the issue.</p>
            <textarea rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 resize-none"
              placeholder="Reason for rejection…" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl">Cancel</button>
              <button onClick={() => handleBudgetAuthDecision(budgetAuth.active!.id, "reject")}
                disabled={!rejectNote.trim() || budgetAuthLoading === "reject"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl">
                {budgetAuthLoading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Boost Modal ── */}
      {boostTarget && (
        <BoostModal
          target={boostTarget}
          campaignId={id}
          campaign={campaign}
          onClose={() => setBoostTarget(null)}
          onSuccess={() => { setBoostTarget(null); load(); }}
        />
      )}
    </div>
  );
}

// ── BoostModal ────────────────────────────────────────────────

function BoostModal({
  target, campaignId, campaign, onClose, onSuccess,
}: {
  target:     { type: 'POST' | 'CAMPAIGN'; postId?: string; postContent?: string };
  campaignId: string;
  campaign:   Campaign;
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [boostPlatform, setBoostPlatform]               = useState<'meta' | 'google'>('meta');

  // Meta state
  const [metaAccounts, setMetaAccounts]                 = useState<MetaAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId]       = useState("");
  const [adAccounts, setAdAccounts]                     = useState<{ id: string; name: string; currency: string; account_status?: number }[]>([]);
  const [selectedAdAccountId, setSelectedAdAccountId]   = useState("");
  const [showAdAccountPicker, setShowAdAccountPicker]   = useState(false);
  const [loadingAdAccounts, setLoadingAdAccounts]       = useState(false);

  // Google Ads state
  const [googleAccounts, setGoogleAccounts]             = useState<MetaAccount[]>([]);
  const [selectedGoogleAccountId, setSelectedGoogleAccountId] = useState("");
  const [googleCustomers, setGoogleCustomers]           = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId]     = useState("");
  const [loadingCustomers, setLoadingCustomers]         = useState(false);
  const [showCustomerPicker, setShowCustomerPicker]     = useState(false);
  const [headline, setHeadline]                         = useState("");
  const [adDescription, setAdDescription]              = useState("");
  const [finalUrl, setFinalUrl]                         = useState("");

  // Shared state
  const [objective, setObjective]     = useState(target.type === "POST" ? "POST_ENGAGEMENT" : "REACH");
  const [budgetType, setBudgetType]   = useState<"daily" | "total">("daily");
  const [budgetAmount, setBudgetAmount] = useState(campaign.budget_daily?.toString() || campaign.budget_total?.toString() || "");
  const [startAt, setStartAt]         = useState(campaign.start_at?.split("T")[0] || new Date().toISOString().split("T")[0]);
  const [endAt, setEndAt]             = useState(campaign.end_at?.split("T")[0] || "");
  const [countries, setCountries]     = useState<string[]>((campaign.targeting?.geography as string[] | undefined) || []);
  const [ageMin, setAgeMin]           = useState(18);
  const [ageMax, setAgeMax]           = useState(65);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/v1/accounts").then(r => {
      const all = r.data || [];
      const meta   = all.filter((a: MetaAccount) => ["facebook", "instagram"].includes(a.platform));
      const google = all.filter((a: MetaAccount) => a.platform === "googleads");
      setMetaAccounts(meta);
      setGoogleAccounts(google);
      if (meta.length === 1) {
        setSelectedAccountId(meta[0].id);
        if (meta[0].ad_account_id) setSelectedAdAccountId(meta[0].ad_account_id);
      }
      if (google.length === 1) {
        setSelectedGoogleAccountId(google[0].id);
        if (google[0].ad_account_id) setSelectedCustomerId(google[0].ad_account_id);
      }
    }).catch(() => {});
  }, []);

  const selectedAccount       = metaAccounts.find(a => a.id === selectedAccountId);
  const selectedGoogleAccount = googleAccounts.find(a => a.id === selectedGoogleAccountId);

  const handleFetchAdAccounts = async () => {
    if (!selectedAccountId) return;
    setLoadingAdAccounts(true); setError(null);
    try {
      const r = await api.get(`/api/v1/ads/accounts/${selectedAccountId}/ad-accounts`);
      setAdAccounts(r.data || []);
      setShowAdAccountPicker(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; hint?: string } } })?.response?.data;
      setError(msg?.hint || msg?.error || "Failed to fetch ad accounts");
    } finally { setLoadingAdAccounts(false); }
  };

  const handleLinkAdAccount = async (adAccountId: string, adAccountName: string) => {
    await api.post(`/api/v1/ads/accounts/${selectedAccountId}/link-ad-account`, {
      ad_account_id: adAccountId, ad_account_name: adAccountName,
    });
    setSelectedAdAccountId(adAccountId);
    setShowAdAccountPicker(false);
    setMetaAccounts(prev => prev.map(a =>
      a.id === selectedAccountId ? { ...a, ad_account_id: adAccountId, ad_account_name: adAccountName } : a
    ));
  };

  const handleFetchGoogleCustomers = async () => {
    if (!selectedGoogleAccountId) return;
    setLoadingCustomers(true); setError(null);
    try {
      const r = await api.get(`/api/v1/ads/google/accounts/${selectedGoogleAccountId}/customers`);
      setGoogleCustomers(r.data || []);
      setShowCustomerPicker(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; hint?: string } } })?.response?.data;
      setError(msg?.hint || msg?.error || "Failed to fetch Google Ads customers");
    } finally { setLoadingCustomers(false); }
  };

  const handleLinkGoogleCustomer = async (customerId: string) => {
    try {
      await api.post(`/api/v1/ads/google/accounts/${selectedGoogleAccountId}/link-customer`, { customer_id: customerId });
      setSelectedCustomerId(customerId);
      setShowCustomerPicker(false);
      setGoogleAccounts(prev => prev.map(a =>
        a.id === selectedGoogleAccountId ? { ...a, ad_account_id: customerId, ad_account_name: `Customer ${customerId}` } : a
      ));
    } catch {
      setError("Failed to link Google Ads customer");
    }
  };

  const toggleCountry = (c: string) => {
    setCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleSubmit = async () => {
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) { setError("Enter a valid budget"); return; }
    if (!startAt || !endAt) { setError("Start and end dates are required"); return; }

    if (boostPlatform === 'meta') {
      if (!selectedAccountId)   { setError("Select a Meta account"); return; }
      if (!selectedAdAccountId) { setError("Link an ad account first"); return; }
      setSubmitting(true); setError(null);
      try {
        await api.post("/api/v1/ads/boosts", {
          boost_type:           target.type,
          publish_intent_id:    target.type === "POST" ? target.postId : undefined,
          campaign_id:          campaignId,
          connected_account_id: selectedAccountId,
          objective,
          [budgetType === "daily" ? "budget_daily" : "budget_total"]: parseFloat(budgetAmount),
          budget_currency: campaign.budget_currency || "USD",
          start_at: startAt, end_at: endAt,
          targeting: { countries, age_min: ageMin, age_max: ageMax },
        });
        onSuccess();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg || "Failed to create boost");
      } finally { setSubmitting(false); }
    } else {
      if (!selectedGoogleAccountId) { setError("Select a Google Ads account"); return; }
      const custId = selectedCustomerId || selectedGoogleAccount?.ad_account_id;
      if (!custId) { setError("Link a Google Ads customer first"); return; }
      setSubmitting(true); setError(null);
      try {
        await api.post("/api/v1/ads/google/boosts", {
          boost_type:           target.type,
          publish_intent_id:    target.type === "POST" ? target.postId : undefined,
          campaign_id:          campaignId,
          connected_account_id: selectedGoogleAccountId,
          objective,
          [budgetType === "daily" ? "budget_daily" : "budget_total"]: parseFloat(budgetAmount),
          budget_currency: campaign.budget_currency || "USD",
          start_at: startAt, end_at: endAt,
          targeting:   { countries, age_min: ageMin, age_max: ageMax },
          headline:    headline    || undefined,
          description: adDescription || undefined,
          final_url:   finalUrl    || undefined,
        });
        onSuccess();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg || "Failed to create Google Ads boost");
      } finally { setSubmitting(false); }
    }
  };

  const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-all";
  const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-white">
              {target.type === "POST" ? "Boost Post" : "Boost Campaign"}
            </h2>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-zinc-500" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Post preview */}
          {target.type === "POST" && target.postContent && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-500 mb-1">Boosting post:</p>
              <p className="text-sm text-zinc-300 line-clamp-2">{target.postContent}</p>
            </div>
          )}

          {/* Platform selector */}
          <div>
            <label className={labelCls}>Ad Platform</label>
            <div className="flex gap-2">
              {(["meta", "google"] as const).map(p => (
                <button key={p} onClick={() => { setBoostPlatform(p); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                    boostPlatform === p
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
                  }`}>
                  {p === 'meta' ? 'Meta Ads' : 'Google Ads'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Meta Ads section ── */}
          {boostPlatform === 'meta' && (
            <>
              <div>
                <label className={labelCls}>Meta Account</label>
                {metaAccounts.length === 0 ? (
                  <p className="text-xs text-rose-400 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    No connected Facebook or Instagram accounts found. Connect a Meta account first.
                  </p>
                ) : (
                  <select value={selectedAccountId}
                    onChange={e => {
                      setSelectedAccountId(e.target.value);
                      const a = metaAccounts.find(x => x.id === e.target.value);
                      setSelectedAdAccountId(a?.ad_account_id || "");
                      setShowAdAccountPicker(false);
                    }}
                    className={inputCls}>
                    <option value="">Select account…</option>
                    {metaAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name} ({a.platform})</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedAccountId && (
                <div>
                  <label className={labelCls}>Ad Account</label>
                  {selectedAccount?.ad_account_id ? (
                    <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-semibold">{selectedAccount.ad_account_name || selectedAccount.ad_account_id}</p>
                        <p className="text-[10px] text-zinc-500">{selectedAccount.ad_account_id}</p>
                      </div>
                      <button onClick={() => { setAdAccounts([]); setShowAdAccountPicker(false); handleFetchAdAccounts(); }}
                        className="text-xs text-zinc-500 hover:text-zinc-300">Change</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                        No ad account linked yet. Select one below to enable boosting.
                      </div>
                      {!showAdAccountPicker ? (
                        <button onClick={handleFetchAdAccounts} disabled={loadingAdAccounts}
                          className="flex items-center gap-2 w-full px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-40">
                          {loadingAdAccounts ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                          Fetch Ad Accounts
                        </button>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {adAccounts.length === 0 ? (
                            <p className="text-xs text-zinc-500 p-2">No ad accounts found. Make sure your Facebook token has ads_management permission.</p>
                          ) : adAccounts.map(a => (
                            <button key={a.id} onClick={() => handleLinkAdAccount(a.id, a.name)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-all text-left">
                              <div>
                                <p className="text-white font-semibold text-xs">{a.name}</p>
                                <p className="text-[10px] text-zinc-500">{a.id} · {a.currency}{a.account_status === 1 ? ' · Active' : ''}</p>
                              </div>
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Google Ads section ── */}
          {boostPlatform === 'google' && (
            <>
              <div>
                <label className={labelCls}>Google Ads Account</label>
                {googleAccounts.length === 0 ? (
                  <p className="text-xs text-amber-400 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    No Google Ads accounts connected. Go to Connected Accounts and link a Google Ads account first.
                  </p>
                ) : (
                  <select value={selectedGoogleAccountId}
                    onChange={e => {
                      setSelectedGoogleAccountId(e.target.value);
                      const a = googleAccounts.find(x => x.id === e.target.value);
                      setSelectedCustomerId(a?.ad_account_id || "");
                      setShowCustomerPicker(false);
                    }}
                    className={inputCls}>
                    <option value="">Select account…</option>
                    {googleAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedGoogleAccountId && (
                <div>
                  <label className={labelCls}>Customer Account</label>
                  {(selectedCustomerId || selectedGoogleAccount?.ad_account_id) ? (
                    <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-semibold">Customer {selectedCustomerId || selectedGoogleAccount?.ad_account_id}</p>
                        <p className="text-[10px] text-zinc-500">ID: {selectedCustomerId || selectedGoogleAccount?.ad_account_id}</p>
                      </div>
                      <button onClick={() => { setGoogleCustomers([]); setShowCustomerPicker(false); handleFetchGoogleCustomers(); }}
                        className="text-xs text-zinc-500 hover:text-zinc-300">Change</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                        No customer ID linked. Fetch your accessible Google Ads customers below.
                      </div>
                      {!showCustomerPicker ? (
                        <button onClick={handleFetchGoogleCustomers} disabled={loadingCustomers}
                          className="flex items-center gap-2 w-full px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-40">
                          {loadingCustomers ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                          Fetch Customers
                        </button>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {googleCustomers.length === 0 ? (
                            <p className="text-xs text-zinc-500 p-2">No accessible customers found. Check your Google Ads permissions.</p>
                          ) : googleCustomers.map(c => (
                            <button key={c.id} onClick={() => handleLinkGoogleCustomer(c.id)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-all text-left">
                              <p className="text-white font-semibold text-xs">Customer {c.id}</p>
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Google creative fields */}
              <div>
                <label className={labelCls}>Ad Headline <span className="normal-case text-zinc-600 font-normal">(optional, max 30 chars)</span></label>
                <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
                  maxLength={30} className={inputCls} placeholder="Discover More" />
              </div>
              <div>
                <label className={labelCls}>Ad Description <span className="normal-case text-zinc-600 font-normal">(optional, max 90 chars)</span></label>
                <input type="text" value={adDescription} onChange={e => setAdDescription(e.target.value)}
                  maxLength={90} className={inputCls} placeholder="Amplified by ZoikoVertex" />
              </div>
              <div>
                <label className={labelCls}>Landing Page URL <span className="normal-case text-zinc-600 font-normal">(optional)</span></label>
                <input type="url" value={finalUrl} onChange={e => setFinalUrl(e.target.value)}
                  className={inputCls} placeholder="https://…" />
              </div>
            </>
          )}

          {/* Objective */}
          <div>
            <label className={labelCls}>Objective</label>
            <select value={objective} onChange={e => setObjective(e.target.value)} className={inputCls}>
              {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className={labelCls}>Budget</label>
            <div className="flex gap-2 mb-2">
              {(["daily", "total"] as const).map(t => (
                <button key={t} onClick={() => setBudgetType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    budgetType === t ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 text-zinc-500"
                  }`}>
                  {t === "daily" ? "Daily" : "Total"}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">
                {campaign.budget_currency || "USD"}
              </span>
              <input type="number" min="1" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)}
                className={`${inputCls} pl-12`} placeholder="0.00" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" value={endAt} onChange={e => setEndAt(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className={labelCls}>Target Countries</label>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRY_LIST.map(c => (
                <button key={c} type="button" onClick={() => toggleCountry(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    countries.includes(c)
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-500 hover:border-zinc-600"
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          {/* Age range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Age</label>
              <input type="number" min="13" max="65" value={ageMin}
                onChange={e => setAgeMin(parseInt(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Age</label>
              <input type="number" min="13" max="65" value={ageMax}
                onChange={e => setAgeMax(parseInt(e.target.value))} className={inputCls} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {submitting ? "Creating Boost…" : "Launch Boost"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-1">
      <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-800/40 last:border-0">
      <span className="text-xs text-zinc-500 font-semibold shrink-0 w-40">{label}</span>
      <span className="text-xs text-zinc-300 text-right leading-relaxed">{value}</span>
    </div>
  );
}

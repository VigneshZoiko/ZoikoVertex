"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2, AlertCircle, MoreHorizontal, Trash2,
  ExternalLink, RefreshCw, ChevronRight, TrendingUp, Users, DollarSign, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import ConfirmActionModal from "@/components/ConfirmActionModal";

// ── Types ──────────────────────────────────────────────────────

interface MetaVerifyCheck {
  field: string;
  intended: string | null;
  on_meta: string | null;
  match: boolean;
}

interface MetaVerifyResult {
  meta_ids: { campaign_id: string; adset_id: string; ad_id: string; creative_id: string };
  live_on_meta: {
    campaign: { id: string; name: string; objective: string; status: string; error: string | null };
    ad_set: { daily_budget: string | null; start_time: string | null; end_time: string | null; error: string | null } | null;
    creative: { headline: string | null; body_text: string | null; landing_url: string | null; thumbnail: string | null; error: string | null } | null;
    ad: { id: string; status: string; error: string | null } | null;
  };
  checks: MetaVerifyCheck[];
  summary: { total: number; passed: number; failed: number };
  error?: string;
}

interface Campaign {
  id: string; name: string; status: string; objective: string;
  campaign_type: string; platforms: string[];
  budget_total?: number | null; budget_daily?: number | null;
  budget_currency?: string; spend_recorded?: number;
  start_at?: string | null; end_at?: string | null;
  targeting?: Record<string, unknown>; creative?: Record<string, unknown>;
  wizard_step?: number; created_at: string; created_by?: string;
  selected_meta_account_id?: string | null;
  meta_account_name?: string | null;
  meta_ad_account_name?: string | null;
  meta_campaign_id?: string | null;
  meta_adset_id?: string | null;
  meta_ad_id?: string | null;
  meta_error?: string | null;
}

interface Boost {
  id: string; status: string; boost_type: string; platform: string;
  impressions: number; reach: number; clicks: number; spend_recorded: number;
  budget_daily?: number; budget_total?: number; budget_currency?: string;
  ad_image_url?: string; ad_headline?: string; ad_body?: string;
  created_at: string; meta_campaign_id?: string; meta_ad_id?: string | null;
}

interface InsightConversions {
  purchases: number; leads: number; add_to_cart: number;
  checkout: number; registrations: number; video_views: number; post_engagements: number;
  cost_per_purchase: number | null; cost_per_lead: number | null; cost_per_add_to_cart: number | null;
}

interface Insights {
  totals: { impressions: number; reach: number; clicks: number; spend: number };
  kpis:   {
    ctr: number; cpm: number; cpc: number; roas: number | null; cpp: number | null;
    frequency?: number | null;
    unique_clicks?: number | null;
    cost_per_unique_click?: number | null;
    outbound_clicks?: number | null;
    website_ctr?: number | null;
    conversions?: InsightConversions | null;
    quality_ranking?: string | null;
    engagement_rate_ranking?: string | null;
    conversion_rate_ranking?: string | null;
  };
  budget: { total: number | null; currency: string; spend: number; utilization_pct: number | null };
  kpi_targets?: { reach?: number | null; engagement?: number | null; conversions?: number | null } | null;
  boosts_count: number;
}

interface BreakdownRow {
  age?: string; gender?: string;
  publisher_platform?: string; impression_device?: string; platform_position?: string;
  impressions: number; reach: number; clicks: number; spend: number;
  ctr?: number; cpc?: number; frequency?: number;
}

interface Breakdown {
  by_age_gender: BreakdownRow[];
  by_placement:  BreakdownRow[];
  by_position?:  BreakdownRow[];
}

interface TrendDay {
  date: string;
  spend: number; impressions: number; clicks: number;
  reach: number; ctr: number; cpm: number; cpc: number;
}

interface AdInsight {
  meta_ad_id: string; ad_name: string;
  impressions: number; reach: number; clicks: number; spend: number;
  cpm: number; cpc: number; ctr: number;
  frequency: number; unique_clicks: number; cost_per_unique_click: number;
  outbound_clicks?: number;
  purchases?: number; leads?: number; add_to_cart?: number; video_views?: number;
  cost_per_purchase?: number | null; cost_per_lead?: number | null;
}

// ── Helpers ────────────────────────────────────────────────────

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }) : "--";

const dur = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
  return `${days} day${days !== 1 ? "s" : ""}`;
};

const isActive = (s: string) => ["ACTIVE", "SCHEDULED"].includes(s);

// ── Page ───────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string };
  const router  = useRouter();

  const [campaign,  setCampaign]  = useState<Campaign | null>(null);
  const [boosts,    setBoosts]    = useState<Boost[]>([]);
  const [insights,  setInsights]  = useState<Insights | null>(null);
  const [tab,       setTab]       = useState<"overview" | "adset" | "ads" | "audience">("overview");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [menu,      setMenu]      = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [verifying,     setVerifying]    = useState(false);
  const [verify,        setVerify]       = useState<MetaVerifyResult | null>(null);
  const [togglingBoost, setTogglingBoost] = useState<string | null>(null);
  const [breakdown,     setBreakdown]    = useState<Breakdown | null>(null);
  const [trendData,     setTrendData]    = useState<TrendDay[]>([]);
  const [adInsights,    setAdInsights]   = useState<AdInsight[]>([]);
  const [budgetSyncing, setBudgetSyncing] = useState(false);
  const [budgetMsg,     setBudgetMsg]    = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cRes, bRes, iRes, bdRes, trendRes, adsInsRes] = await Promise.allSettled([
        api.get(`/api/v1/campaigns/${id}`),
        api.get(`/api/v1/ads/boosts?campaign_id=${id}`),
        api.get(`/api/v1/campaigns/${id}/insights`),
        api.get(`/api/v1/campaigns/${id}/insights/breakdown`),
        api.get(`/api/v1/campaigns/${id}/insights/trend`),
        api.get(`/api/v1/campaigns/${id}/insights/ads`),
      ]);
      if (cRes.status === "fulfilled" && cRes.value?.success !== false) {
        setCampaign(cRes.value.data);
      } else if (cRes.status === "fulfilled" && cRes.value?.success === false) {
        setError(cRes.value.error || 'Campaign not found');
      }
      let fetchedBoosts = bRes.status === "fulfilled" ? (bRes.value.data || []) : [];
      if (cRes.status === "fulfilled" && cRes.value?.success !== false && cRes.value?.data?.ads_data && Array.isArray(cRes.value.data.ads_data)) {
        cRes.value.data.ads_data.forEach((ad: any, i: number) => {
          fetchedBoosts.push({
            id: `virtual-ad-${i}`,
            status: cRes.value.data.status,
            ad_image_url: ad.ad_image_url,
            ad_headline: ad.headline,
            ad_body: ad.copy,
            boost_type: ad.ad_type || 'IMAGE_AD',
            spend_recorded: 0,
            clicks: 0,
            impressions: 0,
            budget_daily: 0,
            budget_total: 0
          });
        });
      }
      setBoosts(fetchedBoosts);
      if (iRes.status === "fulfilled") setInsights(iRes.value.data);
      if (bdRes.status === "fulfilled" && bdRes.value?.success !== false) setBreakdown(bdRes.value.data);
      if (trendRes.status === "fulfilled" && trendRes.value?.success !== false) setTrendData(trendRes.value.data?.by_day || []);
      if (adsInsRes.status === "fulfilled" && adsInsRes.value?.success !== false) setAdInsights(adsInsRes.value.data?.ads || []);
    } catch { setError("Failed to load campaign"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => {
    if (!campaign || toggling) return;
    const pausing = isActive(campaign.status);
    setToggling(true);
    try {
      const r = await api.post(
        `/api/v1/campaigns/${id}/${pausing ? "pause" : "resume"}`,
        pausing ? { reason: "Paused by operator" } : { reason: "Resumed by operator" },
      );
      if (r.success) {
        // Use returned data if available, otherwise optimistic update
        if (r.data?.status) {
          setCampaign(prev => prev ? { ...prev, status: r.data.status } : prev);
        } else {
          setCampaign(prev => prev ? { ...prev, status: pausing ? "PAUSED" : "ACTIVE" } : prev);
        }
      } else {
        // Status mismatch — reload from server to sync
        load();
      }
    } catch { load(); }
    finally { setToggling(false); }
  };

  const handleDelete = async () => {
    setConfirmDelete(true);
  };

  const confirmDeleteCampaign = async () => {
    try {
      await api.delete(`/api/v1/campaigns/${id}`);
      router.push("/campaigns");
    } catch { /* silent */ }
    finally { setConfirmDelete(false); }
  };

  const handleBoostToggle = async (b: Boost) => {
    if (b.id.startsWith('virtual-ad-') || togglingBoost) return;
    const pausing = isActive(b.status);
    setTogglingBoost(b.id);
    try {
      const r = await api.post(
        `/api/v1/ads/boosts/${b.id}/${pausing ? 'pause' : 'resume'}`,
        {}
      );
      if (r.success) {
        setBoosts(prev => prev.map(x => x.id === b.id ? { ...x, status: pausing ? 'PAUSED' : 'ACTIVE' } : x));
      }
    } catch { /* silent */ }
    finally { setTogglingBoost(null); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-foreground-muted" />
      <p className="text-foreground-muted text-sm">Loading campaign...</p>
    </div>
  );

  if (error || !campaign) return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
      <AlertCircle className="w-8 h-8 text-foreground-muted" />
      <p className="text-foreground-muted text-sm">{error || "Campaign not found"}</p>
      <button onClick={() => router.push("/campaigns")} className="text-xs text-foreground-muted hover:text-white underline">
        Back to campaigns
      </button>
    </div>
  );

  const spend     = insights?.totals.spend     ?? campaign.spend_recorded ?? 0;
  const impr      = insights?.totals.impressions ?? 0;
  const reach     = insights?.totals.reach       ?? 0;
  const clicks    = insights?.totals.clicks      ?? 0;
  const ctr       = insights?.kpis.ctr           ?? 0;
  const cpm       = insights?.kpis.cpm           ?? 0;
  const cpc       = insights?.kpis.cpc           ?? 0;
  const roas      = insights?.kpis.roas                    ?? null;
  const cpp       = insights?.kpis.cpp                     ?? null;
  const freq      = insights?.kpis.frequency               ?? null;
  const uniqueClicks = insights?.kpis.unique_clicks        ?? null;
  const cpuc      = insights?.kpis.cost_per_unique_click   ?? null;
  const outboundClicks = insights?.kpis.outbound_clicks    ?? null;
  const websiteCtr     = insights?.kpis.website_ctr        ?? null;
  const conversions    = insights?.kpis.conversions        ?? null;
  const hasConversions = conversions != null && (
    conversions.purchases > 0 || conversions.leads > 0 ||
    conversions.add_to_cart > 0 || conversions.checkout > 0 ||
    conversions.registrations > 0 || conversions.video_views > 0 ||
    conversions.post_engagements > 0
  );
  const budget    = campaign.budget_total         ?? 0;
  const currency  = campaign.budget_currency      ?? "USD";
  const spendPct  = budget > 0 ? Math.round((spend / budget) * 100) : 0;
  const targeting = (campaign.targeting || {}) as Record<string, unknown>;
  const creative  = (campaign.creative  || {}) as Record<string, unknown>;

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-3 border-b border-border/60 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => router.back()} className="p-1.5 text-foreground-muted hover:text-foreground-muted hover:bg-surface-hover rounded-lg transition-colors mr-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <Link href="/campaigns" className="text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-medium">
            <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            All ad campaigns
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
          <span className="text-foreground font-semibold truncate max-w-xs">{campaign.name}</span>
        </div>

        {/* Right: toggle + status + menu */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Toggle */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling || ["DRAFT","COMPLETED","CANCELLED"].includes(campaign.status)}
              className={`relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive(campaign.status) ? "bg-[#1877F2]" : "bg-surface-hover"
              }`}
              style={{ width: 36, height: 20 }}
            >
              {toggling ? (
                <Loader2 className="w-3 h-3 text-foreground animate-spin absolute top-[3.5px] left-[10px]" />
              ) : (
                <span style={{
                  position: "absolute", top: 3, width: 14, height: 14,
                  borderRadius: "50%", background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  transition: "transform 200ms",
                  transform: isActive(campaign.status) ? "translateX(19px)" : "translateX(3px)",
                }} />
              )}
            </button>
            <span className={`text-sm font-semibold ${isActive(campaign.status) ? "text-foreground" : "text-foreground-muted"}`}>
              {campaign.status === "PAUSING" ? "Pausing..." :
               campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
            </span>
          </div>

          {campaign.status === "COMPLETED" && (
            <span className="text-xs text-success-text flex items-center gap-1">
              <span className="w-3 h-3 text-success-text">✓</span> Completed
            </span>
          )}

          <button onClick={load} className="p-1.5 text-foreground-muted hover:text-foreground-muted rounded-lg hover:bg-surface-hover transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Three-dot menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu(m => !m)}
              className="w-8 h-8 rounded-full bg-surface-hover hover:bg-surface-hover flex items-center justify-center text-foreground-muted hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-50 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => { handleDelete(); setMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-error-text hover:bg-surface transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete campaign
                </button>
                {campaign.meta_campaign_id && (
                  <>
                    <div className="border-t border-border" />
                    <a
                      href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${campaign.meta_campaign_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenu(false)}
                      className="flex items-start gap-2.5 px-4 py-3 hover:bg-surface transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-foreground-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-foreground-muted">View on Facebook</p>
                        <p className="text-[11px] text-foreground-muted mt-0.5">You&apos;ll need access to the ad account.</p>
                      </div>
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-border/60 px-6">
        {(["overview", "adset", "ads", "audience"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all capitalize ${
              tab === t ? "border-zinc-300 text-foreground" : "border-transparent text-foreground-muted hover:text-foreground-muted"
            }`}>
            {t === "ads" ? `Ads (${boosts.length})` : t === "adset" ? "Ad Set" : t === "audience" ? "Audience" : "Overview"}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* ════ OVERVIEW ════ */}
        {tab === "overview" && (
          <div className="space-y-8 max-w-5xl">

            {/* Meta sync error banner */}
            {campaign.meta_error && (
              <div className="flex items-start gap-3 p-4 bg-error-text/10 border border-error-border/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-error-text mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-error-text">Meta sync error</p>
                  <p className="text-[12px] text-error-text mt-0.5">{campaign.meta_error}</p>
                </div>
              </div>
            )}

            {/* Campaign details */}
            <section>
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Campaign details</p>
              <div className="grid grid-cols-3 gap-x-12 gap-y-6">

                {/* AD ACCOUNT */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Ad Account</p>
                  <p className="text-sm text-foreground-muted font-medium">
                    {campaign.meta_account_name || "—"}
                  </p>
                  {campaign.meta_ad_account_name && (
                    <p className="text-[11px] text-foreground-muted mt-0.5 font-mono">{campaign.meta_ad_account_name}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-success-text mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-text inline-block" />Active
                  </span>
                </div>

                {/* OBJECTIVE */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Objective</p>
                  <p className="text-sm text-foreground-muted font-medium capitalize">
                    Main objective: {campaign.objective?.toLowerCase().replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    Type: {campaign.campaign_type?.replace(/_/g, " ")}
                  </p>
                </div>

                {/* DURATION */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Duration</p>
                  {campaign.status === "COMPLETED" ? (
                    <p className="text-sm text-foreground-muted">Campaign ended.{dur(campaign.start_at, campaign.end_at) ? ` It ran for ${dur(campaign.start_at, campaign.end_at)}.` : ""}</p>
                  ) : (
                    <p className="text-sm text-foreground-muted">{dur(campaign.start_at, campaign.end_at) ? `Running for ${dur(campaign.start_at, campaign.end_at)}` : "No end date set"}</p>
                  )}
                </div>

                {/* DATES */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Dates</p>
                  <p className="text-sm text-foreground-muted">
                    <span className="text-foreground-muted text-[11px]">Start: </span>{fmt(campaign.start_at)}
                  </p>
                  <p className="text-sm text-foreground-muted mt-0.5">
                    <span className="text-foreground-muted text-[11px]">End: </span>{fmt(campaign.end_at)}
                  </p>
                </div>

                {/* BUDGET */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Budget</p>
                  {(campaign.budget_total || campaign.budget_daily) ? (
                    <>
                      {campaign.budget_daily && <p className="text-sm text-foreground-muted font-medium">{currency}{campaign.budget_daily.toLocaleString()} / day</p>}
                      {campaign.budget_total && !campaign.budget_daily && <p className="text-sm text-foreground-muted font-medium">{currency}{campaign.budget_total.toLocaleString()} total</p>}
                    </>
                  ) : <p className="text-sm text-foreground-muted">Not set</p>}
                </div>

                {/* AMOUNT SPENT */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Amount Spent</p>
                  <p className="text-sm text-foreground-muted font-medium">${spend.toFixed(2)}</p>
                  {budget > 0 && (
                    <div className="mt-1.5">
                      <div className="w-32 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${spendPct >= 90 ? "bg-warning-text" : "bg-zinc-400"}`}
                          style={{ width: `${Math.min(100, spendPct)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-foreground-muted mt-0.5">{spendPct}% of budget (estimated)</p>
                    </div>
                  )}
                </div>

                {/* CAMPAIGN CREATED IN */}
                <div>
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Campaign Created In</p>
                  <p className="text-sm text-foreground-muted">ZoikoVertex</p>
                  {campaign.created_at && (
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      on {new Date(campaign.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* KPI Targets vs Actual */}
            {insights?.kpi_targets && (() => {
              const t = insights.kpi_targets!;
              const targets = [
                { label: "Reach Target",       target: t.reach,       actual: reach,  unit: "" },
                { label: "Engagement Target",   target: t.engagement,  actual: clicks, unit: " clicks" },
                { label: "Conversion Target",   target: t.conversions, actual: (conversions?.purchases ?? 0) + (conversions?.leads ?? 0), unit: "" },
              ].filter(x => x.target != null && x.target > 0);
              if (targets.length === 0) return null;
              return (
                <>
                  <div className="border-t border-border/60" />
                  <section>
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Campaign Targets</p>
                    <div className="grid grid-cols-3 gap-6">
                      {targets.map(({ label, target, actual, unit }) => {
                        const pct = target! > 0 ? Math.min(100, Math.round((actual / target!) * 100)) : 0;
                        const color = pct >= 100 ? "bg-success-text" : pct >= 50 ? "bg-blue-500" : "bg-zinc-500";
                        return (
                          <div key={label}>
                            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-2">{label}</p>
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-lg font-bold text-foreground">{actual.toLocaleString()}{unit}</span>
                              <span className="text-xs text-foreground-muted">/ {target!.toLocaleString()} target</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-foreground-muted mt-1">{pct}% of target</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              );
            })()}

            <div className="border-t border-border/60" />

            {/* Performance */}
            <section>
              <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Performance</p>
              <div className="grid grid-cols-5 gap-6">
                {[
                  { label: "MAIN RESULT",           value: clicks > 0 ? clicks.toLocaleString() : (impr > 0 ? impr.toLocaleString() : "0"), sub: "Link clicks" },
                  { label: "COST PER MAIN RESULT",  value: clicks > 0 && spend > 0 ? `$${(spend / clicks).toFixed(2)}` : "--", sub: "per link click" },
                  { label: "CTR",                   value: ctr > 0 ? `${ctr.toFixed(2)}%` : "--", sub: "" },
                  { label: "IMPRESSIONS",           value: impr > 0 ? impr.toLocaleString() : "--", sub: "" },
                  { label: "REACH",                 value: reach > 0 ? reach.toLocaleString() : "--", sub: "" },
                ].map(({ label, value, sub }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {sub && <p className="text-[11px] text-foreground-muted mt-0.5">{sub}</p>}
                  </div>
                ))}
              </div>
              {insights && (
                <div className="grid grid-cols-5 gap-6 mt-6 pt-4 border-t border-border/40">
                  {[
                    { label: "CPM",         value: cpm > 0 ? `$${cpm.toFixed(2)}` : "--",                          sub: "Cost per 1,000 impressions" },
                    { label: "CPC",         value: cpc > 0 ? `$${cpc.toFixed(2)}` : "--",                          sub: "Cost per link click" },
                    { label: "ROAS",        value: roas != null ? `${Number(roas).toFixed(2)}x` : "N/A",           sub: roas != null ? "Purchase return on ad spend" : "Requires pixel purchase data" },
                    { label: "CPP",         value: cpp  != null ? `$${Number(cpp).toFixed(2)}`  : "N/A",           sub: cpp  != null ? "Cost per purchase" : "Requires pixel purchase data" },
                    { label: "TOTAL SPEND", value: `$${spend.toFixed(2)}`,                                         sub: "All time" },
                  ].map(({ label, value, sub }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">{label}</p>
                      <p className={`text-lg font-semibold ${value === "--" || value === "N/A" ? "text-foreground-muted" : "text-foreground-muted"}`}>{value}</p>
                      {sub && <p className="text-[10px] text-foreground-muted/60 mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(freq != null || uniqueClicks != null) && (
                <div className="grid grid-cols-4 gap-6 mt-4 pt-4 border-t border-border/40">
                  {[
                    { label: "FREQUENCY",         value: freq != null ? Number(freq).toFixed(2) : "--",           sub: "Avg times one person saw this ad" },
                    { label: "UNIQUE CLICKS",      value: uniqueClicks != null ? Number(uniqueClicks).toLocaleString() : "--", sub: "Distinct people who clicked" },
                    { label: "COST / UNIQUE CLICK",value: cpuc != null ? `$${Number(cpuc).toFixed(2)}` : "--",    sub: "Per unique clicking user" },
                    { label: "TOTAL SPEND",        value: `$${spend.toFixed(2)}`,                                 sub: "All time" },
                  ].map(({ label, value, sub }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-lg font-semibold text-foreground-muted">{value}</p>
                      {sub && <p className="text-[10px] text-foreground-muted mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(outboundClicks != null || websiteCtr != null) && (
                <div className="grid grid-cols-4 gap-6 mt-4 pt-4 border-t border-border/40">
                  {[
                    { label: "OUTBOUND CLICKS",  value: outboundClicks != null ? Number(outboundClicks).toLocaleString() : "--", sub: "Clicks to external websites" },
                    { label: "LANDING PAGE CTR", value: websiteCtr != null ? `${Number(websiteCtr).toFixed(2)}%` : "--",         sub: "Website click-through rate" },
                  ].map(({ label, value, sub }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-lg font-semibold text-foreground-muted">{value}</p>
                      {sub && <p className="text-[10px] text-foreground-muted mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quality Signals */}
            {(() => {
              const signals = [
                { label: "Quality Ranking",         value: insights?.kpis.quality_ranking },
                { label: "Engagement Rate Ranking", value: insights?.kpis.engagement_rate_ranking },
                { label: "Conversion Rate Ranking", value: insights?.kpis.conversion_rate_ranking },
              ].filter(s => s.value && s.value !== "UNKNOWN");
              if (!insights) return null;
              return (
                <>
                  <div className="border-t border-border/60" />
                  <section>
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-3">Quality Signals</p>
                    {signals.length === 0 ? (
                      <p className="text-xs text-foreground-muted">
                        Not enough data yet — Meta calculates quality rankings after ~500 impressions. Rankings will appear once this campaign gets more delivery.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {signals.map(signal => {
                          const rank = (signal.value ?? "").toUpperCase();
                          const isAbove = rank.includes("ABOVE");
                          const isBelow = rank.includes("BELOW");
                          const color = isAbove
                            ? "text-success-text border-success-text/30 bg-success-text/10"
                            : isBelow
                            ? "text-error-text border-error-text/30 bg-error-text/10"
                            : "text-warning-text border-warning-text/30 bg-warning-text/10";
                          const icon  = isAbove ? "↑" : isBelow ? "↓" : "→";
                          const friendlyValue = rank
                            .replace("ABOVE_AVERAGE", "Above Average")
                            .replace("BELOW_AVERAGE", "Below Average")
                            .replace(/^AVERAGE$/, "Average");
                          return (
                            <div key={signal.label} className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-xl text-xs ${color}`}>
                              <span className="text-base font-bold leading-none">{icon}</span>
                              <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-0.5">{signal.label}</p>
                                <p className="font-semibold">{friendlyValue}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              );
            })()}

            {/* Conversions from Meta Pixel */}
            {hasConversions && conversions && (
              <>
                <div className="border-t border-border/60" />
                <section>
                  <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Conversions (Meta Pixel)</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Purchases",          count: conversions.purchases,      cost: conversions.cost_per_purchase,    icon: "🛒" },
                      { label: "Leads",              count: conversions.leads,           cost: conversions.cost_per_lead,        icon: "📋" },
                      { label: "Add to Cart",        count: conversions.add_to_cart,     cost: conversions.cost_per_add_to_cart, icon: "🛍️" },
                      { label: "Checkout Initiated", count: conversions.checkout,        cost: null,                             icon: "💳" },
                      { label: "Registrations",      count: conversions.registrations,   cost: null,                             icon: "📝" },
                      { label: "Video Views",        count: conversions.video_views,     cost: null,                             icon: "▶️" },
                      { label: "Post Engagements",   count: conversions.post_engagements, cost: null,                            icon: "❤️" },
                    ].filter(c => c.count > 0).map(c => (
                      <div key={c.label} className="p-4 bg-surface border border-border rounded-xl flex items-start gap-3">
                        <span className="text-xl leading-none mt-0.5">{c.icon}</span>
                        <div>
                          <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-0.5">{c.label}</p>
                          <p className="text-xl font-bold text-foreground">{c.count.toLocaleString()}</p>
                          {c.cost != null && c.cost > 0 && (
                            <p className="text-[11px] text-foreground-muted mt-0.5">${c.cost.toFixed(2)} / result</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Daily Trend Chart */}
            {trendData.length > 1 && (() => {
              const W = 600, H = 100, PAD = 8;
              const xStep = (W - PAD * 2) / (trendData.length - 1);
              const maxSpend = Math.max(...trendData.map(d => d.spend), 0.001);
              const maxImpr  = Math.max(...trendData.map(d => d.impressions), 1);

              const toPoints = (vals: number[], max: number) =>
                vals.map((v, i) => ({
                  x: PAD + i * xStep,
                  y: H - PAD - ((v / max) * (H - PAD * 2)),
                }));

              const toPath = (pts: { x: number; y: number }[]) =>
                pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

              const toArea = (pts: { x: number; y: number }[]) =>
                `${toPath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

              const maxClicks = Math.max(...trendData.map(d => d.clicks), 1);
              const maxReach  = Math.max(...trendData.map(d => d.reach), 1);

              const spendPts  = toPoints(trendData.map(d => d.spend),       maxSpend);
              const imprPts   = toPoints(trendData.map(d => d.impressions),  maxImpr);
              const clicksPts = toPoints(trendData.map(d => d.clicks),       maxClicks);
              const reachPts  = toPoints(trendData.map(d => d.reach),        maxReach);

              const n = trendData.length;
              const firstDate = trendData[0].date.substring(5);
              const midDate   = trendData[Math.floor(n / 2)].date.substring(5);
              const lastDate  = trendData[n - 1].date.substring(5);

              const totalSpend  = trendData.reduce((s, d) => s + d.spend, 0);
              const totalImpr   = trendData.reduce((s, d) => s + d.impressions, 0);
              const totalClicks = trendData.reduce((s, d) => s + d.clicks, 0);
              const totalReach  = trendData.reduce((s, d) => s + d.reach, 0);

              const ChartCard = ({
                title, total, color, gradId, gradColor, pts
              }: {
                title: string; total: string; color: string; gradId: string;
                gradColor: string; pts: { x: number; y: number }[];
              }) => (
                <div className="border border-border rounded-xl p-4 bg-surface">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">{title}</p>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                  </div>
                  <p className="text-lg font-bold text-foreground mb-2">{total}</p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={gradColor} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={gradColor} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0.25, 0.5, 0.75].map(f => (
                      <line key={f}
                        x1={PAD} y1={PAD + (1 - f) * (H - PAD * 2)}
                        x2={W - PAD} y2={PAD + (1 - f) * (H - PAD * 2)}
                        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    ))}
                    <path d={toArea(pts)} fill={`url(#${gradId})`} />
                    <path d={toPath(pts)} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <div className="flex justify-between text-[9px] text-foreground-muted mt-1">
                    <span>{firstDate}</span><span>{midDate}</span><span>{lastDate}</span>
                  </div>
                </div>
              );

              return (
                <>
                  <div className="border-t border-border/60" />
                  <section>
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">
                      Performance Trend <span className="font-normal normal-case text-[10px] ml-1">({n} days · all-time)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <ChartCard
                        title="Daily Spend"
                        total={`$${totalSpend.toFixed(2)} total`}
                        color="rgb(96,165,250)"
                        gradId="spendGrad"
                        gradColor="rgb(96,165,250)"
                        pts={spendPts}
                      />
                      <ChartCard
                        title="Daily Impressions"
                        total={totalImpr.toLocaleString() + " total"}
                        color="rgb(52,211,153)"
                        gradId="imprGrad"
                        gradColor="rgb(52,211,153)"
                        pts={imprPts}
                      />
                      {totalClicks > 0 && (
                        <ChartCard
                          title="Daily Clicks"
                          total={totalClicks.toLocaleString() + " total"}
                          color="rgb(251,191,36)"
                          gradId="clicksGrad"
                          gradColor="rgb(251,191,36)"
                          pts={clicksPts}
                        />
                      )}
                      {totalReach > 0 && (
                        <ChartCard
                          title="Daily Reach"
                          total={totalReach.toLocaleString() + " unique"}
                          color="rgb(167,139,250)"
                          gradId="reachGrad"
                          gradColor="rgb(167,139,250)"
                          pts={reachPts}
                        />
                      )}
                    </div>
                  </section>
                </>
              );
            })()}

            {/* Placements — from creative/targeting */}
            {(campaign.platforms?.length > 0 || !!(targeting?.geography)) && (
              <>
                <div className="border-t border-border/60" />
                <section>
                  <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Placements</p>
                  <div className="space-y-3">
                    {campaign.platforms?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-foreground-muted w-36 shrink-0 pt-0.5">Publisher platforms:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {campaign.platforms.map(p => (
                            <span key={p} className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-foreground-muted">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(targeting?.geography as any[])?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-foreground-muted w-36 shrink-0 pt-0.5">Locations:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(targeting.geography as any[]).map((g: any, i: number) => {
                            const label = typeof g === "object" ? (g.display_name || g.key || JSON.stringify(g)) : String(g);
                            return (
                              <span key={i} className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-foreground-muted">{label}</span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Audience — from targeting */}
            {Object.keys(targeting).length > 0 && (
              <>
                <div className="border-t border-border/60" />
                <section>
                  <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Audience</p>
                  <div className="space-y-3">
                    {(targeting.age_min != null || targeting.age_max != null) && (
                      <div className="flex items-center gap-6">
                        <p className="text-xs text-foreground-muted w-36 shrink-0">Age:</p>
                        <p className="text-sm text-foreground-muted">{String(targeting.age_min ?? 18)}–{String(targeting.age_max ?? 65)}</p>
                      </div>
                    )}
                    {!!targeting.gender && String(targeting.gender) !== "ALL" && (
                      <div className="flex items-center gap-6">
                        <p className="text-xs text-foreground-muted w-36 shrink-0">Gender:</p>
                        <p className="text-sm text-foreground-muted capitalize">{String(targeting.gender)}</p>
                      </div>
                    )}
                    {(targeting.interests as any[])?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-foreground-muted w-36 shrink-0 pt-0.5">Interests:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(targeting.interests as any[]).map((t: any, i: number) => {
                            const label = typeof t === "object" ? (t.name || t.id || JSON.stringify(t)) : String(t);
                            return (
                              <span key={i} className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-foreground-muted">{label}</span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(targeting.keywords as string[])?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-foreground-muted w-36 shrink-0 pt-0.5">Keywords:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(targeting.keywords as string[]).map((k: string) => (
                            <span key={k} className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-foreground-muted">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* ── Meta Verification Panel ── */}
            {campaign.meta_campaign_id && (
              <div className="border-t border-border/60 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest">Meta Verification</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">Confirm every field actually reached Meta correctly.</p>
                  </div>
                  <button
                    onClick={async () => {
                      setVerifying(true); setVerify(null);
                      const r = await api.get(`/api/v1/campaigns/${id}/meta-verify`);
                      setVerify(r.success ? r.data : { error: r.error || "Unknown error" });
                      setVerifying(false);
                    }}
                    disabled={verifying}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-hover hover:bg-surface-hover border border-border text-foreground-muted text-xs font-semibold rounded-xl transition-all disabled:opacity-50">
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {verifying ? "Fetching from Meta…" : "Verify on Meta"}
                  </button>
                </div>

                {verify && !verify.error && (
                  <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-surface border border-border rounded-xl">
                      <span className="text-xs font-bold text-success-text">{verify.summary.passed} / {verify.summary.total} fields confirmed</span>
                      {verify.summary.failed > 0 && <span className="text-xs font-bold text-error-text">{verify.summary.failed} mismatch{verify.summary.failed > 1 ? "es" : ""}</span>}
                      <span className="ml-auto text-[10px] text-foreground-muted">Campaign: {verify.meta_ids.campaign_id} · Ad Set: {verify.meta_ids.adset_id}</span>
                    </div>

                    {/* Field-by-field table */}
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-card">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-foreground-muted uppercase tracking-widest w-40">Field</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Sent from Vertex</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Live on Meta</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-foreground-muted uppercase tracking-widest w-16">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {verify.checks.map((c: MetaVerifyCheck) => (
                            <tr key={c.field} className={c.match ? "" : "bg-error-text/5"}>
                              <td className="px-4 py-2.5 text-foreground-muted font-medium">{c.field}</td>
                              <td className="px-4 py-2.5 text-foreground-muted font-mono text-[11px] max-w-xs truncate">{c.intended ?? "—"}</td>
                              <td className="px-4 py-2.5 text-foreground-muted font-mono text-[11px] max-w-xs truncate">{c.on_meta ?? <span className="text-foreground-muted">not found</span>}</td>
                              <td className="px-4 py-2.5 text-center">
                                {c.match
                                  ? <span className="text-success-text text-sm">✓</span>
                                  : <span className="text-error-text text-sm">✗</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Creative preview */}
                    {verify.live_on_meta.creative?.thumbnail && (
                      <div className="flex items-start gap-4 p-4 bg-surface border border-border rounded-xl">
                        <Image src={verify.live_on_meta.creative.thumbnail} alt="Ad thumbnail from Meta" width={96} height={64} className="w-24 h-16 object-cover rounded-lg border border-border shrink-0" unoptimized />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground-muted mb-1">Ad thumbnail from Meta</p>
                          <p className="text-sm text-foreground font-semibold truncate">{verify.live_on_meta.creative.headline ?? "—"}</p>
                          <p className="text-[11px] text-foreground-muted mt-0.5 line-clamp-2">{verify.live_on_meta.creative.body_text ?? "—"}</p>
                          {verify.live_on_meta.creative.landing_url && (
                            <a href={verify.live_on_meta.creative.landing_url} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] text-blue-400 hover:underline mt-1 block truncate">
                              {verify.live_on_meta.creative.landing_url}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {verify?.error && (
                  <p className="text-sm text-error-text bg-error-text/10 border border-error-border/20 rounded-xl px-4 py-3">{verify.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ AD SET ════ */}
        {tab === "adset" && (() => {
          const metaAdsetId = campaign.meta_adset_id || null;
          const metaCampaignId = campaign.meta_campaign_id || null;
          const obj = (campaign.objective || "").toUpperCase().replace(/ /g, "_");
          const rawOptimize = (campaign as any).boost_settings?.optimize || "";
          const optimizeLabelMap: Record<string, string> = {
            LANDING_PAGE_VIEWS: "Landing Page Views",
            LINK_CLICKS: "Link Clicks",
            REACH: "Reach",
            POST_ENGAGEMENT: "Post Engagement",
            THRUPLAY: "ThruPlay (Video)",
            TWO_SECOND_VIDEO_VIEWS: "2-Second Video Views",
            OFFSITE_CONVERSIONS: "Offsite Conversions",
            LEAD_GENERATION: "Lead Generation",
            QUALITY_LEAD: "Quality Lead",
            AD_RECALL_LIFT: "Ad Recall Lift",
            CONVERSATIONS: "Conversations",
            IMPRESSIONS: "Impressions",
          };
          const fallbackOptMap: Record<string, string> = {
            TRAFFIC: "Landing Page Views", AWARENESS: "Reach",
            ENGAGEMENT: "Post Engagement", LEAD_GENERATION: "Lead Generation",
            CONVERSIONS: "Offsite Conversions",
          };
          const optimization = rawOptimize
            ? (optimizeLabelMap[rawOptimize] || rawOptimize)
            : (fallbackOptMap[obj] || "Landing Page Views");
          const billingMap: Record<string, string> = {
            THRUPLAY: "ThruPlay", LINK_CLICKS: "Link Clicks",
          };
          const billing = billingMap[rawOptimize] || "Impressions";
          const geo = (targeting?.geography as any[]) || [];
          const interests = (targeting?.interests as any[]) || [];
          const budgetDaily = campaign.budget_daily;
          const budgetTotal = campaign.budget_total;
          const currency = campaign.budget_currency ?? "USD";

          return (
            <div className="space-y-8 max-w-5xl">
              {/* Ad Set Identity */}
              <section>
                <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Ad Set Details</p>
                <div className="grid grid-cols-3 gap-x-12 gap-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Ad Set Name</p>
                    <p className="text-sm text-foreground-muted font-medium">{campaign.name} — Ad Set</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Optimization Goal</p>
                    <p className="text-sm text-foreground-muted font-medium">{optimization}</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">Billing: {billing}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Bid Strategy</p>
                    {(campaign as any).bid_strategy ? (
                      <p className="text-sm text-foreground-muted font-medium">
                        {String((campaign as any).bid_strategy).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-foreground-muted font-medium">Lowest Cost</p>
                        <p className="text-[11px] text-foreground-muted mt-0.5">Meta default — no bid cap</p>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Budget</p>
                    {budgetDaily
                      ? <p className="text-sm text-foreground-muted font-medium">{currency} {budgetDaily.toLocaleString()} / day</p>
                      : budgetTotal
                      ? <p className="text-sm text-foreground-muted font-medium">{currency} {budgetTotal.toLocaleString()} total</p>
                      : <p className="text-sm text-foreground-muted">Not set</p>}
                    {metaAdsetId && (budgetDaily || budgetTotal) && (
                      <div className="mt-2">
                        <button
                          onClick={async () => {
                            setBudgetSyncing(true); setBudgetMsg(null);
                            try {
                              const amt = budgetDaily ?? budgetTotal ?? 0;
                              const bType = budgetDaily ? "daily" : "lifetime";
                              const r = await api.patch(`/api/v1/campaigns/${id}/budget-meta`, { budget_type: bType, amount: amt });
                              setBudgetMsg(r.success ? { ok: true, text: "Budget synced to Meta." } : { ok: false, text: r.error || "Sync failed" });
                            } catch { setBudgetMsg({ ok: false, text: "Sync failed" }); }
                            finally { setBudgetSyncing(false); }
                          }}
                          disabled={budgetSyncing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-surface-hover border border-border text-foreground-muted text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                        >
                          {budgetSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                          Sync Budget to Meta
                        </button>
                        {budgetMsg && (
                          <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${budgetMsg.ok ? "text-success-text" : "text-error-text"}`}>
                            {budgetMsg.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {budgetMsg.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Start Date</p>
                    <p className="text-sm text-foreground-muted">{fmt(campaign.start_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">End Date</p>
                    <p className="text-sm text-foreground-muted">{fmt(campaign.end_at)}</p>
                  </div>
                </div>

                {/* Meta IDs */}
                {(metaCampaignId || metaAdsetId) && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {metaCampaignId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-[11px] text-foreground-muted font-mono">
                        <span className="text-foreground-muted">Campaign ID:</span> {metaCampaignId}
                      </span>
                    )}
                    {metaAdsetId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-[11px] text-foreground-muted font-mono">
                        <span className="text-foreground-muted">Ad Set ID:</span> {metaAdsetId}
                      </span>
                    )}
                  </div>
                )}
              </section>

              <div className="border-t border-border/60" />

              {/* Targeting */}
              <section>
                <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Targeting</p>
                <div className="space-y-4">
                  {/* Age & Gender */}
                  <div className="grid grid-cols-3 gap-x-12">
                    <div>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Age Range</p>
                      <p className="text-sm text-foreground-muted">{String(targeting?.age_min ?? 18)}–{String(targeting?.age_max ?? 65)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Gender</p>
                      <p className="text-sm text-foreground-muted capitalize">
                        {!targeting?.gender || targeting.gender === "ALL" ? "All genders" : String(targeting.gender)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Advantage Audience</p>
                      <p className="text-sm text-foreground-muted">
                        {(targeting?.age_min != null || (targeting?.geography as any[])?.length > 0 || (targeting?.interests as any[])?.length > 0)
                          ? "Manual (custom targeting)"
                          : "Not configured"}
                      </p>
                    </div>
                  </div>

                  {/* Geography */}
                  {geo.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-2">Locations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {geo.map((g: any, i: number) => {
                          const label = typeof g === "object" ? (g.display_name || g.key || JSON.stringify(g)) : String(g);
                          return <span key={i} className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-foreground-muted">{label}</span>;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interests */}
                  {interests.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-2">Interests</p>
                      <div className="flex flex-wrap gap-1.5">
                        {interests.map((t: any, i: number) => {
                          const label = typeof t === "object" ? (t.name || t.id || JSON.stringify(t)) : String(t);
                          return <span key={i} className="px-2.5 py-1 bg-surface border border-border rounded text-xs text-foreground-muted">{label}</span>;
                        })}
                      </div>
                    </div>
                  )}

                  {geo.length === 0 && interests.length === 0 && (
                    <p className="text-sm text-foreground-muted">Worldwide, all audiences</p>
                  )}
                </div>
              </section>

              <div className="border-t border-border/60" />

              {/* Status */}
              <section>
                <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-4">Status</p>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${campaign.status === "ACTIVE" ? "bg-success-text" : "bg-zinc-500"}`} />
                  <p className="text-sm text-foreground-muted font-medium capitalize">{campaign.status.toLowerCase()}</p>
                  <span className="text-foreground-muted text-xs">— Ad set is paused until campaign is activated</span>
                </div>
              </section>
            </div>
          );
        })()}

        {/* ════ ADS ════ */}
        {tab === "ads" && (
          boosts.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <p className="text-foreground-muted font-semibold mb-1">No ads yet</p>
              <p className="text-foreground-muted text-sm">Ads will appear here once this campaign has active boosts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const hasAdConvData = adInsights.some(ai => (ai.purchases || 0) + (ai.leads || 0) + (ai.add_to_cart || 0) > 0);
                const adHeaders = ["AD", "STATUS", "AD SET NAME", "MAIN RESULT", "COST PER RESULT", "AMOUNT SPENT", "IMPR", "CTR", "CPM", "CPC", "FREQ",
                  ...(hasAdConvData ? ["CONV.", "COST/CONV."] : [])];
              return (
              <table className="w-full text-sm" style={{ minWidth: hasAdConvData ? 1260 : 1100 }}>
                <thead>
                  <tr className="border-b border-border">
                    {adHeaders.map(h => (
                      <th key={h} className={`px-4 py-3 text-[10px] font-bold text-foreground-muted uppercase tracking-widest whitespace-nowrap ${h === "AD" ? "text-left min-w-[280px]" : "text-right"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Match AdInsight to boost by meta_ad_id (accurate), falling back to positional index
                    const adMap = new Map<string, AdInsight>();
                    const realBoosts = boosts.filter(b => !b.id.startsWith("virtual-ad-"));
                    for (const ai of adInsights) {
                      const matched = realBoosts.find(b => b.meta_ad_id && b.meta_ad_id === ai.meta_ad_id);
                      if (matched) adMap.set(matched.id, ai);
                    }
                    // Positional fallback for boosts without meta_ad_id
                    if (adMap.size === 0) {
                      adInsights.forEach((ai, idx) => { if (realBoosts[idx]) adMap.set(realBoosts[idx].id, ai); });
                    }
                    return boosts.map((b, i) => {
                    const adI = adMap.get(b.id);

                    const bSpend  = adI ? Number(adI.spend)       : (b.spend_recorded || 0);
                    const bClicks = adI ? Number(adI.clicks)       : (b.clicks || 0);
                    const bImpr   = adI ? Number(adI.impressions)  : (b.impressions || 0);
                    const bCpm    = adI ? Number(adI.cpm)          : 0;
                    const bCpc    = adI ? Number(adI.cpc)          : 0;
                    const bCtr    = adI ? Number(adI.ctr)          : 0;
                    const bFreq   = adI ? Number(adI.frequency)    : 0;
                    const cpr = bClicks > 0 && bSpend > 0 ? (bSpend / bClicks).toFixed(2) : null;
                    const isAdActive = ["ACTIVE"].includes(b.status);
                    return (
                      <tr key={b.id}
                        className={`border-b border-border/40 transition-colors ${
                          isAdActive ? "bg-warning-text/3 hover:bg-warning-text/5" : "hover:bg-surface/40"
                        } ${i < boosts.length - 1 ? "" : "border-b-0"}`}>

                        {/* AD */}
                        <td className="px-4 py-4 min-w-[280px]">
                          <div className="flex items-start gap-3">
                            {b.ad_image_url ? (
                              <Image src={b.ad_image_url} alt="Ad creative" width={64} height={48} className="w-16 h-12 object-cover rounded shrink-0 bg-surface-hover" unoptimized />
                            ) : (
                              <div className="w-16 h-12 bg-surface-hover rounded shrink-0 flex items-center justify-center text-foreground-muted text-xs">No img</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{b.ad_headline || `${b.boost_type.replace(/_/g, " ")} Ad`}</p>
                              {b.ad_body && <p className="text-[11px] text-foreground-muted line-clamp-2 mt-0.5">{b.ad_body}</p>}
                              <p className="text-[10px] text-foreground-muted mt-1 flex items-center gap-1">
                                <span>📷</span>
                                {b.boost_type === "POST" ? "Post boost" :
                                 b.boost_type === "IMAGE_AD" ? "Single image ad" :
                                 b.boost_type === "VIDEO_AD" ? "Video ad" :
                                 b.boost_type.replace(/_/g, " ").toLowerCase()}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleBoostToggle(b)}
                              disabled={b.id.startsWith('virtual-ad-') || togglingBoost === b.id}
                              title={b.id.startsWith('virtual-ad-') ? 'Toggle individual ads after campaign is live' : (isAdActive ? 'Pause ad' : 'Resume ad')}
                              style={{
                                width: 32, height: 18, borderRadius: 999,
                                background: isAdActive ? "#1877F2" : "#3f3f46",
                                position: "relative", display: "inline-block",
                                border: "none", padding: 0,
                                cursor: b.id.startsWith('virtual-ad-') ? 'not-allowed' : 'pointer',
                                opacity: togglingBoost === b.id ? 0.6 : 1,
                                transition: "background 200ms",
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 2, width: 14, height: 14,
                                borderRadius: "50%", background: "#fff",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                                transition: "transform 150ms",
                                transform: isAdActive ? "translateX(16px)" : "translateX(2px)",
                              }} />
                            </button>
                            <span className={`text-xs font-medium ${isAdActive ? "text-foreground" : "text-foreground-muted"}`}>
                              {togglingBoost === b.id ? '…' : (b.status.charAt(0) + b.status.slice(1).toLowerCase())}
                            </span>
                          </div>
                        </td>

                        {/* AD SET NAME */}
                        <td className="px-4 py-4 text-right">
                          <p className="text-xs text-foreground-muted">{campaign.name}</p>
                          <p className="text-[10px] text-foreground-muted mt-0.5">Ad Set</p>
                        </td>

                        {/* MAIN RESULT */}
                        <td className="px-4 py-4 text-right">
                          {bClicks > 0 ? (
                            <><p className="text-sm text-foreground font-medium">{bClicks.toLocaleString()}</p>
                            <p className="text-[10px] text-foreground-muted">Link clicks</p></>
                          ) : bImpr > 0 ? (
                            <><p className="text-sm text-foreground font-medium">{bImpr.toLocaleString()}</p>
                            <p className="text-[10px] text-foreground-muted">Impressions</p></>
                          ) : <p className="text-foreground-muted text-xs">--</p>}
                        </td>

                        {/* COST PER RESULT */}
                        <td className="px-4 py-4 text-right">
                          {cpr ? (
                            <><p className="text-sm text-foreground">${cpr}</p>
                            <p className="text-[10px] text-foreground-muted">per link click</p></>
                          ) : <p className="text-foreground-muted text-xs">--</p>}
                        </td>

                        {/* AMOUNT SPENT */}
                        <td className="px-4 py-4 text-right">
                          <p className="text-sm text-foreground">${bSpend.toFixed(2)}</p>
                          {b.budget_daily && bSpend > 0 && b.budget_total && b.budget_total > 0 && (
                            <p className="text-[10px] text-foreground-muted mt-0.5">
                              {Math.round((bSpend / b.budget_total) * 100)}% of budget
                            </p>
                          )}
                        </td>

                        {/* IMPR / CTR / CPM / CPC / FREQ */}
                        <td className="px-4 py-4 text-right"><p className="text-xs text-foreground-muted">{bImpr > 0 ? bImpr.toLocaleString() : "--"}</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-xs text-foreground-muted">{bCtr > 0 ? `${Number(bCtr).toFixed(2)}%` : "--"}</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-xs text-foreground-muted">{bCpm > 0 ? `$${Number(bCpm).toFixed(2)}` : "--"}</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-xs text-foreground-muted">{bCpc > 0 ? `$${Number(bCpc).toFixed(2)}` : "--"}</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-xs text-foreground-muted">{bFreq > 0 ? Number(bFreq).toFixed(2) : "--"}</p></td>

                        {/* CONV / COST PER CONV — only rendered when campaign has pixel data */}
                        {hasAdConvData && (() => {
                          const bConv = (adI?.purchases || 0) + (adI?.leads || 0) + (adI?.add_to_cart || 0);
                          const bCostConv = bConv > 0 && bSpend > 0 ? bSpend / bConv : null;
                          return (
                            <>
                              <td className="px-4 py-4 text-right">
                                {bConv > 0 ? (
                                  <><p className="text-xs text-foreground font-medium">{bConv}</p>
                                  <p className="text-[10px] text-foreground-muted">
                                    {[
                                      (adI?.purchases || 0) > 0 ? `${adI?.purchases} buy` : null,
                                      (adI?.leads || 0) > 0 ? `${adI?.leads} lead` : null,
                                      (adI?.add_to_cart || 0) > 0 ? `${adI?.add_to_cart} cart` : null,
                                    ].filter(Boolean).join(" · ")}
                                  </p></>
                                ) : <p className="text-foreground-muted text-xs">--</p>}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {bCostConv != null ? (
                                  <p className="text-xs text-foreground">${bCostConv.toFixed(2)}</p>
                                ) : <p className="text-foreground-muted text-xs">--</p>}
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    );
                  });
                  })()}
                </tbody>
              </table>
              );})()}
            </div>
          )
        )}
        {/* ════ AUDIENCE ════ */}
        {tab === "audience" && (() => {
          const hasAgeData  = (breakdown?.by_age_gender.length ?? 0) > 0;
          const hasPlacData = (breakdown?.by_placement.length  ?? 0) > 0;
          const hasAny      = hasAgeData || hasPlacData;

          // Derive platform + device rollups from placement rows
          const platMap: Record<string, { impressions: number; clicks: number; spend: number }> = {};
          const devMap:  Record<string, { impressions: number; clicks: number; spend: number }> = {};
          for (const row of (breakdown?.by_placement ?? [])) {
            const plat = row.publisher_platform || "Unknown";
            const dev  = row.impression_device  || "Unknown";
            if (!platMap[plat]) platMap[plat] = { impressions: 0, clicks: 0, spend: 0 };
            platMap[plat].impressions += row.impressions;
            platMap[plat].clicks      += row.clicks;
            platMap[plat].spend       += row.spend;
            if (!devMap[dev]) devMap[dev] = { impressions: 0, clicks: 0, spend: 0 };
            devMap[dev].impressions   += row.impressions;
            devMap[dev].clicks        += row.clicks;
            devMap[dev].spend         += row.spend;
          }
          const platRows = Object.entries(platMap).map(([k, v]) => ({ label: k, ...v })).sort((a,b) => b.impressions - a.impressions);
          const devRows  = Object.entries(devMap).map(([k, v]) => ({ label: k, ...v })).sort((a,b) => b.impressions - a.impressions);

          // Totals
          const totalImpr  = (breakdown?.by_age_gender ?? []).reduce((s, r) => s + r.impressions, 0);
          const totalReach = (breakdown?.by_age_gender ?? []).reduce((s, r) => s + r.reach, 0);
          const totalClicks= (breakdown?.by_age_gender ?? []).reduce((s, r) => s + r.clicks, 0);
          const totalSpend = (breakdown?.by_age_gender ?? []).reduce((s, r) => s + r.spend, 0);

          return (
            <div className="space-y-8 max-w-4xl">
              {!hasAny ? (
                <div className="py-16 flex flex-col items-center text-center gap-3">
                  <TrendingUp className="w-8 h-8 text-foreground-muted" />
                  <p className="text-foreground-muted font-semibold">No delivery data yet</p>
                  <p className="text-sm text-foreground-muted max-w-sm">
                    Audience breakdowns appear once Meta has recorded impressions. Make sure the campaign is active and has started spending.
                  </p>
                </div>
              ) : (
                <>
                  {/* KPI summary row */}
                  {hasAgeData && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Impressions", value: totalImpr.toLocaleString() },
                        { label: "Reach",       value: totalReach.toLocaleString() },
                        { label: "Clicks",      value: totalClicks.toLocaleString() },
                        { label: "Spend",       value: `$${totalSpend.toFixed(2)}` },
                      ].map(k => (
                        <div key={k.label} className="bg-surface-raised/60 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted mb-1">{k.label}</p>
                          <p className="text-lg font-bold text-foreground">{k.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Age / Gender */}
                  {hasAgeData && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-foreground-muted" />
                        <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest">Age & Gender</p>
                      </div>
                      <div className="space-y-2.5">
                        {breakdown!.by_age_gender.map((row, i) => {
                          const maxImpr = Math.max(...breakdown!.by_age_gender.map(r => r.impressions), 1);
                          const pct     = Math.round((row.impressions / maxImpr) * 100);
                          const isMale  = row.gender?.toLowerCase() === "male";
                          const ctr     = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00";
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-28 shrink-0 text-xs text-foreground-muted font-medium text-right">
                                {row.age ?? "—"} · {row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1).toLowerCase() : "—"}
                              </div>
                              <div className="flex-1 h-5 bg-surface-hover rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isMale ? "bg-blue-500/70" : "bg-pink-400/70"}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <div className="w-52 shrink-0 text-xs text-foreground-muted text-right">
                                {row.impressions.toLocaleString()} impr · {ctr}% CTR · ${Number(row.spend).toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 mt-2 ml-[7.5rem] text-[10px] text-foreground-muted">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70 inline-block"/>Male</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400/70 inline-block"/>Female / Other</span>
                      </div>
                    </section>
                  )}

                  {/* Platform + Device side by side */}
                  {hasPlacData && (
                    <>
                      <div className="border-t border-border/60" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                        {/* Platform */}
                        <section>
                          <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-3">Platform</p>
                          <div className="space-y-2.5">
                            {platRows.map((row, i) => {
                              const max = Math.max(...platRows.map(r => r.impressions), 1);
                              const pct = Math.round((row.impressions / max) * 100);
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-20 shrink-0 text-xs text-foreground-muted font-medium capitalize text-right">{row.label}</div>
                                  <div className="flex-1 h-4 bg-surface-hover rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-[#1877F2]/60 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="w-20 shrink-0 text-xs text-foreground-muted text-right">{row.impressions.toLocaleString()}</div>
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        {/* Device */}
                        <section>
                          <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-3">Device</p>
                          <div className="space-y-2.5">
                            {devRows.map((row, i) => {
                              const max = Math.max(...devRows.map(r => r.impressions), 1);
                              const pct = Math.round((row.impressions / max) * 100);
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-20 shrink-0 text-xs text-foreground-muted font-medium capitalize text-right">{row.label}</div>
                                  <div className="flex-1 h-4 bg-surface-hover rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-purple-500/60 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="w-20 shrink-0 text-xs text-foreground-muted text-right">{row.impressions.toLocaleString()}</div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </div>
                    </>
                  )}

                  {/* Age & Gender full table */}
                  {hasAgeData && (
                    <>
                      <div className="border-t border-border/60" />
                      <section>
                        <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-3">Age & Gender Detail</p>
                        <div className="border border-border rounded-xl overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-card">
                                {["Segment","Impressions","Reach","Clicks","CTR","Spend"].map(h => (
                                  <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-widest ${h === "Segment" ? "text-left" : "text-right"}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {breakdown!.by_age_gender.map((row, i) => {
                                const rowCtr = row.ctr != null
                                  ? Number(row.ctr).toFixed(2)
                                  : row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00";
                                return (
                                  <tr key={`ag-${i}`} className="hover:bg-surface/30 transition-colors">
                                    <td className="px-4 py-2.5 text-foreground-muted capitalize">
                                      {row.age ?? "—"} · {row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1).toLowerCase() : "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.impressions.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.reach.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.clicks.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{rowCtr}%</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">${Number(row.spend).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )}

                  {/* Placement breakdown table with CTR + CPC from Meta */}
                  {hasPlacData && (
                    <>
                      <div className="border-t border-border/60" />
                      <section>
                        <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-3">Placement Detail</p>
                        <div className="border border-border rounded-xl overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-card">
                                {["Placement","Impressions","Reach","Clicks","CTR","CPC","Spend"].map(h => (
                                  <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-widest ${h === "Placement" ? "text-left" : "text-right"}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {breakdown!.by_placement.map((row, i) => {
                                const rowCtr = row.ctr != null
                                  ? Number(row.ctr).toFixed(2)
                                  : row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00";
                                const rowCpc = row.cpc != null
                                  ? Number(row.cpc).toFixed(2)
                                  : row.clicks > 0 ? (row.spend / row.clicks).toFixed(2) : null;
                                const platform = (row.publisher_platform || "unknown").charAt(0).toUpperCase() + (row.publisher_platform || "unknown").slice(1).toLowerCase();
                                const device   = row.impression_device ? ` · ${row.impression_device.replace(/_/g, " ")}` : "";
                                return (
                                  <tr key={`pl-${i}`} className="hover:bg-surface/30 transition-colors">
                                    <td className="px-4 py-2.5 text-foreground-muted">{platform}{device}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.impressions.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.reach.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.clicks.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{rowCtr}%</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{rowCpc ? `$${rowCpc}` : "--"}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">${Number(row.spend).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )}

                  {/* Ad Position Breakdown — Feed vs Story vs Reels */}
                  {(breakdown?.by_position?.length ?? 0) > 0 && (
                    <>
                      <div className="border-t border-border/60" />
                      <section>
                        <p className="text-xs font-bold text-foreground-muted uppercase tracking-widest mb-3">Ad Position (Feed · Story · Reels)</p>
                        <div className="border border-border rounded-xl overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-card">
                                {["Position","Platform","Impressions","Reach","Clicks","CTR","CPC","Spend"].map(h => (
                                  <th key={h} className={`px-4 py-2.5 text-[10px] font-bold text-foreground-muted uppercase tracking-widest ${h === "Position" ? "text-left" : "text-right"}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {(breakdown!.by_position ?? []).sort((a, b) => b.impressions - a.impressions).map((row: any, i: number) => {
                                const rowCtr = row.ctr != null
                                  ? Number(row.ctr).toFixed(2)
                                  : row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00";
                                const rowCpc = row.cpc != null
                                  ? Number(row.cpc).toFixed(2)
                                  : row.clicks > 0 ? (row.spend / row.clicks).toFixed(2) : null;
                                const posLabel = (row.platform_position || "feed")
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (c: string) => c.toUpperCase());
                                const platLabel = (row.publisher_platform || "")
                                  .charAt(0).toUpperCase() + (row.publisher_platform || "").slice(1).toLowerCase();
                                return (
                                  <tr key={`pos-${i}`} className="hover:bg-surface/30 transition-colors">
                                    <td className="px-4 py-2.5 text-foreground-muted font-medium">{posLabel}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{platLabel}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.impressions.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.reach.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{row.clicks.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{rowCtr}%</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">{rowCpc ? `$${rowCpc}` : "--"}</td>
                                    <td className="px-4 py-2.5 text-right text-foreground-muted">${Number(row.spend).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

      {menu && <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />}
      <ConfirmActionModal
        open={confirmDelete}
        variant="danger"
        title="Delete campaign?"
        message="This will permanently delete this campaign."
        confirmLabel="Delete"
        onConfirm={confirmDeleteCampaign}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

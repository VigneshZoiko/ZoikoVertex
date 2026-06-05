"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2, AlertCircle, MoreHorizontal, Trash2,
  ExternalLink, RefreshCw, ChevronRight,
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
}

interface Boost {
  id: string; status: string; boost_type: string; platform: string;
  impressions: number; reach: number; clicks: number; spend_recorded: number;
  budget_daily?: number; budget_total?: number; budget_currency?: string;
  ad_image_url?: string; ad_headline?: string; ad_body?: string;
  created_at: string; meta_campaign_id?: string;
}

interface Insights {
  totals: { impressions: number; reach: number; clicks: number; spend: number };
  kpis:   { ctr: number; cpm: number; cpc: number };
  budget: { total: number | null; currency: string; spend: number; utilization_pct: number | null };
  boosts_count: number;
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
  const [tab,       setTab]       = useState<"overview" | "ads">("overview");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [menu,      setMenu]      = useState(false);
  const [toggling,  setToggling]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [verifying,     setVerifying]    = useState(false);
  const [verify,        setVerify]       = useState<MetaVerifyResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cRes, bRes, iRes] = await Promise.allSettled([
        api.get(`/api/v1/campaigns/${id}`),
        api.get(`/api/v1/ads/boosts?campaign_id=${id}`),
        api.get(`/api/v1/campaigns/${id}/insights`),
      ]);
      if (cRes.status === "fulfilled") setCampaign(cRes.value.data);
      if (bRes.status === "fulfilled") setBoosts(bRes.value.data || []);
      if (iRes.status === "fulfilled") setInsights(iRes.value.data);
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
        setCampaign(prev => prev ? { ...prev, status: pausing ? "PAUSING" : "ACTIVE" } : prev);
      }
    } catch { /* silent */ }
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-zinc-500" />
      <p className="text-zinc-600 text-sm">Loading campaign...</p>
    </div>
  );

  if (error || !campaign) return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
      <AlertCircle className="w-8 h-8 text-zinc-600" />
      <p className="text-zinc-400 text-sm">{error || "Campaign not found"}</p>
      <button onClick={() => router.push("/campaigns")} className="text-xs text-zinc-500 hover:text-white underline">
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
  const budget    = campaign.budget_total         ?? 0;
  const currency  = campaign.budget_currency      ?? "USD";
  const spendPct  = budget > 0 ? Math.round((spend / budget) * 100) : 0;
  const targeting = (campaign.targeting || {}) as Record<string, unknown>;
  const creative  = (campaign.creative  || {}) as Record<string, unknown>;

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => router.back()} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors mr-1">
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
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-white font-semibold truncate max-w-xs">{campaign.name}</span>
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
                isActive(campaign.status) ? "bg-zinc-500" : "bg-zinc-800"
              }`}
              style={{ width: 36, height: 20 }}
            >
              {toggling ? (
                <Loader2 className="w-3 h-3 text-white animate-spin absolute top-[3.5px] left-[10px]" />
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
            <span className={`text-sm font-semibold ${isActive(campaign.status) ? "text-white" : "text-zinc-500"}`}>
              {campaign.status === "PAUSING" ? "Pausing..." :
               campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
            </span>
          </div>

          {campaign.status === "COMPLETED" && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-3 h-3 text-emerald-400">✓</span> Completed
            </span>
          )}

          <button onClick={load} className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Three-dot menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu(m => !m)}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-50 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => { handleDelete(); setMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-zinc-900 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />Delete campaign
                </button>
                <div className="border-t border-zinc-800" />
                <div className="flex items-start gap-2.5 px-4 py-3">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-400">View on Facebook</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">You&apos;ll need access to the ad account.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-zinc-800/60 px-6">
        {(["overview", "ads"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all capitalize ${
              tab === t ? "border-zinc-300 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}>
            {t === "ads" ? `Ads (${boosts.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* ════ OVERVIEW ════ */}
        {tab === "overview" && (
          <div className="space-y-8 max-w-5xl">

            {/* Campaign details */}
            <section>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Campaign details</p>
              <div className="grid grid-cols-3 gap-x-12 gap-y-6">

                {/* AD ACCOUNT */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Ad Account</p>
                  <p className="text-sm text-zinc-300 font-medium">Your workspace</p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Active
                  </span>
                </div>

                {/* OBJECTIVE */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Objective</p>
                  <p className="text-sm text-zinc-300 font-medium capitalize">
                    Main objective: {campaign.objective?.toLowerCase().replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Type: {campaign.campaign_type?.replace(/_/g, " ")}
                  </p>
                </div>

                {/* DURATION */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Duration</p>
                  {campaign.status === "COMPLETED" ? (
                    <p className="text-sm text-zinc-300">Campaign ended.{dur(campaign.start_at, campaign.end_at) ? ` It ran for ${dur(campaign.start_at, campaign.end_at)}.` : ""}</p>
                  ) : (
                    <p className="text-sm text-zinc-300">{dur(campaign.start_at, campaign.end_at) ? `Running for ${dur(campaign.start_at, campaign.end_at)}` : "No end date set"}</p>
                  )}
                </div>

                {/* DATES */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Dates</p>
                  <p className="text-sm text-zinc-400">
                    <span className="text-zinc-600 text-[11px]">Start: </span>{fmt(campaign.start_at)}
                  </p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    <span className="text-zinc-600 text-[11px]">End: </span>{fmt(campaign.end_at)}
                  </p>
                </div>

                {/* BUDGET */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Budget</p>
                  {(campaign.budget_total || campaign.budget_daily) ? (
                    <>
                      {campaign.budget_daily && <p className="text-sm text-zinc-300 font-medium">{currency}{campaign.budget_daily.toLocaleString()} / day</p>}
                      {campaign.budget_total && !campaign.budget_daily && <p className="text-sm text-zinc-300 font-medium">{currency}{campaign.budget_total.toLocaleString()} total</p>}
                    </>
                  ) : <p className="text-sm text-zinc-600">Not set</p>}
                </div>

                {/* AMOUNT SPENT */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Amount Spent</p>
                  <p className="text-sm text-zinc-300 font-medium">${spend.toFixed(2)}</p>
                  {budget > 0 && (
                    <div className="mt-1.5">
                      <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${spendPct >= 90 ? "bg-amber-500" : "bg-zinc-400"}`}
                          style={{ width: `${Math.min(100, spendPct)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{spendPct}% of budget (estimated)</p>
                    </div>
                  )}
                </div>

                {/* CAMPAIGN CREATED IN */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Campaign Created In</p>
                  <p className="text-sm text-zinc-300">ZoikoVertex</p>
                  {campaign.created_at && (
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      on {new Date(campaign.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="border-t border-zinc-800/60" />

            {/* Performance */}
            <section>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Performance</p>
              <div className="grid grid-cols-5 gap-6">
                {[
                  { label: "MAIN RESULT",           value: clicks > 0 ? clicks.toLocaleString() : (impr > 0 ? impr.toLocaleString() : "0"), sub: "Link clicks" },
                  { label: "COST PER MAIN RESULT",  value: clicks > 0 && spend > 0 ? `$${(spend / clicks).toFixed(2)}` : "--", sub: "per link click" },
                  { label: "CTR",                   value: ctr > 0 ? `${ctr.toFixed(2)}%` : "--", sub: "" },
                  { label: "IMPRESSIONS",           value: impr > 0 ? impr.toLocaleString() : "--", sub: "" },
                  { label: "REACH",                 value: reach > 0 ? reach.toLocaleString() : "--", sub: "" },
                ].map(({ label, value, sub }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {sub && <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>}
                  </div>
                ))}
              </div>
              {cpm > 0 || cpc > 0 ? (
                <div className="grid grid-cols-5 gap-6 mt-6 pt-4 border-t border-zinc-800/40">
                  {[
                    { label: "CPM",   value: cpm > 0 ? `$${cpm.toFixed(2)}` : "--" },
                    { label: "CPC",   value: cpc > 0 ? `$${cpc.toFixed(2)}` : "--" },
                    { label: "ROAS",  value: "--" },
                    { label: "CPP",   value: "--" },
                    { label: "TOTAL SPEND", value: `$${spend.toFixed(2)}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-lg font-semibold text-zinc-300">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Placements — from creative/targeting */}
            {(campaign.platforms?.length > 0 || !!(targeting?.geography)) && (
              <>
                <div className="border-t border-zinc-800/60" />
                <section>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Placements</p>
                  <div className="space-y-3">
                    {campaign.platforms?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-zinc-600 w-36 shrink-0 pt-0.5">Publisher platforms:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {campaign.platforms.map(p => (
                            <span key={p} className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(targeting?.geography as any[])?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-zinc-600 w-36 shrink-0 pt-0.5">Locations:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(targeting.geography as any[]).map((g: any, i: number) => {
                            const label = typeof g === "object" ? (g.display_name || g.key || JSON.stringify(g)) : String(g);
                            return (
                              <span key={i} className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300">{label}</span>
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
                <div className="border-t border-zinc-800/60" />
                <section>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Audience</p>
                  <div className="space-y-3">
                    {(targeting.age_min != null || targeting.age_max != null) && (
                      <div className="flex items-center gap-6">
                        <p className="text-xs text-zinc-600 w-36 shrink-0">Age:</p>
                        <p className="text-sm text-zinc-300">{String(targeting.age_min ?? 18)}–{String(targeting.age_max ?? 65)}</p>
                      </div>
                    )}
                    {!!targeting.gender && String(targeting.gender) !== "ALL" && (
                      <div className="flex items-center gap-6">
                        <p className="text-xs text-zinc-600 w-36 shrink-0">Gender:</p>
                        <p className="text-sm text-zinc-300 capitalize">{String(targeting.gender)}</p>
                      </div>
                    )}
                    {(targeting.interests as any[])?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-zinc-600 w-36 shrink-0 pt-0.5">Interests:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(targeting.interests as any[]).map((t: any, i: number) => {
                            const label = typeof t === "object" ? (t.name || t.id || JSON.stringify(t)) : String(t);
                            return (
                              <span key={i} className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300">{label}</span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(targeting.keywords as string[])?.length > 0 && (
                      <div className="flex items-start gap-6">
                        <p className="text-xs text-zinc-600 w-36 shrink-0 pt-0.5">Keywords:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(targeting.keywords as string[]).map((k: string) => (
                            <span key={k} className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* ── Meta Verification Panel ── */}
            {(campaign as any).meta_campaign_id && (
              <div className="border-t border-zinc-800/60 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Meta Verification</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Confirm every field actually reached Meta correctly.</p>
                  </div>
                  <button
                    onClick={async () => {
                      setVerifying(true); setVerify(null);
                      const r = await api.get(`/api/v1/campaigns/${id}/meta-verify`);
                      setVerify(r.success ? r.data : { error: r.error });
                      setVerifying(false);
                    }}
                    disabled={verifying}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all disabled:opacity-50">
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {verifying ? "Fetching from Meta…" : "Verify on Meta"}
                  </button>
                </div>

                {verify && !verify.error && (
                  <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <span className="text-xs font-bold text-emerald-400">{verify.summary.passed} / {verify.summary.total} fields confirmed</span>
                      {verify.summary.failed > 0 && <span className="text-xs font-bold text-rose-400">{verify.summary.failed} mismatch{verify.summary.failed > 1 ? "es" : ""}</span>}
                      <span className="ml-auto text-[10px] text-zinc-600">Campaign: {verify.meta_ids.campaign_id} · Ad Set: {verify.meta_ids.adset_id}</span>
                    </div>

                    {/* Field-by-field table */}
                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/60">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-40">Field</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sent from Vertex</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live on Meta</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest w-16">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {verify.checks.map((c: MetaVerifyCheck) => (
                            <tr key={c.field} className={c.match ? "" : "bg-rose-500/5"}>
                              <td className="px-4 py-2.5 text-zinc-400 font-medium">{c.field}</td>
                              <td className="px-4 py-2.5 text-zinc-300 font-mono text-[11px] max-w-xs truncate">{c.intended ?? "—"}</td>
                              <td className="px-4 py-2.5 text-zinc-300 font-mono text-[11px] max-w-xs truncate">{c.on_meta ?? <span className="text-zinc-600">not found</span>}</td>
                              <td className="px-4 py-2.5 text-center">
                                {c.match
                                  ? <span className="text-emerald-400 text-sm">✓</span>
                                  : <span className="text-rose-400 text-sm">✗</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Creative preview */}
                    {verify.live_on_meta.creative?.thumbnail && (
                      <div className="flex items-start gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <Image src={verify.live_on_meta.creative.thumbnail} alt="Ad thumbnail from Meta" width={96} height={64} className="w-24 h-16 object-cover rounded-lg border border-zinc-700 shrink-0" unoptimized />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-400 mb-1">Ad thumbnail from Meta</p>
                          <p className="text-sm text-white font-semibold truncate">{verify.live_on_meta.creative.headline ?? "—"}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{verify.live_on_meta.creative.body_text ?? "—"}</p>
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
                  <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{verify.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ ADS ════ */}
        {tab === "ads" && (
          boosts.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <p className="text-zinc-400 font-semibold mb-1">No ads yet</p>
              <p className="text-zinc-600 text-sm">Ads will appear here once this campaign has active boosts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 1000 }}>
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["AD", "STATUS", "AD SET NAME", "MAIN RESULT", "COST PER RESULT", "AMOUNT SPENT", "CPP", "CPM", "CPC"].map(h => (
                      <th key={h} className={`px-4 py-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap ${h === "AD" ? "text-left min-w-[280px]" : "text-right"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boosts.map((b, i) => {
                    const bSpend = b.spend_recorded || 0;
                    const bClicks = b.clicks || 0;
                    const cpr = bClicks > 0 && bSpend > 0 ? (bSpend / bClicks).toFixed(2) : null;
                    const isAdActive = ["ACTIVE"].includes(b.status);
                    return (
                      <tr key={b.id}
                        className={`border-b border-zinc-800/40 transition-colors ${
                          isAdActive ? "bg-amber-500/3 hover:bg-amber-500/5" : "hover:bg-zinc-900/40"
                        } ${i < boosts.length - 1 ? "" : "border-b-0"}`}>

                        {/* AD */}
                        <td className="px-4 py-4 min-w-[280px]">
                          <div className="flex items-start gap-3">
                            {b.ad_image_url ? (
                              <Image src={b.ad_image_url} alt="Ad creative" width={64} height={48} className="w-16 h-12 object-cover rounded shrink-0 bg-zinc-800" unoptimized />
                            ) : (
                              <div className="w-16 h-12 bg-zinc-800 rounded shrink-0 flex items-center justify-center text-zinc-600 text-xs">No img</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{b.ad_headline || `${b.boost_type.replace(/_/g, " ")} Ad`}</p>
                              {b.ad_body && <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">{b.ad_body}</p>}
                              <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
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
                            <div style={{
                              width: 30, height: 17, borderRadius: 999,
                              background: isAdActive ? "#71717a" : "#3f3f46",
                              position: "relative", display: "inline-block",
                            }}>
                              <span style={{
                                position: "absolute", top: 1.5, width: 14, height: 14,
                                borderRadius: "50%", background: "#fff",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                                transition: "transform 150ms",
                                transform: isAdActive ? "translateX(15px)" : "translateX(2px)",
                              }} />
                            </div>
                            <span className={`text-xs font-medium ${isAdActive ? "text-white" : "text-zinc-400"}`}>
                              {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                            </span>
                          </div>
                        </td>

                        {/* AD SET NAME */}
                        <td className="px-4 py-4 text-right">
                          <p className="text-xs text-zinc-300">{campaign.name}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">Ad Set</p>
                        </td>

                        {/* MAIN RESULT */}
                        <td className="px-4 py-4 text-right">
                          {bClicks > 0 ? (
                            <><p className="text-sm text-white font-medium">{bClicks.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500">Link clicks</p></>
                          ) : b.impressions > 0 ? (
                            <><p className="text-sm text-white font-medium">{b.impressions.toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500">Impressions</p></>
                          ) : <p className="text-zinc-600 text-xs">--</p>}
                        </td>

                        {/* COST PER RESULT */}
                        <td className="px-4 py-4 text-right">
                          {cpr ? (
                            <><p className="text-sm text-white">${cpr}</p>
                            <p className="text-[10px] text-zinc-500">per link click</p></>
                          ) : <p className="text-zinc-600 text-xs">--</p>}
                        </td>

                        {/* AMOUNT SPENT */}
                        <td className="px-4 py-4 text-right">
                          <p className="text-sm text-white">${bSpend.toFixed(2)}</p>
                          {b.budget_daily && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {b.budget_total ? Math.round((bSpend / b.budget_total) * 100) : 0}% of campaign&apos;s daily budget
                            </p>
                          )}
                        </td>

                        {/* CPP / CPM / CPC */}
                        <td className="px-4 py-4 text-right"><p className="text-xs text-zinc-400">--</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-xs text-zinc-400">{cpm > 0 ? `$${cpm.toFixed(2)}` : "--"}</p></td>
                        <td className="px-4 py-4 text-right"><p className="text-xs text-zinc-400">{cpc > 0 ? `$${cpc.toFixed(2)}` : "--"}</p></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
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

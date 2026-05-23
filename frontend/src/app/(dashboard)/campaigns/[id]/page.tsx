"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, X,
  Target, DollarSign, Users, Megaphone, Shield,
  CheckSquare, TrendingUp, ShieldAlert, FileText,
  Rocket, Pause, AlertTriangle, CheckCircle2,
  Clock, Globe, Briefcase, User, Calendar,
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
  risk_tier?: string; autonomy_level?: string; approval_tier?: string; three_key_status?: string;
  targeting?: Record<string, unknown>; creative?: Record<string, unknown>;
  launch_gate_status?: Record<string, unknown>; ai_involvement?: Record<string, unknown>;
  wizard_step?: number; created_at: string; updated_at?: string; created_by?: string;
}

interface GateCondition { id: string; label: string; passed: boolean; reason: string | null; }
interface CampaignEvent {
  id: string; event_type: string; actor_role?: string; prev_status?: string;
  new_status?: string; metadata?: Record<string, unknown>; created_at: string;
}
interface CampaignPost {
  id: string; content: string; platform: string; status: string;
  media_urls?: string[]; created_at: string; creator_name?: string | null;
}

// ── Style maps ─────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  READY_FOR_REVIEW: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  IN_REVIEW: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  CHANGES_REQUESTED: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  APPROVED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  SCHEDULED: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  ACTIVE: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PAUSING: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  PAUSED: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  COMPLETED: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  CLOSED: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  REJECTED: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  CANCELLED: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const RISK_STYLES: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10", medium: "text-amber-400 bg-amber-400/10",
  high: "text-orange-400 bg-orange-400/10", critical: "text-rose-400 bg-rose-400/10",
};

const SPEND_STATE: Record<string, string> = {
  PRELIMINARY: "text-amber-400", FINAL: "text-emerald-400",
  STALE: "text-zinc-500", VARIANCE: "text-orange-400",
};

const TABS = [
  { id: "overview",    label: "Overview",    icon: Target        },
  { id: "brief",       label: "Brief",       icon: FileText      },
  { id: "budget",      label: "Budget",      icon: DollarSign    },
  { id: "audience",    label: "Audience",    icon: Users         },
  { id: "creative",    label: "Creative",    icon: Megaphone     },
  { id: "governance",  label: "Governance",  icon: Shield        },
  { id: "approvals",   label: "Approvals",   icon: CheckSquare   },
  { id: "posts",       label: "Posts",       icon: Globe         },
  { id: "performance", label: "Performance", icon: TrendingUp    },
  { id: "risk",        label: "Risk",        icon: ShieldAlert   },
  { id: "evidence",    label: "Evidence",    icon: FileText      },
];

const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "—";

// ── Page ──────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [campaign, setCampaign]   = useState<Campaign | null>(null);
  const [events, setEvents]       = useState<CampaignEvent[]>([]);
  const [gate, setGate]           = useState<{ eligible: boolean; conditions: GateCondition[]; failed_conditions: GateCondition[] } | null>(null);
  const [posts, setPosts]         = useState<CampaignPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pauseReason, setPauseReason]     = useState("");
  const [showPauseModal, setShowPauseModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cRes, eRes, gRes, pRes] = await Promise.allSettled([
        api.get(`/api/v1/campaigns/${id}`),
        api.get(`/api/v1/campaigns/${id}/events`),
        api.get(`/api/v1/campaigns/${id}/launch-gate`),
        api.get(`/api/v1/campaigns/${id}/posts`),
      ]);
      if (cRes.status === "fulfilled") setCampaign(cRes.value.data);
      else throw new Error("Campaign not found");
      if (eRes.status === "fulfilled") setEvents(eRes.value.data || []);
      if (gRes.status === "fulfilled") setGate(gRes.value.data);
      if (pRes.status === "fulfilled") setPosts(pRes.value.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

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

  const handleSubmitReview = () => doAction("submit-review");
  const handleLaunch       = () => doAction("launch");
  const handlePause        = () => { if (pauseReason.trim()) { doAction("pause", { reason: pauseReason }); setShowPauseModal(false); setPauseReason(""); } };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
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
                {campaign.status.replace(/_/g, " ")}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${RISK_STYLES[campaign.risk_tier || "low"]}`}>
                {(campaign.risk_tier || "low").toUpperCase()} RISK
              </span>
              <span className="text-[10px] text-zinc-600 font-medium">{campaign.campaign_type.replace("_", " ")}</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-snug">{campaign.name}</h1>
          </div>
        </div>

        {/* Action Rail */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button onClick={load} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>

          {["DRAFT", "CHANGES_REQUESTED"].includes(campaign.status) && (
            <Link href={`/campaigns/new?edit=${id}&step=${campaign.wizard_step ?? 1}`}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
              Continue Wizard
            </Link>
          )}
          {["DRAFT", "CHANGES_REQUESTED"].includes(campaign.status) && (
            <button onClick={handleSubmitReview} disabled={actionLoading === "submit-review"}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
              {actionLoading === "submit-review" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit for Review
            </button>
          )}
          {["APPROVED", "SCHEDULED"].includes(campaign.status) && gate?.eligible && (
            <button onClick={handleLaunch} disabled={actionLoading === "launch"}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
              {actionLoading === "launch" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Launch Campaign
            </button>
          )}
          {campaign.status === "ACTIVE" && (
            <button onClick={() => setShowPauseModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-all">
              <Pause className="w-4 h-4" />Pause
            </button>
          )}
        </div>
      </div>

      {/* Error */}
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
                { label: "Budget",       value: campaign.budget_total ? `${campaign.budget_currency || "USD"} ${campaign.budget_total.toLocaleString()}` : "—", icon: DollarSign, color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
                { label: "Spend",        value: campaign.spend_recorded ? `${campaign.budget_currency || "USD"} ${campaign.spend_recorded.toLocaleString()}${spendPct != null ? ` (${spendPct}%)` : ""}` : "—", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "Duration",     value: campaign.start_at && campaign.end_at ? `${fmt(campaign.start_at)} – ${fmt(campaign.end_at)}` : "—", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
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

            {/* Launch Gate Summary */}
            {gate && (
              <div className={`p-5 border rounded-2xl ${gate.eligible ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-900/40 border-zinc-800"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {gate.eligible
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    <h3 className="font-bold text-white text-sm">
                      {gate.eligible ? "Launch Gate — All 13 Conditions Passed" : `Launch Gate — ${gate.failed_conditions.length} Condition(s) Blocking`}
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-500">{gate.conditions.filter(c => c.passed).length}/{gate.conditions.length} passed</span>
                </div>
                {gate.failed_conditions.length > 0 && (
                  <div className="space-y-2">
                    {gate.failed_conditions.map(c => (
                      <div key={c.id} className="flex items-start gap-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                        <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-zinc-300 font-semibold">Condition {c.id}: {c.label}</p>
                          {c.reason && <p className="text-xs text-rose-400 mt-0.5">{c.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BRIEF */}
        {activeTab === "brief" && (
          <div className="space-y-4">
            <InfoCard title="Campaign Brief">
              <InfoRow label="Name"             value={campaign.name} />
              <InfoRow label="Type"             value={campaign.campaign_type.replace("_", " ")} />
              <InfoRow label="Region"           value={campaign.region || "—"} />
              <InfoRow label="Objective"        value={campaign.objective} />
              <InfoRow label="Business Rationale" value={campaign.business_rationale || "—"} />
              <InfoRow label="Success Metrics"  value={campaign.success_metrics || "—"} />
              <InfoRow label="Campaign Manager" value={campaign.campaign_manager_name || "—"} />
              <InfoRow label="Created"          value={fmt(campaign.created_at)} />
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
              <InfoRow label="Total Budget"   value={campaign.budget_total ? `${campaign.budget_currency || "USD"} ${campaign.budget_total.toLocaleString()}` : "—"} />
              <InfoRow label="Pacing"         value={campaign.budget_pacing || "—"} />
              <InfoRow label="Budget Owner"   value={campaign.budget_owner_name || "—"} />
              <InfoRow label="Start Date"     value={fmt(campaign.start_at)} />
              <InfoRow label="End Date"       value={fmt(campaign.end_at)} />
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
                    <div className={`h-full rounded-full transition-all ${
                      spendPct >= 110 ? "bg-rose-500" : spendPct >= 85 ? "bg-amber-500" : "bg-emerald-500"
                    }`} style={{ width: `${Math.min(spendPct, 100)}%` }} />
                  </div>
                  <p className={`text-xs mt-1 font-semibold ${spendPct >= 110 ? "text-rose-400" : spendPct >= 85 ? "text-amber-400" : "text-zinc-400"}`}>
                    {spendPct}% of budget used
                    {spendPct >= 110 && " — OVERSPEND INCIDENT"}
                    {spendPct >= 100 && spendPct < 110 && " — Pause requested"}
                    {spendPct >= 85  && spendPct < 100 && " — Pacing warning"}
                  </p>
                </div>
              )}
              <InfoRow label="Last Reconciled" value={fmt(campaign.last_reconciled_at)} />
            </InfoCard>
          </div>
        )}

        {/* AUDIENCE */}
        {activeTab === "audience" && (
          <div className="space-y-4">
            <InfoCard title="Audience Targeting">
              {campaign.targeting ? (
                <>
                  <InfoRow label="Geography"   value={(campaign.targeting.geography as string[] || []).join(", ") || "—"} />
                  <InfoRow label="Summary"     value={(campaign.targeting.audience_summary as string) || "—"} />
                  <InfoRow label="Exclusions"  value={(campaign.targeting.exclusions as string[] || []).join(", ") || "—"} />
                  <InfoRow label="Sensitive Category" value={(campaign.targeting.sensitive_category_status as string) || "NONE"} />
                  <InfoRow label="Jurisdiction Flags" value={(campaign.targeting.jurisdictional_flags as string[] || []).join(", ") || "None"} />
                </>
              ) : <p className="text-zinc-600 text-sm">No targeting data yet</p>}
            </InfoCard>
          </div>
        )}

        {/* CREATIVE */}
        {activeTab === "creative" && (
          <div className="space-y-4">
            <InfoCard title="Creative Assets">
              {campaign.creative ? (
                <>
                  <InfoRow label="Headline"    value={(campaign.creative.headline as string) || "—"} />
                  <InfoRow label="CTA"         value={(campaign.creative.cta_text as string) || "—"} />
                  <InfoRow label="Landing Page" value={(campaign.creative.landing_page_url as string) || "—"} />
                  {campaign.creative.copy_text && (
                    <div className="py-2">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Copy</p>
                      <p className="text-sm text-zinc-300 bg-zinc-900 p-3 rounded-xl leading-relaxed">{campaign.creative.copy_text as string}</p>
                    </div>
                  )}
                  <InfoRow label="UTM Source"  value={(campaign.creative.utm_source as string) || "—"} />
                  <InfoRow label="UTM Medium"  value={(campaign.creative.utm_medium as string) || "—"} />
                  <InfoRow label="UTM Configured" value={campaign.creative.utm_configured ? "Yes" : campaign.creative.utm_waived ? "Waived" : "No"} />
                </>
              ) : <p className="text-zinc-600 text-sm">No creative data yet</p>}
            </InfoCard>
          </div>
        )}

        {/* GOVERNANCE */}
        {activeTab === "governance" && (
          <div className="space-y-4">
            <InfoCard title="Governance Status">
              <InfoRow label="Approval Tier"   value={campaign.approval_tier || "—"} />
              <InfoRow label="Three-Key Status" value={campaign.three_key_status || "PENDING"} />
              <InfoRow label="Autonomy Level"  value={campaign.autonomy_level || "L1"} />
              <InfoRow label="Risk Tier"       value={campaign.risk_tier || "low"} />
              <InfoRow label="Wizard Step"     value={`Step ${campaign.wizard_step ?? 1} of 5`} />
            </InfoCard>
            {/* Launch Gate full detail */}
            {gate && (
              <InfoCard title="Launch Gate — All 13 Conditions">
                <div className="space-y-2">
                  {gate.conditions.map(c => (
                    <div key={c.id} className={`flex items-start gap-2.5 p-3 rounded-xl ${c.passed ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-rose-500/5 border border-rose-500/15"}`}>
                      {c.passed
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        : <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />}
                      <div>
                        <p className="text-xs font-semibold text-zinc-300">{c.id}. {c.label}</p>
                        {c.reason && <p className="text-xs text-rose-400 mt-0.5">{c.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        )}

        {/* APPROVALS */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            <InfoCard title="Three-Key Approval Protocol">
              <p className="text-xs text-zinc-500 mb-4">Keys are managed by the Accountability Layer. Status reflects current binding state.</p>
              {[
                { key: "Key 1", label: "Technical Confirmation", role: "Validator / Campaign Manager", desc: "Tracking, landing page, UTM, creative assets, evidence pre-write" },
                { key: "Key 2", label: "Governance Confirmation", role: "Brand Steward / Compliance Officer", desc: "Brand rules, claim substantiation, platform policy, jurisdictional restrictions" },
                { key: "Key 3", label: "Output Approval", role: "Approver / Final Approver", desc: "Budget authorization, risk acceptance, launch authority" },
              ].map(k => (
                <div key={k.key} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-xs font-bold text-white">{k.key} — {k.label}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{k.role}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      campaign.three_key_status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400"
                        : campaign.three_key_status === "VOIDED" ? "bg-rose-500/10 text-rose-400"
                        : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {campaign.three_key_status === "APPROVED" ? "SIGNED" : campaign.three_key_status === "VOIDED" ? "VOIDED" : "PENDING"}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">{k.desc}</p>
                </div>
              ))}
            </InfoCard>
          </div>
        )}

        {/* PERFORMANCE */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            <InfoCard title={`Published Posts (${posts.filter(p => p.status === "PUBLISHED").length})`}>
              <p className="text-xs text-zinc-500 mb-4">
                Posts published through the Publishing Hub that were linked to this campaign.
                Only posts with status <span className="text-emerald-400 font-semibold">PUBLISHED</span> are shown below.
              </p>
              {posts.filter(p => p.status === "PUBLISHED").length === 0 ? (
                <div className="text-center py-10 text-zinc-600">
                  <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No published posts yet.</p>
                  <p className="text-xs mt-1">When a publisher selects this campaign in the Publishing Hub and the post goes live, it will appear here.</p>
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
                          {p.creator_name && <span className="text-[10px] text-zinc-500">{p.creator_name}</span>}
                          <span className="text-[10px] text-zinc-600 ml-auto">{fmt(p.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">{p.content || "—"}</p>
                        {p.media_urls && p.media_urls.length > 0 && (
                          <p className="text-[10px] text-indigo-400 mt-1">{p.media_urls.length} media file{p.media_urls.length > 1 ? "s" : ""} attached</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>

            {posts.filter(p => p.status !== "PUBLISHED").length > 0 && (
              <InfoCard title={`In-Progress Posts (${posts.filter(p => p.status !== "PUBLISHED").length})`}>
                <p className="text-xs text-zinc-500 mb-4">Posts linked to this campaign that are still in the approval pipeline.</p>
                <div className="space-y-3">
                  {posts.filter(p => p.status !== "PUBLISHED").map(p => (
                    <div key={p.id} className="flex items-start gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl opacity-70">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 uppercase">{p.platform}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">{p.status.replace(/_/g, " ")}</span>
                          {p.creator_name && <span className="text-[10px] text-zinc-500">{p.creator_name}</span>}
                          <span className="text-[10px] text-zinc-600 ml-auto">{fmt(p.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{p.content || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-4">
            <InfoCard title="Performance Metrics">
              <p className="text-xs text-zinc-500 mb-4">
                Spend figures sourced from connected ad platform connectors.
                {campaign.spend_data_state && (
                  <span className={`ml-1 font-bold ${SPEND_STATE[campaign.spend_data_state] || ""}`}>
                    Data state: {campaign.spend_data_state}
                  </span>
                )}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "KPI Reach Target",       value: campaign.kpi_reach?.toLocaleString()       || "—" },
                  { label: "KPI Engagement Target",  value: campaign.kpi_engagement?.toLocaleString()  || "—" },
                  { label: "KPI Conversion Target",  value: campaign.kpi_conversions?.toLocaleString() || "—" },
                ].map(k => (
                  <div key={k.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p className="text-lg font-bold text-white">{k.value}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{k.label}</p>
                  </div>
                ))}
              </div>
              {spendPct != null && (
                <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <p className="text-xs text-zinc-500 mb-2">Budget Utilisation</p>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${spendPct >= 110 ? "bg-rose-500" : spendPct >= 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(spendPct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{spendPct}% — {campaign.budget_currency} {campaign.spend_recorded?.toLocaleString()} of {campaign.budget_total?.toLocaleString()}</p>
                </div>
              )}
            </InfoCard>
          </div>
        )}

        {/* RISK */}
        {activeTab === "risk" && (
          <div className="space-y-4">
            <InfoCard title="Risk Classification">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm ${RISK_STYLES[campaign.risk_tier || "low"]}`}>
                  {(campaign.risk_tier || "low").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white capitalize">{campaign.risk_tier || "low"} Risk</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {campaign.risk_tier === "critical" ? "Requires Final Approver + Executive sign-off"
                      : campaign.risk_tier === "high" ? "Requires Compliance Officer review"
                      : campaign.risk_tier === "medium" ? "Standard three-key required"
                      : "Standard approval path"}
                  </p>
                </div>
              </div>
              <InfoRow label="Autonomy Level" value={campaign.autonomy_level || "L1"} />
              {!!campaign.targeting?.sensitive_category_status && campaign.targeting.sensitive_category_status !== "NONE" && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mt-3">
                  <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sensitive category declared: {campaign.targeting.sensitive_category_status as string}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Compliance review required before launch.</p>
                </div>
              )}
            </InfoCard>
          </div>
        )}

        {/* EVIDENCE */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            <InfoCard title="Campaign Event Log">
              <p className="text-xs text-zinc-500 mb-4">{events.length} events recorded in this campaign's lifecycle.</p>
              {events.length === 0 ? (
                <p className="text-zinc-600 text-sm">No events yet. Events are recorded as the campaign progresses through lifecycle stages.</p>
              ) : (
                <div className="space-y-2">
                  {events.map(e => (
                    <div key={e.id} className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-300">{e.event_type}</span>
                          <span className="text-[10px] text-zinc-600 shrink-0">{fmt(e.created_at)}</span>
                        </div>
                        {(e.prev_status || e.new_status) && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {e.prev_status && <span>{e.prev_status}</span>}
                            {e.prev_status && e.new_status && <span className="mx-1">→</span>}
                            {e.new_status && <span className="text-zinc-400">{e.new_status}</span>}
                          </p>
                        )}
                        {e.actor_role && <p className="text-[10px] text-zinc-600">{e.actor_role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>
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
            <p className="text-xs text-zinc-500">
              Pausing will set status to PAUSING. Spend may continue briefly while the platform confirms.
              A reason is required.
            </p>
            <textarea rows={3} value={pauseReason} onChange={e => setPauseReason(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Reason for pausing…" />
            <div className="flex gap-3">
              <button onClick={() => setShowPauseModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all">Cancel</button>
              <button onClick={handlePause} disabled={!pauseReason.trim() || actionLoading === "pause"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all">
                {actionLoading === "pause" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Confirm Pause
              </button>
            </div>
          </div>
        </div>
      )}
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

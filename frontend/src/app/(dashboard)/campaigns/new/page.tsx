"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle,
  Target, DollarSign, Users, Megaphone, ClipboardCheck, X,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

interface TeamMember { id: string; full_name?: string; email: string; role: string; }
interface WizardData {
  // Step 1 — Brief
  name: string;
  campaign_type: string;
  objective: string;
  business_rationale: string;
  success_metrics: string;
  region: string;
  campaign_manager_id: string;
  campaign_manager_name: string;

  // Step 2 — Budget
  budget_total: string;
  budget_currency: string;
  budget_pacing: string;
  budget_owner_id: string;
  budget_owner_name: string;
  start_at: string;
  end_at: string;

  // Step 3 — Audience
  geography: string[];
  audience_summary: string;
  audience_segments: string[];
  exclusions: string[];
  sensitive_category_status: string;

  // Step 4 — Creative
  platforms: string[];
  copy_text: string;
  headline: string;
  cta_text: string;
  landing_page_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign_param: string;
  utm_configured: boolean;
  utm_waived: boolean;
}

const DEFAULT: WizardData = {
  name: "", campaign_type: "PAID_ADS", objective: "", business_rationale: "",
  success_metrics: "", region: "", campaign_manager_id: "", campaign_manager_name: "",
  budget_total: "", budget_currency: "USD", budget_pacing: "EVEN",
  budget_owner_id: "", budget_owner_name: "", start_at: "", end_at: "",
  geography: [], audience_summary: "", audience_segments: [], exclusions: [],
  sensitive_category_status: "NONE",
  platforms: [], copy_text: "", headline: "", cta_text: "", landing_page_url: "",
  utm_source: "", utm_medium: "cpc", utm_campaign_param: "", utm_configured: false, utm_waived: false,
};

// ── Constants ─────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Brief",    icon: Target,        desc: "Campaign identity & objective"  },
  { id: 2, label: "Budget",   icon: DollarSign,    desc: "Spend, schedule & owner"        },
  { id: 3, label: "Audience", icon: Users,         desc: "Targeting & sensitivity"        },
  { id: 4, label: "Creative", icon: Megaphone,     desc: "Copy, CTA & landing page"       },
  { id: 5, label: "Submit",   icon: ClipboardCheck, desc: "Review package & submission"   },
];

const CAMPAIGN_TYPES = ["PAID_ADS", "ORGANIC", "EMAIL", "MIXED"];
const CURRENCIES     = ["USD", "AED", "EUR", "GBP", "SAR", "INR"];
const PACING_OPTIONS = ["EVEN", "FRONT_LOADED", "BACK_LOADED", "ACCELERATED"];
const SENSITIVE_CATS = ["NONE","FINANCE","HEALTH","POLITICAL","ALCOHOL","GAMBLING","CRYPTO","DATING","WEAPONS"];
const PLATFORM_LIST  = ["Meta","Google","LinkedIn","TikTok","X","YouTube","Pinterest","Instagram","Facebook"];
const REGIONS        = ["Global","UAE","KSA","Qatar","Kuwait","Bahrain","Oman","Egypt","Jordan","India","UK","USA","EU"];
const COUNTRIES      = ["AE","SA","QA","KW","BH","OM","EG","JO","IN","GB","US","DE","FR","IT","ES","NL","AU","PK","BD","NG"];

const inputCls = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all";
const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

// ── Page ──────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");
  const startStep    = parseInt(searchParams.get("step") ?? "1", 10);

  const [step, setStep]         = useState(startStep);
  const [data, setData]         = useState<WizardData>(DEFAULT);
  const [campaignId, setCampaignId] = useState<string | null>(editId);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [members, setMembers]   = useState<TeamMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load team members for manager/owner dropdowns
  useEffect(() => {
    api.get("/api/v1/team").then(r => setMembers(r.data || [])).catch(() => {});
  }, []);

  // If editing, load existing campaign data
  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/campaigns/${editId}`).then(r => {
      const c = r.data;
      const t = c.targeting || {};
      const cr = c.creative || {};
      setData({
        name: c.name || "", campaign_type: c.campaign_type || "PAID_ADS",
        objective: c.objective || "", business_rationale: c.business_rationale || "",
        success_metrics: c.success_metrics || "", region: c.region || "",
        campaign_manager_id: c.campaign_manager_id || "", campaign_manager_name: c.campaign_manager_name || "",
        budget_total: c.budget_total?.toString() || "", budget_currency: c.budget_currency || "USD",
        budget_pacing: c.budget_pacing || "EVEN", budget_owner_id: c.budget_owner_id || "",
        budget_owner_name: c.budget_owner_name || "",
        start_at: c.start_at ? c.start_at.split("T")[0] : "", end_at: c.end_at ? c.end_at.split("T")[0] : "",
        geography: t.geography || [], audience_summary: t.audience_summary || "",
        audience_segments: t.audience_segments || [], exclusions: t.exclusions || [],
        sensitive_category_status: t.sensitive_category_status || "NONE",
        platforms: c.platforms || [], copy_text: cr.copy_text || "", headline: cr.headline || "",
        cta_text: cr.cta_text || "", landing_page_url: cr.landing_page_url || "",
        utm_source: cr.utm_source || "", utm_medium: cr.utm_medium || "cpc",
        utm_campaign_param: cr.utm_campaign || "", utm_configured: cr.utm_configured || false,
        utm_waived: cr.utm_waived || false,
      });
    }).catch(() => {});
  }, [editId]);

  const set = useCallback(<K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData(d => ({ ...d, [key]: val }));
  }, []);

  const toggleArr = useCallback((key: "geography" | "platforms" | "audience_segments" | "exclusions", val: string) => {
    setData(d => ({
      ...d,
      [key]: (d[key] as string[]).includes(val)
        ? (d[key] as string[]).filter(x => x !== val)
        : [...(d[key] as string[]), val],
    }));
  }, []);

  // Save current step to backend
  const saveStep = useCallback(async (goToStep: number) => {
    setSaving(true); setError(null);
    try {
      const payload: Record<string, unknown> = { wizard_step: goToStep };

      if (step === 1) {
        Object.assign(payload, {
          name: data.name.trim(), campaign_type: data.campaign_type,
          objective: data.objective.trim(), business_rationale: data.business_rationale.trim(),
          success_metrics: data.success_metrics.trim(), region: data.region,
          campaign_manager_id: data.campaign_manager_id || undefined,
          campaign_manager_name: data.campaign_manager_name || undefined,
        });
      }
      if (step === 2) {
        Object.assign(payload, {
          budget_total: data.budget_total ? parseFloat(data.budget_total) : null,
          budget_currency: data.budget_currency, budget_pacing: data.budget_pacing,
          budget_owner_id: data.budget_owner_id || undefined,
          budget_owner_name: data.budget_owner_name || undefined,
          start_at: data.start_at || null, end_at: data.end_at || null,
        });
      }
      if (step === 3) {
        Object.assign(payload, {
          targeting: {
            geography: data.geography, audience_summary: data.audience_summary,
            audience_segments: data.audience_segments, exclusions: data.exclusions,
            sensitive_category_status: data.sensitive_category_status,
          },
        });
      }
      if (step === 4) {
        Object.assign(payload, {
          platforms: data.platforms,
          creative: {
            copy_text: data.copy_text, headline: data.headline, cta_text: data.cta_text,
            landing_page_url: data.landing_page_url,
            utm_source: data.utm_source, utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign_param,
            utm_configured: data.utm_configured, utm_waived: data.utm_waived,
          },
        });
      }

      if (!campaignId) {
        // Create new campaign at step 1
        const res = await api.post("/api/v1/campaigns", {
          name: data.name.trim() || "Untitled Campaign",
          campaign_type: data.campaign_type,
          objective: data.objective.trim() || "To be defined",
          ...payload,
        });
        setCampaignId(res.data.id);
      } else {
        await api.patch(`/api/v1/campaigns/${campaignId}`, payload);
      }

      setStep(goToStep);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }, [step, data, campaignId]);

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 5) saveStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmitForReview = async () => {
    if (!campaignId) return;
    setSubmitting(true); setError(null);
    try {
      await api.post(`/api/v1/campaigns/${campaignId}/submit-review`, {
        approval_tier: data.sensitive_category_status !== "NONE" ? "high" : "low",
      });
      router.push(`/campaigns/${campaignId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; gaps?: string[] } } })?.response?.data;
      if (msg?.gaps) setError(`Required fields missing: ${msg.gaps.join(", ")}`);
      else setError(err instanceof Error ? err.message : "Submission failed");
    } finally { setSubmitting(false); }
  };

  // Per-step validation
  const validateStep = (): boolean => {
    setError(null);
    if (step === 1) {
      if (!data.name.trim())      { setError("Campaign name is required"); return false; }
      if (!data.objective.trim()) { setError("Objective is required"); return false; }
    }
    if (step === 2) {
      if (!data.budget_total)     { setError("Budget total is required"); return false; }
      if (!data.budget_owner_id)  { setError("Budget owner is required"); return false; }
      if (!data.start_at)         { setError("Start date is required"); return false; }
      if (!data.end_at)           { setError("End date is required"); return false; }
    }
    if (step === 4) {
      if (!data.landing_page_url) { setError("Landing page URL is required"); return false; }
      if (!data.utm_configured && !data.utm_waived) {
        setError("UTM tracking must be configured or explicitly waived"); return false;
      }
    }
    return true;
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/campaigns")}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">New Paid Campaign</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {campaignId ? `Editing campaign · ${campaignId.slice(0, 8)}…` : "Creating governed campaign"}
            </p>
          </div>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done    = s.id < step;
            const current = s.id === step;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  current ? "bg-indigo-600/20 border border-indigo-500/30"
                    : done ? "opacity-60"
                    : "opacity-30"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    done ? "bg-emerald-500 text-white" : current ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-bold ${current ? "text-white" : "text-zinc-400"}`}>{s.label}</p>
                    <p className="text-[10px] text-zinc-600">{s.desc}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${done ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ── Step Content ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-5">

          {/* STEP 1 — BRIEF */}
          {step === 1 && (
            <>
              <StepHeader icon={Target} title="Campaign Identity & Brief" />
              <div>
                <label className={labelCls}>Campaign Name <Required /></label>
                <input value={data.name} onChange={e => set("name", e.target.value)}
                  className={inputCls} placeholder="e.g. Ramadan 2025 Brand Awareness" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Campaign Type</label>
                  <select value={data.campaign_type} onChange={e => set("campaign_type", e.target.value)} className={inputCls}>
                    {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Region</label>
                  <select value={data.region} onChange={e => set("region", e.target.value)} className={inputCls}>
                    <option value="">Select region…</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Objective <Required /></label>
                <textarea rows={2} value={data.objective} onChange={e => set("objective", e.target.value)}
                  className={`${inputCls} resize-none`} placeholder="e.g. Increase brand awareness in UAE by 30% during Ramadan" />
              </div>
              <div>
                <label className={labelCls}>Business Rationale</label>
                <textarea rows={2} value={data.business_rationale} onChange={e => set("business_rationale", e.target.value)}
                  className={`${inputCls} resize-none`} placeholder="Why does this campaign exist? What business outcome does it serve?" />
              </div>
              <div>
                <label className={labelCls}>Success Metrics</label>
                <input value={data.success_metrics} onChange={e => set("success_metrics", e.target.value)}
                  className={inputCls} placeholder="e.g. 2M impressions, 5% CTR, 500 conversions" />
              </div>
              <div>
                <label className={labelCls}>Campaign Manager</label>
                <select value={data.campaign_manager_id}
                  onChange={e => {
                    const m = members.find(x => x.id === e.target.value);
                    set("campaign_manager_id", e.target.value);
                    set("campaign_manager_name", m ? (m.full_name || m.email) : "");
                  }} className={inputCls}>
                  <option value="">Select campaign manager…</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name || m.email} ({m.role})</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* STEP 2 — BUDGET */}
          {step === 2 && (
            <>
              <StepHeader icon={DollarSign} title="Budget & Schedule" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Total Budget <Required /></label>
                  <input type="number" min="0" value={data.budget_total}
                    onChange={e => set("budget_total", e.target.value)}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={data.budget_currency} onChange={e => set("budget_currency", e.target.value)} className={inputCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Pacing Strategy</label>
                <select value={data.budget_pacing} onChange={e => set("budget_pacing", e.target.value)} className={inputCls}>
                  {PACING_OPTIONS.map(p => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Budget Owner <Required /></label>
                <select value={data.budget_owner_id}
                  onChange={e => {
                    const m = members.find(x => x.id === e.target.value);
                    set("budget_owner_id", e.target.value);
                    set("budget_owner_name", m ? (m.full_name || m.email) : "");
                  }} className={inputCls}>
                  <option value="">Select budget owner…</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name || m.email} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start Date <Required /></label>
                  <input type="date" value={data.start_at} onChange={e => set("start_at", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date <Required /></label>
                  <input type="date" value={data.end_at} onChange={e => set("end_at", e.target.value)} className={inputCls} />
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — AUDIENCE */}
          {step === 3 && (
            <>
              <StepHeader icon={Users} title="Audience Targeting" />
              <div>
                <label className={labelCls}>Target Geography</label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map(c => (
                    <button key={c} type="button" onClick={() => toggleArr("geography", c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        data.geography.includes(c)
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Audience Summary</label>
                <textarea rows={2} value={data.audience_summary} onChange={e => set("audience_summary", e.target.value)}
                  className={`${inputCls} resize-none`} placeholder="Describe your target audience in plain language" />
              </div>
              <div>
                <label className={labelCls}>Sensitive Category Declaration</label>
                <select value={data.sensitive_category_status}
                  onChange={e => set("sensitive_category_status", e.target.value)} className={inputCls}>
                  {SENSITIVE_CATS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {data.sensitive_category_status !== "NONE" && (
                  <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Compliance review will be required before launch for this category.
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Audience Exclusions</label>
                <input value={data.exclusions.join(", ")}
                  onChange={e => set("exclusions", e.target.value.split(",").map(x => x.trim()).filter(Boolean))}
                  className={inputCls} placeholder="e.g. existing customers, competitors, under-18" />
                <p className="text-xs text-zinc-600 mt-1">Comma-separated list</p>
              </div>
            </>
          )}

          {/* STEP 4 — CREATIVE */}
          {step === 4 && (
            <>
              <StepHeader icon={Megaphone} title="Channels & Creative" />
              <div>
                <label className={labelCls}>Paid Channels</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_LIST.map(p => (
                    <button key={p} type="button" onClick={() => toggleArr("platforms", p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        data.platforms.includes(p)
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Ad Copy / Caption</label>
                <textarea rows={3} value={data.copy_text} onChange={e => set("copy_text", e.target.value)}
                  className={`${inputCls} resize-none`} placeholder="Your main ad copy or caption text" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Headline</label>
                  <input value={data.headline} onChange={e => set("headline", e.target.value)} className={inputCls} placeholder="Ad headline" />
                </div>
                <div>
                  <label className={labelCls}>CTA Text</label>
                  <input value={data.cta_text} onChange={e => set("cta_text", e.target.value)} className={inputCls} placeholder="e.g. Shop Now, Learn More" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Landing Page URL <Required /></label>
                <input value={data.landing_page_url} onChange={e => set("landing_page_url", e.target.value)}
                  className={inputCls} placeholder="https://…" />
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">UTM Tracking</p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={data.utm_configured}
                      onChange={e => { set("utm_configured", e.target.checked); if (e.target.checked) set("utm_waived", false); }}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-sm text-zinc-300">Configure UTM</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={data.utm_waived}
                      onChange={e => { set("utm_waived", e.target.checked); if (e.target.checked) set("utm_configured", false); }}
                      className="w-4 h-4 rounded accent-amber-500" />
                    <span className="text-sm text-zinc-300">Waive UTM (with reason)</span>
                  </label>
                </div>
                {data.utm_configured && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Source</label>
                      <input value={data.utm_source} onChange={e => set("utm_source", e.target.value)} className={inputCls} placeholder="meta, google…" />
                    </div>
                    <div>
                      <label className={labelCls}>Medium</label>
                      <input value={data.utm_medium} onChange={e => set("utm_medium", e.target.value)} className={inputCls} placeholder="cpc, paid-social…" />
                    </div>
                    <div>
                      <label className={labelCls}>Campaign</label>
                      <input value={data.utm_campaign_param} onChange={e => set("utm_campaign_param", e.target.value)} className={inputCls} placeholder="ramadan-2025…" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* STEP 5 — SUBMIT */}
          {step === 5 && (
            <>
              <StepHeader icon={ClipboardCheck} title="Submit for Governance Review" />
              <div className="space-y-3">
                <ReviewRow label="Campaign" value={data.name} />
                <ReviewRow label="Type" value={data.campaign_type.replace("_", " ")} />
                <ReviewRow label="Objective" value={data.objective} />
                <ReviewRow label="Budget" value={data.budget_total ? `${data.budget_currency} ${parseFloat(data.budget_total).toLocaleString()}` : "—"} />
                <ReviewRow label="Budget Owner" value={data.budget_owner_name || "—"} />
                <ReviewRow label="Campaign Manager" value={data.campaign_manager_name || "—"} />
                <ReviewRow label="Schedule" value={data.start_at && data.end_at ? `${data.start_at} → ${data.end_at}` : "—"} />
                <ReviewRow label="Geography" value={data.geography.join(", ") || "—"} />
                <ReviewRow label="Sensitive Category" value={data.sensitive_category_status} />
                <ReviewRow label="Channels" value={data.platforms.join(", ") || "—"} />
                <ReviewRow label="Landing Page" value={data.landing_page_url || "—"} />
                <ReviewRow label="UTM" value={data.utm_configured ? "Configured" : data.utm_waived ? "Waived" : "Not set"} />
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-xs font-semibold mb-1">What happens next</p>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Submitting locks the campaign for editing. A governance review will be triggered. The Review Queue will receive tasks for Key 1 (Technical), Key 2 (Governance), and Key 3 (Output Approval).
                  Material edits after approval will void the keys and return the campaign to Draft.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between">
          <button onClick={handleBack} disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ArrowLeft className="w-4 h-4" />Back
          </button>

          {step < 5 ? (
            <button onClick={handleNext} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save & Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmitForReview} disabled={submitting || !campaignId}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Submit for Review
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StepHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
      <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center">
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <h2 className="text-base font-bold text-white">{title}</h2>
    </div>
  );
}

function Required() {
  return <span className="text-rose-500 font-bold">*</span>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-800/40">
      <span className="text-xs text-zinc-500 font-semibold shrink-0 w-36">{label}</span>
      <span className="text-xs text-zinc-300 text-right">{value}</span>
    </div>
  );
}

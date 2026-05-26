"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle,
  Target, DollarSign, Megaphone, ClipboardCheck,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

interface TeamMember { id: string; full_name?: string; email: string; role: string; }

interface WizardData {
  name: string;
  campaign_type: string;
  objective: string;
  region: string;
  campaign_manager_id: string;
  campaign_manager_name: string;
  budget_total: string;
  budget_currency: string;
  start_at: string;
  end_at: string;
  budget_owner_id: string;
  budget_owner_name: string;
  platforms: string[];
  geography: string[];
  copy_text: string;
  headline: string;
  cta_text: string;
  landing_page_url: string;
}

const DEFAULT: WizardData = {
  name: "", campaign_type: "PAID_ADS", objective: "", region: "",
  campaign_manager_id: "", campaign_manager_name: "",
  budget_total: "", budget_currency: "USD", start_at: "", end_at: "",
  budget_owner_id: "", budget_owner_name: "",
  platforms: [], geography: [],
  copy_text: "", headline: "", cta_text: "", landing_page_url: "",
};

// ── Constants ─────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Brief",    icon: Target,         desc: "Identity & objective" },
  { id: 2, label: "Budget",   icon: DollarSign,     desc: "Spend & schedule"     },
  { id: 3, label: "Channels", icon: Megaphone,      desc: "Platforms & creative" },
  { id: 4, label: "Review",   icon: ClipboardCheck, desc: "Confirm & submit"     },
];

const CAMPAIGN_TYPES = [
  { value: "PAID_ADS", label: "Paid Ads"  },
  { value: "ORGANIC",  label: "Organic"   },
  { value: "EMAIL",    label: "Email"     },
  { value: "MIXED",    label: "Mixed"     },
];

const OBJECTIVES = [
  { value: "BRAND_AWARENESS", label: "Brand Awareness"    },
  { value: "REACH",           label: "Reach & Visibility" },
  { value: "TRAFFIC",         label: "Website Traffic"    },
  { value: "LEAD_GENERATION", label: "Lead Generation"    },
  { value: "POST_ENGAGEMENT", label: "Engagement"         },
  { value: "CONVERSIONS",     label: "Sales & Conversions"},
];

const CURRENCIES = ["USD", "AED", "EUR", "GBP", "SAR", "INR"];
const PLATFORMS  = ["Meta", "Google"];
const REGIONS    = ["Global","UAE","KSA","Qatar","Kuwait","Bahrain","Oman","Egypt","Jordan","India","UK","USA","EU"];
const COUNTRIES  = ["AE","SA","QA","KW","BH","OM","EG","JO","IN","GB","US","DE","FR","IT","ES","NL","AU","PK","BD","NG"];

// Required fields and their error messages
const REQUIRED: Partial<Record<keyof WizardData, string>> = {
  name:             "Campaign name is required",
  objective:        "Select an objective",
  budget_total:     "Budget is required",
  budget_owner_id:  "Budget owner is required",
  start_at:         "Start date is required",
  end_at:           "End date is required",
  landing_page_url: "Landing page URL is required",
};

const STEP_REQUIRED: Record<number, (keyof WizardData)[]> = {
  1: ["name", "objective"],
  2: ["budget_total", "budget_owner_id", "start_at", "end_at"],
  3: ["landing_page_url"],
};

type FieldErrors = Partial<Record<keyof WizardData, string>>;

const baseCls = "w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none transition-all";
const okCls   = "border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";
const errCls  = "border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20";
const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";
const optionalTag = <span className="normal-case font-normal text-zinc-600"> (optional)</span>;

// ── Page ──────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");
  const startStep    = parseInt(searchParams.get("step") ?? "1", 10);

  const [step, setStep]             = useState(startStep);
  const [data, setData]             = useState<WizardData>(DEFAULT);
  const [campaignId, setCampaignId] = useState<string | null>(editId);
  const [saving, setSaving]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers]       = useState<TeamMember[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched]         = useState<Partial<Record<keyof WizardData, boolean>>>({});

  useEffect(() => {
    api.get("/api/v1/team/members").then(r => setMembers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/campaigns/${editId}`).then(r => {
      const c = r.data;
      const t = c.targeting || {};
      const cr = c.creative || {};
      setData({
        name: c.name || "", campaign_type: c.campaign_type || "PAID_ADS",
        objective: c.objective || "", region: c.region || "",
        campaign_manager_id: c.campaign_manager_id || "",
        campaign_manager_name: c.campaign_manager_name || "",
        budget_total: c.budget_total?.toString() || "",
        budget_currency: c.budget_currency || "USD",
        start_at: c.start_at?.split("T")[0] || "",
        end_at:   c.end_at?.split("T")[0]   || "",
        budget_owner_id: c.budget_owner_id || "",
        budget_owner_name: c.budget_owner_name || "",
        platforms: c.platforms || [],
        geography: t.geography || [],
        copy_text: cr.copy_text || "", headline: cr.headline || "",
        cta_text:  cr.cta_text  || "", landing_page_url: cr.landing_page_url || "",
      });
    }).catch(() => {});
  }, [editId]);

  const set = useCallback(<K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData(d => ({ ...d, [key]: val }));
    setFieldErrors(e => ({ ...e, [key]: undefined }));
  }, []);

  const touch = useCallback((key: keyof WizardData, value?: unknown) => {
    setTouched(t => ({ ...t, [key]: true }));
    const val = value !== undefined ? value : undefined;
    const isEmpty = val !== undefined ? !String(val).trim() : false;
    setFieldErrors(e => ({
      ...e,
      [key]: (REQUIRED[key] && isEmpty) ? REQUIRED[key] : undefined,
    }));
  }, []);

  const toggleArr = useCallback((key: "geography" | "platforms", val: string) => {
    setData(d => ({
      ...d,
      [key]: (d[key] as string[]).includes(val)
        ? (d[key] as string[]).filter(x => x !== val)
        : [...(d[key] as string[]), val],
    }));
  }, []);

  // Validate all required fields for current step and show inline errors
  const validateStep = (): boolean => {
    const fields = STEP_REQUIRED[step] || [];
    const newErrors: FieldErrors = {};
    const newTouched: Partial<Record<keyof WizardData, boolean>> = {};
    let valid = true;

    for (const key of fields) {
      newTouched[key] = true;
      const val = (data as unknown as Record<string, unknown>)[key];
      const isEmpty = !String(val ?? "").trim();
      if (isEmpty && REQUIRED[key]) {
        newErrors[key] = REQUIRED[key];
        valid = false;
      }
    }
    setTouched(t => ({ ...t, ...newTouched }));
    setFieldErrors(e => ({ ...e, ...newErrors }));
    return valid;
  };

  const saveStep = useCallback(async (goToStep: number) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { wizard_step: goToStep };

      if (step === 1) {
        Object.assign(payload, {
          name: data.name.trim(), campaign_type: data.campaign_type,
          objective: data.objective, region: data.region || undefined,
          campaign_manager_id:   data.campaign_manager_id   || undefined,
          campaign_manager_name: data.campaign_manager_name || undefined,
        });
      }
      if (step === 2) {
        Object.assign(payload, {
          budget_total:    data.budget_total ? parseFloat(data.budget_total) : null,
          budget_currency: data.budget_currency,
          budget_pacing:   "EVEN",
          budget_owner_id:   data.budget_owner_id   || undefined,
          budget_owner_name: data.budget_owner_name || undefined,
          start_at: data.start_at || null,
          end_at:   data.end_at   || null,
        });
      }
      if (step === 3) {
        Object.assign(payload, {
          platforms: data.platforms,
          targeting: { geography: data.geography },
          creative: {
            copy_text: data.copy_text, headline: data.headline,
            cta_text:  data.cta_text,  landing_page_url: data.landing_page_url,
            utm_configured: false, utm_waived: true,
          },
        });
      }

      if (!campaignId) {
        const res = await api.post("/api/v1/campaigns", {
          name:          data.name.trim() || "Untitled Campaign",
          campaign_type: data.campaign_type,
          objective:     data.objective   || "REACH",
          ...payload,
        });
        setCampaignId(res.data.id);
      } else {
        await api.patch(`/api/v1/campaigns/${campaignId}`, payload);
      }

      setStep(goToStep);
    } catch { /* errors shown inline */ }
    finally  { setSaving(false); }
  }, [step, data, campaignId]);

  const handleNext = () => {
    if (validateStep()) saveStep(step + 1);
  };

  const handleRequestApproval = async () => {
    if (!campaignId) return;
    setSubmitting(true);
    try {
      await api.post(`/api/v1/campaigns/${campaignId}/submit-review`, {});
      router.push(`/campaigns/${campaignId}`);
    } catch { /* stay on page */ }
    finally { setSubmitting(false); }
  };

  // Helper: render inline error
  const fieldErr = (key: keyof WizardData) =>
    touched[key] && fieldErrors[key]
      ? <p className="flex items-center gap-1 text-xs text-rose-400 mt-1.5"><AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors[key]}</p>
      : null;

  // Helper: input className with error state
  const cls = (key: keyof WizardData) =>
    `${baseCls} ${touched[key] && fieldErrors[key] ? errCls : okCls}`;

  // Review completeness
  const REVIEW_CHECKS = [
    { label: "Campaign Name",    ok: !!data.name.trim()           },
    { label: "Objective",        ok: !!data.objective             },
    { label: "Budget",           ok: !!data.budget_total          },
    { label: "Budget Owner",     ok: !!data.budget_owner_id       },
    { label: "Start / End Date", ok: !!data.start_at && !!data.end_at },
    { label: "Landing Page URL", ok: !!data.landing_page_url      },
  ];
  const missing = REVIEW_CHECKS.filter(c => !c.ok);

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/campaigns")}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{editId ? "Edit Campaign" : "New Campaign"}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Step {step} of {STEPS.length}</p>
          </div>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done    = s.id < step;
            const current = s.id === step;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  current ? "bg-indigo-600/20 border border-indigo-500/30" : done ? "opacity-60" : "opacity-30"
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

        {/* ── Step Content ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-5">

          {/* STEP 1 — BRIEF */}
          {step === 1 && (
            <>
              <StepHeader icon={Target} title="Campaign Brief"
                subtitle="What is this campaign and what does it need to achieve?" />

              <div>
                <label className={labelCls}>Campaign Name <Req /></label>
                <input value={data.name}
                  onChange={e => set("name", e.target.value)}
                  onBlur={e => touch("name", e.target.value)}
                  className={cls("name")}
                  placeholder="e.g. Ramadan 2025 — Brand Awareness" />
                {fieldErr("name")}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Campaign Type</label>
                  <select value={data.campaign_type} onChange={e => set("campaign_type", e.target.value)}
                    className={`${baseCls} ${okCls}`}>
                    {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Region{optionalTag}</label>
                  <select value={data.region} onChange={e => set("region", e.target.value)}
                    className={`${baseCls} ${okCls}`}>
                    <option value="">Select region…</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Objective <Req /></label>
                <select value={data.objective}
                  onChange={e => set("objective", e.target.value)}
                  onBlur={e => touch("objective", e.target.value)}
                  className={cls("objective")}>
                  <option value="">Select objective…</option>
                  {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {fieldErr("objective")}
              </div>

              <div>
                <label className={labelCls}>Campaign Manager{optionalTag}</label>
                <select value={data.campaign_manager_id}
                  onChange={e => {
                    const m = members.find(x => x.id === e.target.value);
                    set("campaign_manager_id", e.target.value);
                    set("campaign_manager_name", m ? (m.full_name || m.email) : "");
                  }}
                  className={`${baseCls} ${okCls}`}>
                  <option value="">Assign a manager…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email} ({m.role})</option>)}
                </select>
              </div>
            </>
          )}

          {/* STEP 2 — BUDGET */}
          {step === 2 && (
            <>
              <StepHeader icon={DollarSign} title="Budget & Schedule"
                subtitle="How much to spend and when does this campaign run?" />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Total Budget <Req /></label>
                  <input type="number" min="0" value={data.budget_total}
                    onChange={e => set("budget_total", e.target.value)}
                    onBlur={e => touch("budget_total", e.target.value)}
                    className={cls("budget_total")}
                    placeholder="10,000" />
                  {fieldErr("budget_total")}
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <select value={data.budget_currency} onChange={e => set("budget_currency", e.target.value)}
                    className={`${baseCls} ${okCls}`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start Date <Req /></label>
                  <input type="date" value={data.start_at}
                    onChange={e => set("start_at", e.target.value)}
                    onBlur={e => touch("start_at", e.target.value)}
                    className={cls("start_at")} />
                  {fieldErr("start_at")}
                </div>
                <div>
                  <label className={labelCls}>End Date <Req /></label>
                  <input type="date" value={data.end_at}
                    onChange={e => set("end_at", e.target.value)}
                    onBlur={e => touch("end_at", e.target.value)}
                    className={cls("end_at")} />
                  {fieldErr("end_at")}
                </div>
              </div>

              <div>
                <label className={labelCls}>Budget Owner <Req /></label>
                <select value={data.budget_owner_id}
                  onChange={e => {
                    const m = members.find(x => x.id === e.target.value);
                    set("budget_owner_id", e.target.value);
                    set("budget_owner_name", m ? (m.full_name || m.email) : "");
                  }}
                  onBlur={e => touch("budget_owner_id", e.target.value)}
                  className={cls("budget_owner_id")}>
                  <option value="">Select budget owner…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email} ({m.role})</option>)}
                </select>
                {fieldErr("budget_owner_id")}
              </div>
            </>
          )}

          {/* STEP 3 — CHANNELS & CREATIVE */}
          {step === 3 && (
            <>
              <StepHeader icon={Megaphone} title="Channels & Creative"
                subtitle="Where will this run and what will it say?" />

              <div>
                <label className={labelCls}>Ad Platforms{optionalTag}</label>
                <div className="flex gap-3">
                  {PLATFORMS.map(p => (
                    <button key={p} type="button" onClick={() => toggleArr("platforms", p)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                        data.platforms.includes(p)
                          ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Target Countries{optionalTag}</label>
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
                <label className={labelCls}>Landing Page URL <Req /></label>
                <input type="url" value={data.landing_page_url}
                  onChange={e => set("landing_page_url", e.target.value)}
                  onBlur={e => touch("landing_page_url", e.target.value)}
                  className={cls("landing_page_url")}
                  placeholder="https://…" />
                {fieldErr("landing_page_url")}
              </div>

              <div>
                <label className={labelCls}>Ad Copy{optionalTag}</label>
                <textarea rows={3} value={data.copy_text} onChange={e => set("copy_text", e.target.value)}
                  className={`${baseCls} ${okCls} resize-none`}
                  placeholder="Your main ad copy or caption…" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Headline{optionalTag}</label>
                  <input value={data.headline} onChange={e => set("headline", e.target.value)}
                    className={`${baseCls} ${okCls}`} placeholder="e.g. Discover More" />
                </div>
                <div>
                  <label className={labelCls}>CTA{optionalTag}</label>
                  <input value={data.cta_text} onChange={e => set("cta_text", e.target.value)}
                    className={`${baseCls} ${okCls}`} placeholder="e.g. Shop Now" />
                </div>
              </div>
            </>
          )}

          {/* STEP 4 — REVIEW */}
          {step === 4 && (
            <>
              <StepHeader icon={ClipboardCheck} title="Review & Submit"
                subtitle="Confirm everything looks right before requesting approval." />

              {missing.length > 0 && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {missing.length} required field{missing.length > 1 ? "s" : ""} incomplete — go back to fill in
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map(f => (
                      <span key={f.label} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <ReviewSection title="Brief">
                  <ReviewRow label="Name"      value={data.name || "—"}                                                      missing={!data.name} />
                  <ReviewRow label="Type"      value={CAMPAIGN_TYPES.find(t => t.value === data.campaign_type)?.label || ""} />
                  <ReviewRow label="Objective" value={OBJECTIVES.find(o => o.value === data.objective)?.label || "—"}        missing={!data.objective} />
                  <ReviewRow label="Region"    value={data.region || "Global"} />
                  <ReviewRow label="Manager"   value={data.campaign_manager_name || "Not assigned"} />
                </ReviewSection>

                <ReviewSection title="Budget">
                  <ReviewRow label="Amount"   value={data.budget_total ? `${data.budget_currency} ${parseFloat(data.budget_total).toLocaleString()}` : "—"} missing={!data.budget_total} />
                  <ReviewRow label="Schedule" value={data.start_at && data.end_at ? `${data.start_at} → ${data.end_at}` : "—"} missing={!data.start_at || !data.end_at} />
                  <ReviewRow label="Owner"    value={data.budget_owner_name || "—"} missing={!data.budget_owner_id} />
                </ReviewSection>

                <ReviewSection title="Channels">
                  <ReviewRow label="Platforms"    value={data.platforms.join(", ") || "None selected"} />
                  <ReviewRow label="Countries"    value={data.geography.join(", ") || "All"} />
                  <ReviewRow label="Landing Page" value={data.landing_page_url || "—"} missing={!data.landing_page_url} />
                </ReviewSection>
              </div>

              {missing.length === 0 && (
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                  <p className="text-indigo-400 text-xs font-semibold mb-1">What happens next</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Your campaign goes into review. Once approved by the workspace owner you can launch it and start linking published posts.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push("/campaigns")}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button onClick={handleNext} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleRequestApproval}
              disabled={submitting || !campaignId || missing.length > 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Request Approval
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="pb-3 border-b border-zinc-800">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <p className="text-xs text-zinc-500 ml-9">{subtitle}</p>
    </div>
  );
}

function Req() {
  return <span className="text-rose-500 font-bold"> *</span>;
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-800/40 last:border-0">
      <span className="text-xs text-zinc-500 font-semibold shrink-0 w-32">{label}</span>
      <span className={`text-xs text-right leading-relaxed ${missing ? "text-amber-400 font-semibold" : "text-zinc-300"}`}>
        {missing && "⚠ "}{value}
      </span>
    </div>
  );
}

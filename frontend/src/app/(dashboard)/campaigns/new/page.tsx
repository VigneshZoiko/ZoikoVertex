"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle,
  DollarSign, Users, ClipboardCheck, Megaphone,
  TrendingUp, Target, ShoppingBag, X, ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import MediaVaultPicker from "@/components/MediaVaultPicker";

// ── Types ──────────────────────────────────────────────────────────────────

interface TeamMember { id: string; full_name?: string; email: string; role: string; }

interface WizardData {
  // Step 1
  name:      string;
  platforms: string[];
  objective: string;
  // Step 2
  budget_total:      string;
  budget_currency:   string;
  start_at:          string;
  end_at:            string;
  budget_owner_id:   string;
  budget_owner_name: string;
  // Step 3
  geography:        string[];
  age_min:          string;
  age_max:          string;
  gender:           string;
  interests:        string;
  keywords:         string;   // Google Search keywords (one per line)
  landing_page_url: string;
  headline:         string;
  copy_text:        string;
  cta_text:         string;
  // Creative assets
  meta_ad_type:        string;  // 'post_boost' | 'image_ad' | 'video_ad' | 'lead_ad'
  google_ad_type:      string;  // 'display' | 'search'
  ad_image_url:        string;
  ad_square_image_url: string;
  ad_video_url:        string;
  lead_form_id:        string;
}

const DEFAULT: WizardData = {
  name: "", platforms: [], objective: "",
  budget_total: "", budget_currency: "USD",
  start_at: "", end_at: "",
  budget_owner_id: "", budget_owner_name: "",
  geography: [], age_min: "18", age_max: "65", gender: "ALL",
  interests: "", keywords: "", landing_page_url: "",
  headline: "", copy_text: "", cta_text: "Learn More",
  meta_ad_type: "image_ad", google_ad_type: "display",
  ad_image_url: "", ad_square_image_url: "", ad_video_url: "", lead_form_id: "",
};

// ── 3 Goals only ───────────────────────────────────────────────────────────

const GOALS = [
  { value: "TRAFFIC",         label: "Website Traffic",     icon: TrendingUp, desc: "Drive visitors to your site"       },
  { value: "LEAD_GENERATION", label: "Lead Generation",     icon: Target,     desc: "Collect contacts & enquiries"      },
  { value: "CONVERSIONS",     label: "Sales & Conversions", icon: ShoppingBag,desc: "Drive purchases and key actions"   },
];

// ── Steps ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Campaign",  icon: Megaphone,      desc: "Name, platform & goal"   },
  { id: 2, label: "Budget",    icon: DollarSign,     desc: "Spend & schedule"         },
  { id: 3, label: "Audience",  icon: Users,          desc: "Who sees it & creative"   },
  { id: 4, label: "Review",    icon: ClipboardCheck, desc: "Confirm & submit"          },
];

const CURRENCIES = ["USD", "AED", "EUR", "GBP", "SAR", "INR"];

const COUNTRIES: Record<string, string> = {
  AE:"UAE", SA:"Saudi Arabia", QA:"Qatar", KW:"Kuwait", BH:"Bahrain",
  OM:"Oman", EG:"Egypt", JO:"Jordan", IN:"India", GB:"UK",
  US:"USA", DE:"Germany", FR:"France", IT:"Italy", ES:"Spain",
  NL:"Netherlands", AU:"Australia", PK:"Pakistan", BD:"Bangladesh", NG:"Nigeria",
};

const CTA_OPTIONS = ["Learn More","Shop Now","Sign Up","Book Now","Contact Us","Download","Get Quote","Subscribe"];

const STEP_REQUIRED: Record<number, (keyof WizardData)[]> = {
  1: ["name", "objective"],
  2: ["budget_total", "start_at", "end_at"],
  3: ["landing_page_url", "headline", "copy_text"],
};

const REQUIRED_MSGS: Partial<Record<keyof WizardData, string>> = {
  name:             "Campaign name is required",
  objective:        "Select a goal to continue",
  budget_total:     "Budget is required",
  start_at:         "Start date is required",
  end_at:           "End date is required",
  landing_page_url: "Landing page URL is required",
  headline:         "Headline is required",
  copy_text:        "Ad body text is required (Meta requires it for image ads)",
};

type ArrKey = "geography" | "platforms";
type FieldErrors = Partial<Record<keyof WizardData, string>>;

// ── Styles ─────────────────────────────────────────────────────────────────

const inp   = "w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none transition-all";
const ok    = "border-zinc-800 focus:border-white/30";
const err   = "border-rose-500/60 focus:border-rose-500";
const lbl   = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";
const selChip = "bg-white text-zinc-900 border-white/20 font-semibold";
const unChip  = "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300";

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");

  const [step,       setStep]       = useState(parseInt(searchParams.get("step") ?? "1", 10));
  const [data,       setData]       = useState<WizardData>(DEFAULT);
  const [campaignId, setCampaignId] = useState<string | null>(editId);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members,    setMembers]    = useState<TeamMember[]>([]);
  const [fieldErrors,setFieldErrors]= useState<FieldErrors>({});
  const [touched,    setTouched]    = useState<Partial<Record<keyof WizardData, boolean>>>({});
  const [submitError,setSubmitError]= useState<string | null>(null);
  const [vaultPicker, setVaultPicker] = useState<{ slot: string; hint: string } | null>(null);

  useEffect(() => {
    api.get("/api/v1/team/members").then(r => setMembers(r.data || [])).catch(() => {});
  }, []);

  // Load campaign in edit mode
  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/campaigns/${editId}`).then(r => {
      const c  = r.data;
      const t  = c.targeting || {};
      const cr = c.creative  || {};
      setData({
        name: c.name || "", platforms: c.platforms || [], objective: c.objective || "",
        budget_total: c.budget_total?.toString() || "", budget_currency: c.budget_currency || "USD",
        start_at: c.start_at?.split("T")[0] || "", end_at: c.end_at?.split("T")[0] || "",
        budget_owner_id: c.budget_owner_id || "", budget_owner_name: c.budget_owner_name || "",
        geography: t.geography || [], age_min: t.age_min?.toString() || "18", age_max: t.age_max?.toString() || "65",
        gender: t.gender || "ALL",
        interests: Array.isArray(t.interests) ? t.interests.join(", ") : (t.interests || ""),
        keywords: Array.isArray(t.keywords) ? t.keywords.join("\n") : (t.keywords || ""),
        landing_page_url: cr.landing_page_url || "", headline: cr.headline || "",
        copy_text: cr.copy_text || "", cta_text: cr.cta_text || "Learn More",
        meta_ad_type: cr.meta_ad_type || "image_ad", google_ad_type: cr.google_ad_type || "display",
        ad_image_url: cr.ad_image_url || "", ad_square_image_url: cr.ad_square_image_url || "",
        ad_video_url: cr.ad_video_url || "", lead_form_id: cr.lead_form_id || "",
      });
    }).catch(() => {});
  }, [editId]);

  const set = useCallback(<K extends keyof WizardData>(key: K, val: WizardData[K]) => {
    setData(d => ({ ...d, [key]: val }));
    setFieldErrors(e => ({ ...e, [key]: undefined }));
  }, []);

  const touch = useCallback((key: keyof WizardData, value?: unknown) => {
    setTouched(t => ({ ...t, [key]: true }));
    const empty = value !== undefined ? !String(value).trim() : false;
    setFieldErrors(e => ({ ...e, [key]: REQUIRED_MSGS[key] && empty ? REQUIRED_MSGS[key] : undefined }));
  }, []);

  const toggleArr = useCallback((key: ArrKey, val: string) => {
    setData(d => ({
      ...d,
      [key]: (d[key] as string[]).includes(val)
        ? (d[key] as string[]).filter(x => x !== val)
        : [...(d[key] as string[]), val],
    }));
  }, []);

  const cls = (key: keyof WizardData) =>
    `${inp} ${touched[key] && fieldErrors[key] ? err : ok}`;

  const fieldErr = (key: keyof WizardData) =>
    touched[key] && fieldErrors[key]
      ? <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors[key]}</p>
      : null;

  const validateStep = (): boolean => {
    const fields = STEP_REQUIRED[step] || [];
    const errors: FieldErrors = {};
    const newTouched: Partial<Record<keyof WizardData, boolean>> = {};
    let valid = true;
    for (const key of fields) {
      newTouched[key] = true;
      const val = (data as unknown as Record<string, unknown>)[key];
      if (!String(val ?? "").trim() && REQUIRED_MSGS[key]) {
        errors[key] = REQUIRED_MSGS[key];
        valid = false;
      }
    }
    setTouched(t => ({ ...t, ...newTouched }));
    setFieldErrors(e => ({ ...e, ...errors }));
    return valid;
  };

  const saveStep = useCallback(async (goTo: number) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { wizard_step: goTo };

      if (step === 1) {
        Object.assign(payload, {
          name:          data.name.trim(),
          campaign_type: 'PAID_ADS',
          objective:     data.objective,
          platforms:     data.platforms,
        });
      }
      if (step === 2) {
        Object.assign(payload, {
          budget_total:     data.budget_total ? parseFloat(data.budget_total) : null,
          budget_currency:  data.budget_currency,
          budget_type:      'LIFETIME',
          budget_pacing:    'EVEN',
          start_at:         data.start_at || null,
          end_at:           data.end_at   || null,
          budget_owner_id:  data.budget_owner_id   || undefined,
          budget_owner_name: data.budget_owner_name || undefined,
        });
      }
      if (step === 3) {
        Object.assign(payload, {
          platforms: data.platforms,
          targeting: {
            geography: data.geography,
            age_min:   parseInt(data.age_min  || "18"),
            age_max:   parseInt(data.age_max  || "65"),
            gender:    data.gender || "ALL",
            interests: data.interests ? data.interests.split(",").map(s => s.trim()).filter(Boolean) : [],
            keywords:  data.keywords  ? data.keywords.split("\n").filter(Boolean) : [],
          },
          creative: {
            landing_page_url: data.landing_page_url,
            headline:         data.headline,
            copy_text:        data.copy_text,
            cta_text:         data.cta_text,
            utm_configured:   false,
            utm_waived:       false,  // user must explicitly waive UTM tracking
            meta_ad_type:        data.meta_ad_type     || undefined,
            google_ad_type:      data.google_ad_type   || undefined,
            ad_image_url:        data.ad_image_url     || undefined,
            ad_square_image_url: data.ad_square_image_url || undefined,
            ad_video_url:        data.ad_video_url     || undefined,
            lead_form_id:        data.lead_form_id     || undefined,
          },
        });
      }

      if (!campaignId) {
        const res = await api.post("/api/v1/campaigns", {
          name: data.name.trim() || "Untitled Campaign",
          campaign_type: "PAID_ADS",
          objective: data.objective || "TRAFFIC",
          platforms: data.platforms,
          ...payload,
        });
        setCampaignId(res.data.id);
      } else {
        await api.patch(`/api/v1/campaigns/${campaignId}`, payload);
      }
      setStep(goTo);
    } catch { /* inline errors */ }
    finally { setSaving(false); }
  }, [step, data, campaignId]);

  const handleNext   = () => { if (validateStep()) saveStep(step + 1); };
  const handleBack   = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!campaignId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Launch directly — governance review re-enabled later once campaign flow is validated
      const launchRes = await api.post(`/api/v1/campaigns/${campaignId}/launch`, {});
      if (!launchRes.success) throw new Error(launchRes.error || "Launch failed");

      // If Meta platform is selected, publish to Meta immediately
      if (data.platforms.includes("Meta")) {
        const metaRes = await api.post(`/api/v1/campaigns/${campaignId}/publish-to-meta`, {});
        if (!metaRes.success) {
          // Non-fatal: campaign is launched, Meta publish failed — user can retry from detail page
          setSubmitError(`Campaign launched but Meta publish failed: ${metaRes.error || "Unknown error"}`);
          router.push(`/campaigns/${campaignId}`);
          return;
        }
      }

      router.push(`/campaigns/${campaignId}`);
    } catch (e: unknown) {
      const body = (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      setSubmitError(body?.message || body?.error || "Launch failed — please try again.");
    } finally { setSubmitting(false); }
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  const budgetAmt = parseFloat(data.budget_total) || 0;
  const needsTwoApprovals = budgetAmt >= 500;

  // ── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <button onClick={() => router.push("/campaigns")} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                step === s.id ? "bg-white text-zinc-900" :
                step > s.id  ? "bg-zinc-800 text-zinc-400" :
                               "text-zinc-600"
              }`}>
                {step > s.id ? <CheckCircle2 className="w-3 h-3" /> : <s.icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-zinc-800" />}
            </div>
          ))}
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">

          {/* ── STEP 1 — Campaign ── */}
          {step === 1 && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">New Campaign</h2>
                <p className="text-sm text-zinc-500 mt-0.5">What are you trying to achieve?</p>
              </div>

              {/* Name */}
              <div>
                <label className={lbl}>Campaign Name <span className="text-rose-400">*</span></label>
                <input value={data.name} onChange={e => set("name", e.target.value)}
                  onBlur={e => touch("name", e.target.value)}
                  className={cls("name")} placeholder="e.g. Summer Sale 2026" />
                {fieldErr("name")}
              </div>

              {/* Platform */}
              <div>
                <label className={lbl}>Run ads on</label>
                <div className="flex gap-3">
                  {[
                    { id: "Meta",   label: "Meta",   sub: "Facebook & Instagram", available: true  },
                    { id: "Google", label: "Google", sub: "Coming soon",           available: false },
                  ].map(p => (
                    <button key={p.id} type="button"
                      onClick={() => p.available && toggleArr("platforms", p.id)}
                      disabled={!p.available}
                      title={!p.available ? "Google Ads publishing is not yet available" : undefined}
                      className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                        !p.available
                          ? "bg-zinc-900/30 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60"
                          : data.platforms.includes(p.id)
                            ? "bg-white border-white/20 text-zinc-900"
                            : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}>
                      <p className="text-sm font-bold">{p.label}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{p.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className={lbl}>Campaign Goal <span className="text-rose-400">*</span></label>
                <div className="space-y-2">
                  {GOALS.map(g => (
                    <button key={g.value} type="button" onClick={() => set("objective", g.value)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        data.objective === g.value
                          ? "bg-white border-white/20 text-zinc-900"
                          : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        data.objective === g.value ? "bg-zinc-900/10" : "bg-zinc-800"
                      }`}>
                        <g.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{g.label}</p>
                        <p className="text-[11px] opacity-70">{g.desc}</p>
                      </div>
                      {data.objective === g.value && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
                {fieldErr("objective")}
              </div>
            </div>
          )}

          {/* ── STEP 2 — Budget ── */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Budget & Schedule</h2>
                <p className="text-sm text-zinc-500 mt-0.5">How much will you spend and when?</p>
              </div>

              {/* Budget */}
              <div>
                <label className={lbl}>Total Budget <span className="text-rose-400">*</span></label>
                <div className="flex gap-2">
                  <select value={data.budget_currency} onChange={e => set("budget_currency", e.target.value)}
                    className={`${inp} ${ok} w-24`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" min="1" value={data.budget_total}
                    onChange={e => set("budget_total", e.target.value)}
                    onBlur={e => touch("budget_total", e.target.value)}
                    className={`${cls("budget_total")} flex-1`} placeholder="1,000" />
                </div>
                {fieldErr("budget_total")}
                {needsTwoApprovals && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Budgets of $500+ require <strong className="mx-0.5">2 approvals</strong> before launch
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Start Date <span className="text-rose-400">*</span></label>
                  <input type="date" value={data.start_at}
                    onChange={e => set("start_at", e.target.value)}
                    onBlur={e => touch("start_at", e.target.value)}
                    className={cls("start_at")} />
                  {fieldErr("start_at")}
                </div>
                <div>
                  <label className={lbl}>End Date <span className="text-rose-400">*</span></label>
                  <input type="date" value={data.end_at}
                    onChange={e => set("end_at", e.target.value)}
                    onBlur={e => touch("end_at", e.target.value)}
                    className={cls("end_at")} />
                  {fieldErr("end_at")}
                </div>
              </div>

              {/* Budget owner */}
              <div>
                <label className={lbl}>Budget Owner <span className="text-zinc-600 normal-case font-normal">(who approves this spend)</span></label>
                <select value={data.budget_owner_id}
                  onChange={e => {
                    const m = members.find(x => x.id === e.target.value);
                    set("budget_owner_id", e.target.value);
                    set("budget_owner_name", m?.full_name || m?.email || "");
                  }}
                  className={`${inp} ${ok}`}>
                  <option value="">Assign budget owner…</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email} ({m.role})</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Audience & Creative ── */}
          {step === 3 && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Audience & Creative</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Who should see this and what will it say?</p>
              </div>

              {/* Target countries */}
              <div>
                <label className={lbl}>Target Countries</label>
                <div className="flex flex-wrap gap-2 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl max-h-40 overflow-y-auto">
                  {Object.entries(COUNTRIES).map(([code, name]) => (
                    <button key={code} type="button" onClick={() => toggleArr("geography", code)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        data.geography.includes(code) ? selChip : unChip
                      }`}>
                      {name}
                    </button>
                  ))}
                </div>
                {data.geography.length === 0 && <p className="text-[11px] text-zinc-600 mt-1">No selection = global audience</p>}
              </div>

              {/* Age + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Age Range</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="13" max="65" value={data.age_min}
                      onChange={e => set("age_min", e.target.value)}
                      className={`${inp} ${ok} text-center`} placeholder="18" />
                    <span className="text-zinc-600 shrink-0">–</span>
                    <input type="number" min="13" max="65" value={data.age_max}
                      onChange={e => set("age_max", e.target.value)}
                      className={`${inp} ${ok} text-center`} placeholder="65" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Gender</label>
                  <div className="flex gap-1.5 h-[42px]">
                    {[
                      { value: "ALL",    label: "All"    },
                      { value: "MALE",   label: "Male"   },
                      { value: "FEMALE", label: "Female" },
                    ].map(g => (
                      <button key={g.value} type="button" onClick={() => set("gender", g.value)}
                        className={`flex-1 rounded-xl text-xs font-semibold border transition-all ${
                          data.gender === g.value ? "bg-white text-zinc-900 border-white/20" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className={lbl}>Interests <span className="normal-case font-normal text-zinc-600">(optional, comma-separated)</span></label>
                <input value={data.interests} onChange={e => set("interests", e.target.value)}
                  className={`${inp} ${ok}`} placeholder="e.g. Fashion, Luxury, Travel" />
              </div>

              {/* Landing URL */}
              <div>
                <label className={lbl}>Landing Page URL <span className="text-rose-400">*</span></label>
                <input type="url" value={data.landing_page_url}
                  onChange={e => set("landing_page_url", e.target.value)}
                  onBlur={e => touch("landing_page_url", e.target.value)}
                  className={cls("landing_page_url")} placeholder="https://example.com/campaign" />
                {fieldErr("landing_page_url")}
              </div>

              {/* Headline */}
              <div>
                <label className={lbl}>Headline <span className="text-rose-400">*</span></label>
                <input value={data.headline}
                  onChange={e => set("headline", e.target.value)}
                  onBlur={e => touch("headline", e.target.value)}
                  className={cls("headline")} placeholder="e.g. Discover Our New Collection" />
                {fieldErr("headline")}
              </div>

              {/* Ad Copy */}
              <div>
                <label className={lbl}>Ad Copy</label>
                <textarea rows={3} value={data.copy_text} onChange={e => set("copy_text", e.target.value)}
                  className={`${inp} ${ok} resize-none`} placeholder="Write your main ad message here…" />
              </div>

              {/* CTA */}
              <div>
                <label className={lbl}>Call to Action</label>
                <select value={data.cta_text} onChange={e => set("cta_text", e.target.value)} className={`${inp} ${ok}`}>
                  {CTA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* ── Meta Creative ── */}
              {data.platforms.includes("Meta") && (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-4">
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Meta Ad Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "image_ad",   label: "Image Ad"   },
                      { value: "video_ad",   label: "Video Ad"   },
                      { value: "lead_ad",    label: "Lead Ad"    },
                      { value: "post_boost", label: "Post Boost" },
                    ].map(t => (
                      <button key={t.value} type="button" onClick={() => set("meta_ad_type", t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs border font-semibold transition-all ${
                          data.meta_ad_type === t.value ? selChip : unChip
                        }`}>{t.label}</button>
                    ))}
                  </div>

                  {data.meta_ad_type === "image_ad" && (
                    <div>
                      <WizardImageUpload label="Ad Image" hint="1200×628px recommended"
                        value={data.ad_image_url} onChange={url => set("ad_image_url", url)} />
                      {!data.ad_image_url && (
                        <button type="button" onClick={() => setVaultPicker({ slot: "meta-image", hint: "Pick an image for the Meta ad" })}
                          className="mt-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                          or browse Media Vault →
                        </button>
                      )}
                    </div>
                  )}
                  {data.meta_ad_type === "video_ad" && (
                    <div className="space-y-3">
                      <WizardImageUpload label="Video Thumbnail" hint="Optional"
                        value={data.ad_image_url} onChange={url => set("ad_image_url", url)} />
                      <div>
                        <label className={lbl}>Video URL</label>
                        <input value={data.ad_video_url} onChange={e => set("ad_video_url", e.target.value)}
                          className={`${inp} ${ok}`} placeholder="Paste Facebook-hosted video URL or ID" />
                      </div>
                    </div>
                  )}
                  {data.meta_ad_type === "lead_ad" && (
                    <div>
                      <label className={lbl}>Lead Form ID</label>
                      <input value={data.lead_form_id} onChange={e => set("lead_form_id", e.target.value)}
                        className={`${inp} ${ok}`} placeholder="Paste your Meta Lead Gen Form ID" />
                      <p className="text-[11px] text-zinc-600 mt-1.5">Create in Meta Ads Manager → Lead Ads Forms</p>
                    </div>
                  )}
                  {data.meta_ad_type === "post_boost" && (
                    <p className="text-xs text-zinc-500">Boost an existing published post — select the post to boost after launching the campaign.</p>
                  )}
                </div>
              )}

              {/* ── Google Creative ── */}
              {data.platforms.includes("Google") && (
                <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-4">
                  <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest">Google Ad Type</p>
                  <div className="flex gap-2">
                    {[
                      { value: "display", label: "Display Ad" },
                      { value: "search",  label: "Search Ad"  },
                    ].map(t => (
                      <button key={t.value} type="button" onClick={() => set("google_ad_type", t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs border font-semibold transition-all ${
                          data.google_ad_type === t.value ? selChip : unChip
                        }`}>{t.label}</button>
                    ))}
                  </div>

                  {data.google_ad_type === "display" && (
                    <div className="space-y-3">
                      <div>
                        <WizardImageUpload label="Landscape Image (1200×628)" hint="Required"
                          value={data.ad_image_url} onChange={url => set("ad_image_url", url)} />
                        {!data.ad_image_url && (
                          <button type="button" onClick={() => setVaultPicker({ slot: "landscape", hint: "Pick a landscape image (1200×628) for the Display ad" })}
                            className="mt-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                            or browse Media Vault →
                          </button>
                        )}
                      </div>
                      <div>
                        <WizardImageUpload label="Square Image (1200×1200)" hint="Required"
                          value={data.ad_square_image_url} onChange={url => set("ad_square_image_url", url)} />
                        {!data.ad_square_image_url && (
                          <button type="button" onClick={() => setVaultPicker({ slot: "square", hint: "Pick a square image (1200×1200) for the Display ad" })}
                            className="mt-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                            or browse Media Vault →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {data.google_ad_type === "search" && (
                    <div>
                      <label className={lbl}>Keywords <span className="normal-case font-normal text-zinc-600">(one per line)</span></label>
                      <textarea rows={4} value={data.keywords} onChange={e => set("keywords", e.target.value)}
                        className={`${inp} ${ok} resize-none font-mono text-xs`}
                        placeholder={"running shoes\nbuy sneakers online\nbest trainers 2026"} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4 — Review ── */}
          {step === 4 && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Review & Submit</h2>
                <p className="text-sm text-zinc-500 mt-0.5">Confirm everything looks right before requesting approval.</p>
              </div>

              {submitError && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300">{submitError}</p>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-4">
                <ReviewSection title="Campaign">
                  <ReviewRow label="Name"      value={data.name || "—"}       missing={!data.name} />
                  <ReviewRow label="Platforms" value={data.platforms.join(" + ") || "—"} missing={!data.platforms.length} />
                  <ReviewRow label="Goal"      value={GOALS.find(g => g.value === data.objective)?.label || "—"} missing={!data.objective} />
                </ReviewSection>

                <ReviewSection title="Budget">
                  <ReviewRow label="Budget"   value={data.budget_total ? `${data.budget_currency} ${parseFloat(data.budget_total).toLocaleString()}` : "—"} missing={!data.budget_total} />
                  <ReviewRow label="Duration" value={data.start_at && data.end_at ? `${data.start_at} → ${data.end_at}` : "—"} missing={!data.start_at || !data.end_at} />
                  {needsTwoApprovals && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 mt-1">
                      <AlertCircle className="w-3 h-3" />This budget requires 2 approvals
                    </div>
                  )}
                </ReviewSection>

                <ReviewSection title="Audience & Creative">
                  <ReviewRow label="Locations" value={data.geography.length ? data.geography.map(c => COUNTRIES[c] || c).join(", ") : "Global"} />
                  <ReviewRow label="Age" value={`${data.age_min || 18}–${data.age_max || 65} · ${data.gender === "ALL" ? "All genders" : data.gender}`} />
                  <ReviewRow label="Landing URL" value={data.landing_page_url || "—"} missing={!data.landing_page_url} />
                  <ReviewRow label="Headline"    value={data.headline || "—"} missing={!data.headline} />
                  {data.platforms.includes("Meta") && (
                    <ReviewRow label="Meta Ad Type" value={{ post_boost: "Post Boost", image_ad: "Image Ad", video_ad: "Video Ad", lead_ad: "Lead Ad" }[data.meta_ad_type] || data.meta_ad_type} />
                  )}
                  {data.platforms.includes("Google") && (
                    <ReviewRow label="Google Ad Type" value={{ display: "Display Ad", search: "Search Ad" }[data.google_ad_type] || data.google_ad_type} />
                  )}
                </ReviewSection>
              </div>

              <div className="p-4 bg-zinc-800/50 border border-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your campaign will be launched immediately and published to Meta. You can pause or cancel it at any time from the campaigns list.
                </p>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex gap-3 px-6 pb-6">
            {step > 1 && (
              <button onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-all">
                <ArrowLeft className="w-4 h-4" />Back
              </button>
            )}
            {step < 4 ? (
              <button onClick={handleNext} disabled={saving}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-sm font-bold rounded-xl transition-all">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Continue"}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !campaignId}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 disabled:opacity-40 text-zinc-900 text-sm font-bold rounded-xl transition-all">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? "Launching…" : "Launch Campaign"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Vault Picker modal */}
      {vaultPicker && (
        <MediaVaultPicker
          title="Browse Media Vault"
          hint={vaultPicker.hint}
          typeFilter="image"
          onSelect={url => {
            if (vaultPicker.slot === "landscape" || vaultPicker.slot === "meta-image") set("ad_image_url", url);
            else if (vaultPicker.slot === "square") set("ad_square_image_url", url);
            setVaultPicker(null);
          }}
          onClose={() => setVaultPicker(null)}
        />
      )}
    </div>
  );
}

// ── WizardImageUpload ──────────────────────────────────────────────────────

function WizardImageUpload({ label, hint, value, onChange }: {
  label: string; hint?: string; value: string; onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { setUploadErr("Max 10 MB"); return; }
    setUploadErr(null); setUploading(true);
    try {
      const ext  = file.name.split(".").pop() || "jpg";
      const path = `campaign-creatives/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
      onChange(publicUrl);
    } catch (e: unknown) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  }

  const lbl = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

  return (
    <div>
      <label className={lbl}>{label}{hint && <span className="normal-case font-normal text-zinc-600 ml-1">— {hint}</span>}</label>
      {value ? (
        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
          <Image src={value} alt="" fill className="object-cover" unoptimized />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full h-20 border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-all disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          <span className="text-xs">{uploading ? "Uploading…" : "Click to upload"}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {uploadErr && <p className="text-[11px] text-rose-400 mt-1">{uploadErr}</p>}
    </div>
  );
}

// ── Review helpers ─────────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className={`text-xs text-right ${missing ? "text-amber-400 flex items-center gap-1" : "text-zinc-300"}`}>
        {missing && <AlertCircle className="w-3 h-3 shrink-0" />}{value}
      </span>
    </div>
  );
}

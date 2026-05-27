"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle,
  ChevronDown, ChevronUp,
  Globe, TrendingUp, MessageSquare, Target, ShoppingBag,
  DollarSign, Users, ClipboardCheck, Megaphone, Info,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface TeamMember { id: string; full_name?: string; email: string; role: string; }

interface WizardData {
  // Step 1 — Identity
  name: string;
  platforms: string[];
  objective: string;
  campaign_subtype: string;
  special_ad_category: string;
  region: string;
  // Step 2 — Budget
  post_limit: string;
  auto_boost_enabled: boolean;
  boost_per_post_budget: string;
  budget_total: string;
  budget_currency: string;
  budget_type: string;
  start_at: string;
  end_at: string;
  bidding_strategy: string;
  budget_owner_id: string;
  budget_owner_name: string;
  daily_budget_cap: string;
  // Step 3 — Audience & Creative
  geography: string[];
  age_min: string;
  age_max: string;
  gender: string;
  languages: string[];
  interests: string;
  placements: string[];
  networks: string[];
  device_targeting: string[];
  keywords: string;
  landing_page_url: string;
  headline: string;
  headline_2: string;
  copy_text: string;
  description: string;
  cta_text: string;
  display_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign_param: string;
  facebook_page_id: string;
  instagram_account_id: string;
}

const DEFAULT: WizardData = {
  name: "", platforms: [], objective: "",
  campaign_subtype: "", special_ad_category: "NONE",
  region: "",
  post_limit: "", auto_boost_enabled: false, boost_per_post_budget: "",
  budget_total: "", budget_currency: "USD", budget_type: "LIFETIME",
  start_at: "", end_at: "", bidding_strategy: "",
  budget_owner_id: "", budget_owner_name: "", daily_budget_cap: "",
  geography: [], age_min: "18", age_max: "65", gender: "ALL",
  languages: [], interests: "",
  placements: [], networks: [], device_targeting: [],
  keywords: "", landing_page_url: "",
  headline: "", headline_2: "", copy_text: "", description: "",
  cta_text: "Learn More", display_url: "",
  utm_source: "", utm_medium: "", utm_campaign_param: "",
  facebook_page_id: "", instagram_account_id: "",
};

// ── Campaign Goals (planning labels — stored for analytics & reporting) ────

const GOALS = [
  { value: "BRAND_AWARENESS", label: "Brand Awareness",     icon: Globe,         desc: "Increase visibility and recall",   platforms: ["Meta","Google"] },
  { value: "TRAFFIC",         label: "Website Traffic",     icon: TrendingUp,    desc: "Drive visitors to your site",      platforms: ["Meta","Google"] },
  { value: "LEAD_GENERATION", label: "Lead Generation",     icon: Target,        desc: "Collect contacts & enquiries",     platforms: ["Meta","Google"] },
  { value: "CONVERSIONS",     label: "Sales & Conversions", icon: ShoppingBag,   desc: "Drive purchases and key actions",  platforms: ["Meta","Google"] },
  { value: "POST_ENGAGEMENT", label: "Engagement",          icon: MessageSquare, desc: "Likes, comments, shares, saves",   platforms: ["Meta"] },
];

const getGoals = (selected: string[]) => {
  if (selected.length === 0) return GOALS;
  return GOALS.filter(g => g.platforms.some(p => selected.includes(p)));
};

// ── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identity", icon: Megaphone,      desc: "Name, platform & goal"  },
  { id: 2, label: "Budget",   icon: DollarSign,     desc: "Spend & schedule"        },
  { id: 3, label: "Reach",    icon: Users,          desc: "Audience & creative"     },
  { id: 4, label: "Review",   icon: ClipboardCheck, desc: "Confirm & submit"        },
];

const CURRENCIES        = ["USD", "AED", "EUR", "GBP", "SAR", "INR"];
const REGIONS           = ["Global","UAE","KSA","Qatar","Kuwait","Bahrain","Oman","Egypt","Jordan","India","UK","USA","EU"];
const COUNTRIES: Record<string, string> = {
  AE:"UAE", SA:"Saudi Arabia", QA:"Qatar", KW:"Kuwait", BH:"Bahrain",
  OM:"Oman", EG:"Egypt", JO:"Jordan", IN:"India", GB:"UK",
  US:"USA", DE:"Germany", FR:"France", IT:"Italy", ES:"Spain",
  NL:"Netherlands", AU:"Australia", PK:"Pakistan", BD:"Bangladesh", NG:"Nigeria",
};
const LANGUAGES         = ["English","Arabic","French","German","Spanish","Hindi","Urdu","Turkish","Portuguese","Italian"];
const META_PLACEMENTS   = ["Facebook Feed","Instagram Feed","Facebook Stories","Instagram Stories","Facebook Reels","Instagram Reels","Messenger","Audience Network"];
const GOOGLE_NETWORKS   = ["Search Network","Display Network","YouTube","Gmail","Maps"];
const DEVICE_OPTIONS    = ["Mobile","Desktop","Tablet"];
const CTA_OPTIONS       = ["Learn More","Shop Now","Sign Up","Book Now","Contact Us","Download","Get Quote","Subscribe","Watch More","Apply Now","Get Directions","Call Now","Get Offer","Order Now"];
const SUBTYPES_GOOGLE   = ["Search","Display","Video (YouTube)","Shopping","Smart","Performance Max"];
const SUBTYPES_META     = ["Auction","Reservation"];
const SPECIAL_AD_CATS   = [
  { value: "NONE",                      label: "None — standard campaign"        },
  { value: "CREDIT",                    label: "Credit"                          },
  { value: "EMPLOYMENT",                label: "Employment"                      },
  { value: "HOUSING",                   label: "Housing"                         },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "Social Issues / Politics"        },
];
const BIDDING_META = [
  { value: "LOWEST_COST", label: "Lowest Cost (Auto)" },
  { value: "COST_CAP",    label: "Cost Cap"           },
  { value: "BID_CAP",     label: "Bid Cap"            },
  { value: "TARGET_COST", label: "Target Cost"        },
];
const BIDDING_GOOGLE = [
  { value: "MAXIMIZE_CONVERSIONS",     label: "Maximize Conversions"    },
  { value: "TARGET_CPA",               label: "Target CPA"              },
  { value: "TARGET_ROAS",              label: "Target ROAS"             },
  { value: "MAXIMIZE_CLICKS",          label: "Maximize Clicks"         },
  { value: "MANUAL_CPC",               label: "Manual CPC"              },
  { value: "TARGET_IMPRESSION_SHARE",  label: "Target Impression Share" },
];

const STEP_REQUIRED: Record<number, (keyof WizardData)[]> = {
  1: ["name", "objective"],
  2: ["budget_total", "start_at", "end_at"],
  3: ["landing_page_url"],
};

const REQUIRED_MSGS: Partial<Record<keyof WizardData, string>> = {
  name:             "Campaign name is required",
  objective:        "Select a campaign goal to continue",
  budget_total:     "Budget amount is required",
  start_at:         "Start date is required",
  end_at:           "End date is required",
  landing_page_url: "Landing page URL is required",
};

const ADVANCED_FIELDS: Record<number, (keyof WizardData)[]> = {
  1: ["campaign_subtype", "region"],
  2: ["bidding_strategy", "budget_owner_id", "daily_budget_cap"],
  3: ["languages", "interests", "placements", "networks", "device_targeting",
      "keywords", "headline_2", "description", "display_url",
      "utm_source", "utm_medium", "utm_campaign_param",
      "facebook_page_id", "instagram_account_id"],
};

type ArrKey = "geography" | "platforms" | "languages" | "placements" | "networks" | "device_targeting";
type FieldErrors = Partial<Record<keyof WizardData, string>>;

// ── Styles ─────────────────────────────────────────────────────────────────

const baseCls  = "w-full bg-zinc-900 border rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none transition-all";
const okCls    = "border-zinc-800 focus:border-white/30 focus:ring-2 focus:ring-white/10";
const errCls   = "border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20";
const labelCls = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5";

// ── Selected chip / card helpers ───────────────────────────────────────────

const selCard = "bg-white border-white/20 text-zinc-900 shadow-sm";
const unCard  = "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300";
const selChip = "bg-white text-zinc-900 border-white/20 font-semibold";
const unChip  = "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300";

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get("edit");

  const [step,        setStep]        = useState(parseInt(searchParams.get("step") ?? "1", 10));
  const [data,        setData]        = useState<WizardData>(DEFAULT);
  const [campaignId,  setCampaignId]  = useState<string | null>(editId);
  const [saving,      setSaving]      = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [members,     setMembers]     = useState<TeamMember[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched,     setTouched]     = useState<Partial<Record<keyof WizardData, boolean>>>({});
  const [advOpen,     setAdvOpen]     = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/v1/team/members").then(r => setMembers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    api.get(`/api/v1/campaigns/${editId}`).then(r => {
      const c = r.data;
      const t = c.targeting || {};
      const cr = c.creative || {};
      const utm = cr.utm_params || {};
      setData({
        name: c.name || "", platforms: c.platforms || [], objective: c.objective || "",
        campaign_subtype: c.campaign_subtype || "",
        special_ad_category: c.special_ad_category || "NONE",
        region: c.region || "",
        post_limit: c.post_limit?.toString() || "",
        auto_boost_enabled: c.auto_boost_enabled || false,
        boost_per_post_budget: c.boost_per_post_budget?.toString() || "",
        budget_total: c.budget_total?.toString() || "", budget_currency: c.budget_currency || "USD",
        budget_type: c.budget_type || "LIFETIME",
        start_at: c.start_at?.split("T")[0] || "", end_at: c.end_at?.split("T")[0] || "",
        bidding_strategy: c.bidding_strategy || "", budget_owner_id: c.budget_owner_id || "",
        budget_owner_name: c.budget_owner_name || "", daily_budget_cap: c.daily_budget_cap?.toString() || "",
        geography: t.geography || [], age_min: t.age_min?.toString() || "18",
        age_max: t.age_max?.toString() || "65", gender: t.gender || "ALL",
        languages: t.languages || [],
        interests: Array.isArray(t.interests) ? t.interests.join(", ") : (t.interests || ""),
        placements: t.placements || [], networks: t.networks || [],
        device_targeting: t.device_targeting || [],
        keywords: Array.isArray(t.keywords) ? t.keywords.join("\n") : (t.keywords || ""),
        landing_page_url: cr.landing_page_url || "", headline: cr.headline || "",
        headline_2: cr.headline_2 || "", copy_text: cr.copy_text || "",
        description: cr.description || "", cta_text: cr.cta_text || "Learn More",
        display_url: cr.display_url || "",
        utm_source: utm.source || "", utm_medium: utm.medium || "", utm_campaign_param: utm.campaign || "",
        facebook_page_id: cr.facebook_page_id || "", instagram_account_id: cr.instagram_account_id || "",
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
          name: data.name.trim(),
          campaign_type: data.platforms.includes("Google") ? "PAID_ADS" : data.platforms.includes("Meta") ? "PAID_ADS" : "ORGANIC",
          objective: data.objective, platforms: data.platforms,
          campaign_subtype: data.campaign_subtype || undefined,
          special_ad_category: data.special_ad_category || "NONE",
          region: data.region || undefined,
        });
      }
      if (step === 2) {
        Object.assign(payload, {
          post_limit: data.post_limit ? parseInt(data.post_limit) : null,
          auto_boost_enabled: data.auto_boost_enabled,
          boost_per_post_budget: data.boost_per_post_budget ? parseFloat(data.boost_per_post_budget) : null,
          budget_total: data.budget_total ? parseFloat(data.budget_total) : null,
          budget_currency: data.budget_currency, budget_type: data.budget_type,
          budget_pacing: "EVEN",
          bidding_strategy: data.bidding_strategy || undefined,
          budget_owner_id: data.budget_owner_id || undefined,
          budget_owner_name: data.budget_owner_name || undefined,
          daily_budget_cap: data.daily_budget_cap ? parseFloat(data.daily_budget_cap) : undefined,
          start_at: data.start_at || null, end_at: data.end_at || null,
        });
      }
      if (step === 3) {
        Object.assign(payload, {
          platforms: data.platforms,
          targeting: {
            geography: data.geography,
            age_min: parseInt(data.age_min || "18"),
            age_max: parseInt(data.age_max || "65"),
            gender: data.gender || "ALL",
            languages: data.languages,
            interests: data.interests ? data.interests.split(",").map(s => s.trim()).filter(Boolean) : [],
            placements: data.placements, networks: data.networks,
            device_targeting: data.device_targeting,
            keywords: data.keywords ? data.keywords.split("\n").filter(Boolean) : [],
          },
          creative: {
            landing_page_url: data.landing_page_url, headline: data.headline,
            headline_2: data.headline_2, copy_text: data.copy_text,
            description: data.description, cta_text: data.cta_text,
            display_url: data.display_url,
            utm_configured: !!(data.utm_source || data.utm_medium || data.utm_campaign_param),
            utm_waived: !(data.utm_source || data.utm_medium || data.utm_campaign_param),
            utm_params: {
              source: data.utm_source || undefined,
              medium: data.utm_medium || undefined,
              campaign: data.utm_campaign_param || undefined,
            },
            facebook_page_id: data.facebook_page_id || undefined,
            instagram_account_id: data.instagram_account_id || undefined,
          },
        });
      }

      if (!campaignId) {
        const res = await api.post("/api/v1/campaigns", {
          name: data.name.trim() || "Untitled Campaign",
          campaign_type: "PAID_ADS", objective: data.objective || "BRAND_AWARENESS",
          platforms: data.platforms, ...payload,
        });
        setCampaignId(res.data.id);
      } else {
        await api.patch(`/api/v1/campaigns/${campaignId}`, payload);
      }
      setStep(goTo);
    } catch { /* inline errors */ }
    finally { setSaving(false); }
  }, [step, data, campaignId]);

  const handleNext = () => { if (validateStep()) saveStep(step + 1); };

  const handleSubmit = async () => {
    if (!campaignId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post(`/api/v1/campaigns/${campaignId}/submit-review`, {});
      if (res?.success === false) {
        const body = res.data as { message?: string; error?: string } | undefined;
        setSubmitError(body?.message || body?.error || res.error || "Submit failed — please try again.");
        return;
      }
      router.push(`/campaigns/${campaignId}`);
    } catch {
      setSubmitError("Submit failed — please try again.");
    } finally { setSubmitting(false); }
  };

  const fieldErr = (key: keyof WizardData) =>
    touched[key] && fieldErrors[key]
      ? <p className="flex items-center gap-1 text-xs text-rose-400 mt-1.5"><AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors[key]}</p>
      : null;

  const cls = (key: keyof WizardData) => `${baseCls} ${touched[key] && fieldErrors[key] ? errCls : okCls}`;

  const advFilledCount = (s: number) => {
    const n = (ADVANCED_FIELDS[s] || []).filter(k => {
      const v = data[k]; return Array.isArray(v) ? v.length > 0 : !!String(v || "").trim();
    }).length;
    return s === 1 && data.special_ad_category && data.special_ad_category !== "NONE" ? n + 1 : n;
  };

  const toggleAdv = (s: number) => setAdvOpen(o => ({ ...o, [s]: !o[s] }));

  const biddingOptions = data.platforms.includes("Google") && !data.platforms.includes("Meta")
    ? BIDDING_GOOGLE
    : data.platforms.includes("Meta") && !data.platforms.includes("Google")
      ? BIDDING_META
      : [...BIDDING_META, ...BIDDING_GOOGLE];

  const subtypeOptions = data.platforms.includes("Google") && !data.platforms.includes("Meta")
    ? SUBTYPES_GOOGLE
    : data.platforms.includes("Meta") && !data.platforms.includes("Google")
      ? SUBTYPES_META : [];

  const REVIEW_CHECKS = [
    { label: "Campaign Name",    ok: !!data.name.trim()               },
    { label: "Campaign Goal",    ok: !!data.objective                 },
    { label: "Budget",           ok: !!data.budget_total              },
    { label: "Start / End Date", ok: !!data.start_at && !!data.end_at },
    { label: "Landing Page URL", ok: !!data.landing_page_url          },
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
            const done = s.id < step;
            const current = s.id === step;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${current ? "bg-white/5 border border-white/10" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    done    ? "bg-white/10 border border-white/20"
                    : current ? "bg-white shadow-lg shadow-white/10"
                    : "bg-zinc-800 border border-zinc-700"
                  }`}>
                    {done
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      : <Icon className={`w-3.5 h-3.5 ${current ? "text-black" : "text-zinc-500"}`} />
                    }
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-[11px] font-bold ${current ? "text-white" : done ? "text-zinc-500" : "text-zinc-600"}`}>{s.label}</p>
                    <p className="text-[10px] text-zinc-600">{s.desc}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${done ? "bg-white/20" : "bg-zinc-800"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step Content ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">

          {/* ────────── STEP 1 — IDENTITY ────────── */}
          {step === 1 && (
            <div className="p-6 space-y-6">
              <StepHeader icon={Megaphone} title="Campaign Identity" subtitle="What is this campaign and where will it run?" />

              {/* Campaign Name */}
              <div>
                <label className={labelCls}>Campaign Name <Req /></label>
                <input
                  value={data.name}
                  onChange={e => set("name", e.target.value)}
                  onBlur={e => touch("name", e.target.value)}
                  className={cls("name")}
                  placeholder="e.g. Ramadan 2026 — Brand Push"
                />
                {fieldErr("name")}
              </div>

              {/* Platform Selection */}
              <div>
                <label className={labelCls}>Ad Platform <span className="normal-case font-normal text-zinc-600">(select one or both)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "Meta",   label: "Meta Ads",   sub: "Facebook · Instagram · Reels · Messenger" },
                    { id: "Google", label: "Google Ads", sub: "Search · Display · YouTube · Gmail" },
                  ].map(p => {
                    const sel = data.platforms.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => toggleArr("platforms", p.id)}
                        className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${sel ? selCard : unCard}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${sel ? "text-zinc-900" : "text-zinc-300"}`}>{p.label}</span>
                          {sel && <CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0" />}
                        </div>
                        <p className={`text-[11px] ${sel ? "text-zinc-600" : "text-zinc-600"}`}>{p.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campaign Goal Cards */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className={`${labelCls} mb-0`}>Campaign Goal <Req /></label>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                    <Info className="w-3 h-3" />planning label for analytics
                  </span>
                </div>
                {data.platforms.length > 0 && (
                  <p className="text-[11px] text-zinc-600 mb-3">
                    Showing goals supported by {data.platforms.join(" + ")}
                    {data.platforms.length < 2 && " — select both platforms to see all"}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {getGoals(data.platforms).map(obj => {
                    const ObjIcon = obj.icon;
                    const sel = data.objective === obj.value;
                    const showBadges = data.platforms.includes("Meta") && data.platforms.includes("Google");
                    return (
                      <button key={obj.value} type="button"
                        onClick={() => { set("objective", obj.value); setTouched(t => ({ ...t, objective: true })); }}
                        className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all ${sel ? selCard : unCard}`}>
                        <ObjIcon className={`w-5 h-5 ${sel ? "text-zinc-700" : "text-zinc-600"}`} />
                        <div className="flex-1">
                          <p className={`text-xs font-semibold leading-tight ${sel ? "text-zinc-900" : "text-zinc-300"}`}>{obj.label}</p>
                          <p className={`text-[10px] leading-relaxed mt-0.5 ${sel ? "text-zinc-600" : "text-zinc-500"}`}>{obj.desc}</p>
                        </div>
                        {showBadges && (
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {obj.platforms.map(p => (
                              <span key={p}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  sel
                                    ? "bg-zinc-200/60 border-zinc-300/40 text-zinc-700"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                                }`}>
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {touched.objective && fieldErrors.objective && (
                  <p className="flex items-center gap-1 text-xs text-rose-400 mt-2">
                    <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.objective}
                  </p>
                )}
              </div>

              {/* Advanced Toggle */}
              <AdvancedToggle open={advOpen[1]} filled={advFilledCount(1)} onToggle={() => toggleAdv(1)} />
              {advOpen[1] && (
                <div className="space-y-4 pt-2">
                  {subtypeOptions.length > 0 && (
                    <div>
                      <label className={labelCls}>Campaign Subtype <AdvTag /></label>
                      <select value={data.campaign_subtype} onChange={e => set("campaign_subtype", e.target.value)} className={`${baseCls} ${okCls}`}>
                        <option value="">Select subtype…</option>
                        {subtypeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Primary Region <AdvTag /></label>
                    <select value={data.region} onChange={e => set("region", e.target.value)} className={`${baseCls} ${okCls}`}>
                      <option value="">Select region…</option>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {data.platforms.includes("Meta") && (
                    <div>
                      <label className={labelCls}>Special Ad Category <span className="normal-case font-normal text-zinc-500">(Meta compliance)</span> <AdvTag /></label>
                      <select value={data.special_ad_category} onChange={e => set("special_ad_category", e.target.value)} className={`${baseCls} ${okCls}`}>
                        {SPECIAL_AD_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ────────── STEP 2 — BUDGET ────────── */}
          {step === 2 && (
            <div className="p-6 space-y-6">
              <StepHeader icon={DollarSign} title="Budget & Schedule" subtitle="How much will you spend and when does this campaign run?" />

              {/* Budget Amount + Currency */}
              <div>
                <label className={labelCls}>Total Budget <Req /></label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={data.budget_currency} onChange={e => set("budget_currency", e.target.value)}
                    className={`${baseCls} ${okCls}`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" min="0" value={data.budget_total}
                    onChange={e => set("budget_total", e.target.value)}
                    onBlur={e => touch("budget_total", e.target.value)}
                    className={`${cls("budget_total")} col-span-2`}
                    placeholder="10,000"
                  />
                </div>
                {fieldErr("budget_total")}
              </div>

              {/* Budget Type */}
              <div>
                <label className={labelCls}>Budget Type</label>
                <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                  {[
                    { value: "LIFETIME", label: "Lifetime Budget", desc: "Total spend over the campaign" },
                    { value: "DAILY",    label: "Daily Budget",    desc: "Spend cap per day" },
                  ].map(bt => (
                    <button key={bt.value} type="button" onClick={() => set("budget_type", bt.value)}
                      className={`flex-1 flex flex-col gap-0.5 px-4 py-2.5 rounded-lg text-left transition-all ${
                        data.budget_type === bt.value
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}>
                      <span className={`text-sm font-semibold ${data.budget_type === bt.value ? "text-zinc-900" : ""}`}>{bt.label}</span>
                      <span className={`text-[10px] ${data.budget_type === bt.value ? "text-zinc-600" : "text-zinc-600"}`}>{bt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start Date <Req /></label>
                  <input type="date" value={data.start_at}
                    onChange={e => set("start_at", e.target.value)}
                    onBlur={e => touch("start_at", e.target.value)}
                    className={cls("start_at")}
                  />
                  {fieldErr("start_at")}
                </div>
                <div>
                  <label className={labelCls}>End Date <Req /></label>
                  <input type="date" value={data.end_at}
                    onChange={e => set("end_at", e.target.value)}
                    onBlur={e => touch("end_at", e.target.value)}
                    className={cls("end_at")}
                  />
                  {fieldErr("end_at")}
                </div>
              </div>

              {/* Post Limit */}
              <div>
                <label className={labelCls}>
                  Post Limit
                  <span className="normal-case font-normal text-zinc-600"> (max posts in this campaign)</span>
                </label>
                <input
                  type="number" min="1" max="500"
                  value={data.post_limit}
                  onChange={e => set("post_limit", e.target.value)}
                  className={`${baseCls} ${okCls}`}
                  placeholder="e.g. 7 — leave blank for unlimited"
                />
                {data.post_limit && data.budget_total && (
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    ≈ {data.budget_currency} {(parseFloat(data.budget_total) / parseInt(data.post_limit)).toLocaleString(undefined, { maximumFractionDigits: 2 })} per post
                  </p>
                )}
              </div>

              {/* Auto-boost toggle */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Auto-Boost Posts</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Each published post auto-runs as a Meta paid ad (requires connected Meta ad account)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input type="checkbox" className="sr-only peer"
                      checked={data.auto_boost_enabled}
                      onChange={e => set("auto_boost_enabled", e.target.checked)} />
                    <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-black after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white border border-zinc-700" />
                  </label>
                </div>
                {data.auto_boost_enabled && (
                  <div>
                    <label className={labelCls}>Budget per Post <Req /> <span className="normal-case font-normal text-zinc-600">({data.budget_currency})</span></label>
                    <input
                      type="number" min="1"
                      value={data.boost_per_post_budget}
                      onChange={e => set("boost_per_post_budget", e.target.value)}
                      className={`${baseCls} ${okCls}`}
                      placeholder="e.g. 100"
                    />
                    <p className="text-[11px] text-zinc-600 mt-1.5">
                      Debited from your campaign wallet each time a post goes live
                    </p>
                  </div>
                )}
              </div>

              {/* Advanced Toggle */}
              <AdvancedToggle open={advOpen[2]} filled={advFilledCount(2)} onToggle={() => toggleAdv(2)} />
              {advOpen[2] && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className={labelCls}>Bidding Strategy <AdvTag /></label>
                    <select value={data.bidding_strategy} onChange={e => set("bidding_strategy", e.target.value)} className={`${baseCls} ${okCls}`}>
                      <option value="">Platform default (auto)</option>
                      {biddingOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </div>
                  {data.budget_type === "LIFETIME" && (
                    <div>
                      <label className={labelCls}>Daily Spend Cap <AdvTag /> <span className="normal-case font-normal text-zinc-600">({data.budget_currency})</span></label>
                      <input type="number" min="0" value={data.daily_budget_cap}
                        onChange={e => set("daily_budget_cap", e.target.value)}
                        className={`${baseCls} ${okCls}`} placeholder="Optional daily limit" />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Budget Owner <AdvTag /></label>
                    <select value={data.budget_owner_id}
                      onChange={e => {
                        const m = members.find(x => x.id === e.target.value);
                        set("budget_owner_id", e.target.value);
                        set("budget_owner_name", m ? (m.full_name || m.email) : "");
                      }}
                      className={`${baseCls} ${okCls}`}>
                      <option value="">Assign budget owner…</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email} ({m.role})</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────── STEP 3 — AUDIENCE & CREATIVE ────────── */}
          {step === 3 && (
            <div className="p-6 space-y-6">
              <StepHeader icon={Users} title="Audience & Creative" subtitle="Who should see this and what will it say?" />

              {/* Target Countries */}
              <div>
                <label className={labelCls}>Target Locations <span className="normal-case font-normal text-zinc-600">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl max-h-44 overflow-y-auto">
                  {Object.entries(COUNTRIES).map(([code, name]) => (
                    <button key={code} type="button" onClick={() => toggleArr("geography", code)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        data.geography.includes(code) ? selChip : unChip
                      }`}>
                      {name}
                    </button>
                  ))}
                </div>
                {data.geography.length === 0 && (
                  <p className="text-[11px] text-zinc-600 mt-1.5">No selection = global audience</p>
                )}
              </div>

              {/* Age + Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Age Range</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="13" max="65" value={data.age_min}
                      onChange={e => set("age_min", e.target.value)}
                      className={`${baseCls} ${okCls} text-center`} placeholder="18" />
                    <span className="text-zinc-600 shrink-0 text-sm">–</span>
                    <input type="number" min="13" max="65" value={data.age_max}
                      onChange={e => set("age_max", e.target.value)}
                      className={`${baseCls} ${okCls} text-center`} placeholder="65" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <div className="flex gap-1.5 h-[42px]">
                    {[
                      { value: "ALL",    label: "All"    },
                      { value: "MALE",   label: "Male"   },
                      { value: "FEMALE", label: "Female" },
                    ].map(g => (
                      <button key={g.value} type="button" onClick={() => set("gender", g.value)}
                        className={`flex-1 rounded-xl text-xs font-semibold border transition-all ${
                          data.gender === g.value
                            ? "bg-white text-zinc-900 border-white/20 shadow-sm"
                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                        }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Landing Page URL */}
              <div>
                <label className={labelCls}>Landing Page URL <Req /></label>
                <input type="url" value={data.landing_page_url}
                  onChange={e => set("landing_page_url", e.target.value)}
                  onBlur={e => touch("landing_page_url", e.target.value)}
                  className={cls("landing_page_url")}
                  placeholder="https://example.com/campaign"
                />
                {fieldErr("landing_page_url")}
              </div>

              {/* Headline */}
              <div>
                <label className={labelCls}>
                  Headline
                  {data.platforms.includes("Google") && <span className="normal-case font-normal text-zinc-500"> · recommended for Google</span>}
                </label>
                <input value={data.headline} onChange={e => set("headline", e.target.value)}
                  className={`${baseCls} ${okCls}`}
                  placeholder="e.g. Discover Our New Collection" />
              </div>

              {/* Ad Copy */}
              <div>
                <label className={labelCls}>Ad Copy / Primary Text</label>
                <textarea rows={3} value={data.copy_text} onChange={e => set("copy_text", e.target.value)}
                  className={`${baseCls} ${okCls} resize-none`}
                  placeholder="Write your main ad copy or caption here…" />
              </div>

              {/* CTA */}
              <div>
                <label className={labelCls}>Call to Action</label>
                <select value={data.cta_text} onChange={e => set("cta_text", e.target.value)} className={`${baseCls} ${okCls}`}>
                  {CTA_OPTIONS.map(cta => <option key={cta} value={cta}>{cta}</option>)}
                </select>
              </div>

              {/* Advanced Toggle */}
              <AdvancedToggle open={advOpen[3]} filled={advFilledCount(3)} onToggle={() => toggleAdv(3)} />
              {advOpen[3] && (
                <div className="space-y-5 pt-2">

                  {/* Languages */}
                  <div>
                    <label className={labelCls}>Languages <AdvTag /></label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => (
                        <button key={lang} type="button" onClick={() => toggleArr("languages", lang)}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                            data.languages.includes(lang) ? selChip : unChip
                          }`}>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className={labelCls}>Interests / Audience Segments <AdvTag /></label>
                    <input value={data.interests} onChange={e => set("interests", e.target.value)}
                      className={`${baseCls} ${okCls}`}
                      placeholder="e.g. Fashion, Luxury, Travel (comma-separated)" />
                  </div>

                  {/* Meta Placements */}
                  {(data.platforms.includes("Meta") || data.platforms.length === 0) && (
                    <div>
                      <label className={labelCls}>Meta Placements <PlatformTag label="Meta" /></label>
                      <div className="flex flex-wrap gap-2">
                        {META_PLACEMENTS.map(p => (
                          <button key={p} type="button" onClick={() => toggleArr("placements", p)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              data.placements.includes(p) ? selChip : unChip
                            }`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Google Networks */}
                  {(data.platforms.includes("Google") || data.platforms.length === 0) && (
                    <div>
                      <label className={labelCls}>Google Networks <PlatformTag label="Google" /></label>
                      <div className="flex flex-wrap gap-2">
                        {GOOGLE_NETWORKS.map(n => (
                          <button key={n} type="button" onClick={() => toggleArr("networks", n)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              data.networks.includes(n) ? selChip : unChip
                            }`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Device Targeting */}
                  <div>
                    <label className={labelCls}>Device Targeting <AdvTag /></label>
                    <div className="flex gap-2">
                      {DEVICE_OPTIONS.map(d => (
                        <button key={d} type="button" onClick={() => toggleArr("device_targeting", d)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            data.device_targeting.includes(d) ? selChip : unChip
                          }`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {data.device_targeting.length === 0 && (
                      <p className="text-[11px] text-zinc-600 mt-1.5">No selection = all devices</p>
                    )}
                  </div>

                  {/* Keywords (Google) */}
                  {(data.platforms.includes("Google") || data.platforms.length === 0) && (
                    <div>
                      <label className={labelCls}>Keywords <PlatformTag label="Google Search" /></label>
                      <textarea rows={4} value={data.keywords} onChange={e => set("keywords", e.target.value)}
                        className={`${baseCls} ${okCls} resize-none font-mono text-xs`}
                        placeholder={"running shoes\nbuy sneakers online\nbest trainers 2026"} />
                      <p className="text-[11px] text-zinc-600 mt-1.5">One keyword or phrase per line</p>
                    </div>
                  )}

                  {/* Second Headline (Google) */}
                  {(data.platforms.includes("Google") || data.platforms.length === 0) && (
                    <div>
                      <label className={labelCls}>Second Headline <PlatformTag label="Google" /></label>
                      <input value={data.headline_2} onChange={e => set("headline_2", e.target.value)}
                        className={`${baseCls} ${okCls}`} placeholder="e.g. Free Shipping on All Orders" />
                    </div>
                  )}

                  {/* Description (Google) */}
                  {(data.platforms.includes("Google") || data.platforms.length === 0) && (
                    <div>
                      <label className={labelCls}>Ad Description <PlatformTag label="Google" /></label>
                      <textarea rows={2} value={data.description} onChange={e => set("description", e.target.value)}
                        className={`${baseCls} ${okCls} resize-none`}
                        placeholder="e.g. Shop the latest collection with exclusive member discounts." />
                    </div>
                  )}

                  {/* Display URL (Google) */}
                  {(data.platforms.includes("Google") || data.platforms.length === 0) && (
                    <div>
                      <label className={labelCls}>Display URL / Path <PlatformTag label="Google" /></label>
                      <input value={data.display_url} onChange={e => set("display_url", e.target.value)}
                        className={`${baseCls} ${okCls}`} placeholder="e.g. example.com/shoes" />
                    </div>
                  )}

                  {/* Meta Page Links */}
                  {(data.platforms.includes("Meta") || data.platforms.length === 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Facebook Page ID <PlatformTag label="Meta" /></label>
                        <input value={data.facebook_page_id} onChange={e => set("facebook_page_id", e.target.value)}
                          className={`${baseCls} ${okCls}`} placeholder="Your Page ID" />
                      </div>
                      <div>
                        <label className={labelCls}>Instagram Account ID <PlatformTag label="Meta" /></label>
                        <input value={data.instagram_account_id} onChange={e => set("instagram_account_id", e.target.value)}
                          className={`${baseCls} ${okCls}`} placeholder="Your IG Account ID" />
                      </div>
                    </div>
                  )}

                  {/* UTM Parameters */}
                  <div>
                    <label className={labelCls}>UTM Parameters <AdvTag /></label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-1">utm_source</p>
                        <input value={data.utm_source} onChange={e => set("utm_source", e.target.value)}
                          className={`${baseCls} ${okCls}`} placeholder="google" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-1">utm_medium</p>
                        <input value={data.utm_medium} onChange={e => set("utm_medium", e.target.value)}
                          className={`${baseCls} ${okCls}`} placeholder="cpc" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-1">utm_campaign</p>
                        <input value={data.utm_campaign_param} onChange={e => set("utm_campaign_param", e.target.value)}
                          className={`${baseCls} ${okCls}`} placeholder="spring_2026" />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ────────── STEP 4 — REVIEW ────────── */}
          {step === 4 && (
            <div className="p-6 space-y-5">
              <StepHeader icon={ClipboardCheck} title="Review & Submit" subtitle="Confirm everything looks right before requesting approval." />

              {submitError && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300">{submitError}</p>
                </div>
              )}

              {missing.length > 0 && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {missing.length} required field{missing.length > 1 ? "s" : ""} incomplete — go back to fill in
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map(f => (
                      <span key={f.label} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <ReviewSection title="Campaign Identity">
                  <ReviewRow label="Name"     value={data.name || "—"} missing={!data.name} />
                  <ReviewRow label="Platform" value={data.platforms.length ? data.platforms.join(" + ") : "Not specified"} />
                  <ReviewRow label="Goal"     value={GOALS.find(o => o.value === data.objective)?.label || "—"} missing={!data.objective} />
                  {data.campaign_subtype && <ReviewRow label="Subtype" value={data.campaign_subtype} />}
                  {data.region           && <ReviewRow label="Region"  value={data.region} />}
                </ReviewSection>

                <ReviewSection title="Budget & Schedule">
                  <ReviewRow label="Budget"
                    value={data.budget_total
                      ? `${data.budget_currency} ${parseFloat(data.budget_total).toLocaleString()} · ${data.budget_type === "DAILY" ? "Daily" : "Lifetime"}`
                      : "—"}
                    missing={!data.budget_total}
                  />
                  <ReviewRow label="Duration"
                    value={data.start_at && data.end_at ? `${data.start_at} → ${data.end_at}` : "—"}
                    missing={!data.start_at || !data.end_at}
                  />
                  <ReviewRow label="Post Limit"
                    value={data.post_limit ? `${data.post_limit} posts` : "Unlimited"}
                  />
                  <ReviewRow label="Auto-Boost"
                    value={data.auto_boost_enabled
                      ? `Enabled · ${data.budget_currency} ${data.boost_per_post_budget || "—"} per post`
                      : "Disabled"}
                  />
                  {data.bidding_strategy  && <ReviewRow label="Bidding" value={data.bidding_strategy.replace(/_/g, " ")} />}
                  {data.budget_owner_name && <ReviewRow label="Owner"   value={data.budget_owner_name} />}
                </ReviewSection>

                <ReviewSection title="Audience & Creative">
                  <ReviewRow label="Locations"
                    value={data.geography.length
                      ? data.geography.map(c => COUNTRIES[c] || c).join(", ")
                      : "All locations"}
                  />
                  <ReviewRow label="Age / Gender"
                    value={`${data.age_min || 18}–${data.age_max || 65} · ${data.gender === "ALL" ? "All genders" : data.gender}`}
                  />
                  <ReviewRow label="Landing URL" value={data.landing_page_url || "—"} missing={!data.landing_page_url} />
                  {data.headline   && <ReviewRow label="Headline"  value={data.headline} />}
                  {data.copy_text  && <ReviewRow label="Ad Copy"   value={data.copy_text.length > 60 ? data.copy_text.slice(0, 60) + "…" : data.copy_text} />}
                  {data.cta_text   && <ReviewRow label="CTA"       value={data.cta_text} />}
                  {data.placements.length > 0 && <ReviewRow label="Placements" value={data.placements.join(", ")} />}
                  {data.networks.length > 0   && <ReviewRow label="Networks"   value={data.networks.join(", ")} />}
                  {data.languages.length > 0  && <ReviewRow label="Languages"  value={data.languages.join(", ")} />}
                </ReviewSection>
              </div>

              {missing.length === 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-white text-xs font-semibold mb-1">What happens next</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Your campaign enters the approval queue. Once approved by the workspace owner it can be launched and linked to published posts and ad accounts.
                  </p>
                </div>
              )}
            </div>
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
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 disabled:opacity-40 text-black text-sm font-semibold rounded-xl transition-all shadow-lg shadow-white/10">
              {saving && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit}
              disabled={submitting || !campaignId || missing.length > 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-100 disabled:opacity-40 text-black text-sm font-semibold rounded-xl transition-all shadow-lg shadow-white/10">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Request Approval
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="pb-4 border-b border-zinc-800">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <p className="text-xs text-zinc-500 ml-[42px]">{subtitle}</p>
    </div>
  );
}

function Req() {
  return <span className="text-rose-500 font-bold"> *</span>;
}

function AdvTag() {
  return <span className="ml-1 normal-case font-normal text-[10px] text-zinc-600">optional</span>;
}

function PlatformTag({ label }: { label: string }) {
  return (
    <span className="ml-1.5 normal-case font-normal text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
      {label}
    </span>
  );
}

function AdvancedToggle({ open, filled, onToggle }: { open: boolean; filled: number; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors border-t border-zinc-800/60 mt-1">
      {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      {open ? "Hide advanced options" : "Show advanced options"}
      {!open && filled > 0 && (
        <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-semibold">
          {filled} filled
        </span>
      )}
    </button>
  );
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
      <span className="text-xs text-zinc-500 font-medium shrink-0 w-28">{label}</span>
      <span className={`text-xs text-right leading-relaxed break-all ${missing ? "text-amber-400 font-semibold" : "text-zinc-300"}`}>
        {missing && "⚠ "}{value}
      </span>
    </div>
  );
}


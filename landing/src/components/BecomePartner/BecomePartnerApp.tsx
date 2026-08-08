"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import {
  CONTAINER,
  FieldLabel,
  FieldsetLabel,
  INPUT_CLASS,
  Icon,
  STEPS,
} from "./shared";
import PartnerStepBar from "./PartnerStepBar";
import PartnerSidebar, { type SummaryRow } from "./PartnerSidebar";

type Form = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  workEmail: string;
  phone: string;
  companyName: string;
  companyWebsite: string;
  country: string;
  companySize: string;
  partnerType: string;
  marketFocus: string;
  regions: string[];
  customerBase: string;
  deliveryCapability: string;
  teamSize: string;
  certifications: string[];
  integrationExperience: string;
  engagementModel: string;
  timeline: string;
  pipeline: string;
  consentPrivacy: boolean;
  consentUpdates: boolean;
};

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  workEmail: "",
  phone: "",
  companyName: "",
  companyWebsite: "",
  country: "",
  companySize: "",
  partnerType: "",
  marketFocus: "",
  regions: [],
  customerBase: "",
  deliveryCapability: "",
  teamSize: "",
  certifications: [],
  integrationExperience: "",
  engagementModel: "",
  timeline: "",
  pipeline: "",
  consentPrivacy: false,
  consentUpdates: false,
};

const STEP_INTRO: Record<number, string> = {
  1: "Tell us who you are and how to reach you. Work email required — personal domains are not accepted.",
  2: "Tell us how you want to partner, which markets you serve, and where you operate.",
  3: "Show us your delivery capability, compliance posture, and technical readiness.",
  4: "Confirm commercial expectations and how we may process your application.",
};

const COMPANY_SIZES = ["1–50", "51–200", "201–1,000", "1,001–5,000", "5,000+"];
const PARTNER_TYPES = [
  "Solution / delivery partner",
  "Technology / ISV partner",
  "Reseller / channel partner",
  "Advisory / consulting partner",
  "Agency partner",
];
const MARKETS = [
  "Enterprise retail",
  "Financial services & FinTech",
  "Healthcare",
  "B2B SaaS",
  "Logistics",
  "Telecommunications",
  "Multi-brand / agency",
];
const REGIONS = [
  "North America",
  "LATAM",
  "UK & Ireland",
  "European Union",
  "Middle East & Africa",
  "APAC",
];
const DELIVERY = [
  "In-house delivery team",
  "Partner-led delivery",
  "Referral only",
];
const TEAM_SIZES = ["1–5", "6–20", "21–50", "51–200", "200+"];
const CERTIFICATIONS = [
  "SOC 2 Type II",
  "ISO 27001",
  "GDPR programme",
  "HIPAA",
  "None yet",
];
const MODELS = ["Co-sell", "Referral", "Resell", "Managed service", "Advisory"];
const TIMELINES = [
  "Immediately",
  "This quarter",
  "Next quarter",
  "Exploring only",
];
const PIPELINES = ["< $250k", "$250k – $1M", "$1M – $5M", "$5M+", "Not yet known"];

function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLASS} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_1rem_center] bg-no-repeat pr-10`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(o)}
            className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left text-sm transition-colors ${
              on
                ? "border-[#20E7F2] bg-[#20E7F2]/10 text-slate-900"
                : "border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                on ? "border-[#20E7F2] bg-[#20E7F2]" : "border-slate-400 bg-white"
              }`}
            >
              {on && (
                <Check className="h-2.5 w-2.5 text-slate-950" strokeWidth={3.5} />
              )}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function BecomePartnerApp() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "regions" | "certifications", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const name = [form.firstName, form.lastName].filter(Boolean).join(" ");
  const summary: SummaryRow[] = [
    { label: "Name", value: name || "—" },
    { label: "Company", value: form.companyName || "—" },
    { label: "Type", value: form.partnerType || "—" },
    { label: "Market", value: form.marketFocus || "—" },
    {
      label: "Regions",
      value: form.regions.length ? `${form.regions.length} selected` : "—",
    },
    { label: "Model", value: form.engagementModel || "—" },
  ];

  const active = STEPS.find((s) => s.n === step)!;
  const isLast = step === STEPS.length;

  return (
    <>
      <PartnerStepBar current={step} />

      <div className="bg-slate-100 py-10 lg:py-14">
        <div className={CONTAINER}>
          {/* items-start so the form card keeps its own height instead of
              stretching to match the taller rail. */}
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,720px)_384px]">
            {/* ── Form card ─────────────────────────────────────── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isLast) setSubmitted(true);
                else setStep((s) => s + 1);
              }}
              className="overflow-hidden rounded-[20px] border border-slate-300 bg-white shadow-[0_4px_32px_rgba(8,14,26,0.07)]"
            >
              <header className="relative bg-cyan-900 px-9 py-8">
                <div className="absolute inset-0 bg-gradient-to-b from-[#20E7F2]/5 to-transparent" />
                <div className="relative flex items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="h-px w-2.5 bg-[#20E7F2]" />
                      <span className="text-[9.6px] font-medium uppercase tracking-wide text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                        Step {step} of {STEPS.length}
                      </span>
                    </div>
                    <h1 className="mt-3 text-xl font-extrabold leading-6 text-white font-[family-name:var(--font-bricolage)]">
                      {active.label}
                    </h1>
                    <p className="mt-3 max-w-[560px] text-sm font-light leading-5 text-white/90">
                      {STEP_INTRO[step]}
                    </p>
                  </div>
                  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#20E7F2]/20 bg-[#20E7F2]/10 sm:flex">
                    <Icon name="companyContact" size={20} />
                  </span>
                </div>
              </header>

              {/* progress */}
              <div className="h-[3px] w-full bg-slate-200">
                <div
                  className="h-full bg-[#20E7F2] transition-all"
                  style={{ width: `${(step / STEPS.length) * 100}%` }}
                />
              </div>

              <div className="px-9 py-8">
                {submitted ? (
                  <div className="py-10 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#20E7F2]">
                      <Check className="h-5 w-5 text-slate-950" strokeWidth={3} />
                    </span>
                    <h2 className="mt-6 text-xl font-extrabold text-slate-900 font-[family-name:var(--font-bricolage)]">
                      Application received
                    </h2>
                    <p className="mx-auto mt-3 max-w-[420px] text-sm font-light leading-6 text-slate-600">
                      Thanks{name ? `, ${form.firstName}` : ""}. The alliances
                      team reviews every application and responds within five
                      business days.
                    </p>
                  </div>
                ) : (
                  <>
                    {step === 1 && (
                      <>
                        <FieldsetLabel>Personal details</FieldsetLabel>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="firstName" required>
                              First name
                            </FieldLabel>
                            <input
                              id="firstName"
                              required
                              placeholder="Alex"
                              className={INPUT_CLASS}
                              value={form.firstName}
                              onChange={(e) => set("firstName", e.target.value)}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="lastName" required>
                              Last name
                            </FieldLabel>
                            <input
                              id="lastName"
                              required
                              placeholder="Johnson"
                              className={INPUT_CLASS}
                              value={form.lastName}
                              onChange={(e) => set("lastName", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="mt-5">
                          <FieldLabel
                            htmlFor="jobTitle"
                            required
                            hint="As it appears on your email signature"
                          >
                            Job title
                          </FieldLabel>
                          <input
                            id="jobTitle"
                            required
                            placeholder="e.g. Head of AI Practice, VP Alliances, CTO"
                            className={INPUT_CLASS}
                            value={form.jobTitle}
                            onChange={(e) => set("jobTitle", e.target.value)}
                          />
                        </div>

                        <div className="mt-5">
                          <FieldLabel
                            htmlFor="workEmail"
                            required
                            hint="No personal domains (gmail, yahoo, etc.)"
                          >
                            Work email
                          </FieldLabel>
                          <input
                            id="workEmail"
                            type="email"
                            required
                            placeholder="alex@yourcompany.com"
                            className={INPUT_CLASS}
                            value={form.workEmail}
                            onChange={(e) => set("workEmail", e.target.value)}
                          />
                        </div>

                        <div className="mt-5">
                          <FieldLabel
                            htmlFor="phone"
                            hint="Optional — accelerates qualification"
                          >
                            Phone number
                          </FieldLabel>
                          <input
                            id="phone"
                            type="tel"
                            placeholder="+1 (415) 000 0000"
                            className={INPUT_CLASS}
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                          />
                        </div>

                        <div className="mt-9">
                          <FieldsetLabel>Company details</FieldsetLabel>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="companyName" required>
                              Company name
                            </FieldLabel>
                            <input
                              id="companyName"
                              required
                              placeholder="Acme Corp"
                              className={INPUT_CLASS}
                              value={form.companyName}
                              onChange={(e) =>
                                set("companyName", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="companyWebsite" required>
                              Company website
                            </FieldLabel>
                            <input
                              id="companyWebsite"
                              type="url"
                              required
                              placeholder="https://yourcompany.com"
                              className={INPUT_CLASS}
                              value={form.companyWebsite}
                              onChange={(e) =>
                                set("companyWebsite", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="country" required>
                              Headquarters country
                            </FieldLabel>
                            <input
                              id="country"
                              required
                              placeholder="United States"
                              className={INPUT_CLASS}
                              value={form.country}
                              onChange={(e) => set("country", e.target.value)}
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="companySize" hint="Employees">
                              Company size
                            </FieldLabel>
                            <Select
                              id="companySize"
                              value={form.companySize}
                              onChange={(v) => set("companySize", v)}
                              options={COMPANY_SIZES}
                              placeholder="Select range"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <FieldsetLabel>Partnership model</FieldsetLabel>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="partnerType" required>
                              Partner type
                            </FieldLabel>
                            <Select
                              id="partnerType"
                              value={form.partnerType}
                              onChange={(v) => set("partnerType", v)}
                              options={PARTNER_TYPES}
                              placeholder="Select type"
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="marketFocus" required>
                              Primary market focus
                            </FieldLabel>
                            <Select
                              id="marketFocus"
                              value={form.marketFocus}
                              onChange={(v) => set("marketFocus", v)}
                              options={MARKETS}
                              placeholder="Select market"
                            />
                          </div>
                        </div>

                        <div className="mt-9">
                          <FieldsetLabel>Regions served</FieldsetLabel>
                          <CheckboxGroup
                            options={REGIONS}
                            selected={form.regions}
                            onToggle={(v) => toggle("regions", v)}
                          />
                        </div>

                        <div className="mt-9">
                          <FieldsetLabel>Enterprise footprint</FieldsetLabel>
                          <FieldLabel
                            htmlFor="customerBase"
                            hint="Named accounts accelerate qualification"
                          >
                            Existing enterprise customer base
                          </FieldLabel>
                          <textarea
                            id="customerBase"
                            rows={4}
                            placeholder="Describe the enterprise accounts you deliver to today."
                            className={`${INPUT_CLASS} resize-y`}
                            value={form.customerBase}
                            onChange={(e) => set("customerBase", e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <FieldsetLabel>Delivery capability</FieldsetLabel>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="deliveryCapability" required>
                              Delivery model
                            </FieldLabel>
                            <Select
                              id="deliveryCapability"
                              value={form.deliveryCapability}
                              onChange={(v) => set("deliveryCapability", v)}
                              options={DELIVERY}
                              placeholder="Select model"
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="teamSize" hint="Practitioners">
                              Dedicated team size
                            </FieldLabel>
                            <Select
                              id="teamSize"
                              value={form.teamSize}
                              onChange={(v) => set("teamSize", v)}
                              options={TEAM_SIZES}
                              placeholder="Select range"
                            />
                          </div>
                        </div>

                        <div className="mt-9">
                          <FieldsetLabel>Security &amp; compliance</FieldsetLabel>
                          <CheckboxGroup
                            options={CERTIFICATIONS}
                            selected={form.certifications}
                            onToggle={(v) => toggle("certifications", v)}
                          />
                        </div>

                        <div className="mt-9">
                          <FieldsetLabel>Technical fit</FieldsetLabel>
                          <FieldLabel
                            htmlFor="integrationExperience"
                            hint="CRM, DAM, identity, data warehouse"
                          >
                            Integration experience
                          </FieldLabel>
                          <textarea
                            id="integrationExperience"
                            rows={4}
                            placeholder="Which enterprise systems have you integrated, and at what scale?"
                            className={`${INPUT_CLASS} resize-y`}
                            value={form.integrationExperience}
                            onChange={(e) =>
                              set("integrationExperience", e.target.value)
                            }
                          />
                        </div>
                      </>
                    )}

                    {step === 4 && (
                      <>
                        <FieldsetLabel>Commercial intent</FieldsetLabel>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <FieldLabel htmlFor="engagementModel" required>
                              Engagement model
                            </FieldLabel>
                            <Select
                              id="engagementModel"
                              value={form.engagementModel}
                              onChange={(v) => set("engagementModel", v)}
                              options={MODELS}
                              placeholder="Select model"
                            />
                          </div>
                          <div>
                            <FieldLabel htmlFor="timeline" required>
                              Expected start
                            </FieldLabel>
                            <Select
                              id="timeline"
                              value={form.timeline}
                              onChange={(v) => set("timeline", v)}
                              options={TIMELINES}
                              placeholder="Select timeline"
                            />
                          </div>
                        </div>

                        <div className="mt-5">
                          <FieldLabel
                            htmlFor="pipeline"
                            hint="Indicative — not binding"
                          >
                            Anticipated annual pipeline
                          </FieldLabel>
                          <Select
                            id="pipeline"
                            value={form.pipeline}
                            onChange={(v) => set("pipeline", v)}
                            options={PIPELINES}
                            placeholder="Select range"
                          />
                        </div>

                        <div className="mt-9">
                          <FieldsetLabel>Consent</FieldsetLabel>
                          <div className="space-y-3">
                            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-slate-300 bg-slate-100 px-4 py-3">
                              <input
                                type="checkbox"
                                required
                                className="mt-0.5 h-4 w-4 accent-[#20E7F2]"
                                checked={form.consentPrivacy}
                                onChange={(e) =>
                                  set("consentPrivacy", e.target.checked)
                                }
                              />
                              <span className="text-xs font-light leading-5 text-slate-600">
                                I consent to ZoikoVertex processing this
                                application under the Privacy Policy.
                                <span className="ml-1 text-rose-500">*</span>
                              </span>
                            </label>
                            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-slate-300 bg-slate-100 px-4 py-3">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 accent-[#20E7F2]"
                                checked={form.consentUpdates}
                                onChange={(e) =>
                                  set("consentUpdates", e.target.checked)
                                }
                              />
                              <span className="text-xs font-light leading-5 text-slate-600">
                                Send me partner programme updates. Optional — you
                                can withdraw at any time.
                              </span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {!submitted && (
                <footer className="flex flex-wrap items-center justify-end gap-5 border-t border-slate-300 bg-slate-200 px-9 py-6">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep((s) => s - 1)}
                      className="mr-auto inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-800"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-800"
                  >
                    Save draft
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2.5 rounded-[100px] bg-blue-900 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800"
                  >
                    {isLast ? "Submit application" : "Continue"}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </footer>
              )}
            </form>

            <PartnerSidebar summary={summary} />
          </div>
        </div>
      </div>
    </>
  );
}

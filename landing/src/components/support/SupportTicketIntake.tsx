"use client";

import { useState } from "react";
import { CONTAINER, MONO, SectionHeadLeft } from "./shared";

/* ── Data ──────────────────────────────────────────────────────────────── */

type CategoryId =
  | "product"
  | "ai-workflow"
  | "api"
  | "billing"
  | "security"
  | "enterprise";

type Category = {
  id: CategoryId;
  label: string;
  /** Where the routing preview says this lands. */
  queue: string;
  note: string;
  modules: string[];
};

const CATEGORIES: Category[] = [
  {
    id: "product",
    label: "Product",
    queue: "Product Support",
    note: "Handled by the product support queue during your plan's coverage hours.",
    modules: [
      "Dashboard",
      "Brand Library",
      "Content Studio",
      "Calendar & Publishing",
      "Reporting",
    ],
  },
  {
    id: "ai-workflow",
    label: "AI Workflow",
    queue: "AI Workflow & Agent Operations",
    note: "Reviewed with governance context — policy version, agent authority, and approval stage.",
    modules: [
      "Strategy Agent",
      "Content Agent",
      "Publishing Agent",
      "Engagement Agent",
      "Revenue Attribution Agent",
      "Approval Stages",
    ],
  },
  {
    id: "api",
    label: "API & Integration",
    queue: "Integration Engineering",
    note: "Triaged by engineers using your endpoints, error codes, and environment detail.",
    modules: [
      "REST API",
      "Webhooks",
      "CRM Connector",
      "Social Connector",
      "SSO / SCIM",
    ],
  },
  {
    id: "billing",
    label: "Billing & Account",
    queue: "Billing & Accounts",
    note: "Routed to billing, with escalation to your account manager where one is assigned.",
    modules: [
      "Invoices",
      "Plan & Seats",
      "Purchase Orders",
      "Payment Method",
      "Workspace Ownership",
    ],
  },
  {
    id: "security",
    label: "Security & Privacy",
    queue: "Trust & Safety Specialist Queue",
    note: "Handled through specialist workflows, not the ordinary support queue.",
    modules: [
      "Access Control",
      "Audit Trail",
      "Evidence Vault",
      "Data Processing",
      "Legal Hold",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    queue: "Enterprise Support & Customer Success",
    note: "Severity-based routing to enterprise support, customer success, or sales escalation.",
    modules: [
      "Implementation",
      "Governance Configuration",
      "Identity (SSO / SCIM)",
      "Multi-brand Workspaces",
      "Executive Reporting",
    ],
  },
];

/** Shown until a category narrows the list. */
const DEFAULT_MODULES = [
  "Dashboard",
  "Workflows & Approvals",
  "AI Agents",
  "Integrations & API",
  "Evidence & Audit Trail",
  "Admin & Permissions",
  "Billing & Account",
];

type SeverityId = "P1" | "P2" | "P3" | "P4";

/** Target response mirrors the Severity & SLA table further down the page. */
const SEVERITIES: {
  id: SeverityId;
  label: string;
  standard: string;
  enterprise: string;
}[] = [
  { id: "P1", label: "Critical", standard: "4 business hrs", enterprise: "1 hour" },
  { id: "P2", label: "Major", standard: "1 business day", enterprise: "4 business hrs" },
  { id: "P3", label: "Standard", standard: "1–2 business days", enterprise: "1–2 business days" },
  { id: "P4", label: "Question", standard: "2–3 business days", enterprise: "2–3 business days" },
];

const CONTACT_METHODS = ["Email", "Phone", "Success manager", "Secure portal"];
const PLANS = ["Standard", "Enterprise"] as const;

/* ── Shared field chrome ───────────────────────────────────────────────── */

const FIELD =
  "w-full rounded-lg border border-white/25 bg-[#080d1a] px-3.5 py-3.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-white/30 focus:border-[#20E7F2]/60";

function Label({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold leading-5 text-white/70">
      {children}
      {required && <span className="text-[#20E7F2]">*</span>}
      {hint && (
        <span className="text-xs font-normal leading-4 text-white/35">
          {hint}
        </span>
      )}
    </span>
  );
}

/** Bordered pill used for category and contact method. */
function Segment({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2.5 text-center text-xs font-semibold leading-4 transition-colors ${
        active
          ? "border-[#20E7F2] bg-[#20E7F2]/12 text-[#20E7F2]"
          : "border-white/25 bg-[#080d1a] text-white/70 hover:border-white/40"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function SupportTicketIntake() {
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [severity, setSeverity] = useState<SeverityId | null>(null);
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("Standard");
  const [contact, setContact] = useState("Email");

  const active = CATEGORIES.find((c) => c.id === category) ?? null;
  const activeSeverity = SEVERITIES.find((s) => s.id === severity) ?? null;
  const target = activeSeverity
    ? plan === "Enterprise"
      ? activeSeverity.enterprise
      : activeSeverity.standard
    : "—";

  return (
    <section id="new-request" className="scroll-mt-24 bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <SectionHeadLeft
          eyebrow="Guided ticket intake"
          title={
            <>
              Tell us what&apos;s blocked. We&apos;ll
              <br className="hidden sm:block" /> route it.
            </>
          }
          lede="Progressive and severity-aware — we ask only for what's needed to resolve your request. Watch the routing and response target update as you go."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_495px] lg:items-start">
          {/* ── Form ─────────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-white/25 bg-[#0b1120]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
              <h3 className="text-base font-bold leading-6 text-slate-100">
                New support request
              </h3>
              <span
                className={`shrink-0 text-[10px] font-normal uppercase leading-4 tracking-wide text-white/55 ${MONO}`}
              >
                ▤ Data minimized
              </span>
            </div>

            {/*
              Presentational, matching the other landing forms
              (PartnerApplicationForm, TalkToSalesSection): there is no submit
              endpoint in this app yet, so submit is intentionally a no-op.
            */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-4 px-6 pb-6 pt-6"
            >
              <div className="flex flex-col gap-2">
                <Label required>Support category</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {CATEGORIES.map((c) => (
                    <Segment
                      key={c.id}
                      active={category === c.id}
                      onClick={() => setCategory(c.id)}
                    >
                      {c.label}
                    </Segment>
                  ))}
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <Label required>Work email</Label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className={FIELD}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <Label required>Company / workspace</Label>
                  <input type="text" placeholder="Acme Health" className={FIELD} />
                </label>
              </div>

              {/* Figma: bare text, no chrome until selected. */}
              <div className="flex flex-col gap-2">
                <Label required>Severity</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITIES.map((s) => {
                    const on = severity === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSeverity(s.id)}
                        aria-pressed={on}
                        className={`flex flex-col items-start gap-[3px] rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                          on ? "bg-[#20E7F2]/[0.08]" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold ${MONO} ${
                            on ? "text-[#20E7F2]" : "text-slate-100"
                          }`}
                        >
                          {s.id}
                        </span>
                        <span
                          className={`text-[10px] font-medium ${
                            on ? "text-[#20E7F2]/80" : "text-white/55"
                          }`}
                        >
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cyan rule marks the context block that sharpens routing. */}
              <div className="grid gap-3.5 border-l-2 border-[#20E7F2]/55 pl-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <Label hint="optional">Affected module</Label>
                  <select className={FIELD} defaultValue="">
                    <option value="" disabled>
                      Select…
                    </option>
                    {(active?.modules ?? DEFAULT_MODULES).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <Label hint="workflow / audit / evidence / case">
                    Object ID
                  </Label>
                  <input
                    type="text"
                    placeholder="WF-… / EV-… / CASE-…"
                    className={FIELD}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <Label required>Description</Label>
                <textarea
                  rows={4}
                  placeholder="Plain-language summary of the issue…"
                  className={`${FIELD} min-h-20 resize-y`}
                />
              </label>

              <div className="flex flex-col gap-2">
                <Label hint="optional">Attachments</Label>
                <div className="flex flex-col items-center gap-1.5 rounded-[10px] border border-white/25 p-4 text-center">
                  <span className="text-xs font-normal leading-5 text-white/60">
                    Drop screenshots, logs, CSV, or a redacted HAR file
                  </span>
                  <span
                    className={`text-xs leading-4 tracking-tight text-[#E8944B] ${MONO}`}
                  >
                    ⚠ Do not upload passwords, access tokens, secrets, or
                    unnecessary personal data.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label required>Preferred contact method</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CONTACT_METHODS.map((m) => (
                    <Segment
                      key={m}
                      active={contact === m}
                      onClick={() => setContact(m)}
                    >
                      {m}
                    </Segment>
                  ))}
                </div>
              </div>

              <div className="-mx-6 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 pt-4">
                <span
                  className={`text-xs font-normal leading-4 text-white/55 ${MONO}`}
                >
                  No secrets or PII required
                </span>
                <button
                  type="submit"
                  className="rounded-[10px] bg-gradient-to-b from-[#20E7F2] to-[#12c9d4] px-4 py-2.5 text-xs font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(32,231,242,0.55)] ring-1 ring-[#20E7F2]/40 transition-opacity hover:opacity-90"
                >
                  Submit request
                </button>
              </div>
            </form>
          </div>

          {/* ── Routing preview ──────────────────────────────────────── */}
          <aside className="flex flex-col gap-3 self-start rounded-2xl border border-white/25 bg-gradient-to-b from-[#0d1526] to-[#0a1020] p-5 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-normal uppercase leading-4 tracking-wider text-white/55 ${MONO}`}
              >
                Routing preview
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-sm bg-[#20E7F2]" aria-hidden />
                <span
                  className={`text-[10px] font-normal leading-4 text-[#20E7F2] ${MONO}`}
                >
                  LIVE
                </span>
              </span>
            </div>

            <div
              aria-live="polite"
              className="flex flex-col gap-1 rounded-xl border border-white/10 px-3.5 py-4"
            >
              <span
                className={`text-[9.5px] font-normal uppercase leading-4 tracking-wider text-white/55 ${MONO}`}
              >
                Routes to
              </span>
              <span className="text-base font-bold leading-6 text-slate-100">
                {active ? active.queue : "Select a category"}
              </span>
              <span className="text-xs font-normal leading-4 text-white/55">
                {active
                  ? active.note
                  : "Choose a support category to see where this request goes."}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 px-3.5 py-3.5">
              <span
                className={`text-[9.5px] font-normal uppercase leading-4 tracking-wider text-white/55 ${MONO}`}
              >
                Support plan
              </span>
              <div className="flex gap-1.5">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    aria-pressed={plan === p}
                    className={`flex-1 rounded-md border p-2 text-center text-xs transition-colors ${MONO} ${
                      plan === p
                        ? "border-[#20E7F2] bg-[#20E7F2]/12 text-[#20E7F2]"
                        : "border-white/25 text-white/55 hover:border-white/40"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-xl border border-white/10 px-3 py-3">
                <span
                  className={`text-[9px] font-normal uppercase leading-3 tracking-wide text-white/55 ${MONO}`}
                >
                  Severity
                </span>
                <span
                  className={`text-base font-bold leading-6 text-[#20E7F2] ${MONO}`}
                >
                  {severity ?? "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-white/10 px-3 py-3">
                <span
                  className={`text-[9px] font-normal uppercase leading-3 tracking-wide text-white/55 ${MONO}`}
                >
                  Target response
                </span>
                <span
                  className={`text-base font-bold leading-6 text-[#20E7F2] ${MONO}`}
                >
                  {target}
                </span>
              </div>
            </div>

            <p className="border-t border-white/10 pt-3 text-xs leading-5 text-white/45">
              <span className="font-semibold text-[#E8B768]">
                Security &amp; privacy requests
              </span>{" "}
              are handled through specialist workflows, not the ordinary support
              queue. Response targets are indicative unless contractual SLA terms
              apply through your agreement.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

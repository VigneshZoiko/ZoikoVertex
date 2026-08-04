"use client";

import { useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { CONTAINER, DISPLAY, Eyebrow, MONO } from "./shared";

/** Quick-intent chips under the search field. Amber marks the trust queue. */
const CHIPS: { label: string; tone: "cyan" | "amber" }[] = [
  { label: "AI Workflow Help", tone: "cyan" },
  { label: "Approval Workflow Issue", tone: "cyan" },
  { label: "Integration Problem", tone: "cyan" },
  { label: "Security or Privacy Request", tone: "amber" },
  { label: "Billing and Account", tone: "cyan" },
  { label: "Enterprise Implementation", tone: "cyan" },
];

export default function SupportHero() {
  const [query, setQuery] = useState("");

  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_-8%,rgba(32,231,242,0.13),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(0,0,0,0.9),transparent_78%)]" />
        <div className="absolute inset-0 opacity-50 bg-gradient-to-b from-white/[0.04] to-transparent" />
      </div>

      <div
        className={`${CONTAINER} relative z-10 flex flex-col items-center py-20 text-center lg:py-28`}
      >
        <Eyebrow center>Support Center</Eyebrow>

        <h1
          className={`mt-4 max-w-[560px] text-[clamp(2.2rem,4.6vw,3.25rem)] font-extrabold leading-[1.1] tracking-tight text-slate-100 ${DISPLAY}`}
        >
          Support for{" "}
          <span className="text-[#20E7F2]">
            governed agentic execution.
          </span>
        </h1>

        <p className="mt-5 max-w-[600px] text-base font-normal leading-7 text-white/60">
          Get help with AI workflows, approval routing, integrations, evidence,
          auditability, privacy, billing, and enterprise implementation.
        </p>

        {/*
          Search is presentational for now — there is no search backend wired
          into the landing app. Submitting is a no-op until an endpoint exists.
        */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-8 w-full max-w-[720px]"
        >
          {/* Figma: azure-12 → azure-9-2 gradient, azure-61 @26% hairline. */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-gradient-to-b from-[#0b1120] to-[#0a1020] py-2 pl-4 pr-2 shadow-[0_30px_70px_-34px_rgba(0,0,0,0.8)] ring-1 ring-[#20E7F2]/[0.05] focus-within:border-[#20E7F2]/50">
            <Search className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search support, docs, integrations, audit logs, approvals, billing, security…"
              aria-label="Search support"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-slate-100 outline-none placeholder:text-white/35"
            />
            <span
              className={`hidden shrink-0 items-center rounded-md border border-white/15 px-1.5 py-1 text-[10px] leading-4 text-white/35 sm:inline-flex ${MONO}`}
              aria-hidden
            >
              <CornerDownLeft className="h-3 w-3" />
            </span>
          </div>
          <p
            className={`mt-3 text-center text-xs font-normal leading-4 text-white/35 ${MONO}`}
          >
            Search for help across workflows, approvals, integrations,
            governance, auditability, billing, and implementation.
          </p>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {CHIPS.map((chip) => (
            <a
              key={chip.label}
              href="#new-request"
              className="flex items-center gap-2 rounded-lg border border-white/25 bg-white/[0.02] px-3.5 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              <span
                className={`h-[5px] w-[5px] shrink-0 rounded-[2px] ${
                  chip.tone === "amber" ? "bg-[#E8B768]" : "bg-[#20E7F2]"
                }`}
                aria-hidden
              />
              {chip.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

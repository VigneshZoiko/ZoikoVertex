"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ShieldCheck, Download } from "lucide-react";
import { BackdropImage, CONTAINER, Eyebrow, Icon, SectionTitle } from "./shared";

const FAQ = [
  {
    q: "What is responsible AI in ZoikoVertex?",
a:"Responsible AI at ZoikoVertex means using artificial intelligence within defined authority, policy, data, approval, transparency, and accountability boundaries. AI may assist with analysis, recommendations, content, routing, and execution, but the customer retains responsibility for configuration, authorized use, review standards, legal obligations, and the decisions that require human judgment.",
  },
  {
    q: "Can ZoikoVertex AI agents act autonomously?",
a: "ZoikoVertex AI agents can operate only within the autonomy level, permissions, data access, policies, thresholds, and approval rules configured by the customer. Approved low-risk actions may be eligible for automated execution. Higher-risk, customer-facing, regulated, financial, or exceptional actions can require human authorization. Autonomy is bounded by the operating model rather than treated as unrestricted authority.",
  },
  {
    q: "What controls can govern ZoikoVertex AI agents?",
    a: "AI-agent controls can include defined capabilities, prohibited actions, approved data sources, role and workspace permissions, brand rules, risk classifications, confidence thresholds, budget or execution limits, human-review gates, escalation rules, overrides, monitoring, and evidence capture. The actual control set depends on the selected deployment, implemented capability, customer configuration, and applicable contractual terms.",
  },
  {
    q: "Can users see when AI contributed to an action?",
    a: "ZoikoVertex is designed to make material AI-assisted participation traceable within the workflow record. Depending on configuration, the record can identify the agent or system involved, the recommendation or output, the applicable policy state, reviewer or approver, decision, and resulting action. Traceability supports accountability without claiming that every internal model process is fully interpretable.",
  },
  {
    q: "How are customer data and external AI providers governed?",
    a: "AI processing should be governed by the implemented product configuration, customer agreement, Data Processing Addendum, subprocessor disclosures, privacy notices, and approved provider terms. Enterprise buyers should verify which providers are used, what information is processed, where it is handled, how long it is retained, and whether it is used for model improvement. Public statements must match documented technical and contractual facts.",
  },
  {
    q: "Does responsible AI guarantee legal or regulatory compliance?",
    a: "No. Responsible AI controls can strengthen oversight, consistency, documentation, and review, but they do not guarantee compliance. Legal and regulatory outcomes depend on the customer's jurisdiction, industry, data use, policies, configuration, human decisions, and implementation. ZoikoVertex does not replace legal advice, regulatory interpretation, independent risk assessment, or the customer's compliance responsibilities.",
  },
];

export default function ResponsibleAIFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className={`${CONTAINER} py-20`}>
      <Eyebrow>Common questions</Eyebrow>

      <SectionTitle className="mt-6 max-w-[560px]">
        Common questions from enterprise buyers.
      </SectionTitle>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-xl border border-white/10">
          {FAQ.map(({ q, a }, i) => {
            const open = openIdx === i;
            return (
              <div
                key={q}
                className="border-b border-white/10 bg-[#111827] last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-[13.5px] font-medium text-white/90">
                    {q}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                    strokeWidth={2.5}
                  />
                </button>
                {open && (
                  <p className="px-5 pb-5 text-xs font-light leading-6 text-white/50">
                    {a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Enterprise review card ──────────────────────────────── */}
        <aside className="relative overflow-hidden rounded-2xl border border-white/10">
          <BackdropImage
            slot="faq"
            className="saturate-[0.25]"
            sizes="(max-width: 1024px) 100vw, 380px"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,13,26,0.75)_0%,rgba(8,13,26,0.97)_55%)]" />

          <div className="relative flex h-full flex-col p-7">
            <div className="min-h-[120px]" />
            <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
              Enterprise governance review
            </span>
            <h3 className="mt-4 text-lg font-extrabold leading-tight text-white font-[family-name:var(--font-bricolage)]">
              Build governed AI workflows your enterprise can trust.
            </h3>
            <p className="mt-3 text-xs font-light leading-5 text-white/50">
              Walk through policy guardrails, approval authority, evidence
              capture, and framework alignment with the ZoikoVertex governance
              team.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href="/request-demo"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#20E7F2] px-5 py-2.5 text-[13px] font-bold text-[#080d1a] transition-colors hover:bg-[#20E7F2]/90"
              >
                <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={2.5} />
                Request a Responsible AI Review
              </Link>
              <Link
                href="/governance"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/10 px-5 py-2.5 text-[13px] font-normal text-white/90 transition-colors hover:border-white/30"
              >
                <Download className="h-[14px] w-[14px]" strokeWidth={2} />
                Download AI Governance Brief
              </Link>
              <Link
                href="/governance"
                className="inline-flex items-center justify-center gap-2 text-[11px] font-medium text-white/50 transition-colors hover:text-white/90 font-[family-name:var(--font-jetbrains)]"
              >
                <Icon name="viewAuditability" size={12} />
                Compliance &amp; Governance
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

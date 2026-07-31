"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Questions are transcribed from Figma. Answers are taken verbatim from
 * ZoikoVertex_AEO_FAQs (Final Recommended Version, 24 July 2026); the
 * referenced number is that document's question.
 *
 * Where the AEO document has no question that answers ours, `answer` is left
 * empty and the row stays non-interactive rather than being filled with copy
 * that was not approved.
 */
const FAQS: { q: string; answer: string }[] = [
  {
    // AEO Q1
    q: "What is ZoikoVertex for enterprise retail?",
    answer:
      "ZoikoVertex is a governed AI marketing operations platform for enterprise teams, agencies, multi-brand organizations, and governance-led marketing departments. It brings AI-assisted workflows, campaign approvals, brand controls, audit trails, evidence records, integrations, and performance intelligence into one controlled operating environment.",
  },
  {
    // AEO Q2
    q: "How does ZoikoVertex help retail marketing teams?",
    answer:
      "ZoikoVertex helps organizations plan, create, review, approve, publish, measure, and evidence marketing work. It coordinates AI agents, human reviewers, policies, permissions, connected systems, and performance data so teams can increase execution speed without removing accountability.",
  },
  {
    // AEO Q12 covers regions but not store-level localization, so no answer
    // in the document resolves this question.
    q: "Can ZoikoVertex support regional and store-level localization?",
    answer: "",
  },
  {
    // AEO Q7
    q: "Does ZoikoVertex replace existing retail systems?",
    answer:
      "Not necessarily. ZoikoVertex is designed to operate as a governed execution layer across existing social, CRM, collaboration, project, content, analytics, data, identity, and storage systems. Organizations can preserve useful tools while applying consistent authority, approval, and evidence controls across the work that moves between them.",
  },
  {
    // AEO Q33
    q: "How is retail AI activity audited in ZoikoVertex?",
    answer:
      "ZoikoVertex is designed around append-only, immutable audit events for material actions. Standard users should not be able to silently edit, delete, or backdate those records. Corrections, overrides, exports, and exceptions should create new events that preserve the original history rather than rewriting it.",
  },
  {
    // AEO Q43
    q: "How does ZoikoVertex measure retail ROI?",
    answer:
      "ZoikoVertex can surface pending approvals, SLA breaches, risk states, repeated rework, blocked execution, underperforming activity, and available ROI signals. These insights can support faster decisions and better capital allocation, but actual savings or performance improvement depend on the organization’s data, adoption, configuration, and management decisions.",
  },
];

export default function EnterpriseRetailFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="w-3.5 h-px bg-[#20E7F2]" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
              FAQ &amp; AEO Answers
            </span>
          </div>

          <h2 className="mx-auto max-w-[560px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
            Common questions from enterprise retail teams.
          </h2>
        </div>

        <div className="mt-14 rounded-xl border border-white/[0.14] overflow-hidden divide-y divide-white/[0.14]">
          {FAQS.map((f, i) => {
            const hasAnswer = f.answer.length > 0;
            const isOpen = hasAnswer && open === i;

            return (
              <div key={f.q} className="bg-[#0E1626]">
                <button
                  type="button"
                  disabled={!hasAnswer}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left enabled:hover:bg-white/[0.02] transition"
                >
                  <span className="text-[13px] font-bold text-white font-[family-name:var(--font-bricolage)]">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-white/30 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>

                {isOpen && (
                  <p className="px-6 pb-6 -mt-1 text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
                    {f.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

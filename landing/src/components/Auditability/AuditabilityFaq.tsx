"use client";

import { useState } from "react";
import { CONTAINER, SectionHead } from "./shared";

const FAQ = [
  {
    q: "What is auditability in AI-assisted marketing?",
    a: "Auditability in AI-assisted marketing is the ability to reconstruct and explain a material action or decision using reliable records. A defensible record should show what happened, who or what initiated it, which content and policy state applied, what review occurred, who authorized the outcome, when execution occurred, and what evidence or result followed.",
  },
  {
    q: "How does ZoikoVertex make marketing activity auditable?",
    a: "ZoikoVertex captures material events as governed workflows operate. Records can link the responsible user or AI agent, workspace, content version, policy state, risk classification, approval route, decision, execution event, and available outcome. This reduces reliance on email threads, spreadsheets, screenshots, memory, or manual reconstruction after a decision is questioned.",
  },
  {
    q: "What types of events can ZoikoVertex record?",
    a: "Depending on configuration, ZoikoVertex can record human and AI-created outputs, workflow routing, policy checks, risk classifications, content revisions, reviewer comments, approval decisions, publishing events, budget recommendations, authorized changes, overrides, identity events, permission changes, evidence exports, and governance-setting changes. The implemented event model and retention policy determine the records available for review.",
  },
  {
    q: "Why should evidence be captured during the workflow?",
    a: "Evidence captured during execution is more reliable than evidence assembled later because it preserves the identity, content state, policy, decision, timestamp, and outcome connected to the actual event. Runtime evidence helps legal, compliance, security, finance, audit, and executive teams review the process that produced an outcome rather than receiving only a final asset or performance report.",
  },
  {
    q: "Can ZoikoVertex show who approved a campaign or AI-generated output?",
    a: "Yes. The applicable workflow record can identify the reviewer or approver, role, decision, timestamp, approval stage, policy state, content version, conditions, and subsequent execution event. If approved content is materially changed, the new version can be treated as a different content state and routed through the required review and authorization process again.",
  },
  {
    q: "Can audit records be edited, deleted, or backdated?",
    a: "ZoikoVertex should preserve material events so standard users cannot silently rewrite decision history. Corrections, reversals, overrides, or exceptions should create new attributable events while retaining the original record. Public claims such as immutable, append-only, tamper-evident, or write-once must be used only after Engineering and Security verify the implemented storage, integrity, access, and retention controls.",
  },
];

export default function AuditabilityFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="bg-[#0a0f1c] py-20">
      <div className={CONTAINER}>
        <SectionHead eyebrow="Auditability FAQ" tone="amber" title="Answers for legal, security & procurement." />

        {/* Separate rounded cards with gaps — not a single bordered list. */}
        <div className="mx-auto mt-12 flex max-w-[820px] flex-col gap-3">
          {FAQ.map(({ q, a }, i) => {
            const open = openIdx === i;
            return (
              <div
                key={q}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#111827]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-sm font-semibold leading-5 text-slate-100">
                    {q}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 text-lg leading-none text-[#20E7F2] transition-transform ${
                      open ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {open && (
                  <p className="px-6 pb-5 text-xs font-normal leading-6 text-white/55">
                    {a}
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

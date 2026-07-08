"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.6 2.4a1.8 1.8 0 0 0-1.8 1.8v7.2a1.8 1.8 0 0 0 1.8 1.8h7.2a1.8 1.8 0 0 0 1.8-1.8V4.2a1.8 1.8 0 0 0-1.8-1.8H3.6Z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.8 1.2v2.4M9.6 1.2v2.4M1.8 6h10.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

const FAQS = [
  {
    question: "What is agentic architecture?",
    answer:
      "Agentic architecture is the layered operating model that connects business goals, AI agents, workflow orchestration, governance, integrations, and evidence into one governed execution system — rather than isolated automation scripts.",
  },
  {
    question: "How is ZoikoVertex different from basic AI automation?",
    answer:
      "Basic automation executes tasks blindly. ZoikoVertex wraps every agent action in policy gates, role-based authority, approval workflows, and evidence capture — so execution stays accountable and auditable.",
  },
  {
    question: "Can humans approve or block AI actions?",
    answer:
      "Yes. Human-in-the-loop controls let reviewers, approvers, and escalation owners intervene at defined checkpoints before high-risk or policy-triggering actions proceed.",
  },
  {
    question: "Does ZoikoVertex support auditability?",
    answer:
      "Every meaningful action — prompts, outputs, decisions, approvals, and integration calls — is captured in the Evidence Layer with a full audit trail, forensic hub, and exportable records.",
  },
  {
    question: "Can ZoikoVertex integrate with existing systems?",
    answer:
      "Yes. The Integration Fabric connects to marketing channels, CRMs, project tools, communication platforms, storage/DAM systems, and developer APIs already in your stack.",
  },
  {
    question: "Is this only for marketing teams?",
    answer:
      "No. While many workflows are marketing-led, the architecture applies to any team running governed AI execution — including operations, compliance, legal, and executive oversight functions.",
  },
  {
    question: "What does the ROI Engine measure?",
    answer:
      "It connects agentic execution outcomes to measurable productivity, cycle time, and governance impact — giving executives a command-center view of performance and risk.",
  },
];

export default function AgenticArchitectureFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-[#080812] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Frequently Asked</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white">
            Buyer questions, answered.
          </h2>
        </div>

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10 items-start">
          <div className="rounded-2xl border border-white/10 bg-[#0C1422] overflow-hidden">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              const isLast = i === FAQS.length - 1;
              return (
                <div
                  key={faq.question}
                  className={isLast ? "" : "border-b border-white/10"}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-6 text-left"
                  >
                    <span className={`text-[15px] font-bold ${isOpen ? "text-white" : "text-white/85"}`}>
                      {faq.question}
                    </span>
                    <svg
                      className={`shrink-0 text-white/40 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-48 pb-6" : "max-h-0"}`}>
                    <p className="text-white/45 text-[13px] leading-relaxed px-6">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1420] overflow-hidden sticky top-24">
            <div className="relative h-52">
              <Image
                src="/images/agentic-architecture/faq-cta-bg.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="400px"
              />
            </div>
            <div className="p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-4">Ready to Evaluate?</p>
            <h3 className="text-white font-black text-2xl leading-snug mb-4">
              Build a governed agentic operating model.
            </h3>
            <p className="text-white/50 text-[13.5px] leading-relaxed mb-7">
              Book an architecture demo or start an ROI &amp; Governance Audit. Our enterprise team will walk through your goals, current stack, and governance requirements.
            </p>
            <Link
              href="/request-demo"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Book Architecture Demo
            </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

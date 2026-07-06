"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is ZoikoVertex?",
    a: "ZoikoVertex is a governed AI marketing operations platform that helps organizations manage content workflows, campaign approvals, brand governance, audit trails, evidence records, and performance intelligence.",
  },
  {
    q: "Who is ZoikoVertex for?",
    a: "Enterprise marketing teams, agencies, multi-brand organizations, and governance-led marketing departments that need stronger control over AI-assisted marketing activity.",
  },
  {
    q: "Is ZoikoVertex just a social media scheduler?",
    a: "No. ZoikoVertex is a governance and execution platform. Scheduling is one output among many — the core value is approval workflows, evidence records, and human oversight over AI-assisted work.",
  },
  {
    q: "Does ZoikoVertex replace human marketers?",
    a: "No. ZoikoVertex is built to assist marketing execution while keeping human oversight, brand responsibility, and organizational accountability in place at every step.",
  },
  {
    q: "What makes ZoikoVertex different from generic AI marketing tools?",
    a: "ZoikoVertex is built around approval governance, auditability, and role-based accountability rather than pure content generation — the platform assumes review and evidence are required, not optional.",
  },
  {
    q: "Who should journalists contact about ZoikoVertex?",
    a: "Media inquiries should be directed to ZoikoVertex media relations using the contact details and request form on this page. Please include organization, topic, and deadline.",
  },
  {
    q: "Can media use ZoikoVertex brand assets freely?",
    a: "Approved assets may be used for editorial and approved media purposes, subject to the brand usage rules on this page. Assets must not be modified, recolored, distorted, or misattributed.",
  },
  {
    q: "Where can media download ZoikoVertex logos?",
    a: "Approved logo packages are available in the Media Kit & Brand Assets section above, including SVG, PNG, and PDF formats.",
  },
];

export default function PressFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-[#080D1A] py-20 md:py-24 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Media FAQ</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-14 max-w-2xl">
          Common questions from journalists and analysts.
        </h2>

        <div className="grid md:grid-cols-2 gap-x-12">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="border-b border-white/[0.08]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              >
                <span className={`font-bold text-[15px] ${open === i ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-300 ${open === i ? "rotate-180 text-[#C9A84C]" : "text-white/30"}`}
                />
              </button>
              <div
                className="overflow-hidden transition-[max-height] duration-300"
                style={{ maxHeight: open === i ? "300px" : "0px" }}
              >
                <p className="text-white/50 text-[13.5px] leading-relaxed pb-5">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

const FAQS = [
  {
    question: "How is this different from Hootsuite or Sprout Social?",
    answer:
      "ZoikoVertex is a governed execution platform, not a scheduling tool. Where Hootsuite and Sprout Social focus on publishing calendars and social inbox management, ZoikoVertex adds policy enforcement, multi-key approval workflows, immutable audit trails, and AI agents that operate within defined governance boundaries.",
  },
  {
    question: "Can approvals be bypassed?",
    answer:
      "No. Approval gates in ZoikoVertex are policy-bound and cannot be bypassed by standard users. Override actions require elevated authority and are logged as exceptions in the immutable audit trail — creating a defensible record of every governance deviation.",
  },
  {
    question: "What does the audit trail capture?",
    answer:
      "The audit trail captures every action taken within ZoikoVertex — content creation, edits, approvals, rejections, overrides, publishing events, and agent actions. Each event is timestamped, user-attributed, and linked to the policy version active at the time.",
  },
  {
    question: "How are AI agents governed?",
    answer:
      "Every AI agent in ZoikoVertex operates within a defined autonomy tier. Agents cannot publish, approve, or execute actions beyond their configured authority level. Human gates are required at defined checkpoints, and all agent actions are logged in the immutable audit trail.",
  },
  {
    question: "What is the commitment to get a demo?",
    answer:
      "None. A demo is a 45-minute walkthrough with no contract, no credit card, and no obligation. Enterprise teams receive a named Account Executive within 4 business hours. Smaller teams can start with the free Starter plan immediately.",
  },
];

export default function RequestDemoFAQ() {
  const [visible, setVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="bg-[#080E1A] py-20 px-6">
      <div ref={ref} className="max-w-2xl mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-10 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl font-black text-white">
            Common questions
          </h2>
        </div>

        {/* FAQ list */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          {FAQS.map((faq, i) => (
            <div
              key={faq.question}
              className="border-b border-white/8 last:border-b-0"
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between py-5 text-left gap-6 group"
              >
                <span
                  className={`text-sm leading-snug transition-colors duration-200 ${
                    openIndex === i
                      ? "text-white"
                      : "text-white/60 group-hover:text-white/80"
                  }`}
                >
                  {faq.question}
                </span>
                <svg
                  className={`shrink-0 text-white/25 transition-transform duration-300 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  openIndex === i ? "max-h-48 pb-5" : "max-h-0"
                }`}
              >
                <p className="text-white/40 text-xs leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
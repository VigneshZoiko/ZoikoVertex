"use client";
import { useEffect, useRef, useState } from "react";

const FAQS = [
  {
    question: "How is this different from Hootsuite or Sprout Social?",
    answer:
      "ZoikoVertex is a governed execution platform, not a scheduling tool. Where Hootsuite and Sprout Social focus on publishing calendars and social inbox management, ZoikoVertex adds policy enforcement, multi-key approval workflows, immutable audit trails, and AI agents that operate within defined governance boundaries.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately. Downgrades apply at the end of your current billing period. Data and audit history are preserved across plan changes.",
  },
  {
    question: "What happens when the 14-day Growth trial ends?",
    answer:
      "At the end of your trial, your workspace moves to the free Starter tier automatically. No charges are applied unless you choose to upgrade. Your content, audit logs, and settings are preserved for 30 days.",
  },
  {
    question: "Is there a free version?",
    answer:
      "Yes. Vertex Starter is permanently free with 2 users, 2 channels, and read-only AI recommendations. It's designed for teams evaluating governed AI before committing to a paid plan.",
  },
  {
    question: "Can approvals be bypassed?",
    answer:
      "No. Approval gates in ZoikoVertex are policy-bound and cannot be bypassed by standard users. Override actions require elevated authority and are logged as exceptions in the immutable audit trail — creating a defensible record of every governance deviation.",
  },
  {
    question: "Do you offer discounts for non-profits or startups?",
    answer:
      "Yes. We offer discounted access for registered non-profits and early-stage startups. Contact our team with proof of eligibility and we'll apply the appropriate pricing tier to your account.",
  },
  {
    question: 'What does "SOC 2 readiness in progress" mean?',
    answer:
      "It means ZoikoVertex has implemented the technical controls required for SOC 2 Type II certification and is currently undergoing the formal audit period. The Trust Center documentation is available to enterprise prospects under NDA during this period.",
  },
  {
    question: "How does Corporate deployment work?",
    answer:
      "Corporate deployment begins with a scoping call to map your brand structure, approval chains, and compliance requirements. Your implementation lead then configures workspaces, roles, Brand Library, and governance policies before any production use begins. Phased onboarding — no big-bang deployment.",
  },
];

export default function PricingFAQ() {
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

  const left = FAQS.filter((_, i) => i % 2 === 0);
  const right = FAQS.filter((_, i) => i % 2 !== 0);

  return (
    <section className="bg-[#080E1A] py-20 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl lg:text-4xl font-black text-white">
            Frequently asked questions
          </h2>
        </div>

        {/* Two column FAQ */}
        <div className="grid md:grid-cols-2 gap-x-12">
          {[left, right].map((col, colIdx) => (
            <div key={colIdx}>
              {col.map((faq, rowIdx) => {
                const globalIndex = colIdx === 0 ? rowIdx * 2 : rowIdx * 2 + 1;
                const isOpen = openIndex === globalIndex;

                return (
                  <div
                    key={faq.question}
                    className={`border-b border-white/8 transition-all duration-500 ease-out ${
                      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${globalIndex * 60}ms` }}
                  >
                    <button
                      onClick={() => toggle(globalIndex)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                    >
                      <span
                        className={`text-sm leading-snug transition-colors duration-200 ${
                          isOpen ? "text-white" : "text-white/60 group-hover:text-white/80"
                        }`}
                      >
                        {faq.question}
                      </span>
                      <svg
                        className={`shrink-0 text-white/30 transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
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

                    {/* Answer */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-out ${
                        isOpen ? "max-h-48 pb-5" : "max-h-0"
                      }`}
                    >
                      <p className="text-white/40 text-xs leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
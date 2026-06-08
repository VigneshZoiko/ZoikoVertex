"use client";
import { useEffect, useRef, useState } from "react";

const FAQS = [
  {
    question: "Who is the Solutions page for?",
    answer:
      "The Solutions page is designed for buyers evaluating ZoikoVertex across different team structures — marketing leaders, compliance officers, CIOs, agency heads, and brand stewards. Each section addresses the specific governance, risk, and operational concerns relevant to that role.",
  },
  {
    question: "Which solution is right for a regulated organization?",
    answer:
      "Regulated organizations should explore the High-Assurance & Regulated Operations pathway. It includes the Policy Engine with sector-specific packs, Three-Key Approval Protocol, immutable audit trail with legal hold, and procurement-grade documentation.",
  },
  {
    question: "Can teams start without committing to a full plan?",
    answer:
      "Yes. The Discovery phase is designed for teams that need visibility and a readiness diagnostic before committing to full production workflows. You can map your governance requirements and validate fit before any deployment begins.",
  },
  {
    question: "Is ZoikoVertex only for large companies?",
    answer:
      "No. ZoikoVertex is designed for teams at different scales — from growing brand teams on Pro to enterprise command centers on Command. The governance depth scales with your complexity, not your headcount.",
  },
  {
    question: "Can agencies use ZoikoVertex for clients?",
    answer:
      "Yes. The Agency & Client Service pathway is purpose-built for multi-client operations. Client-scoped workspaces, External Collaborator roles, per-client Brand Libraries, and client-ready reporting make it suitable for agencies managing multiple accounts.",
  },
  {
    question: "Does ZoikoVertex replace existing marketing tools?",
    answer:
      "ZoikoVertex is a governed execution layer — not a replacement for every tool. It connects strategy, content, approvals, publishing, and evidence into one policy-bound workflow. Existing tools can integrate via the platform's publishing and attribution connectors.",
  },
];

export default function SolutionFAQ() {
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

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  // Split into two columns
  const left = FAQS.filter((_, i) => i % 2 === 0);
  const right = FAQS.filter((_, i) => i % 2 !== 0);

  return (
    <section className="bg-[#080812] py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-[#20E7F2] inline-block" />
            FAQ
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Answers for every buying perspective.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
            Procurement, compliance, and buyer objections answered directly
            — before the demo.
          </p>
        </div>

        {/* Two column FAQ grid */}
        <div className="grid md:grid-cols-2 gap-x-8">
          {[left, right].map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col">
              {col.map((faq, rowIdx) => {
                const globalIndex = colIdx === 0 ? rowIdx * 2 : rowIdx * 2 + 1;
                const isOpen = openIndex === globalIndex;

                return (
                  <div
                    key={faq.question}
                    className={`border-b border-white/10 transition-all duration-500 ease-out ${
                      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                    }`}
                    style={{ transitionDelay: `${150 + globalIndex * 80}ms` }}
                  >
                    <button
                      onClick={() => toggle(globalIndex)}
                      className="w-full flex items-center justify-between py-5 text-left group"
                    >
                      <span
                        className={`text-sm font-semibold transition-colors duration-300 pr-4 ${
                          isOpen ? "text-white" : "text-white/70 group-hover:text-white"
                        }`}
                      >
                        {faq.question}
                      </span>
                      <svg
                        className={`shrink-0 text-white/30 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-white/60" : ""
                        }`}
                        width="16"
                        height="16"
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
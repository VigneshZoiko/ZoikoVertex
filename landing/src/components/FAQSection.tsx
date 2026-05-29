"use client";

import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const faqs = [
  {
    q: "How is ZoikoVertex different from Hootsuite, Sprout Social, or Buffer?",
    a: "ZoikoVertex is a governed execution platform, not a scheduling tool. Every action taken by a human or AI agent is policy-checked, role-bound, logged, and auditable. Hootsuite and similar tools focus on publishing workflows. ZoikoVertex focuses on governance, compliance, and evidence — with publishing as one output.",
  },
  {
    q: "How are AI agents governed in ZoikoVertex?",
    a: "Every AI agent has a defined capability scope, a list of actions it cannot perform, and full logging of every decision. No agent can bypass the governance layer, publish unapproved content, or respond to sensitive items without authorization. Final authority is always role-bound and human-in-the-loop.",
  },
  {
    q: "Can approvals be bypassed?",
    a: "No. Approval chains are enforced at the platform level. Content cannot move from draft to published without completing the required approval sequence. Crisis Console access requires dual authorization and is time-boxed.",
  },
  {
    q: "How do audit records work and can they be edited?",
    a: "Every action — draft creation, approval, override, read, or AI decision — creates an immutable audit event. Records cannot be edited, deleted, or back-dated. Legal hold is available on Corporate plans, freezing all records related to a matter.",
  },
  {
    q: "How are multi-role users handled?",
    a: "Users can hold multiple roles but each role carries its own scope. Visibility does not equal authority — a user with Reviewer access cannot approve, and a user with Publisher access cannot override a compliance flag. ABAC enforcement ensures actions are always role-appropriate.",
  },
  {
    q: "What is included in each plan?",
    a: "Starter includes basic activity logging and limited channel connections. Growth adds immutable audit trails and AI-assisted execution for one brand team. Scale adds multi-brand support, advanced evidence packaging, and Crisis Console. Corporate adds Evidence Vault, legal hold, SSO/SCIM, and dedicated implementation.",
  },
  {
    q: "What integrations are supported?",
    a: "ZoikoVertex integrates with social channels (Meta, LinkedIn, TikTok, X/Twitter, YouTube, Pinterest), analytics platforms (Google Analytics, Looker, BigQuery, Snowflake), CRM tools (Salesforce, HubSpot, Pipedrive, Zoho CRM), and identity/storage systems (SSO/SAML, SCIM, AWS S3, Bynder, Canto).",
  },
  {
    q: "How does Corporate deployment work?",
    a: "Corporate deployment includes a dedicated implementation specialist, custom integration scoping, SSO/SCIM setup, Evidence Vault configuration, and a phased onboarding plan. All data residency and DPA requirements are handled during the onboarding process.",
  },
];

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
    viewBox="0 0 24 24"
    style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function FAQSection() {
  const { ref: headRef, inView: headInView } = useInView(0.2);
  const { ref: listRef, inView: listInView } = useInView(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-[#080E1A] w-full px-6 py-20 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div
          ref={headRef}
          className="flex flex-col items-center text-center mb-12"
          style={{
            opacity: headInView ? 1 : 0,
            transform: headInView ? "translateY(0px)" : "translateY(48px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-5 h-[1.5px] bg-[#20E7F2] inline-block" />
            <span className="text-[#20E7F2] text-[11px] font-semibold tracking-[0.22em] uppercase">
              FAQ
            </span>
          </div>
          <h2 className="text-white font-black text-[2.6rem] md:text-[3.2rem] leading-[1.1] tracking-tight max-w-xl">
            Common questions answered directly.
          </h2>
        </div>

        {/* ── Accordion Container ── */}
        <div
          ref={listRef}
          className="border border-[#ffffff10] rounded-2xl overflow-hidden"
          style={{
            opacity: listInView ? 1 : 0,
            transform: listInView ? "translateY(0px)" : "translateY(44px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`${i !== faqs.length - 1 ? "border-b border-[#ffffff0d]" : ""}`}
            >
              {/* Question row */}
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-7 py-5 text-left gap-6
                  hover:bg-[#ffffff03] transition-colors duration-200 group"
              >
                <span className={`text-[15px] font-semibold leading-snug transition-colors duration-200
                  ${openIndex === i ? "text-white" : "text-[#CBD5E1] group-hover:text-white"}`}>
                  {faq.q}
                </span>
                <span className={`shrink-0 transition-colors duration-200
                  ${openIndex === i ? "text-teal-400" : "text-[#4B5563] group-hover:text-[#94A3B8]"}`}>
                  <ChevronIcon open={openIndex === i} />
                </span>
              </button>

              {/* Answer — animated expand */}
              <div
                style={{
                  maxHeight: openIndex === i ? "400px" : "0px",
                  overflow: "hidden",
                  transition: "max-height 0.35s ease",
                }}
              >
                <p className="text-[#7a8fa8] text-[14px] leading-relaxed px-7 pb-5">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
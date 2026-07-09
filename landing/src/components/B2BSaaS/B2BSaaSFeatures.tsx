"use client";

import Image from "next/image";

const TAGS_A = ["Product claims review", "Security sign-off", "Compliance positioning", "Legal escalation", "Competitive claim validation"];
const TAGS_B = ["Customer authorization tracking", "Quote approval", "Case study review", "Logo governance", "Consent evidence"];

function TagPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1.5"
      style={{
        borderRadius: "100px",
        border: "1px solid rgba(139, 92, 246, 0.25)",
        background: "rgba(139, 92, 246, 0.12)",
        color: "#20E7F2",
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: "10.1px",
        fontStyle: "normal",
        fontWeight: 500,
        lineHeight: "normal",
      }}
    >
      {label}
    </span>
  );
}

export default function B2BSaaSFeatures() {
  return (
    <section className="bg-[#080d1a]">
      {/* Block A — image left, content right */}
      <div className="grid lg:grid-cols-2 lg:h-[560px]">
        <div className="relative h-[320px] lg:h-full">
          <Image src="/images/b2b-saas/left-diagonal-v2.png" alt="Product and security claims review" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
        <div className="flex items-center px-6 sm:px-12 py-16 lg:py-0">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Product Claims &amp; Security Review</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3vw,2.4rem)] font-black leading-tight text-white mb-5">
              Product and security claims reviewed before every piece of content.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7">
              ZoikoVertex routes product capability claims, security statements, compliance positioning, and competitive comparisons to product marketing, legal, and security teams — with structured approval paths and evidence records at every step.
            </p>
            <div className="flex flex-wrap gap-2">
              {TAGS_A.map((t) => <TagPill key={t} label={t} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Block B — content left, image right */}
      <div className="grid lg:grid-cols-2 lg:h-[560px] border-t border-white/[0.06]">
        <div className="flex items-center px-6 sm:px-12 py-16 lg:py-0 order-2 lg:order-1">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Customer Proof Governance</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3vw,2.4rem)] font-black leading-tight text-white mb-5">
              Customer proof used only with documented authorization.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7">
              ZoikoVertex helps B2B SaaS teams manage authorization records for customer quotes, case studies, logo usage, and usage data — ensuring customer evidence is current, consented, and linked to an auditable approval record.
            </p>
            <div className="flex flex-wrap gap-2">
              {TAGS_B.map((t) => <TagPill key={t} label={t} />)}
            </div>
          </div>
        </div>
        <div className="relative h-[320px] lg:h-full order-1 lg:order-2">
          <Image src="/images/b2b-saas/right-diagonal-v2.png" alt="Customer proof governance" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </div>
    </section>
  );
}

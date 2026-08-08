"use client";

import Image from "next/image";

type BuyerPath = {
  role: string;
  scope: string;
  question: string;
  desc: string;
  image: string;
};

const PATHS: BuyerPath[] = [
  {
    role: "CEO",
    scope: "Founder",
    question: "Is strategy actually being executed?",
    desc: "Turns agentic work, campaigns, approvals, and outcomes into executive operating visibility.",
    image: "/images/executive-command-center/buyer-ceo.png",
  },
  {
    role: "CMO",
    scope: "Growth Leader",
    question: "What campaigns are moving, blocked, and performing?",
    desc: "Campaign velocity, content status, governance exceptions, and ROI contribution in one view.",
    image: "/images/executive-command-center/buyer-cmo.png",
  },
  {
    role: "COO",
    scope: "Operations Leader",
    question: "Where are the bottlenecks? Who is accountable?",
    desc: "Workflow health, SLA signals, owner accountability, and escalation queues — with no blind spots.",
    image: "/images/executive-command-center/buyer-coo.png",
  },
  {
    role: "CTO",
    scope: "CIO",
    question: "Can this dashboard be trusted, secured, and integrated?",
    desc: "Role-based visibility, event-source architecture, integration health, data governance, and audit linkage.",
    image: "/images/executive-command-center/buyer-cto.png",
  },
  {
    role: "Legal",
    scope: "Governance Leader",
    question: "Can we see risk before damage and prove what happened?",
    desc: "Risk signals, evidence links, approval decisions, and audit trail references built into the command layer.",
    image: "/images/executive-command-center/buyer-legal.png",
  },
  {
    role: "Procurement",
    scope: "Finance",
    question: "Can we justify cost and prove measurable value?",
    desc: "ROI indicators, productivity metrics, execution value, and governance-risk reduction — surfaced clearly.",
    image: "/images/executive-command-center/buyer-procurement.png",
  },
];

export default function ExecutiveCommandCenterBuyerPaths() {
  return (
    <section className="bg-[#080d1a] pt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Executive Buyer Paths
          </span>
        </div>

        <h2 className="max-w-[480px] text-[clamp(1.9rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          The right view for every leader in the buying committee.
        </h2>

        <p className="mt-6 max-w-[500px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Six distinct executive roles. Each with a specific question the command center is designed
          to answer.
        </p>
      </div>

      {/* ─── Full-bleed role strip ──────────────────────────────────── */}
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {PATHS.map((p) => (
          <article
            key={p.role}
            className="relative min-h-[420px] flex flex-col justify-end overflow-hidden border-r border-white/10 last:border-r-0"
          >
            <Image
              src={p.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 16vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] from-25% via-[#080d1a]/60 via-55% to-transparent" />

            <div className="relative p-5">
              <div className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                {p.role} <span className="text-white/25">/</span> {p.scope}
              </div>
              <h3 className="mt-2.5 text-[15px] font-bold leading-snug text-white font-[family-name:var(--font-bricolage)]">
                {p.question}
              </h3>
              <p className="mt-2.5 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                {p.desc}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type UseCase = {
  role: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  image: string;
};

const USE_CASES: UseCase[] = [
  {
    role: "Chief Marketing Officer",
    title: "More campaigns. Faster. Without brand dilution.",
    desc: "AI accelerates campaign velocity. Approval workflows protect accountability. Evidence records close disputes instantly.",
    cta: "See Marketing Demo",
    href: "/request-demo",
    image: "/images/enterprise-retail/Chief Marketing Officer.png",
  },
  {
    role: "Chief Information Officer",
    title: "Secure AI orchestration across the enterprise stack.",
    desc: "One governed layer — integrating with existing commerce, CRM, DAM, identity, and analytics systems without fragmentation.",
    cta: "Review Architecture",
    href: "/agentic-architecture",
    image: "/images/enterprise-retail/Chief Information Officer.png",
  },
  {
    role: "COO & Store Operations",
    title: "Consistent execution across stores, regions, and field teams.",
    desc: "Central brand rules govern every local variant. Store-level execution stays on-brand without slowing local speed.",
    cta: "Explore Store Execution",
    href: "/platform",
    image: "/images/enterprise-retail/Chief Operating Officer.png",
  },
  {
    role: "Head of E-commerce",
    title: "Faster product launches, content variants, and channel QA.",
    desc: "Review and approve product descriptions, landing page content, and channel-specific variants without creating bottlenecks.",
    cta: "View E-commerce Workflow",
    href: "/ai-workflow-orchestration",
    image: "/images/enterprise-retail/Head of E-commerce.png",
  },
  {
    role: "Head of Retail Media",
    title: "Governed intake, creative approval, and advertiser evidence.",
    desc: "Retail media campaigns require structured intake, creative approval, publisher evidence, and performance reporting in one governed flow.",
    cta: "View Retail Media Use Case",
    href: "/solution",
    image: "/images/enterprise-retail/Head of Retail Media.png",
  },
  {
    role: "Legal & Compliance",
    title: "Policy checks, approval evidence, and investigation readiness.",
    desc: "Claims, pricing, regulated categories, and privacy rules are checked before publication. Evidence is preserved and available on demand.",
    cta: "View Compliance Controls",
    href: "/governance",
    image: "/images/enterprise-retail/Legal and Compliance.png",
  },
  {
    role: "Procurement & Finance",
    title: "A clear ROI model, vendor controls, and measurable impact.",
    desc: "Campaign throughput, cycle-time reduction, rework cost, and governance maturity all translate to a measurable executive business case.",
    cta: "Calculate Retail ROI",
    href: "/pricing",
    image: "/images/enterprise-retail/Procurement and Finance.png",
  },
  {
    role: "Agency Management",
    title: "Coordinate external partners without losing visibility or control.",
    desc: "Agencies work within governed brief templates, approval workflows, and evidence standards — reducing revision cycles and integration risk.",
    cta: "View Agency Workflow",
    href: "/agencies",
    image: "/images/enterprise-retail/Agency Management.png",
  },
];

export default function EnterpriseRetailUseCases() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Use Cases by Role
          </span>
        </div>

        <h2 className="max-w-[420px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          The right case for every enterprise retail buyer.
        </h2>

        <p className="mt-6 max-w-[490px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Eight buying roles. Eight distinct reasons governed agentic execution changes how retail
          operations run.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {USE_CASES.map((u) => (
            <article
              key={u.role}
              className="rounded-2xl border border-white/[0.14] bg-[#0E1626] overflow-hidden flex flex-col"
            >
              <div className="relative h-36 shrink-0">
                <Image
                  src={u.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
                  className="object-cover saturate-0"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-[#080d1a]/95" />
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="text-[9.6px] font-medium uppercase tracking-[0.1em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                  {u.role}
                </div>

                <h3 className="mt-3 text-base font-bold leading-5 text-white/90 font-[family-name:var(--font-bricolage)]">
                  {u.title}
                </h3>

                <p className="mt-3 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
                  {u.desc}
                </p>

                <Link
                  href={u.href}
                  className="mt-auto pt-6 inline-flex items-center gap-1.5 text-[10.1px] font-medium uppercase tracking-[0.1em] text-[#20E7F2] hover:gap-2.5 transition-all font-[family-name:var(--font-jetbrains)]"
                >
                  {u.cta}
                  <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

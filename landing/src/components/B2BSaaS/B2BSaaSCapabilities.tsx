"use client";

import { Code2, ShieldCheck, Star, Award, FileCheck2, Users2 } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Code2,
    title: "Product Claims Review",
    desc: "Route product capability descriptions, feature claims, roadmap references, and competitive statements to product marketing and legal for sign-off.",
    color: "#20E7F2",
  },
  {
    icon: ShieldCheck,
    title: "Security & Compliance Messaging",
    desc: "Require security team review for security, privacy, and compliance claims before they appear in any customer-facing content.",
    color: "#20E7F2",
  },
  {
    icon: Star,
    title: "Customer Proof Authorization",
    desc: "Track customer consent and authorization records for quotes, case studies, logos, and usage data — with auditable approval trails.",
    color: "#20E7F2",
  },
  {
    icon: Award,
    title: "AI Workflow Governance",
    desc: "Apply human review gates to AI-assisted product descriptions, competitive comparisons, and market positioning before any approval path.",
    color: "#20E7F2",
  },
  {
    icon: FileCheck2,
    title: "Procurement Audit Trails",
    desc: "Maintain complete evidence records for product claims, security statements, and customer proof — ready for enterprise procurement review.",
    color: "#20E7F2",
  },
  {
    icon: Users2,
    title: "Cross-Functional Approval Paths",
    desc: "Route marketing content to product, security, legal, and customer success teams with defined authority levels and escalation paths.",
    color: "#20E7F2",
  },
];

export default function B2BSaaSCapabilities() {
  return (
    <section className="bg-[#0C1523] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Platform Capabilities</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white max-w-2xl">
            Governance capabilities for B2B SaaS marketing operations.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/[0.08] bg-[#101D2F] p-7">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
                style={{ background: `${c.color}1A`, border: `1px solid ${c.color}40` }}
              >
                <c.icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <h3 className="text-white font-bold text-[15px] mb-2 leading-snug">{c.title}</h3>
              <p className="text-white/50 text-[13.5px] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { ShieldCheck, FileCheck2, Award, Lock } from "lucide-react";

const DOCS = [
  {
    icon: ShieldCheck,
    title: "Compliance & Governance",
    desc: "Approval workflows, policy controls, role-based permissions, and governance architecture.",
  },
  {
    icon: FileCheck2,
    title: "Auditability",
    desc: "Evidence records and audit trails for accountable marketing operations.",
  },
  {
    icon: Award,
    title: "Responsible AI",
    desc: "How ZoikoVertex governs AI-assisted workflows with human oversight.",
  },
  {
    icon: Lock,
    title: "Security",
    desc: "Access controls, data protection, and enterprise security review documentation.",
  },
];

export default function B2BSaaSTrustDocs() {
  return (
    <section className="bg-[#0C1523] border-t border-white/[0.06] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Trust &amp; Governance</span>
        </div>
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-4">
          Documentation for enterprise review.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-xl mb-14">
          Deeper trust documentation for legal, compliance, security, and procurement teams evaluating ZoikoVertex.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DOCS.map((d) => (
            <div key={d.title} className="rounded-2xl border border-white/[0.08] bg-[#101D2F] p-6">
              <div className="w-10 h-10 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/25 flex items-center justify-center mb-5">
                <d.icon className="w-4.5 h-4.5 text-[#20E7F2]" />
              </div>
              <h3 className="text-white font-bold text-[14.5px] mb-2">{d.title}</h3>
              <p className="text-white/50 text-[13px] leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { Code2, ShieldOff, Star, Award } from "lucide-react";

const CHALLENGES = [
  {
    icon: Code2,
    title: "Product claims outpace features",
    desc: "Marketing teams describe capabilities that engineering has not yet shipped — or positions features more broadly than the product actually supports.",
  },
  {
    icon: ShieldOff,
    title: "Security claims without review",
    desc: "Security, compliance, and privacy claims are published without security team sign-off, creating procurement and legal risk for enterprise deals.",
  },
  {
    icon: Star,
    title: "Customer proof used without permission",
    desc: "Case studies, quotes, and usage data are referenced in marketing without current customer authorization or adequate legal review.",
  },
  {
    icon: Award,
    title: "AI generates competitive claims unreviewed",
    desc: "AI-assisted competitive positioning, product comparisons, and market-leader language goes live without product or legal review.",
  },
];

export default function B2BSaaSChallenges() {
  return (
    <section className="bg-[#080d1a] border-y border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">B2B SaaS Marketing Challenges</span>
        </div>
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white max-w-3xl mx-auto">
          Why B2B SaaS marketing governance matters more as you scale.
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-white/[0.06]">
        {CHALLENGES.map((c, i) => (
          <div
            key={c.title}
            className={`p-8 border-white/[0.06] bg-[#101D2F] ${i < CHALLENGES.length - 1 ? "lg:border-r" : ""} border-b lg:border-b-0 sm:${i % 2 === 0 ? "border-r" : ""}`}
          >
            <div className="w-11 h-11 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/25 flex items-center justify-center mb-5">
              <c.icon className="w-5 h-5 text-[#20E7F2]" />
            </div>
            <h3 className="text-white font-bold text-[15px] mb-2 leading-snug">{c.title}</h3>
            <p className="text-white/50 text-[13.5px] leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { ScrollText, Bot, FileWarning, ShieldAlert } from "lucide-react";

const CHALLENGES = [
  {
    icon: ScrollText,
    title: "Regulated claims require review",
    desc: "Financial product claims, rate disclosures, and promotional messaging must pass legal and compliance review before any public distribution.",
  },
  {
    icon: Bot,
    title: "AI drafts financial copy unreviewed",
    desc: "AI tools generate financial messaging, rate comparisons, and product descriptions that may contain inaccuracies or unreviewed regulatory risks.",
  },
  {
    icon: FileWarning,
    title: "Approval evidence is missing",
    desc: "Regulators may ask for evidence of the approval process behind financial communications. Manual workflows leave no auditable record.",
  },
  {
    icon: ShieldAlert,
    title: "Brand risk from rapid publishing",
    desc: "Fast-moving FinTech teams push financial communications to market before adequate compliance and legal sign-off — creating regulatory exposure.",
  },
];

export default function FintechChallenges() {
  return (
    <section className="bg-[#101D2F] border-y border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#20E7F2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Fintech Marketing Challenges</span>
        </div>
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white max-w-3xl mx-auto">
          Why financial marketing governance demands more discipline.
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

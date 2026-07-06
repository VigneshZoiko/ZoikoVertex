"use client";

const FACTS = [
  { label: "Product Name", value: "ZoikoVertex" },
  { label: "Category", value: "Governed AI Marketing Operations Platform" },
  { label: "Parent Ecosystem", value: "Zoiko Group" },
  {
    label: "Primary Users",
    value: "Enterprise teams, agencies, multi-brand organizations, governance-led marketing departments",
  },
  { label: "AI Positioning", value: "AI-assisted workflows with human oversight and governance controls" },
  { label: "Trust Focus", value: "Security, privacy, auditability, responsible AI, and compliance-aware workflows" },
  {
    label: "Core Functions",
    value: "Content workflows, campaign approvals, brand governance, audit trails, evidence records",
  },
  { label: "Launch Status", value: "[To be confirmed before publication]", pending: true },
  { label: "Website", value: "[To be confirmed]", pending: true },
];

export default function PressSnapshot() {
  return (
    <section className="bg-[#080D1A] py-20 md:py-24 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Product Facts</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-4">
          Platform snapshot.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mb-12">
          Quick reference facts for editorial use. All claims must be verified before publication. Do not include customer counts, revenue, certifications, awards, or market rankings unless confirmed.
        </p>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0C1523] grid sm:grid-cols-2 lg:grid-cols-3 divide-y divide-white/[0.06] sm:divide-x lg:divide-x">
          {FACTS.map((f) => (
            <div key={f.label} className="px-7 py-7">
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/35 font-mono mb-2">{f.label}</div>
              <div className={`font-bold text-[15px] leading-snug ${f.pending ? "text-[#C9A84C]" : "text-white"}`}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

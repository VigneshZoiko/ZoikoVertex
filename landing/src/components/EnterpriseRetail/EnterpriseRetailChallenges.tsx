"use client";

import { Timer, Store, Network, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Challenge = { icon: LucideIcon; title: string; desc: string };

const CHALLENGES: Challenge[] = [
  {
    icon: Timer,
    title: "Campaign speed vs approval reality",
    desc: "Seasonal windows, promotions, and product drops move faster than approval processes. Teams bypass controls to hit launch dates — creating risk and missing evidence.",
  },
  {
    icon: Store,
    title: "Brand consistency across stores",
    desc: "Stores, franchises, regions, agencies, and creators drift from central brand standards. Without governed localization, every market becomes its own risk.",
  },
  {
    icon: Network,
    title: "Fragmented operational complexity",
    desc: "Marketing, e-commerce, merchandising, retail media, store teams, and agencies work across disconnected tools with no unified governance or visibility layer.",
  },
  {
    icon: ShieldAlert,
    title: "Compliance and claims exposure",
    desc: "Pricing claims, offers, regulated categories, privacy rules, and regional legal requirements create exposure when AI-generated content bypasses review.",
  },
];

export default function EnterpriseRetailChallenges() {
  return (
    <section className="bg-[#0A111E] border-t border-b border-white/[0.14]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-14">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Enterprise Retail Challenges
          </span>
        </div>

        <h2 className="max-w-[520px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          Why retail marketing governance breaks down at scale.
        </h2>

        <p className="mt-6 max-w-[540px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Seasonal windows, franchise complexity, agency sprawl, and AI acceleration are outrunning
          the controls that protect brand, compliance, and ROI.
        </p>
      </div>

      {/* ─── Full-bleed challenge row ───────────────────────────────── */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-px bg-white/10">
        {CHALLENGES.map((c) => (
          <div key={c.title} className="bg-[#0A111E] px-7 py-8">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-[#20E7F2]/10 border border-[#20E7F2]/30">
              <c.icon className="w-4 h-4 text-[#20E7F2]" strokeWidth={2} />
            </div>
            <h3 className="mt-6 text-base font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
              {c.title}
            </h3>
            <p className="mt-3 text-xs font-light leading-5 text-white/50 font-[family-name:var(--font-jakarta)]">
              {c.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

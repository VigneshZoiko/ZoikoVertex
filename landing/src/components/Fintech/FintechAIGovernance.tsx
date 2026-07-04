"use client";

import Image from "next/image";

const TAGS = ["AI draft boundaries", "Mandatory human review", "Compliance routing", "Claim validation", "Rate accuracy checks"];

export default function FintechAIGovernance() {
  return (
    <section className="bg-[#080d1a]">
      <div className="grid lg:grid-cols-2 items-stretch">
        <div className="flex items-center px-6 py-16 lg:px-16 order-2 lg:order-1">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">AI Governance for Financial Copy</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
              AI helps write financial content. Humans stay responsible for every claim.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7 max-w-[480px]">
              AI assistance in ZoikoVertex operates within governed workflow boundaries. Every AI-assisted draft is subject to mandatory human review, compliance routing, and approval sign-off before any distribution to any audience.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {TAGS.map((t) => (
                <span key={t} className="text-[11.5px] font-medium text-[#20E7F2] bg-[#20E7F2]/10 border border-[#20E7F2]/25 rounded-full px-3.5 py-1.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[360px] lg:min-h-[560px] order-1 lg:order-2">
          <Image
            src="/images/fintech/ai-governance.png"
            alt="AI-assisted financial content review with human oversight"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

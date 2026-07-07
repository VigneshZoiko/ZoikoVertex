"use client";

import Image from "next/image";

const TAGS = ["Sensitive content gates", "Clinical accuracy review", "AI draft boundaries", "Mandatory human oversight"];

export default function HealthcareAIGovernance() {
  return (
    <section className="bg-[#080d1a] border-t border-white/[0.06]">
      <div className="grid lg:grid-cols-2 items-stretch">
        <div className="flex items-center px-6 py-16 lg:px-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">AI Governance for Health Content</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
              AI assists drafting. Clinical humans stay accountable for every claim.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7 max-w-[480px]">
              All AI-assisted health content in ZoikoVertex is subject to mandatory clinical and policy review before advancing. AI assistance cannot bypass sensitive-content review gates or clinical accuracy requirements.
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

        <div className="relative min-h-[360px] lg:min-h-[560px]">
          <Image
            src="/images/healthcare/ai-governance.png"
            alt="AI-assisted health content drafting with clinical human oversight"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

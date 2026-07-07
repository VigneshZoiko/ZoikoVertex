"use client";

import Image from "next/image";

const TAGS = ["Clinical review routing", "Policy sign-off", "Privacy review", "Legal escalation", "Sensitivity-based workflows"];

export default function HealthcareClinicalReview() {
  return (
    <section className="bg-[#080d1a]">
      <div className="grid lg:grid-cols-2 items-stretch">
        <div className="relative min-h-[360px] lg:min-h-[560px]">
          <Image
            src="/images/healthcare/clinical-review.png"
            alt="Clinical and policy review governance for healthcare marketing content"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex items-center px-6 py-16 lg:px-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Clinical &amp; Policy Review Governance</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
              Every health claim reviewed by the right experts before publication.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7 max-w-[480px]">
              ZoikoVertex routes health-related marketing content to clinical reviewers, policy teams, legal counsel, privacy officers, and communications leads — with structured approval paths that match the sensitivity of each content type.
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
      </div>
    </section>
  );
}

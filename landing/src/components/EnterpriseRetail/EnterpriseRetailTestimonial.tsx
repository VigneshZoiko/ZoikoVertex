"use client";

import Image from "next/image";

const STATS = [
  { value: "7-step", label: "Governed flow" },
  { value: "Full chain", label: "Campaign evidence" },
  { value: "Zero", label: "Uncontrolled AI" },
];

export default function EnterpriseRetailTestimonial() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      {/* 1440x700 export — matches this band, not the 1440x963 hero frame. */}
      <Image
        src="/images/enterprise-retail/Enterprise retail environment.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover saturate-[0.2]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/95 via-[#080d1a]/85 to-[#080d1a]/70" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ─── Quote ──────────────────────────────────────────────── */}
          <div>
            <div className="flex gap-1.5 mb-8" aria-hidden>
              <span className="w-1.5 h-6 bg-[#20E7F2]" />
              <span className="w-1.5 h-6 bg-[#20E7F2]" />
            </div>

            <blockquote className="max-w-[440px] text-[clamp(1.15rem,1.9vw,1.4rem)] font-bold leading-[1.55] text-white font-[family-name:var(--font-bricolage)]">
              Enterprise retail moves at promotional speed. ZoikoVertex gives our marketing and
              operations teams the ability to launch governed AI-assisted campaigns across hundreds
              of stores without losing the approval discipline and evidence trail our legal and
              compliance teams require.
            </blockquote>

            <div className="mt-9 max-w-[340px] border-t border-white/[0.14] pt-5">
              <div className="text-sm font-bold text-white font-[family-name:var(--font-bricolage)]">
                [VP Marketing Operations]
              </div>
              <div className="mt-3 text-[9.6px] font-medium uppercase tracking-[0.1em] leading-[1.6] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                Enterprise retail organization — profile pending approval
              </div>
            </div>
          </div>

          {/* ─── Portrait + stats ───────────────────────────────────── */}
          <div className="justify-self-end w-full max-w-[420px]">
            {/* PENDING: portrait PNG for this card has not been supplied yet. */}
            <div className="relative aspect-[16/11] rounded-sm overflow-hidden border border-white/[0.14]">
              <Image
                src="/images/enterprise-retail/testimonial-portrait.png"
                alt=""
                fill
                sizes="420px"
                className="object-cover saturate-0"
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-base font-extrabold text-[#20E7F2] font-[family-name:var(--font-bricolage)]">
                    {s.value}
                  </div>
                  <div className="mt-2 text-[8.8px] font-medium uppercase tracking-[0.1em] text-white/30 font-[family-name:var(--font-jetbrains)]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

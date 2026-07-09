"use client";

import Image from "next/image";

const STATS = [
  { label: "Zero", sub: "Unreviewed Claims" },
  { label: "Full chain", sub: "Approval Evidence" },
  { label: "Instant", sub: "Audit Retrieval" },
];

export default function FintechTestimonial() {
  return (
    <section className="relative bg-[#0C1523] border-t border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/fintech/testimonial-bg.jpg"
          alt=""
          fill
          className="object-cover opacity-15"
          sizes="100vw"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div
            className="mb-6"
            style={{
              color: "#20E7F2",
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontSize: 80,
              fontStyle: "normal",
              fontWeight: 800,
              lineHeight: "64px",
            }}
          >
            &rdquo;
          </div>
          <blockquote className="text-white text-[clamp(1.4rem,2.2vw,1.75rem)] font-bold leading-snug mb-8">
            Financial regulators expect evidence of process, not just evidence of outcome. ZoikoVertex gives our marketing governance team a complete, auditable record of every approval decision — without any extra effort.
          </blockquote>
          <div
            className="bg-[#0C1523]/60 border border-white/10 rounded-lg self-stretch"
            style={{ display: "flex", padding: "26px 44px", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 16 }}
          >
            <div className="text-white font-bold text-[15px]">[Compliance &amp; Marketing Lead]</div>
            <div className="text-[#20E7F2] text-[11px] font-mono uppercase tracking-[0.1em]">
              Fintech Organization — Profile Pending Approval
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10">
          <div className="relative h-[280px]">
            <Image
              src="/images/fintech/testimonial-lead.png"
              alt="Compliance & Marketing Lead"
              fill
              className="object-cover grayscale"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1523] via-transparent to-transparent" />
          </div>
          <div className="bg-[#101D2F] grid grid-cols-3 divide-x divide-white/[0.08] px-6 py-5">
            {STATS.map((s) => (
              <div key={s.label} className="px-2 first:pl-0">
                <div className="text-[#20E7F2] font-bold text-[15px]">{s.label}</div>
                <div className="text-white/35 text-[10px] font-mono uppercase tracking-[0.1em] mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

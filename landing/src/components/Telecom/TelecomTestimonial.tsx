"use client";

import Image from "next/image";

const STATS = [
  { label: "Verified", sub: "Every Pricing Claim" },
  { label: "Multi-market", sub: "Disclosure Governance" },
  { label: "Regulator-ready", sub: "Evidence Records" },
];

export default function TelecomTestimonial() {
  return (
    <section className="relative bg-[#0C1523] border-t border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/telecom/testimonial-bg.jpg"
          alt=""
          fill
          className="object-cover opacity-15"
          sizes="100vw"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div
            className="mb-2 select-none"
            style={{
              display: "flex",
              width: "28.218px",
              height: "64px",
              flexDirection: "column",
              justifyContent: "center",
              color: "#20E7F2",
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontSize: 80,
              fontWeight: 800,
              lineHeight: "64px",
              opacity: 0.35,
            }}
            aria-hidden="true"
          >
            &#8220;
          </div>
          <blockquote className="text-white text-[clamp(1.4rem,2.2vw,1.75rem)] font-bold leading-snug mb-8">
            Telecom advertising faces regulator attention in every market we operate in. ZoikoVertex means our team can demonstrate a governed approval process for every claim we publish — before regulators ask for it.
          </blockquote>
          <div
            className="bg-[#0C1422] border border-white/10 rounded-lg self-stretch"
            style={{ display: "flex", padding: "26px 44px", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 16 }}
          >
            <div className="text-white font-bold text-[15px]">[VP Marketing &amp; Regulatory Affairs]</div>
            <div className="text-[#20E7F2] text-[11px] font-mono uppercase tracking-[0.1em]">
              Telecom Organization — Profile Pending Approval
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10">
          <div className="relative h-[280px]">
            <Image
              src="/images/telecom/testimonial-headshot.jpg"
              alt="VP Marketing & Regulatory Affairs"
              fill
              className="object-cover object-center grayscale"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C1523] via-transparent to-transparent" />
          </div>
          <div className="bg-[#0C1422] grid grid-cols-3 divide-x divide-white/[0.08] px-6 py-5">
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

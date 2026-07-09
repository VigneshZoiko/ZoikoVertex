"use client";

import Image from "next/image";

const STATS = [
  { label: "Product", sub: "Claims verified" },
  { label: "Security", sub: "Team sign-off" },
  { label: "Procurement", sub: "Ready evidence" },
];

export default function B2BSaaSTestimonial() {
  return (
    <section className="relative bg-[#0C1523] border-t border-white/[0.06] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/b2b-saas/testimonial-lead.png"
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
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontSize: "80px",
              fontStyle: "normal",
              fontWeight: 800,
              lineHeight: "64px",
            }}
          >
            &ldquo;
          </div>
          <blockquote className="text-white text-[clamp(1.4rem,2.2vw,1.75rem)] font-bold leading-snug mb-8">
            Enterprise buyers audit our marketing claims during procurement. ZoikoVertex means we can show them exactly how every product claim was reviewed, by whom, and under which policy — not just hope the evidence exists somewhere.
          </blockquote>
          <div className="pt-5 px-5 pb-5 -mx-5" style={{ borderTop: "0.8px solid rgba(255, 255, 255, 0.10)", background: "#0C1422" }}>
            <div className="text-white font-bold text-[15px]">[Head of Marketing Operations]</div>
            <div className="text-[#20E7F2] text-[11px] font-mono uppercase tracking-[0.1em] mt-1">
              B2B SaaS Organization — Profile Pending Approval
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10">
          <div className="relative h-[280px]">
            <Image
              src="/images/b2b-saas/testimonial-person.png"
              alt="Head of Marketing Operations"
              fill
              className="object-cover grayscale"
              style={{ objectPosition: "center 15%" }}
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

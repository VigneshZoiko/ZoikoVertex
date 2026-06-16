"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const FEATURES = [
  {
    title: "Non-Bypassable Governance",
    description: "Structural enforcement — not optional, not configurable",
    badge: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "Precision Attribution",
    description: "Multi-touch, decision-level, CFO-ready reporting",
    badge: { value: "82%", label: "Accuracy" },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
  },
  {
    title: "Immutable Audit Ledger",
    description: "Every decision recorded at runtime — not reconstructed",
    badge: null,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

export default function AboutGEI() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#0C1529] ">
      <div
        ref={ref}
        className=" mx-auto grid lg:grid-cols-2 gap-6 items-stretch"
      >

        {/* LEFT — Full height image, text centered */}
        <div
          className={`relative overflow-hidden lg:pl-40 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "100ms", minHeight: "360px" }}
        >
          {/* Background image */}
          <Image
            src="/images/about-gei.webp"
            alt="GEI"
            fill
            className="object-cover"
          />

          {/* Dark overlay — improves text legibility over image */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C1529]/85 via-[#0C1529]/50 to-transparent" />

          {/* Content — vertically and horizontally centered */}
          <div className="relative z-10 h-full flex flex-col justify-center px-8 py-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-[#1E2F55] bg-[#0E1B35] rounded-full px-3 py-1 mb-6 self-start">
              <span className="text-[#00C8F0] text-xs">✦</span>
              <span className="text-[#00C8F0] text-xs font-semibold tracking-widest uppercase">
                New Category
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl font-black text-white leading-tight mb-5">
              Governed Execution<br />Infrastructure (GEI)
            </h2>

            {/* Description */}
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              An infrastructure layer that sits between intent and
              execution — determining in real time what is permitted to
              happen, under what authority, with what financial
              consequence, and with what evidential record.
            </p>
          </div>
        </div>

        {/* RIGHT — 3 feature cards stacked, equal height */}
        <div
          className={`flex flex-col gap-4 transition-all py-10 pr-20 pl-5 duration-700 ease-out ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`flex items-center gap-4 px-5 py-5 rounded-xl flex-1
                hover:bg-[#0f0f25] transition-all duration-300 cursor-default
                ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
              style={{
                background: "#0d0d1f",
                border: "1px solid rgba(255,255,255,0.07)",
                transitionDelay: `${300 + i * 100}ms`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.15)",
                }}
              >
                {feature.icon}
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="text-white text-sm font-black mb-1">
                  {feature.title}
                </p>
                <p className="text-white/35 text-xs leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Badge */}
              {feature.badge && (
                <div
                  className="flex flex-col items-center justify-center px-3 py-2 rounded-xl shrink-0"
                  style={{
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.25)",
                  }}
                >
                  <p className="text-cyan-400 text-lg font-black leading-none">
                    {feature.badge.value}
                  </p>
                  <p className="text-cyan-400/50 text-xs font-bold">
                    {feature.badge.label}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
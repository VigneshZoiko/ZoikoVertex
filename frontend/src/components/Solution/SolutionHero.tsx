"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function SolutionHero() {
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
    <section className="bg-[#080E1A] min-h-screen pt-20 pb-16 px-6 overflow-hidden">
      <div
        ref={ref}
        className="max-w-[1200] mx-auto grid lg:grid-cols-2 gap-12 items-center"
      >

        {/* Left Content */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-[#20E7F22E] bg-[#20E7F20F] rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#20E7F2] text-xs">✦</span>
            <span className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase">
              Solutions · Governed Execution for Modern Marketing Teams
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            Find the ZoikoVertex solution built for your{" "}
            <span className="text-[#20E7F2]">
              team, risk, and growth model.
            </span>
          </h1>

          {/* Description */}
          <p className="text-[#FFFFFF85] text-sm leading-relaxed max-w-md mb-10">
            ZoikoVertex supports marketing teams, agencies, regulated
            organizations, and multi-brand operators with governed AI agents,
            approval workflows, brand controls, and revenue intelligence — all
            operating inside a defensible governance layer.
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/request-demo"
              className="flex items-center gap-2 bg-[#20E7F2] hover:bg-cyan-300 text-[#080E1A] text-sm font-bold px-6 py-3 rounded-lg transition-colors duration-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Request a Demo
            </Link>
            <button className="flex items-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm font-medium px-6 py-3 rounded-lg transition-colors duration-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
              Find Your Solution
            </button>
          </div>
        </div>

        {/* Right — Image only, no overlays, no cards */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          <img
            src="/images/Vertex-Tab.webp"
            alt="Solution"
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>

      </div>
    </section>
  );
}
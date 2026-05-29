"use client";
import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: "100%", label: "Governance Enforcement\nCoverage", color: "#22d3ee" },
  { value: "<150ms", label: "Decision Engine\nLatency", color: "#22d3ee" },
  { value: "82%", label: "Attribution Confidence\nScore", color: "#22d3ee" },
  { value: "3.7×", label: "Average Campaign\nROI Uplift", color: "#22d3ee" },
];

export default function AboutStats() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#0C1529] py-6 px-6">
      <div
        ref={ref}
        className="max-w-5xl mx-auto border border-white/10 rounded-2xl overflow-hidden grid grid-cols-2 md:grid-cols-4 bg-[#1E2F55]"
      >
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center justify-center gap-2 py-8 px-6 text-center
              hover:bg-white/[0.02] transition-all duration-500 ease-out
              ${i < STATS.length - 1 ? "border-r border-white/10" : ""}
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <p
              className="text-3xl lg:text-4xl font-black leading-none"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
            <p className="text-white/35 text-xs leading-relaxed whitespace-pre-line">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
"use client";
import { useEffect, useRef, useState } from "react";

export default function PlatformPainPoints() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const leftCards = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      iconColor: "text-red-400",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      title: "Fragmented content operations",
      description: "Teams work across disconnected tools — briefs, drafts, approvals, and publishing with no governance thread connecting them. No single source of truth.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12h6M9 8h6M9 16h4"/><rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="17" y1="17" x2="17" y2="17.01" strokeLinecap="round"/>
        </svg>
      ),
      iconColor: "text-orange-400",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      title: "Weak approval evidence",
      description: "Posts move faster than approvals. Teams lose evidence of who reviewed what, when, and under which brand policy version — leaving organizations exposed in disputes.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      iconColor: "text-cyan-400",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      title: "AI without governance",
      description: "AI content tools generate at volume without provable policy boundaries, brand rule enforcement, or decision audit trails — creating legal and reputational risk at scale.",
    },
  ];

  const rightItems = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      iconColor: "#20E7F2",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      text: "Regulatory exposure without a defensible audit trail",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      iconColor: "#20E7F2",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      text: "Revenue leakage from ungoverned spend decisions",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      iconColor: "#20E7F2",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      text: "Brand risk from AI-generated content without boundaries",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#20E7F2" strokeWidth="1.5">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      ),
      iconColor: "#20E7F2",
      iconBg: "bg-[#0C1422] border-[#FFFFFF1A]",
      text: "Strategic drift — teams optimizing activity, not outcomes",
    },
  ];

  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-6 h-px bg-white/40 inline-block" /> THE PROBLEM
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight max-w-2xl mx-auto">
            Social operations have outgrown scheduling tools.
          </h2>
        </div>

        {/* Two Column Layout */}
        <div ref={ref} className="grid lg:grid-cols-2 gap-6 items-stretch">

          {/* Left — 3 Cards */}
          <div className="flex flex-col gap-4">
            {leftCards.map((card, i) => (
              <div
                key={card.title}
                className={`border border-white/10 rounded-xl p-6 bg-[#0d0d1a] hover:bg-[#111128] hover:border-white/20 transition-all duration-500 cursor-default group ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${card.iconBg} ${card.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                    {card.icon}
                  </div>
                  <h3 className="text-white text-sm font-semibold">
                    {card.title}
                  </h3>
                </div>
                <p className="text-white/40 text-xs leading-relaxed">
                  {card.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right — Quote Card — full height */}
          <div
            className={`border border-white/10 rounded-xl p-8 bg-[#111D2E] flex flex-col transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <blockquote className="text-white text-2xl font-black leading-snug mb-10">
              "Posts move faster than approvals. Teams lose evidence, ownership,
              and accountability."
            </blockquote>

            <div className="flex flex-col gap-5">
              {rightItems.map((item, i) => (
                <div
                  key={item.text}
                  className={`flex items-center gap-4 transition-all duration-500 ${
                    visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  }`}
                  style={{ transitionDelay: `${500 + i * 100}ms` }}
                >
                  <div className={`w-15 h-15 rounded-lg border flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor}`}>
                    {item.icon}
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
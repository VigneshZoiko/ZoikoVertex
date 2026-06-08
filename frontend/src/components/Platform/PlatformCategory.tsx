"use client";
import { useEffect, useRef, useState } from "react";


const CONFIG = {
  label: "PLATFORM CATEGORY",
  heading: "One platform for strategy, execution, control, and proof.",
  description:
    "ZoikoVertex is governed execution infrastructure — not a scheduling tool, not an AI content generator. Every workflow, every agent action, every approval operates inside a defined policy boundary.",
  quote:
    '"ZoikoVertex is not only where content is scheduled. It is where social execution is governed."',

  cards: [
    {
      title: "Plan",
      description:
        "AI-guided strategy, channel intelligence, and campaign briefs connected to brand standards and approval workflows.",
      iconColor: "#20E7F2",   
      iconBg: "none",
      borderColor: "rgba(34,211,238,0.15)",
      hoverBorder: "rgba(34,211,238,0.4)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3h18v18H3z" rx="2"/><path d="M3 9h18M9 21V9"/>
        </svg>
      ),
    },
    {
      title: "Create",
      description:
        "Content Studio, AI agents, Brand Library policy checks, and structured workflow from brief to review queue.",
      iconColor: "#C9A84C",   
      iconBg: "none",
       borderColor: "#FFFFFF1A",
      hoverBorder: "rgba(245,158,11,0.4)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      ),
    },
    {
      title: "Govern",
      description:
        "Review Queue, Validation Desk, Approvals, policy versioning, and human-in-the-loop controls at every gate.",
      iconColor: "#F5E6C0",   
      iconBg: "none",
      borderColor: "#FFFFFF1A",
      hoverBorder: "rgba(167,139,250,0.4)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
    {
      title: "Prove",
      description:
        "Immutable audit events, watermarked evidence exports, Analytics & ROI, and revenue attribution by channel.",
      iconColor: "#22C55E",   
      iconBg: "none",
      borderColor: "#FFFFFF1A",
      hoverBorder: "rgba(52,211,153,0.4)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
  ],
};
// ============================================

export default function PlatformCategory() {
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
    <section className="bg-[#0C1422] py-24 px-6">
      <div ref={ref} className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
         <p className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-6 h-px bg-white/40 inline-block" /> Platform Category
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight max-w-3xl mx-auto mb-5">
            {CONFIG.heading}
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-2xl mx-auto">
            {CONFIG.description}
          </p>
        </div>

        {/* 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px  rounded-xl overflow-hidden mb-6">
          {CONFIG.cards.map((card, i) => (
            <div
              key={card.title}
              className={`bg-[#0C1422] p-6 group cursor-default transition-all duration-500 ease-out hover:bg-[#0d0d1a] ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: `${200 + i * 120}ms` }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: card.iconBg,
                  border: `1px solid ${card.borderColor}`,
                  color: card.iconColor,
                  boxShadow: `0 0 0 0 ${card.iconColor}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px 2px ${card.iconColor}40`;
                  (e.currentTarget as HTMLElement).style.borderColor = card.hoverBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.borderColor = card.borderColor;
                }}
              >
                {card.icon}
              </div>

              {/* Title */}
              <h3
                className="text-white text-base font-bold mb-2 transition-colors duration-300"
                style={{ color: "white" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = card.iconColor)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "white")}
              >
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-white/40 text-xs leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quote Banner */}
        <div
  className={`bg-[#C9A84C1A] border border-[#C9A84C33] rounded-xl px-8 py-5 text-center transition-all duration-700 ease-out ${
    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
  }`}
          style={{ transitionDelay: "700ms" }}
        >
          <p className="text-[#F5E6C0] text-sm font-medium ">
            {CONFIG.quote}
          </p>
        </div>

      </div>
    </section>
  );
}
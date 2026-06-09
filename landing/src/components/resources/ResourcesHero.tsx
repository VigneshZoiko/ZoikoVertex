"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const FILTER_TABS = ["All Formats", "Executive Brief", "Toolkit", "Guide", "Field Note"];

const RESOURCES = [
  {
    badge: "EXECUTIVE BRIEF",
    badgeColor: "#A5B4FC",
    badgeBg: "#6366F126",
    badgeBorder: "#6366F14D",
    title: "Governed AI Marketing Execution",
    description: "Strategic framework for CMOs and CFOs deploying AI at scale.",
    meta: "GATED · 8 MIN",
    metaColor: "#20E7F2",
    metaIcon: "lock",
  },
  {
    badge: "TOOLKIT",
    badgeColor: "#C9A84C",
    badgeBg: "#C9A84C1F",
    badgeBorder: "#C9A84C4D",
    title: "AI Marketing Governance Checklist",
    description: "43-item pre-deployment governance review.",
    meta: "UNGATED · PDF",
    metaColor: "#facc15",
    metaIcon: "user",
  },
  {
    badge: "GUIDE",
    badgeColor: "#20E7F2",
    badgeBg: "#20E7F21F",
    badgeBorder: "#20E7F24D",
    title: "Human-in-the-Loop Approval Models",
    description: "Configuring authority thresholds for AI agents.",
    meta: "FREE · 12 MIN",
    metaColor: "#4ade80",
    metaIcon: "circle",
  },
  {
    badge: "FIELD NOTE",
    badgeColor: "#94A3B8",
    badgeBg: "#64748B26",
    badgeBorder: "#64748B4D",
    title: "From Content Chaos to Governed Execution",
    description: "Real-world enterprise transition case study.",
    meta: "FREE · 6 MIN",
    metaColor: "#fb7185",
    metaIcon: "circle",
  },
];

const TRUST_TAGS = ["SOC 2 TYPE II", "ISO 27001", "GDPR", "RESPONSIBLE AI", "AUDIT-READY"];

function MetaIcon({ type, color }: { type: string; color: string }) {
  if (type === "lock") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
  if (type === "user") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 8 16 12 12 16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
}

export default function ResourcesHero() {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("All Formats");
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
    <section className="bg-[#070D1F] min-h-screen pt-28 pb-16 px-6 overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

        {/* ── LEFT ── */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-6 flex items-center gap-3">
            <span className="w-8 h-px bg-[#20E7F2] inline-block" />
            RESOURCES FOR GOVERNED AI MARKETING EXECUTION
          </p>

          <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
            Learn how to scale AI marketing without losing control.
          </h1>

          <p className="text-white/40 text-sm leading-relaxed max-w-md mb-10">
            The definitive knowledge base for marketing executives,
            compliance teams, and operations leaders deploying governed
            autonomous AI at enterprise scale.
          </p>

          <div className="flex items-center gap-3 flex-wrap mb-10">
            <Link
              href="/resources/library"
              className="flex items-center gap-2 bg-[#20E7F2] hover:bg-cyan-300 text-[#070D1F] text-sm font-bold px-6 py-3 rounded-lg transition-colors duration-300"
            >
              Explore Resources →
            </Link>
            <button className="border border-[#FFFFFF40] text-[#FFFFFF] hover:text-white hover:border-white/30 text-sm font-medium px-6 py-3 rounded-lg transition-colors duration-300">
              Access Trust Center
            </button>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
            {TRUST_TAGS.map((tag, i) => (
              <span key={tag} className="flex items-center gap-3">
                <span className="text-[#20E7F299] text-xs font-bold tracking-widest">{tag}</span>
                {i < TRUST_TAGS.length - 1 && <span className="text-white/15 text-xs">·</span>}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT — Browser mockup ── */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          <div className="border border-[#FFFFFF14] rounded-2xl overflow-hidden bg-[#FFFFFF08]">

            {/* Browser chrome */}
            <div className="border-b  px-4 py-3 flex items-center gap-3 bg-[#FFFFFF08]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FFFFFF0D]" />
                <div className="w-3 h-3 rounded-full bg-[#FFFFFF0D]" />
                <div className="w-3 h-3 rounded-full bg-[#FFFFFF0D]" />
              </div>
              <div className="flex-1 bg-[#FFFFFF0D] border border-white/10 rounded-md px-3 py-1.5">
                <span className="text-white/25 text-xs font-mono">
                  resources.zoikovertex.com/library
                </span>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-2 flex-wrap">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium ${
                    activeTab === tab
                      ? "bg-cyan-400/10 border-cyan-400/40 text-cyan-400"
                      : "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 bg-transparent"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 2x2 Resource cards */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {RESOURCES.map((r, i) => (
                <div
                  key={r.title}
                  className={`border rounded-xl p-4 flex flex-col gap-3 cursor-default
                    hover:-translate-y-0.5 transition-all duration-300 group
                    ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                  style={{
                    background: "#0C1422",
                    borderColor: "#FFFFFF14",
                    transitionDelay: `${400 + i * 80}ms`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = r.badgeBorder;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  {/* Badge */}
                  <span
                    className="font-medium self-start text-xs px-2.5 py-0.5 rounded border tracking-widest"
                    style={{
                      color: r.badgeColor,
                      background: r.badgeBg,
                      borderColor: r.badgeBorder,
                    }}
                  >
                    {r.badge}
                  </span>

                  {/* Title */}
                  <h3 className="text-white text-sm font-black leading-snug">
                    {r.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/35 text-xs leading-relaxed flex-1">
                    {r.description}
                  </p>

                  {/* Meta — icon + text SAME color as badge */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                    <MetaIcon type={r.metaIcon} color={r.metaColor} />
                    <span
                      className="text-xs font-bold tracking-wide"
                      style={{ color: r.metaColor }}
                    >
                      {r.meta}
                    </span>
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
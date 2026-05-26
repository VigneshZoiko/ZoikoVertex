"use client";
import { useEffect, useRef, useState } from "react";

const PATHS = [
  {
    tags: ["CMO", "CFO", "CEO"],
    tagColor: "#A5B4FC",
    tagBg: "#6366F126",
    tagBorder: "#6366F14D",
    title: "For Executives",
    cardBg: "#6366F10D",
    cardBorder: "#6366F133",
    iconColor: "#A5B4FC",
    iconBg: "#6366F126",
    iconBorder: "#6366F126",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    resources: [
      { title: "Executive Guide to Governed AI Marketing", meta: "Brief · 8 min", active: true },
      { title: "Revenue Intelligence Layer Explainer", meta: "Explainer · 6 min", active: true },
      { title: "ROI Attribution Measurement Toolkit", meta: "Toolkit · PDF", active: true },
      { title: "Book Executive Strategy Call", meta: "Demo · 45 min", active: false },
    ],
    footer: "4 RESOURCES · ~25 MIN",
    numColor: "#A5B4FC",
    numBg: "#6366F133",
    numBorder: "#6366F133",
  },
  {
    tags: ["Legal", "Compliance", "GRC"],
    tagColor: "#C9A84C",
    tagBg: "#C9A84C1F",
    tagBorder: "#C9A84C40",
    title: "For Compliance & Legal",
    cardBg: "#C9A84C0A",
    cardBorder: "#C9A84C2E",
    iconColor: "#C9A84C",
    iconBg: "#C9A84C1F",
    iconBorder: "#C9A84C1F",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
      </svg>
    ),
    resources: [
      { title: "Governance Model Documentation", meta: "Trust Doc · 10 min", active: true },
      { title: "Compliance Review Toolkit for Legal Teams", meta: "Toolkit · PDF", active: true },
      { title: "Privacy & Data Handling Framework", meta: "Trust Doc · 8 min", active: true },
      { title: "Audit Architecture & Evidence Packaging", meta: "Trust Doc · 12 min", active: false },
    ],
    footer: "4 RESOURCES · ~30 MIN",
    numColor: "#C9A84C",
    numBg: "#C9A84C26",
    numBorder: "#C9A84C26",
  },
];

export default function ResourcesLearningPaths() {
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
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-14 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-cyan-400 inline-block" />
            GUIDED LEARNING
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            Structured Learning Paths by Role
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            Sequenced resource journeys designed for each stakeholder —
            from boardroom to operations room.
          </p>
        </div>

        {/* 2 Cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {PATHS.map((path, i) => (
            <div
              key={path.title}
              className={`border rounded-2xl p-7 flex flex-col transition-all duration-500 ease-out cursor-default
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{
                background: path.cardBg,
                borderColor: path.cardBorder,
                transitionDelay: `${150 + i * 150}ms`,
              }}
            >
              {/* Top row — tags pill + icon */}
              <div className="flex items-center justify-between mb-5">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                  style={{ background: path.tagBg, borderColor: path.tagBorder }}
                >
                  {path.tags.map((tag, ti) => (
                    <span key={tag} className="flex items-center gap-1.5">
                      <span className="text-xs font-medium" style={{ color: path.tagColor }}>
                        {tag}
                      </span>
                      {ti < path.tags.length - 1 && (
                        <span className="text-xs" style={{ color: path.tagColor, opacity: 0.4 }}>·</span>
                      )}
                    </span>
                  ))}
                </div>

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center border"
                  style={{ background: path.iconBg, borderColor: path.iconBorder }}
                >
                  {path.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-white text-2xl font-black mb-6">
                {path.title}
              </h3>

              {/* Resource list — NO border on last item */}
              <div className="flex flex-col flex-1">
                {path.resources.map((r, ri) => (
                  <div
                    key={r.title}
                    className={`flex items-start gap-3 py-3 ${
                      ri < path.resources.length - 1 ? "border-b border-white/5" : ""
                    } ${!r.active ? "opacity-30" : ""}`}
                  >
                    {/* Number circle */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                      style={{
                        background: r.active ? path.numBg : "rgba(255,255,255,0.04)",
                        border: `1px solid ${r.active ? path.numBorder : "rgba(255,255,255,0.08)"}`,
                        color: r.active ? path.numColor : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {ri + 1}
                    </div>

                    {/* Text */}
                    <div>
                      <p className={`text-sm font-semibold leading-snug ${r.active ? "text-white" : "text-white/40"}`}>
                        {r.title}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5 font-mono">
                        {r.meta}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-white/20 text-xs font-bold tracking-widest text-center">
                  {path.footer}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
"use client";
import { useEffect, useRef, useState } from "react";

const CHAIN = [
  {
    number: "01",
    title: "Intent",
    description: "Structured, classified, risk-scored at origin",
    highlighted: false,
  },
  {
    number: "02",
    title: "Decision",
    description: "Confidence scored against objectives",
    highlighted: false,
  },
  {
    number: "03",
    title: "Governance",
    description: "Policy applied — non-bypassable",
    highlighted: true,
  },
  {
    number: "04",
    title: "Authorization",
    description: "Approved, escalated, or blocked",
    highlighted: false,
  },
  {
    number: "05",
    title: "Execution",
    description: "Only authorized actions proceed",
    highlighted: false,
  },
  {
    number: "06",
    title: "Attribution",
    description: "Outcomes traced to decisions",
    highlighted: false,
  },
  {
    number: "07",
    title: "Audit",
    description: "Immutable record written at runtime",
    highlighted: false,
  },
];

export default function AboutExecutionChain() {
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
    <section className="bg-[#0C1529] py-20 px-6">
      <div ref={ref} className="max-w-[1200] mx-auto">

        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 border border-[#00C8F038] bg-[#00C8F01F] rounded-full px-4 py-1.5 mb-7">
            <span className="text-[#00C8F0] text-xs">✦</span>
            <span className="text-[#00C8F0] text-xs font-semibold tracking-widest uppercase">
              How It Works
            </span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-5">
            The Controlled Execution Chain
          </h2>

          <p className="text-white/40 text-sm leading-relaxed max-w-lg mx-auto">
            Every action passes through seven governed stages — from intent to audit.
            There are no bypass paths. There is no ungoverned activity.
          </p>
        </div>

        {/* Chain — 7 cards with connectors */}
        <div
          className={`relative flex items-stretch gap-0 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          {CHAIN.map((step, i) => (
            <div key={step.number} className="flex items-stretch flex-1">

              {/* Card */}
              <div
                className={`flex-1 flex flex-col gap-3 p-4 items-center rounded-2xl transition-all duration-300 cursor-default
                  ${step.highlighted
                    ? "bg-[#0E1B35] border-2 border-[#1E2F55]"
                    : "bg-[#0E1B35] border border-[#1E2F55] hover:border-[#00C8F066] hover:bg-[#00C8F026]"
                  }
                  ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${200 + i * 80}ms` }}
              >
                {/* Number circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                  style={
                    step.highlighted
                      ? {
                            background: "#0C1529",
                          border: "1#1E2F55",
                          color: "#FFFFFF73",
                         
                        }
                      : {
                          background: "#0C1529",
                          border: "1#1E2F55",
                          color: "#FFFFFF73",
                        }
                  }
                >
                  {step.number}
                </div>

                {/* Title */}
                <h3
                  className="text-sm font-black leading-snug"
                  style={{ color: step.highlighted ? "#ffffff" : "rgba(255,255,255,0.75)" }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: step.highlighted ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.25)" }}
                >
                  {step.description}
                </p>
              </div>

              {/* Connector arrow between cards */}
              {i < CHAIN.length - 1 && (
                <div className="flex items-center justify-center px-1 shrink-0">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              )}

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
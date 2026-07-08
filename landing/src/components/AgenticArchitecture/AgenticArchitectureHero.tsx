"use client";

import Image from "next/image";
import Link from "next/link";
import { LAYERS } from "./agenticArchitecture";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.6 2.4a1.8 1.8 0 0 0-1.8 1.8v7.2a1.8 1.8 0 0 0 1.8 1.8h7.2a1.8 1.8 0 0 0 1.8-1.8V4.2a1.8 1.8 0 0 0-1.8-1.8H3.6Z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.8 1.2v2.4M9.6 1.2v2.4M1.8 6h10.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export default function AgenticArchitectureHero() {
  return (
    <section className="relative overflow-hidden bg-[#050810] pt-[68px]">
      <div className="absolute inset-0">
        <Image
          src="/images/agentic-architecture/hero-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050810] via-[#050810]/85 to-[#050810]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-[#050810]/50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        {/* Left column */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#20E7F2]/25 bg-[#20E7F2]/[0.08] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">
              Governed Agentic Execution Platform
            </span>
          </div>

          <h1 className="text-[clamp(2.4rem,4.6vw,3.4rem)] font-black leading-[1.08] tracking-tight mb-6 text-white">
            Turn AI agents into{" "}
            <span className="text-[#20E7F2]">accountable execution.</span>
          </h1>

          <p className="text-[16px] text-white/55 leading-relaxed mb-8 max-w-[520px]">
            ZoikoVertex gives organizations the architecture to orchestrate AI
            agents, approvals, policies, integrations, evidence, and ROI
            controls in one governed operating system.
          </p>

          <div
            className="rounded-lg px-5 py-4 mb-9 max-w-[480px]"
            style={{
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "rgba(201,168,76,0.25)",
              background: "rgba(201,168,76,0.12)",
            }}
          >
            <p className="text-[13px] font-mono text-white/70 leading-relaxed">
              &ldquo;Every governed action can be traced, evidenced, reviewed,
              and explained.&rdquo;
            </p>
          </div>

          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Book an Architecture Demo
          </Link>
        </div>

        {/* Right column - stacked layer cards */}
        <div className="flex flex-col items-stretch">
          {LAYERS.map((layer, i) => (
            <div key={layer.id} className="flex flex-col items-center">
              <div
                className="w-full rounded-xl px-4 py-3 backdrop-blur-sm"
                style={{
                  borderWidth: "1.1px",
                  borderStyle: "solid",
                  borderColor: layer.colorBorder,
                  background: layer.colorBg,
                }}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-[10px] font-mono font-bold shrink-0"
                    style={{ color: layer.color }}
                  >
                    {layer.number}
                  </span>
                  <div>
                    <p
                      className="text-[13px] font-bold leading-snug"
                      style={{ color: layer.color }}
                    >
                      {layer.title}
                    </p>
                    <p className="text-[11px] text-white/40 leading-snug mt-0.5">
                      {layer.subtitle}
                    </p>
                  </div>
                </div>
              </div>
              {i < LAYERS.length - 1 && (
                <svg
                  className="my-1 text-white/20"
                  width="12"
                  height="10"
                  viewBox="0 0 12 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M1 1l5 6 5-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { Check, X } from "lucide-react";

const USE = [
  { text: "ZoikoVertex", note: "(one word, capital Z and V)" },
  { text: "Governed AI marketing operations platform" },
  { text: "AI-assisted marketing workflows" },
  { text: "Approval governance and brand control" },
  { text: "Auditability and evidence records" },
  { text: "Human oversight and accountability" },
  { text: "Enterprise marketing operations platform" },
  { text: "Part of Zoiko Group's technology ecosystem" },
];

const AVOID = [
  { text: "Zoiko Vertex", note: "(two words)" },
  { text: "Autonomous marketing bot or AI publisher" },
  { text: "Fully automated marketing replacement" },
  { text: "Guaranteed compliance system" },
  { text: "World-leading, unmatched, number one" },
  { text: "AI replaces marketers" },
  { text: "Regulator-approved or certified" },
  { text: "Market leader", note: "(unless verified)" },
];

export default function PressMessaging() {
  return (
    <section className="bg-[#0A0F1C] border-t border-white/[0.06] py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Brand Usage Rules</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-4">
          Approved &amp; incorrect messaging.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mb-12">
          Use these guidelines when describing ZoikoVertex in editorial coverage, event listings, analyst briefs, and media materials to ensure accurate positioning.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-emerald-500/20 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-emerald-500/10 border-b border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-[12px] font-bold uppercase tracking-[0.15em]">Use These</span>
            </div>
            <div className="bg-[#0C1523]">
              {USE.map((item, i) => (
                <div
                  key={item.text}
                  className={`flex items-center gap-3 px-6 py-4 ${i !== USE.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white/80 text-[14.5px]">
                    {item.text}
                    {item.note && <span className="text-white/35 ml-2 text-[13px]">{item.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-red-500/10 border-b border-red-500/20">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-[12px] font-bold uppercase tracking-[0.15em]">Do Not Use</span>
            </div>
            <div className="bg-[#0C1523]">
              {AVOID.map((item, i) => (
                <div
                  key={item.text}
                  className={`flex items-center gap-3 px-6 py-4 ${i !== AVOID.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                >
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-white/80 text-[14.5px]">
                    {item.text}
                    {item.note && <span className="text-white/35 ml-2 text-[13px]">{item.note}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

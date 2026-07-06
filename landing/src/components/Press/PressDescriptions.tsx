"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const DESCRIPTIONS = [
  {
    label: "One Sentence",
    text: "ZoikoVertex is a governed AI marketing operations platform that helps organizations manage content workflows, campaign approvals, brand governance, audit trails, evidence records, and performance intelligence.",
  },
  {
    label: "Two Sentences",
    text: "ZoikoVertex helps enterprise teams, agencies, and multi-brand organizations scale AI-assisted marketing operations with stronger approval governance, brand control, auditability, and human oversight. The platform brings content workflows, campaign oversight, evidence records, collaboration, and performance intelligence into a structured operating layer for accountable marketing execution.",
  },
  {
    label: "50 Words",
    text: "ZoikoVertex is a governed AI marketing operations platform for enterprise teams, agencies, and multi-brand organizations. It helps teams manage AI-assisted content workflows, campaign approvals, brand governance, audit trails, evidence records, collaboration, and performance intelligence so organizations can move faster without losing control, oversight, or accountability.",
  },
  {
    label: "100 Words",
    text: "ZoikoVertex is a governed AI marketing operations platform designed for organizations that need stronger control over AI-assisted marketing activity. The platform helps enterprise teams, agencies, and multi-brand organizations manage content workflows, campaign approvals, brand governance, collaboration, audit trails, evidence records, and performance intelligence. ZoikoVertex is built around the belief that AI should assist marketing execution without removing human oversight, brand responsibility, or organizational accountability. By combining workflow control, approval governance, auditability, and performance context, ZoikoVertex helps teams scale marketing operations with greater discipline, clarity, and trust.",
  },
];

const BOILERPLATE = {
  label: "Company Boilerplate — About ZoikoVertex",
  text: "ZoikoVertex is a governed AI marketing operations platform built for enterprise teams, agencies, multi-brand organizations, and governance-led marketing departments. The platform helps organizations manage AI-assisted content workflows, campaign approvals, brand governance, collaboration, audit trails, evidence records, and performance intelligence in one controlled environment. ZoikoVertex is part of Zoiko Group's broader technology ecosystem, which focuses on building category-defining platforms across AI, telecom, workforce intelligence, communications, digital operations, and enterprise software.",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-[#C9A84C] text-[11px] font-semibold hover:bg-[#C9A84C]/10 transition shrink-0"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DescCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0C1523] p-6 flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C] font-mono">{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="text-white/60 text-[15px] leading-relaxed">{text}</p>
    </div>
  );
}

export default function PressDescriptions() {
  return (
    <section className="bg-[#080D1A] py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-4 h-px bg-[#C9A84C]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Approved for Media Use</span>
        </div>
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] font-black leading-tight text-white mb-4">
          Official ZoikoVertex descriptions.
        </h2>
        <p className="text-white/50 text-[15px] leading-relaxed max-w-2xl mb-12">
          Use these approved descriptions in editorial coverage, event pages, analyst notes, and media materials. Do not modify approved copy in ways that change product category or make unsupported claims.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {DESCRIPTIONS.map((d) => (
            <DescCard key={d.label} {...d} />
          ))}
        </div>

        <DescCard {...BOILERPLATE} />
      </div>
    </section>
  );
}

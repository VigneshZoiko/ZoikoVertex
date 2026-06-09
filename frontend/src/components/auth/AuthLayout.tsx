"use client";

import React from "react";
import Image from "next/image";
import { ShieldCheck, Bot, FileCheck, Lock } from "lucide-react";
const TRUST_BULLETS = [
  { icon: ShieldCheck, text: "Role-based access control + immutable audit trail" },
  { icon: Bot,         text: "AI agents operating inside your policy boundaries" },
  { icon: FileCheck,   text: "Evidence-grade governance — not bolted on" },
  { icon: Lock,        text: "GDPR-compatible · SOC 2 readiness in progress" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080E1A]">
    <div className="flex pt-16">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-20 bg-[#0C1422] border-r border-white/10 w-[44%] shrink-0">
        <div className="max-w-sm">
          {/* Logo */}
          <Image
            src="/images/zoikovertexlogo.png"
            alt="ZoikoVertex"
            width={200}
            height={38}
            className="h-9 w-auto mb-10"
            priority
          />

          {/* Headline */}
          <h1 className="text-[2.1rem] leading-[1.15] font-black text-white/90 mb-6">
            Governed AI marketing.<br />
            <span className="text-[#20E7F2]">Built for accountability.</span>
          </h1>

          {/* Description */}
          <p className="text-[15px] leading-[1.75] text-white/50 mb-10">
            Every action governed. Every decision logged.<br />
            Every output approved before it reaches the<br />
            outside world.
          </p>

          {/* Trust bullets */}
          <div className="space-y-4">
            {TRUST_BULLETS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(32,231,242,0.1)] border border-[rgba(32,231,242,0.18)]">
                  <Icon className="h-4 w-4 text-[#20E7F2]" />
                </div>
                <span className="text-[14px] text-white/50">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
    </div>
  );
}

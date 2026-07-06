"use client";

import React from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { ShieldCheck, Bot, FileCheck, Lock } from "lucide-react";

const TRUST_BULLETS = [
  { icon: ShieldCheck, text: "Role-based access control + immutable audit trail" },
  { icon: Bot,         text: "AI agents operating inside your policy boundaries" },
  { icon: FileCheck,   text: "Evidence-grade governance — not bolted on" },
  { icon: Lock,        text: "GDPR-compatible · SOC 2 readiness in progress" },
];

export default function AuthLayout({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="h-screen bg-[#0C1523] flex flex-col overflow-y-auto">
      <Navbar forceShow />
      <div className="flex flex-1">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-20 bg-[#0C1523] w-[48%] shrink-0">
        <div className="max-w-[460px]">
          {/* Logo */}
          <Image
            src="/images/logos/zoikovertexlogo.png"
            alt="ZoikoVertex"
            width={200}
            height={38}
            className="h-9 w-auto mb-10"
            priority
          />

          {/* Headline */}
          <h1
            className="text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white/[88%] mb-6"
            style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif" }}
          >
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(32,231,242,0.08)] border border-[rgba(32,231,242,0.15)]">
                  <Icon className="h-4 w-4 text-[#20E7F2]" />
                </div>
                <span className="text-[14px] text-white/50">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-[#0C1523] gap-6">
        <div className="w-full max-w-[480px] rounded-[20px] bg-[#080E1A] px-6 sm:px-10 pt-10 sm:pt-[52px] pb-10 sm:pb-[54px]">
          {children}
        </div>
        {footer && <div className="w-full max-w-[480px] text-center">{footer}</div>}
      </div>
      </div>
    </div>
  );
}

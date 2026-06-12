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

export default function AuthLayout({ children, footer, noCard }: { children: React.ReactNode; footer?: React.ReactNode; noCard?: boolean }) {
  return (
    <div className="h-screen bg-[#0B1120] flex flex-col overflow-y-auto">
      <Navbar />
      <div className="flex flex-1 pt-[68px]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-20 bg-[#0B1120] w-[48%] shrink-0">
        <div className="max-w-[380px]">
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
      {noCard ? (
        <div className="flex flex-1 flex-col justify-center px-16 xl:px-20 py-12 bg-[#0B1120] gap-6">
          <div className="w-full max-w-[480px]">{children}</div>
          {footer && <div className="w-full max-w-[480px]">{footer}</div>}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-[#0B1120] gap-6">
          <div className="w-full max-w-[440px] rounded-2xl border border-[#1E2F55]/60 bg-[#0D1628] px-10 py-10 shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            {children}
          </div>
          {footer && <div className="w-full max-w-[440px]">{footer}</div>}
        </div>
      )}
      </div>
    </div>
  );
}

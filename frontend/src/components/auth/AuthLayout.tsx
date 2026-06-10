"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
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
      {/* Top navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080812]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="https://zoikovertex.com" target="_blank" rel="noopener noreferrer">
            <Image
              src="/images/logo-wordmark.svg"
              alt="ZoikoVertex"
              width={235}
              height={36}
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            {["Platform", "AI Agents", "Solutions", "Resources", "About Us", "Pricing"].map((label) => (
              <span key={label} className="hover:text-white transition-colors cursor-default">{label}</span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium border border-white/15 text-white/80 hover:text-white px-5 py-2 rounded-lg transition-colors hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link
              href="https://zoikovertex.com/request-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium border border-white/15 text-white/80 hover:text-white px-5 py-2 rounded-lg transition-colors hover:bg-white/5"
            >
              Request a Demo
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-black px-5 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>
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

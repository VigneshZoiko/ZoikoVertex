"use client";

import React from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const benefits = [
  {
    title: "Role-based access",
    description: "Access aligned to your role and responsibilities.",
  },
  {
    title: "Audit-grade security",
    description: "Encryption, monitoring, and immutable audit trails.",
  },
  {
    title: "SSO ready",
    description: "Seamless SSO integration for your organization.",
  },
  {
    title: "Multi-factor protection",
    description: "MFA support to keep your account secure.",
  },
  {
    title: "Enterprise governance",
    description: "Policies, controls, and compliance built in.",
  },
];

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 antialiased">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-0 top-1/3 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.15),_transparent_60%)]" />
      </div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
               <img
        src="/images/logo-wordmark.svg"
        alt="ZoikoVertex"
        width={160}
        height={32}
        className="h-8 w-auto"
      />
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a href="#" className="hover:text-slate-900 transition-colors">Security</a>
              <span className="text-slate-300">|</span>
              <a href="#" className="hover:text-slate-900 transition-colors">Help</a>
              <span className="text-slate-300">|</span>
              <a href="#" className="hover:text-slate-900 transition-colors">Contact Sales</a>
            </div>
          </div>
        </div>

        <main className="grid min-h-[calc(100vh-96px)] place-items-center px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_0.95fr] xl:grid-cols-[1.05fr_0.95fr]">
            <aside className="hidden overflow-hidden rounded-[36px] border border-slate-200/70 bg-white/90 p-10 shadow-[0_40px_120px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:block">
              <div className="max-w-lg">
                <span className="text-xs font-semibold tracking-[0.35em] text-sky-600 uppercase">
                  Governed Autonomous
                </span>
                <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Digital Marketing Operating System
                </h1>
                <p className="mt-5 text-base leading-8 text-slate-600">
                  Where Digital Execution Becomes Accountable. Secure access to your governed workspace. Built for trust. Designed for enterprise.
                </p>

                <div className="mt-10 space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit.title} className="flex gap-4 rounded-3xl border border-slate-200/70 bg-slate-100/80 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-700">
                        <span className="text-base font-bold">•</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">{benefit.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  © 2024 ZoikoGroup. All rights reserved.
                </p>
              </div>
            </aside>

            <div className="flex items-center justify-center">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { MessageSquareCode, ShieldCheck, Zap } from "lucide-react";

export default function PromptsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
          <MessageSquareCode className="w-8 h-8 text-indigo-500" />
          Prompt Governance
        </h1>
        <p className="text-[var(--foreground-muted)] max-w-2xl">
          Manage the lifecycle of versioned prompt artifacts, refusal logic, and safety guardrails for your agents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[var(--card)] border border-[var(--card-border)] p-8 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Safety Guardrails</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Define system-wide refusal logic and safety filters that all agents must inherit.
          </p>
          <div className="pt-4">
            <span className="px-3 py-1 bg-[var(--surface)] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[var(--border)]">
              Phase 2 Development
            </span>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--card-border)] p-8 rounded-3xl space-y-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Versioned Artifacts</h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Track and roll back prompt versions across your entire agent fleet.
          </p>
          <div className="pt-4">
            <span className="px-3 py-1 bg-[var(--surface)] text-[10px] font-black uppercase tracking-widest rounded-lg border border-[var(--border)]">
              Phase 2 Development
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


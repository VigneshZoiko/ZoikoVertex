"use client";

import { useState } from "react";
import { 
  Scale, 
  Plus, 
  Shield, 
  AlertOctagon, 
  CheckCircle, 
  FileText, 
  Zap, 
  Users,
  ChevronRight,
  Info,
  Lock,
  Globe
} from "lucide-react";

const POLICY_TIERS = [
  {
    id: "tier-1",
    name: "Standard Corporate",
    description: "Default guardrails for all agents. Enforces brand voice and basic data privacy.",
    agents: 14,
    violations: 2,
    status: "ACTIVE",
    rules: ["Brand Voice v1.2", "GDPR Basic", "No Profanity"]
  },
  {
    id: "tier-2",
    name: "High Sensitivity",
    description: "Strict enforcement for agents handling financial, health, or PII data.",
    agents: 3,
    violations: 0,
    status: "STRICT",
    rules: ["PII Redaction", "Human-in-loop required", "Audit Level 3"]
  },
  {
    id: "tier-3",
    name: "Experimental",
    description: "Minimal restrictions for sandbox testing. Cannot be promoted past L2 autonomy.",
    agents: 5,
    violations: 12,
    status: "MONITORING",
    rules: ["L2 Cap", "Sandbox only", "Weekly Review"]
  }
];

export default function PolicyPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
            <Scale className="w-8 h-8 text-indigo-500" />
            Policy Center
          </h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Define the legal and ethical guardrails that govern your autonomous workforce.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-foreground px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group">
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Create Policy Tier
        </button>
      </div>

      {/* Alert Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-start gap-4">
        <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-amber-700">Pending Policy Review</h3>
          <p className="text-xs text-amber-700/70 mt-1">3 agents are currently operating under &quot;Experimental&quot; policies while handling production data. This exceeds the recommended risk threshold.</p>
        </div>
        <button className="px-4 py-2 bg-amber-500 text-foreground rounded-xl text-xs font-bold hover:bg-amber-600 transition-all self-center">
          REVIEW RISK
        </button>
      </div>

      {/* Policy Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {POLICY_TIERS.map((tier) => (
          <div key={tier.id} className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-8 flex flex-col space-y-6 group hover:border-indigo-500/30 transition-all">
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                tier.status === 'STRICT' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                <Shield className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                tier.status === 'STRICT' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                tier.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {tier.status}
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold group-hover:text-indigo-500 transition-colors">{tier.name}</h3>
              <p className="text-xs text-[var(--foreground-muted)] mt-2 leading-relaxed">{tier.description}</p>
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-[var(--card-border)] border-dashed">
              <div className="flex flex-col">
                <span className="text-sm font-black">{tier.agents}</span>
                <span className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-tight">Agents</span>
              </div>
              <div className="flex flex-col text-rose-500">
                <span className="text-sm font-black">{tier.violations}</span>
                <span className="text-[10px] font-bold uppercase tracking-tight">Violations</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest">Active Rules</span>
              <div className="flex flex-wrap gap-2">
                {tier.rules.map((rule, i) => (
                  <span key={i} className="px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] font-bold text-[var(--foreground-muted)]">
                    {rule}
                  </span>
                ))}
              </div>
            </div>

            <button className="w-full py-3 bg-[var(--surface)] hover:bg-indigo-500 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 group-hover:border group-hover:border-indigo-500/20">
              CONFIGURE TIER
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Governance Stats */}
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--foreground-muted)] flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Governance Inheritance Tree
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
            <CheckCircle className="w-3 h-3" />
            SYSTEM WIDE COMPLIANCE: 94.2%
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg text-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Immutability Lock</h4>
                  <p className="text-[10px] text-[var(--foreground-muted)]">Core governance rules cannot be overridden by individual agents.</p>
                </div>
              </div>
              <div className="w-full h-2 bg-indigo-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[100%]" />
              </div>
            </div>

            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg text-foreground">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Regional Adaptation</h4>
                  <p className="text-[10px] text-[var(--foreground-muted)]">Automatic policy adjustment based on detected execution market.</p>
                </div>
              </div>
              <div className="w-full h-2 bg-emerald-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[82%]" />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4 p-8 bg-[var(--surface)]/30 rounded-3xl border border-[var(--card-border)] border-dashed text-center">
            <Info className="w-8 h-8 text-[var(--foreground-muted)] mx-auto opacity-20" />
            <div>
              <h4 className="font-bold text-sm">Policy Inheritance Visualizer</h4>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">The inheritance tree will be available in Phase 6 for mapping agent clusters to compliance tiers.</p>
            </div>
            <div className="pt-2">
              <span className="px-3 py-1 bg-[var(--surface)] text-[9px] font-black uppercase tracking-widest rounded-lg border border-[var(--border)]">
                Coming in Phase 6
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

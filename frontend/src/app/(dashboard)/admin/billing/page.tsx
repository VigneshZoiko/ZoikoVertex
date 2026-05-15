"use client";

import { useState } from "react";
import {
  CheckCircle2, Zap, Building2, Users, Star,
  TrendingUp, HardDrive, FileText, Download,
  ArrowRight, Shield, ChevronDown, ChevronUp,
  CreditCard, Calendar, AlertCircle,
} from "lucide-react";

/* ─── Plan Data ─────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "standard",
    name: "Standard",
    price: { monthly: 149, annual: 119 },
    tagline: "Small teams and simple social media operations.",
    icon: Users,
    color: "blue",
    accentBg: "bg-blue-500/10",
    accentText: "text-blue-400",
    accentBorder: "border-blue-500/20",
    accentButton: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/25",
    roles: [
      "Workspace Owner", "Admin", "Campaign Manager", "Creator",
      "Reviewer", "Approver", "Publisher", "Viewer",
    ],
    plusFrom: null,
    features: [],
    cta: "Get Started",
    ctaVariant: "secondary",
  },
  {
    id: "professional",
    name: "Professional",
    price: { monthly: 299, annual: 239 },
    tagline: "AI-assisted teams using agentic workflows and outside collaborators.",
    icon: Zap,
    color: "indigo",
    accentBg: "bg-indigo-500/10",
    accentText: "text-indigo-400",
    accentBorder: "border-indigo-500/30",
    accentButton: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25",
    roles: [
      "Agent Architect", "Agent Operator", "Knowledge Manager",
      "Governance Admin", "Validator", "Developer", "External Collaborator",
    ],
    plusFrom: "Standard",
    features: [],
    cta: "Current Plan",
    ctaVariant: "current",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: null, annual: null },
    tagline: "Governed autonomous operations, regulated teams, global brands, multi-entity organizations, and audit-heavy customers.",
    icon: Building2,
    color: "violet",
    accentBg: "bg-violet-500/10",
    accentText: "text-violet-400",
    accentBorder: "border-violet-500/20",
    accentButton: "bg-violet-600 hover:bg-violet-500 shadow-violet-500/25",
    roles: [
      "Security Admin", "Privacy Admin", "Risk Manager", "Compliance Reviewer",
      "Auditor", "Evidence Manager", "Model Supervisor", "Autonomy Controller",
      "Prompt Manager", "Workflow Architect", "Final Approver", "Custom Roles",
    ],
    plusFrom: "Professional",
    features: [
      "Advanced Separation of Duties", "Three-Key Approval", "Legal Hold",
      "Evidence Vault", "Policy Versioning", "Advanced Audit Exports",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline",
  },
] as const;

const USAGE = [
  { label: "Team Members",    value: 8,     max: 15,    unit: "",    icon: Users,       color: "indigo" },
  { label: "AI Generations",  value: 2340,  max: 5000,  unit: "",    icon: Zap,         color: "amber"  },
  { label: "Storage",         value: 12.4,  max: 50,    unit: "GB",  icon: HardDrive,   color: "blue"   },
  { label: "Published Posts", value: 84,    max: null,  unit: "",    icon: TrendingUp,  color: "emerald" },
];

const INVOICES = [
  { month: "May 2026", plan: "Professional Plan", amount: "$299.00", status: "Paid" },
  { month: "Apr 2026", plan: "Professional Plan", amount: "$299.00", status: "Paid" },
  { month: "Mar 2026", plan: "Professional Plan", amount: "$299.00", status: "Paid" },
  { month: "Feb 2026", plan: "Professional Plan", amount: "$299.00", status: "Paid" },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const currentPlan = "professional";

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Subscription & Usage
          </h1>
          <p className="text-[var(--foreground-muted)] text-sm mt-1">
            Manage your plan, seats, billing cycle, and resource consumption.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-sm font-bold text-indigo-400">Professional Plan — Active</span>
        </div>
      </div>

      {/* ── Current Plan Banner ── */}
      <div className="relative overflow-hidden bg-[var(--card)] border border-indigo-500/20 rounded-2xl p-6 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Professional Plan</h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-indigo-500/15 text-indigo-400 rounded-full border border-indigo-500/20">
                  Current
                </span>
              </div>
              <p className="text-sm text-[var(--foreground-muted)]">
                AI-assisted teams with agentic workflows and outside collaborators.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-2xl font-black text-[var(--foreground)] tabular-nums">$299<span className="text-sm font-medium text-[var(--foreground-muted)]">/mo</span></p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] justify-end mt-0.5">
                <Calendar className="w-3 h-3" />
                <span>Next renewal: Jun 14, 2026</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Manage Billing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Usage ── */}
      <div>
        <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-4">
          Usage This Period
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {USAGE.map((u) => {
            const Icon = u.icon;
            const pct = u.max ? Math.round((u.value / u.max) * 100) : null;
            const warn = pct !== null && pct >= 80;
            const colorMap: Record<string, { bar: string; icon: string; text: string }> = {
              indigo:  { bar: "bg-indigo-500",  icon: "text-indigo-400",  text: "text-indigo-400"  },
              amber:   { bar: "bg-amber-500",   icon: "text-amber-400",   text: "text-amber-400"   },
              blue:    { bar: "bg-blue-500",    icon: "text-blue-400",    text: "text-blue-400"    },
              emerald: { bar: "bg-emerald-500", icon: "text-emerald-400", text: "text-emerald-400" },
            };
            const c = colorMap[u.color];
            return (
              <div
                key={u.label}
                className={`bg-[var(--card)] border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md ${warn ? "border-amber-500/30" : "border-[var(--border)]"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-lg bg-[var(--surface)]`}>
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                  </div>
                  {warn && <AlertCircle className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                  {u.label}
                </p>
                <p className="text-2xl font-black text-[var(--foreground)] tabular-nums mb-3">
                  {u.value.toLocaleString()}
                  {u.unit && <span className="text-sm font-medium ml-1">{u.unit}</span>}
                  {u.max && (
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">
                      {" "}/ {u.max.toLocaleString()}{u.unit}
                    </span>
                  )}
                  {!u.max && <span className="text-xs font-medium text-[var(--foreground-muted)] ml-1">total</span>}
                </p>
                {pct !== null ? (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${warn ? "bg-amber-500" : c.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={`text-[10px] font-bold ${warn ? "text-amber-400" : "text-[var(--foreground-muted)]"}`}>
                      {pct}% used{warn ? " — nearing limit" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Unlimited</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Plan Comparison ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
            Available Plans
          </h2>
          {/* Billing Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${billing === "monthly" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${billing === "annual" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
            >
              Annual
              <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[9px] font-black rounded-full border border-emerald-500/20">
                −20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            const isExpanded = expandedPlan === plan.id;
            const price = billing === "annual" ? plan.price.annual : plan.price.monthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-[var(--card)] rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isCurrent
                    ? "border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : "border-[var(--border)] hover:border-[var(--card-border)] hover:shadow-md"
                }`}
              >
                {/* Popular badge */}
                {isCurrent && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
                )}

                <div className="p-6 flex-1">
                  {/* Plan header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-xl ${plan.accentBg}`}>
                      <Icon className={`w-5 h-5 ${plan.accentText}`} />
                    </div>
                    {isCurrent && (
                      <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest ${plan.accentBg} ${plan.accentText} rounded-full border ${plan.accentBorder}`}>
                        Current
                      </span>
                    )}
                    {plan.id === "enterprise" && (
                      <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20">
                        Custom Pricing
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-[var(--foreground)] mb-1">{plan.name}</h3>
                  <p className="text-xs text-[var(--foreground-muted)] leading-relaxed mb-4">{plan.tagline}</p>

                  {/* Price */}
                  <div className="mb-5">
                    {price ? (
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-[var(--foreground)] tabular-nums">${price}</span>
                        <span className="text-sm text-[var(--foreground-muted)] mb-1.5">/mo</span>
                        {billing === "annual" && (
                          <span className="ml-2 mb-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Save ${(plan.price.monthly! - price) * 12}/yr
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-[var(--foreground)]">Custom</span>
                      </div>
                    )}
                  </div>

                  {/* Roles included */}
                  <div className="space-y-3">
                    {plan.plusFrom && (
                      <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Everything in <strong className="text-[var(--foreground)]">{plan.plusFrom}</strong>, plus:</span>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest mb-2">
                        {plan.plusFrom ? "Additional Roles" : "Roles Included"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(isExpanded ? plan.roles : plan.roles.slice(0, 5)).map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${plan.accentBg} ${plan.accentText} border ${plan.accentBorder}`}
                          >
                            {role}
                          </span>
                        ))}
                        {!isExpanded && plan.roles.length > 5 && (
                          <button
                            onClick={() => setExpandedPlan(plan.id)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
                          >
                            +{plan.roles.length - 5} more
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        )}
                        {isExpanded && (
                          <button
                            onClick={() => setExpandedPlan(null)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
                          >
                            Show less
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Governance features (Enterprise only) */}
                    {plan.features.length > 0 && (
                      <div className="pt-3 border-t border-[var(--border)]">
                        <p className="text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest mb-2">
                          Governance Features
                        </p>
                        <div className="space-y-1.5">
                          {plan.features.map((f) => (
                            <div key={f} className="flex items-center gap-2">
                              <Shield className="w-3 h-3 text-violet-400 shrink-0" />
                              <span className="text-xs text-[var(--foreground-muted)]">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  {plan.ctaVariant === "current" && (
                    <button
                      disabled
                      className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-sm rounded-xl cursor-default"
                    >
                      <Star className="w-4 h-4" />
                      Current Plan
                    </button>
                  )}
                  {plan.ctaVariant === "secondary" && (
                    <button className={`w-full h-11 flex items-center justify-center gap-2 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg ${plan.accentButton}`}>
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {plan.ctaVariant === "outline" && (
                    <button className={`w-full h-11 flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:border-violet-500/40 hover:bg-violet-500/5 text-[var(--foreground)] font-bold text-sm rounded-xl transition-all duration-200`}>
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Billing History ── */}
      <div>
        <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-4">
          Billing History
        </h2>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest px-6 py-3">Period</th>
                <th className="text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest px-6 py-3">Description</th>
                <th className="text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest px-6 py-3">Amount</th>
                <th className="text-left text-[10px] font-black text-[var(--foreground-muted)] uppercase tracking-widest px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors duration-150 group"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-[var(--foreground)]">{inv.month}</td>
                  <td className="px-6 py-4 text-sm text-[var(--foreground-muted)]">{inv.plan}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[var(--foreground)] tabular-nums">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-xs font-bold rounded-lg">
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <p className="text-xs text-[var(--foreground-muted)]">Showing last 4 invoices</p>
            <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              View all invoices
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

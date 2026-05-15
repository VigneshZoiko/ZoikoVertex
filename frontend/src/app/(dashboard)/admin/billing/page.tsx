"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, Zap, Building2, Users, Star,
  FileText, Download, ArrowRight, Shield,
  ChevronDown, ChevronUp, CreditCard, Calendar,
  AlertCircle, Globe, Layers,
} from "lucide-react";
import { api } from "@/lib/api";

/* ─── Plan definitions (from ZoikoVertex_Plan_Access_Architecture) ───────── */
const PLANS = [
  {
    id: "starter",
    name: "Vertex Starter",
    price: { monthly: 0, annual: 0 },
    tagline:
      "Start with visibility. Connect limited channels, understand your social governance posture, and see where ZoikoVertex can reduce risk before your team commits.",
    icon: Globe,
    accentBg: "bg-emerald-500/10",
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/20",
    accentButton: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25",
    limits: { users: "2", profiles: "2", brands: "1", retention: "30 days" },
    roles: ["Workspace Owner", "Platform Administrator", "Analyst"],
    plusFrom: null,
    features: [
      "Limited Command Center",
      "Limited Campaigns",
      "Publishing Calendar Preview",
      "Analytics Snapshot",
      "Media Vault Preview",
      "Inbox / Engagement (Preview)",
      "Basic Activity Log",
    ],
    governance: [],
    cta: "Start Free",
    ctaVariant: "filled",
    recommended: false,
  },
  {
    id: "growth",
    name: "Vertex Growth",
    price: { monthly: 399, annual: 299 },
    tagline:
      "Run governed campaigns with AI-assisted content, approvals, publishing, engagement workflows, analytics, and audit-ready execution for one brand team.",
    icon: Zap,
    accentBg: "bg-indigo-500/10",
    accentText: "text-indigo-400",
    accentBorder: "border-indigo-500/30",
    accentButton: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25",
    limits: { users: "7", profiles: "8", brands: "1", retention: "12 months" },
    roles: [
      "Workspace Owner", "Platform Administrator", "Governance Administrator",
      "Security Administrator", "Privacy Officer", "Agent Architect",
      "Agent Operator", "Knowledge Manager", "Campaign Manager",
      "Creator", "Reviewer", "Validator", "Approver", "Publisher",
      "Analyst", "External Collaborator",
    ],
    plusFrom: null,
    features: [
      "5 AI Agents (Standard)",
      "Standard Two-Step Approvals",
      "Immutable Audit Trail",
      "Basic Brand Library",
      "Standard Inbox & Engagement",
    ],
    governance: [],
    cta: "Start 14-Day Trial",
    ctaVariant: "filled",
    recommended: false,
  },
  {
    id: "scale",
    name: "Vertex Scale",
    price: { monthly: 999, annual: 799 },
    tagline:
      "Coordinate multi-brand teams with advanced approvals, full Brand Library, governed agents, engagement routing, crisis readiness, and cross-brand performance intelligence.",
    icon: Layers,
    accentBg: "bg-violet-500/10",
    accentText: "text-violet-400",
    accentBorder: "border-violet-500/20",
    accentButton: "bg-violet-600 hover:bg-violet-500 shadow-violet-500/25",
    limits: { users: "20", profiles: "25", brands: "5", retention: "24 months" },
    roles: [
      "All Growth Roles", "Compliance Officer", "Brand Steward",
      "Executive Viewer", "Crisis Commander", "Service Account",
    ],
    plusFrom: "Growth",
    features: [
      "5 AI Agents (Advanced)",
      "Advanced Multi-Stage Approvals",
      "Optional Multi-Key Approval",
      "Full Brand Library",
      "Crisis Console (Standard)",
    ],
    governance: [
      "Advanced Evidence Packaging",
      "Cross-Brand Analytics",
      "Named Customer Success Manager",
      "Quarterly Governance Review",
    ],
    cta: "Book Strategy Call",
    ctaVariant: "filled",
    recommended: true,
  },
  {
    id: "corporate",
    name: "Vertex Corporate",
    price: { monthly: null, annual: null },
    tagline:
      "Deploy ZoikoVertex across corporate brands, regulated workflows, executive oversight, advanced security, evidence-grade auditability, and custom governance architecture.",
    icon: Building2,
    accentBg: "bg-amber-500/10",
    accentText: "text-amber-400",
    accentBorder: "border-amber-500/20",
    accentButton: "bg-amber-600 hover:bg-amber-500 shadow-amber-500/25",
    limits: { users: "Custom", profiles: "Custom", brands: "Custom", retention: "Custom" },
    roles: [
      "All Scale Roles", "Risk Manager", "Auditor", "Evidence Manager",
      "Model Supervisor", "Autonomy Controller", "Prompt Manager",
      "Workflow Architect", "Final Approver", "Custom Scoped Roles",
    ],
    plusFrom: "Scale",
    features: [
      "5 AI Agents (Custom-Governed)",
      "Three-Key Approval Protocol",
      "Evidence Vault + Legal Hold",
      "SSO / SAML / SCIM",
      "Full Crisis Console",
    ],
    governance: [
      "DPA & Compliance Packs",
      "Custom Security Review",
      "Chain-of-Custody Exports",
      "TAM + Account Executive + SLA",
    ],
    cta: "Request Corporate Brief",
    ctaVariant: "outline",
    recommended: false,
  },
];

/* ─── Plan limits for usage bars ─────────────────────────────────────────── */
const PLAN_LIMITS: Record<string, { users: number | null; profiles: number | null; brands: number | null }> = {
  starter:   { users: 2,    profiles: 2,    brands: 1    },
  growth:    { users: 7,    profiles: 8,    brands: 1    },
  scale:     { users: 20,   profiles: 25,   brands: 5    },
  corporate: { users: null, profiles: null, brands: null },
};

/* ─── Map DB plan_type → PLANS id ────────────────────────────────────────── */
function normalizePlanId(dbPlanType: string): string {
  const map: Record<string, string> = {
    FREE:       "starter",
    STARTER:    "starter",
    GROWTH:     "growth",
    SCALE:      "scale",
    ENTERPRISE: "corporate",
    CORPORATE:  "corporate",
  };
  return map[(dbPlanType || "").toUpperCase()] ?? "starter";
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function LimitBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground-muted)]">{label}</span>
      <span className="text-xs font-bold text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface)] mb-3" />
          <div className="h-3 w-24 bg-[var(--surface)] rounded mb-2" />
          <div className="h-7 w-16 bg-[var(--surface)] rounded mb-3" />
          <div className="h-1.5 w-full bg-[var(--surface)] rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  /* real data */
  const [loading, setLoading] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<string>("starter");
  const [orgStatus, setOrgStatus] = useState<string>("ACTIVE");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [profileCount, setProfileCount] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [contextRes, membersRes, accountsRes] = await Promise.allSettled([
          api.get("/api/v1/user/context"),
          api.get("/api/v1/team/members"),
          api.get("/api/v1/accounts"),
        ]);

        if (contextRes.status === "fulfilled" && contextRes.value?.success) {
          const ctx = contextRes.value.data;
          setCurrentPlanId(normalizePlanId(ctx.plan_type || "FREE"));
          setOrgStatus(ctx.org_status || "ACTIVE");
        }

        if (membersRes.status === "fulfilled" && membersRes.value?.success) {
          setMemberCount(Array.isArray(membersRes.value.data) ? membersRes.value.data.length : 0);
        }

        if (accountsRes.status === "fulfilled" && accountsRes.value?.success) {
          setProfileCount(Array.isArray(accountsRes.value.data) ? accountsRes.value.data.length : 0);
        }
      } catch (err) {
        console.error("Failed to load billing data", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentPlanData = PLANS.find((p) => p.id === currentPlanId) ?? PLANS[0];
  const limits = PLAN_LIMITS[currentPlanId] ?? PLAN_LIMITS.starter;
  const currentPrice = billing === "annual" ? currentPlanData.price.annual : currentPlanData.price.monthly;

  const usageCards = [
    {
      label: "Team Members",
      value: memberCount,
      max: limits.users,
      icon: Users,
      color: { bar: "bg-indigo-500", icon: "text-indigo-400" },
    },
    {
      label: "Social Profiles",
      value: profileCount,
      max: limits.profiles,
      icon: Globe,
      color: { bar: "bg-blue-500", icon: "text-blue-400" },
    },
    {
      label: "Brands",
      value: 1,
      max: limits.brands,
      icon: Layers,
      color: { bar: "bg-violet-500", icon: "text-violet-400" },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">

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
        {!loading && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${currentPlanData.accentBg} ${currentPlanData.accentBorder}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${currentPlanData.accentText.replace("text-", "bg-")}`} />
            <span className={`text-sm font-bold ${currentPlanData.accentText}`}>
              {currentPlanData.name} — {orgStatus === "TRIAL" ? "Trial" : "Active"}
            </span>
          </div>
        )}
        {loading && (
          <div className="h-9 w-48 rounded-xl bg-[var(--surface)] animate-pulse" />
        )}
      </div>

      {/* ── Current Plan Banner ── */}
      {loading ? (
        <div className="h-28 rounded-2xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
      ) : (
        <div className={`relative overflow-hidden bg-[var(--card)] border rounded-2xl p-6 shadow-sm ${currentPlanData.accentBorder}`}>
          <div className={`absolute inset-0 bg-gradient-to-r ${currentPlanData.accentBg} via-transparent to-transparent opacity-40 pointer-events-none`} />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${currentPlanData.accentBg} flex items-center justify-center shrink-0`}>
                <currentPlanData.icon className={`w-6 h-6 ${currentPlanData.accentText}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">{currentPlanData.name}</h2>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${currentPlanData.accentBg} ${currentPlanData.accentText} rounded-full border ${currentPlanData.accentBorder}`}>
                    {orgStatus === "TRIAL" ? "Trial" : "Current"}
                  </span>
                </div>
                <p className="text-sm text-[var(--foreground-muted)]">{currentPlanData.tagline}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--foreground-muted)]">
                  <span>
                    <span className="font-bold text-[var(--foreground)]">{currentPlanData.limits.users}</span> users included
                  </span>
                  <span>
                    <span className="font-bold text-[var(--foreground)]">{currentPlanData.limits.profiles}</span> social profiles
                  </span>
                  <span>
                    <span className="font-bold text-[var(--foreground)]">{currentPlanData.limits.brands}</span>{" "}
                    {currentPlanData.limits.brands === "1" ? "brand workspace" : "brands"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              {currentPrice !== null ? (
                <div className="text-right">
                  <p className="text-2xl font-black text-[var(--foreground)] tabular-nums">
                    {currentPrice === 0 ? "Free" : `$${currentPrice}`}
                    {currentPrice > 0 && <span className="text-sm font-medium text-[var(--foreground-muted)]">/mo</span>}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] justify-end mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Renewal managed by your account representative</span>
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-2xl font-black text-[var(--foreground)]">Custom</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">Annual or multi-year contract</p>
                </div>
              )}
              <button className="px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-sm font-bold rounded-xl transition-all duration-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Manage Billing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Usage This Period ── */}
      <div>
        <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest mb-4">
          Usage This Period
        </h2>
        {loading ? (
          <UsageSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {usageCards.map((u) => {
              const Icon = u.icon;
              const isUnlimited = u.max === null;
              const isUnknown = u.value === null;
              const pct = !isUnlimited && !isUnknown && u.max ? Math.round(((u.value as number) / u.max) * 100) : null;
              const warn = pct !== null && pct >= 80;
              const over = pct !== null && pct > 100;

              return (
                <div
                  key={u.label}
                  className={`bg-[var(--card)] border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
                    over ? "border-rose-500/30" : warn ? "border-amber-500/30" : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-1.5 rounded-lg bg-[var(--surface)]">
                      <Icon className={`w-4 h-4 ${u.color.icon}`} />
                    </div>
                    {over && <AlertCircle className="w-4 h-4 text-rose-400" />}
                    {!over && warn && <AlertCircle className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
                    {u.label}
                  </p>
                  <p className="text-2xl font-black text-[var(--foreground)] tabular-nums mb-3">
                    {isUnknown ? "—" : (u.value as number).toLocaleString()}
                    {!isUnknown && !isUnlimited && u.max !== null && (
                      <span className="text-sm font-medium text-[var(--foreground-muted)]">
                        {" "}/ {u.max}
                      </span>
                    )}
                  </p>
                  {isUnlimited ? (
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Unlimited</p>
                  ) : isUnknown ? (
                    <p className="text-[10px] text-[var(--foreground-muted)]">Unable to load</p>
                  ) : pct !== null ? (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            over ? "bg-rose-500" : warn ? "bg-amber-500" : u.color.bar
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className={`text-[10px] font-bold ${over ? "text-rose-400" : warn ? "text-amber-400" : "text-[var(--foreground-muted)]"}`}>
                        {pct}% used{over ? " — over limit" : warn ? " — nearing limit" : ""}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Available Plans ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
              Available Plans
            </h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              All plans enforce RBAC + ABAC. Visibility does not equal authority.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                billing === "monthly"
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                billing === "annual"
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[9px] font-black rounded-full border border-emerald-500/20">
                Save up to 25%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlanId;
            const isExpanded = expandedPlan === plan.id;
            const price = billing === "annual" ? plan.price.annual : plan.price.monthly;
            const monthlyPrice = plan.price.monthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-[var(--card)] rounded-2xl border transition-all duration-300 overflow-hidden ${
                  plan.recommended
                    ? "border-violet-500/40 shadow-lg shadow-violet-500/10"
                    : isCurrent
                    ? `${plan.accentBorder} shadow-lg`
                    : "border-[var(--border)] hover:border-[var(--card-border)] hover:shadow-md"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600" />
                )}
                {isCurrent && !plan.recommended && (
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${plan.accentText.replace("text-", "from-")} via-transparent ${plan.accentText.replace("text-", "to-")}`} />
                )}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-xl ${plan.accentBg}`}>
                      <Icon className={`w-5 h-5 ${plan.accentText}`} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {plan.recommended && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-violet-500/15 text-violet-400 rounded-full border border-violet-500/20">
                          Recommended
                        </span>
                      )}
                      {isCurrent && (
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${plan.accentBg} ${plan.accentText} rounded-full border ${plan.accentBorder}`}>
                          Current
                        </span>
                      )}
                      {plan.id === "corporate" && !isCurrent && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                          Custom Pricing
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-black text-[var(--foreground)] mb-1 leading-tight">{plan.name}</h3>
                  <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed mb-4">{plan.tagline}</p>

                  {/* Price */}
                  <div className="mb-4">
                    {price !== null ? (
                      price === 0 ? (
                        <span className="text-3xl font-black text-[var(--foreground)]">Free</span>
                      ) : (
                        <div>
                          <div className="flex items-end gap-1">
                            <span className="text-3xl font-black text-[var(--foreground)] tabular-nums">${price}</span>
                            <span className="text-xs text-[var(--foreground-muted)] mb-1.5">/mo</span>
                          </div>
                          {billing === "annual" && monthlyPrice && (
                            <p className="text-[10px] font-bold text-emerald-400 mt-0.5">
                              Save ${(monthlyPrice - price) * 12}/yr billed annually
                            </p>
                          )}
                          {billing === "monthly" && plan.price.annual !== null && (
                            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                              or ${plan.price.annual}/mo billed annually
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      <div>
                        <span className="text-3xl font-black text-[var(--foreground)]">Custom</span>
                        <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">Annual or multi-year contract</p>
                      </div>
                    )}
                  </div>

                  {/* Limits grid */}
                  <div className={`grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-xl mb-4 ${plan.accentBg} border ${plan.accentBorder}`}>
                    <LimitBadge label="Users" value={plan.limits.users} />
                    <LimitBadge label="Profiles" value={plan.limits.profiles} />
                    <LimitBadge label="Brands" value={plan.limits.brands} />
                    <LimitBadge label="Retention" value={plan.limits.retention} />
                  </div>

                  <div className="space-y-3 flex-1">
                    {plan.plusFrom && (
                      <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Everything in <strong className="text-[var(--foreground)]">{plan.plusFrom}</strong>, plus:</span>
                      </div>
                    )}

                    {/* Roles */}
                    <div>
                      <p className="text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest mb-2">
                        {plan.plusFrom ? "Additional Roles" : "Roles Included"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(isExpanded ? plan.roles : plan.roles.slice(0, 4)).map((role) => (
                          <span
                            key={role}
                            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md ${plan.accentBg} ${plan.accentText} border ${plan.accentBorder}`}
                          >
                            {role}
                          </span>
                        ))}
                        {!isExpanded && plan.roles.length > 4 && (
                          <button
                            onClick={() => setExpandedPlan(plan.id)}
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-0.5"
                          >
                            +{plan.roles.length - 4} more <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {isExpanded && (
                          <button
                            onClick={() => setExpandedPlan(null)}
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-0.5"
                          >
                            Less <ChevronUp className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    {plan.features.length > 0 && (
                      <div className="pt-3 border-t border-[var(--border)]">
                        <p className="text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest mb-2">Features</p>
                        <div className="space-y-1.5">
                          {plan.features.map((f) => (
                            <div key={f} className="flex items-center gap-1.5">
                              <CheckCircle2 className={`w-3 h-3 shrink-0 ${plan.accentText}`} />
                              <span className="text-[11px] text-[var(--foreground-muted)]">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Governance */}
                    {plan.governance.length > 0 && (
                      <div className="pt-3 border-t border-[var(--border)]">
                        <p className="text-[9px] font-black text-[var(--foreground-muted)] uppercase tracking-widest mb-2">Governance & Support</p>
                        <div className="space-y-1.5">
                          {plan.governance.map((g) => (
                            <div key={g} className="flex items-center gap-1.5">
                              <Shield className={`w-3 h-3 shrink-0 ${plan.accentText}`} />
                              <span className="text-[11px] text-[var(--foreground-muted)]">{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full h-10 flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] font-bold text-sm rounded-xl cursor-default"
                    >
                      <Star className="w-4 h-4" />
                      Current Plan
                    </button>
                  ) : plan.ctaVariant === "filled" ? (
                    <button className={`w-full h-10 flex items-center justify-center gap-2 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg ${plan.accentButton}`}>
                      {plan.cta} <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button className={`w-full h-10 flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:${plan.accentBorder} hover:${plan.accentBg} text-[var(--foreground)] font-bold text-sm rounded-xl transition-all duration-200`}>
                      {plan.cta} <ArrowRight className="w-4 h-4" />
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
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[var(--foreground-muted)]" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground-muted)]">No billing history</p>
                    <p className="text-xs text-[var(--foreground-muted)] max-w-xs">
                      Invoices will appear here once payment processing is active. Contact your account representative for billing enquiries.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <p className="text-xs text-[var(--foreground-muted)]">No invoices on record</p>
            <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

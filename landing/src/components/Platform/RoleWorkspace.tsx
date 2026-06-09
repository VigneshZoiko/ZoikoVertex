"use client";
import { useEffect, useRef, useState } from "react";

const ROLES = [
  {
    tab: "Campaign Manager",
    badge: "CAMPAIGN MANAGER",
    heading: "Campaign Manager workspace",
    description:
      "The Campaign Manager lands on the Campaigns dashboard with a scope selector for brand, region, and channel. All campaign briefs, AI agent recommendations, publishing status, and performance data are visible within their authorized scope.",
    dashboardLabel: "PRIMARY DASHBOARD",
    dashboard: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      label: "Campaigns",
    },
    rule: "Rule: Visibility does not equal authority. Actions remain permission-scoped through RBAC + ABAC.",
    features: [
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        ),
        title: "Campaign planning",
        description: "Create briefs, set objectives, allocate content across channels.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        ),
        title: "AI agent recommendations",
        description: "View Strategy Agent output — approval required before execution.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        ),
        title: "Publishing Calendar",
        description: "See approved content entering scheduled release windows.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        ),
        title: "Analytics & ROI",
        description: "Performance within authorized brand scope.",
      },
    ],
  },
  {
    tab: "Reviewer",
    badge: "REVIEWER",
    heading: "Reviewer workspace",
    description:
      "The Reviewer lands on the Review Queue with all pending approvals scoped to their brand and region. Every submission includes the policy version it was validated against.",
    dashboardLabel: "PRIMARY DASHBOARD",
    dashboard: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
      label: "Review Queue",
    },
    rule: "Rule: Reviewers can approve or reject but cannot edit content directly.",
    features: [
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 11l3 3L22 4"/>
          </svg>
        ),
        title: "Approval workflows",
        description: "Single-click approve or reject with mandatory reason capture.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        ),
        title: "Policy version reference",
        description: "Each submission linked to the exact policy version checked.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        ),
        title: "Audit timeline",
        description: "Full history of who reviewed what and when.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
        ),
        title: "Escalation desk",
        description: "Flag sensitive content for compliance review before approval.",
      },
    ],
  },
  {
    tab: "Brand Steward",
    badge: "BRAND STEWARD",
    heading: "Brand Steward workspace",
    description:
      "The Brand Steward manages the Brand Library — voice guidelines, approved claims, prohibited phrases, and visual standards. Changes trigger policy re-validation across queued content.",
    dashboardLabel: "PRIMARY DASHBOARD",
    dashboard: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      label: "Brand Library",
    },
    rule: "Rule: Brand policy changes are versioned and immutable once published.",
    features: [
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        ),
        title: "Voice & tone rules",
        description: "Define approved language patterns enforced at content creation.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        ),
        title: "Prohibited phrase list",
        description: "Blocked terms auto-flagged before content reaches review.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
        ),
        title: "Visual standards",
        description: "Upload and version brand assets with usage permissions.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
        ),
        title: "Policy versioning",
        description: "Every update creates a new version with full change history.",
      },
    ],
  },
  {
    tab: "Compliance Officer",
    badge: "COMPLIANCE OFFICER",
    heading: "Compliance Officer workspace",
    description:
      "The Compliance Officer accesses immutable audit logs, evidence exports, and regulatory reporting across all brands and regions. Read-only with export privileges.",
    dashboardLabel: "PRIMARY DASHBOARD",
    dashboard: {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      label: "Audit Log",
    },
    rule: "Rule: Compliance Officers have read-only access with full export privileges.",
    features: [
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          </svg>
        ),
        title: "Immutable audit events",
        description: "Every action logged with timestamp, user, and policy version.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        ),
        title: "Evidence exports",
        description: "Watermarked PDF exports for regulatory submissions.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        ),
        title: "Regulatory reporting",
        description: "Pre-built report templates for common compliance frameworks.",
      },
      {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        ),
        title: "Cross-brand visibility",
        description: "Full read access across all brands, regions, and channels.",
      },
    ],
  },
];

export default function RoleWorkspaces() {
  const [activeTab, setActiveTab] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = ROLES[activeTab];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleTab = (i: number) => {
    if (i === activeTab) return;
    setAnimating(true);
    setTimeout(() => {
      setActiveTab(i);
      setAnimating(false);
    }, 200);
  };

  return (
    <section className="bg-[#080E1A] py-24 px-6">
      <div ref={ref} className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div
          className={`mb-10 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-[#20E7F2] text-xs font-bold tracking-widest uppercase mb-4 flex items-center  gap-2">
            <span className="w-6 h-px bg-white/40 inline-block" /> Role-Based Workspaces
          </p>
          <h2 className="text-4xl lg:text-[40px] font-black text-white leading-tight mb-4">
            Every role lands where work actually happens.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-lg">
            Visibility does not equal authority. Actions remain permission-scoped through
            RBAC and ABAC — by brand, region, channel, and workspace.
          </p>
        </div>

        {/* Tabs */}
        <div
          className={`flex flex-wrap gap-2 mb-6 transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          {ROLES.map((role, i) => (
            <button
              key={role.tab}
              onClick={() => handleTab(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 ${
                activeTab === i
                  ? "bg-[#20E7F20F] text-[#C7F9FFE5] border-[#20E7F240]"
                  : "bg-transparent text-white/50 border-white/15 hover:border-white/30 hover:text-white/80"
              }`}
            >
              {role.tab}
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div
          className={`border border-[#FFFFFF1A] rounded-2xl p-8 bg-[#0C1422] transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          } ${animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
          style={{ transitionDelay: "250ms" }}
        >
          <div className="grid lg:grid-cols-2 gap-8">

            {/* Left */}
            <div>
              {/* Badge */}
              <span className="inline-block text-xs  font-bold tracking-widest text-[#F5E6C0] border border-[#C9A84C38] bg-[#C9A84C1A] px-3 py-1 rounded-[50px] mb-5">
                {active.badge}
              </span>

              <h3 className="text-white text-2xl font-black mb-3">
                {active.heading}
              </h3>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                {active.description}
              </p>

              {/* Dashboard label */}
              <p className="text-white/30 text-xs font-bold tracking-widest uppercase mb-3">
                {active.dashboardLabel}
              </p>

              {/* Dashboard card */}
              <div className="border border-[#20E7F22E] rounded-xl p-4 bg-[#20E7F20F] flex items-center gap-4 mb-4 hover:border-cyan-400/20 hover:bg-white/[0.02] transition-all duration-300 cursor-default">
                <div className="w-12 h-12 rounded-lg bg-[#0C1422] border border-[#FFFFFF1A] flex items-center justify-center text-cyan-400 shrink-0">
                  {active.dashboard.icon}
                </div>
                <span className="text-white font-semibold text-sm">
                  {active.dashboard.label}
                </span>
              </div>

              {/* Rule box */}
              <div className="border border-[#FFFFFF1A] rounded-xl p-4 bg-[#FFFFFF0E]">
                <p className="text-white/30 text-xs font-mono leading-relaxed">
                  <span className="text-white/50 font-bold">Rule:</span>{" "}
                  {active.rule.replace("Rule: ", "")}
                </p>
              </div>
            </div>

            {/* Right — feature list */}
            <div className="flex flex-col gap-3">
              {active.features.map((feature, i) => (
                <div
                  key={feature.title}
                  className={`border border-[#FFFFFF1A] rounded-xl p-4 bg-[#FFFFFF0E] flex items-start gap-4
                    hover:border-white/20 hover:bg-white/[0.02] transition-all duration-300 cursor-default
                    ${!animating ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
                  style={{ transitionDelay: `${i * 60}ms`, transition: "all 0.3s ease" }}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0C1422] border border-[#FFFFFF1A] flex items-center justify-center text-[#C9A84C] shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-1">
                      {feature.title}
                    </p>
                    <p className="text-white/40 text-[10px] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
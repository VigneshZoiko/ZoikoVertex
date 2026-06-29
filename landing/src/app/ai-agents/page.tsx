"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Brain, Pencil, Send, MessageCircle, TrendingUp,
  Users, CheckSquare, BookOpen, Code2, FileText, UserCheck,
  Shield, Lock, Eye, Settings, BarChart2, Globe, AlertTriangle,
  Rocket, Clock, Database, Zap,
} from "lucide-react";

/* ── Ticker ── */
function Ticker() {
  const items = [
    "POLICY-BOUND EXECUTION",
    "APPROVAL-GATED PUBLISHING",
    "BRAND STANDARD ENFORCEMENT",
    "IMMUTABLE AUDIT EVIDENCE",
    "ROLE-SCOPED PERMISSIONS",
  ];
  return (
    <div className="border-y border-white/10 bg-[#101D2F] py-3 overflow-hidden">
      <div className="flex gap-12 animate-none whitespace-nowrap">
        <div className="flex gap-12 text-xs font-semibold tracking-widest text-white/40">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-3">
              {i % items.length === 0 && <span className="text-cyan-400">✓</span>}
              {item}
              <span className="text-white/20">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="bg-[#080F1B] pt-16 pb-20 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 border border-cyan-400/30 bg-cyan-400/5 text-cyan-400 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            AI AGENTS — GOVERNED AGENTIC EXECUTION™
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Most AI tools{" "}
            <span className="line-through text-white/30">generate content.</span>
            <br />
            Ours operate inside{" "}
            <span className="text-cyan-400">your governance.</span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed mb-8 max-w-lg">
            Five specialized AI agents that plan, create, review, publish, engage, and measure — operating within your roles, policies, brand standards, approval chains, and audit trail.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="https://getzoikovertex.com/request-demo"
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-7 py-3.5 rounded-xl transition-all flex items-center gap-2 text-sm"
            >
              <span>📅</span> Request a Demo
            </Link>
            <Link
              href="https://getzoikovertex.com"
              className="border border-white/20 hover:border-white/40 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:bg-white/5 text-sm flex items-center gap-2"
            >
              <Shield className="w-4 h-4" /> Explore Governance
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {["Role-aware permissions", "Policy-bound approvals", "Audit-ready evidence", "SOC 2 Type II-ready"].map((b) => (
              <span key={b} className="text-xs text-cyan-400/80 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-cyan-400/40 flex items-center justify-center text-[8px]">◎</span>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Orbit diagram — matches Figma: 5 nodes at 72° intervals, dashed spokes */}
        <div className="relative flex items-center justify-center h-[560px]">
          {/* SVG: rings + dashed spokes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 560" preserveAspectRatio="xMidYMid meet">
            {/* Outer ring */}
            <circle cx="240" cy="280" r="190" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            {/* Inner ring */}
            <circle cx="240" cy="280" r="115" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            {/* Dashed spokes at 72° intervals from top */}
            {[0, 72, 144, 216, 288].map((deg) => {
              const rad = (deg - 90) * Math.PI / 180;
              return (
                <line
                  key={deg}
                  x1="240" y1="280"
                  x2={240 + 190 * Math.cos(rad)}
                  y2={280 + 190 * Math.sin(rad)}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                  strokeDasharray="4 5"
                />
              );
            })}
          </svg>

          {/* Center — Governance Core PNG */}
          <div className="absolute z-10" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <img src="/images/governance_core.png" alt="Governance Core" className="w-28 h-28" />
          </div>

          {/* Strategy — 0° (top) */}
          <div className="absolute flex flex-col items-center gap-1" style={{ left: '50%', top: 'calc(50% - 190px)', transform: 'translate(-50%, -100%)' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#0d1a2e] border border-white/10 flex items-center justify-center">
              <img src="/images/strategy_icon.png" alt="Strategy" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-[11px] font-bold text-white/70 tracking-widest mt-1">STRATEGY</span>
            <span className="text-[10px] text-white/30">Campaign Direction</span>
          </div>

          {/* "19 DEFAULT ROLES" badge — upper right, outside ring */}
          <div className="absolute" style={{ right: '0', top: '8%' }}>
            <img src="/images/19-default-roles.png" alt="19 Default Roles" className="h-12 object-contain" />
          </div>

          {/* Content — 72° (upper right) */}
          <div className="absolute flex flex-col items-center gap-1" style={{ left: 'calc(50% + 181px)', top: 'calc(50% - 59px)', transform: 'translate(-50%, -50%)' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#0d1a2e] border border-white/10 flex items-center justify-center">
              <img src="/images/content_icon.png" alt="Content" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-[11px] font-bold text-white/70 tracking-widest mt-1">CONTENT</span>
            <span className="text-[10px] text-white/30">Brand-grounded Drafts</span>
          </div>

          {/* Publishing — 144° (lower right) */}
          <div className="absolute flex flex-col items-center gap-1" style={{ left: 'calc(50% + 112px)', top: 'calc(50% + 154px)', transform: 'translate(-50%, -50%)' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#1a2e1a] border border-green-500/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-[11px] font-bold text-white/70 tracking-widest mt-1">PUBLISHING</span>
            <div className="bg-[#0d2010] border border-green-500/30 rounded-xl px-3 py-1.5 text-[10px] text-green-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="text-green-400">✓</span> 100% APPROVAL-GATED
            </div>
          </div>

          {/* Engagement — 216° (lower left) */}
          <div className="absolute flex flex-col items-center gap-1" style={{ left: 'calc(50% - 112px)', top: 'calc(50% + 154px)', transform: 'translate(-50%, -50%)' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#2a1e0a] border border-amber-500/20 flex items-center justify-center">
              <img src="/images/engagement_icon.png" alt="Engagement" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-[11px] font-bold text-amber-400/80 tracking-widest mt-1">ENGAGEMENT</span>
            <span className="text-[10px] text-white/30">Route &amp; Escalate</span>
          </div>

          {/* "5 AI AGENTS" badge — lower left, below engagement */}
          <div className="absolute" style={{ left: '5%', bottom: '4%' }}>
            <img src="/images/5-governed-agents.png" alt="5 AI Agents" className="h-12 object-contain" />
          </div>

          {/* Revenue — 288° (upper left) */}
          <div className="absolute flex flex-col items-center gap-1" style={{ left: 'calc(50% - 181px)', top: 'calc(50% - 59px)', transform: 'translate(-50%, -50%)' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#0d1a2e] border border-white/10 flex items-center justify-center">
              <img src="/images/revenue_icon.png" alt="Revenue" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-[11px] font-bold text-white/70 tracking-widest mt-1">REVENUE</span>
            <span className="text-[10px] text-white/30">Attribution &amp; ROI</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── The Distinction ── */
function Distinction() {
  const cards = [
    {
      title: "Role-Aware",
      desc: "Acts within your permissions, not around them. Every action is scoped to the user's role, brand, region, and risk class.",
      badge: "19 default roles + ABAC scoping",
      badgeColor: "bg-cyan-900/40 border-cyan-500/30 text-cyan-400",
    },
    {
      title: "Policy-Bound",
      desc: "Constrained by your rules, not model assumptions. Policies are versioned, auditable, and enforced as code.",
      badge: "Policy-as-code + versioned controls",
      badgeColor: "bg-green-900/40 border-green-500/30 text-green-400",
    },
    {
      title: "Human-Gated",
      desc: "High-impact actions wait for authorized humans. No agent publishes or commits budget without completing the approval chain.",
      badge: "Three-Key Approval Protocol",
      badgeColor: "bg-amber-900/40 border-amber-500/30 text-amber-400",
    },
    {
      title: "Audit-Ready",
      desc: "Every action becomes evidence. The audit trail is append-only, timestamped, role-attributed, and exportable via Evidence Vault.",
      badge: "WORM-ready ledger + Evidence Vault",
      badgeColor: "bg-red-900/40 border-red-500/30 text-red-400",
    },
  ];
  return (
    <section className="bg-[#0C1523] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> THE DISTINCTION
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Not generic automation.<br />Governed execution.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Every AI tool can draft a post. The difference is what happens between draft and publish.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c) => (
            <div key={c.title} className="bg-[#0a0f1e] border border-white/8 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                {c.title === "Role-Aware" && <Users className="w-5 h-5 text-cyan-400" />}
                {c.title === "Policy-Bound" && <Code2 className="w-5 h-5 text-cyan-400" />}
                {c.title === "Human-Gated" && <UserCheck className="w-5 h-5 text-amber-400" />}
                {c.title === "Audit-Ready" && <FileText className="w-5 h-5 text-red-400" />}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{c.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{c.desc}</p>
              <span className={`inline-block border rounded px-3 py-1 text-xs font-mono ${c.badgeColor}`}>{c.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Five Agents ── */
const AGENTS = [
  {
    num: "01",
    label: "PLAN SMARTER, WITH EVIDENCE.",
    title: "Strategy Agent",
    desc: "Generates campaign direction, audience prioritization, channel mix, and message hypotheses — risk-adjusted and grounded in approved knowledge sources and prior performance data.",
    features: ["Campaign direction from approved objectives", "Channel mix with performance evidence", "Audience prioritization within Brand Library rules"],
    bestFor: "CMOs and Campaign Managers who need evidence-backed campaign direction.",
    failure: "Launching a campaign that contradicts prior performance or approved strategy.",
    plans: ["Audit", "Pro", "Scale", "Command"],
    icon: <img src="/images/strategy_icon.png" alt="Strategy" className="w-7 h-7 object-contain" />,
    iconBg: "bg-cyan-900/40 border-cyan-500/20",
  },
  {
    num: "02",
    label: "DRAFT WITHIN THE BRAND, NOT AROUND IT.",
    title: "Content Agent",
    desc: "Drafts posts, captions, and campaign variations — grounded in the Brand Library, checked against approved claims, and flagged for prohibited phrases before reaching the Review Queue.",
    features: ["Brand Library-grounded content generation", "Prohibited phrase detection before review", "Multi-variant drafting with source context"],
    bestFor: "Creators, Brand Stewards, and Compliance Reviewers managing regulated or multi-brand content at volume.",
    failure: "A regulated claim reaching review without Brand Library verification.",
    plans: ["Pro", "Scale", "Command"],
    icon: <img src="/images/content_icon.png" alt="Content" className="w-7 h-7 object-contain" />,
    iconBg: "bg-white/5 border-white/10",
  },
  {
    num: "03",
    label: "RELEASE ONLY WHAT IS AUTHORIZED.",
    title: "Publishing Agent",
    desc: "Schedules and releases approved content only after verifying signature, policy version, embargo, and publishing window compliance. Post-approval modifications trigger re-approval.",
    features: ["Signature and policy-version verification before release", "Post-approval modification detection and re-routing", "Crisis-aware publishing pause controls (Command)"],
    bestFor: "Marketing Operations leads and Publishers managing multi-channel release schedules.",
    failure: "Modified content published after original approval without re-review.",
    plans: ["Pro", "Scale", "Command"],
    icon: <Send className="w-6 h-6 text-green-400" />,
    iconBg: "bg-green-900/30 border-green-500/20",
  },
  {
    num: "04",
    label: "RESPOND FASTER. ESCALATE SOONER.",
    title: "Engagement Agent",
    desc: "Triages comments, mentions, and DMs by sentiment, urgency, and sensitive topic classification. Routes sensitive communications before any public response is drafted.",
    features: ["Sentiment, urgency, and escalation classification", "Sensitive topic routing before public response", "Multi-region crisis routing (Command)"],
    bestFor: "Community Managers and Crisis Communications leaders managing risk-sensitive engagement.",
    failure: "An unreviewed response to a sensitive complaint going public before escalation.",
    plans: ["Pro", "Scale", "Command"],
    icon: <img src="/images/engagement_icon.png" alt="Engagement" className="w-7 h-7 object-contain" />,
    iconBg: "bg-amber-900/30 border-amber-500/20",
  },
  {
    num: "05",
    label: "CONNECT ACTIVITY TO OUTCOMES.",
    title: "Revenue Attribution Agent",
    desc: "Connects campaign activity to pipeline and revenue with logged model assumptions, evidence-grade reporting, and board-ready attribution packages exportable via Evidence Vault.",
    features: ["Multi-touch attribution with logged assumptions", "Cross-brand attribution analysis (Scale+)", "Board-grade evidence packs (Command)"],
    bestFor: "CMOs, CFOs, and Analysts who need ROI evidence that survives Finance and board scrutiny.",
    failure: "A marketing ROI claim that cannot be verified by Finance or the board.",
    plans: ["Pro", "Scale", "Command"],
    icon: <img src="/images/revenue_icon.png" alt="Revenue" className="w-7 h-7 object-contain" />,
    iconBg: "bg-white/5 border-white/10",
  },
];

const PLAN_COLORS: Record<string, string> = {
  Audit: "border-cyan-400/40 text-cyan-400",
  Pro: "border-cyan-400/40 text-cyan-400",
  Scale: "border-cyan-400/40 text-cyan-400",
  Command: "border-cyan-400/40 text-cyan-400",
};

function FiveAgents() {
  return (
    <section className="bg-[#080F1B] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> FIVE AGENTS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Five governed agents.<br />One operating layer.
          </h2>
          <p className="text-white/50 max-w-2xl">
            Each agent owns a stage of the marketing lifecycle and reports to the same governance engine. Handoffs become the audit trail.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {AGENTS.map((a) => (
            <div key={a.num} className="bg-[#0a0f1e] border border-white/8 rounded-2xl p-8 grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl font-black text-white/10">{a.num}</span>
                  <div>
                    <p className="text-cyan-400 text-xs font-bold tracking-wider uppercase mb-1">{a.label}</p>
                    <h3 className="text-2xl font-black text-white">{a.title}</h3>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${a.iconBg}`}>
                  {a.icon}
                </div>
                <p className="text-white/50 text-sm leading-relaxed mb-4">{a.desc}</p>
                <ul className="space-y-1.5">
                  {a.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="text-cyan-400 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-white/30 text-xs font-bold tracking-widest uppercase mb-2">BEST FOR</p>
                  <p className="text-white/70 text-sm mb-5">{a.bestFor}</p>
                  <p className="text-white/30 text-xs font-bold tracking-widest uppercase mb-2">FAILURE PREVENTED</p>
                  <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-3 mb-5">
                    <p className="text-red-400 text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      {a.failure}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {a.plans.map((p) => (
                    <span key={p} className={`border rounded-full px-3 py-1 text-xs font-semibold ${PLAN_COLORS[p]}`}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Operating Model ── */
const STAGES = [
  { num: "01", title: "Connect", role: "Knowledge Mgr", tag: "Assets · Libraries", iconBg: "#0C212F", icon: <Database style={{ width: 15, height: 15, flexShrink: 0 }} className="text-cyan-400" /> },
  { num: "02", title: "Apply Standards", role: "Brand Steward", tag: "Voice · Claims", iconBg: "#0C212F", icon: <BookOpen style={{ width: 15, height: 15, flexShrink: 0 }} className="text-cyan-400" /> },
  { num: "03", title: "Set Policies", role: "Gov. Admin", tag: "Roles · Autonomy", iconBg: "#18212E", icon: <Settings style={{ width: 15, height: 15, flexShrink: 0 }} className="text-white/50" /> },
  { num: "04", title: "Generate", role: "Agent Operator", tag: "Drafts · Plans", iconBg: "#18212E", icon: <Zap style={{ width: 15, height: 15, flexShrink: 0 }} className="text-white/50" /> },
  { num: "05", title: "Route for Review", role: "Reviewer · Validator", tag: "Queue · Approval", iconBg: "#0C212F", icon: <Eye style={{ width: 15, height: 15, flexShrink: 0 }} className="text-cyan-400" /> },
  { num: "06", title: "Execute", role: "Publisher", tag: "Signed · Current", iconBg: "#0F2729", icon: <Send style={{ width: 15, height: 15, flexShrink: 0 }} className="text-green-400" /> },
  { num: "07", title: "Evidence", role: "Analyst · Auditor", tag: "Evidence Vault", iconBg: "#0C212F", icon: <FileText style={{ width: 15, height: 15, flexShrink: 0 }} className="text-cyan-400" /> },
];

function OperatingModel() {
  return (
    <section className="bg-[#0C1523] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> OPERATING MODEL
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">How the agents actually operate.</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Seven stages from data connection to evidence capture. Each stage has an owner role, a governance checkpoint, and a control surface.
          </p>
        </div>

        {/* Agent tabs */}
        <div className="border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 mb-6 bg-[#080F1B]">
          <span className="text-xs font-bold tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-lg px-3 py-1.5">AI ORCHESTRATION</span>
          {["Strategy Agent", "Content Agent", "Publishing Agent", "Engagement Agent", "Revenue Attribution Agent"].map((a) => (
            <span key={a} className="text-xs text-white/40 border border-white/10 rounded-lg px-3 py-1.5">{a}</span>
          ))}
        </div>

        {/* Stages */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          {STAGES.map((s) => (
            <div key={s.num} className="bg-[#0a0f1e] border border-white/8 rounded-xl p-3 flex flex-col items-center text-center">
              <span className="text-white/20 text-xs font-mono mb-2">{s.num}</span>
              <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center mb-2" style={{ backgroundColor: s.iconBg }}>
                {s.icon}
              </div>
              <p className="text-white font-bold text-xs mb-1">{s.title}</p>
              <p className="text-white/30 text-[10px] mb-2">{s.role}</p>
              <span className="text-[10px] border border-white/10 rounded-full px-2 py-0.5 text-white/40">{s.tag}</span>
            </div>
          ))}
        </div>

        {/* Governance bar */}
        <div className="border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 bg-[#080F1B]">
          <span className="text-xs font-bold tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-1.5">GOVERNANCE CONTROL</span>
          {["Policy Engine", "Role-Based Access", "Approval Workflows", "Brand Standards", "Audit Trail", "Human Oversight"].map((g) => (
            <span key={g} className="text-xs text-white/40 border border-white/10 rounded-lg px-3 py-1.5">{g}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Governance ── */
const GOV_CARDS = [
  { title: "Role-Based Access", icon: <Users className="w-5 h-5 text-cyan-400" />, desc: "RBAC + ABAC enforcement. Visibility does not equal authority — actions are independently permissioned by role, brand, and region.", artifact: "Role attestation report" },
  { title: "Approval Workflows", icon: <CheckSquare className="w-5 h-5 text-cyan-400" />, desc: "Multi-stage approval chains with separation of duties. Content is bound to its approved version — modifications trigger re-approval before release.", artifact: "Signed approval chain per asset" },
  { title: "Brand Standards", icon: <BookOpen className="w-5 h-5 text-cyan-400" />, desc: "Voice guidelines, approved claims, prohibited phrases, and regional rules enforced as policy checks before content enters the Review Queue.", artifact: "Brand integrity scorecard" },
  { title: "Policy Engine", icon: <Code2 className="w-5 h-5 text-cyan-400" />, desc: "Customer-defined policies enforced as versioned code. Every policy change creates a new version in the audit trail with its effective date.", artifact: "Policy version history" },
  { title: "Immutable Audit Trail", icon: <FileText className="w-5 h-5 text-cyan-400" />, desc: "Every action is written to an append-only ledger at runtime. Records cannot be edited, deleted, or back-dated. WORM-ready by design.", artifact: "Evidence Vault export" },
  { title: "Human Oversight", icon: <UserCheck className="w-5 h-5 text-cyan-400" />, desc: "Human-in-the-loop defaults, autonomy thresholds, and break-glass controls. No agent action escapes documented human accountability.", artifact: "Override and exception log" },
];

function Governance() {
  return (
    <section className="bg-[#080F1B] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> GOVERNANCE
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Trust is not a feature.<br />It is the foundation.
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Six controls beneath every agent action — each naming the artifact the audit, legal, brand, or compliance team receives.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GOV_CARDS.map((c) => (
            <div key={c.title} className="bg-[#0C1523] border border-white/8 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                {c.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{c.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{c.desc}</p>
              <div className="border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white/40">
                <span className="text-white/20 mr-2">ARTIFACT</span>{c.artifact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Plan Access Table ── */
type CellValue = string | boolean;

const TABLE_ROWS: { label: string; section?: boolean; audit: CellValue; pro: CellValue; scale: CellValue; command: CellValue }[] = [
  { label: "AI AGENTS", section: true, audit: "", pro: "", scale: "", command: "" },
  { label: "Strategy Agent", audit: "Read-only", pro: "✓", scale: "Multi-brand", command: "Custom models" },
  { label: "Content Agent", audit: false, pro: "Governed drafts", scale: "Multi-brand", command: "Sector packs" },
  { label: "Publishing Agent", audit: false, pro: "Policy-bound", scale: "Adv. windows", command: "Crisis-aware" },
  { label: "Engagement Agent", audit: "Preview", pro: "Standard", scale: "Adv. escalation", command: "Multi-region" },
  { label: "Revenue Attribution Agent", audit: "Diagnostic", pro: "Standard", scale: "Cross-brand", command: "Board-grade" },
  { label: "GOVERNANCE", section: true, audit: "", pro: "", scale: "", command: "" },
  { label: "Approval Workflows", audit: false, pro: "Standard", scale: "Advanced", command: "Three-Key Protocol" },
  { label: "Brand Library", audit: false, pro: "Basic", scale: "Full multi-brand", command: "Portfolio-level" },
  { label: "Crisis Console", audit: false, pro: false, scale: "Standard", command: "Full + break-glass" },
  { label: "Evidence Vault / Legal Hold", audit: false, pro: false, scale: false, command: "Where contracted" },
  { label: "SSO / SAML / SCIM", audit: false, pro: false, scale: "SSO option", command: "Full identity suite" },
];

function Cell({ val, highlight, bg }: { val: CellValue; highlight?: boolean; bg?: string }) {
  if (val === "") return <td className="px-4 py-2" style={bg ? { backgroundColor: bg } : undefined} />;
  if (val === false) return <td className="px-4 py-3 text-center text-white/20" style={bg ? { backgroundColor: bg } : undefined}>✕</td>;
  const isCheck = val === "✓";
  return (
    <td className={`px-4 py-3 text-center text-sm ${isCheck ? "text-green-400 font-bold" : highlight ? "text-cyan-400 font-semibold" : "text-white/50"}`} style={bg ? { backgroundColor: bg } : undefined}>
      {val as string}
    </td>
  );
}

function PlanAccess() {
  return (
    <section className="bg-[#0C1523] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> PLAN ACCESS
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Four plans. One governance model.</h2>
          <p className="text-white/50 max-w-md mx-auto">Agent access and governance depth scale across your deployment tier.</p>
        </div>

        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-4 text-left text-xs font-bold text-white/30 tracking-widest">CAPABILITY</th>
                {["AUDIT", "PRO", "SCALE ★", "COMMAND"].map((p, i) => (
                  <th key={p} className={`px-4 py-4 text-center text-xs font-bold tracking-widest ${i === 2 ? "text-cyan-400 border-t-2 border-cyan-400" : "text-white/30"}`} style={i === 2 ? { backgroundColor: "#12293A" } : undefined}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row, i) =>
                row.section ? (
                  <tr key={i} className="bg-[#080F1B]">
                    <td className="px-4 py-2 text-xs font-bold text-cyan-400 tracking-widest" colSpan={2}>{row.label}</td>
                    <td className="px-4 py-2" colSpan={1} style={{ backgroundColor: "#0C1A27" }} />
                    <td className="px-4 py-2" colSpan={2} />
                  </tr>
                ) : (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 text-sm text-white/70">{row.label}</td>
                    <Cell val={row.audit} />
                    <Cell val={row.pro} />
                    <Cell val={row.scale} highlight bg="#0C1A27" />
                    <Cell val={row.command} highlight />
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/8 bg-[#080F1B]">
                <td className="px-4 py-4 text-xs text-white/30">Scale includes all five agents in advanced multi-brand mode.</td>
                {[
                  { label: "Request Audit", style: "border border-white/20 text-white/60" },
                  { label: "Start Pro Trial", style: "border border-white/20 text-white/60" },
                  { label: "Book Scale Call", style: "bg-cyan-400 text-black font-bold" },
                  { label: "Command Brief", style: "border border-white/20 text-white/60" },
                ].map((b, i) => (
                  <td key={b.label} className="px-4 py-4 text-center" style={i === 2 ? { backgroundColor: "#0C1A27" } : undefined}>
                    <Link href="https://getzoikovertex.com/request-demo" className={`text-xs rounded-lg px-3 py-2 transition-all hover:opacity-80 ${b.style}`}>
                      {b.label}
                    </Link>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="text-center mt-6">
          <Link href="https://getzoikovertex.com" className="border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm rounded-xl px-6 py-3 transition-all inline-flex items-center gap-2">
            → View full plan comparison
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Role-Aware ── */
const ROLES = [
  { title: "Creator", sub: "CONTENT STUDIO", desc: "Drafts content with agent assistance within Brand Library rules. No review, approval, or publish rights.", badge: "× No approval rights", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <Pencil className="w-5 h-5 text-cyan-400" /> },
  { title: "Reviewer", sub: "REVIEW QUEUE", desc: "Editorial review of drafts. Can annotate and return. Cannot self-approve or publish independently.", badge: "× No self-approval", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <Eye className="w-5 h-5 text-cyan-400" /> },
  { title: "Validator", sub: "VALIDATION DESK", desc: "Checks claims, source evidence, brand fit, and regulated exposure before approval.", badge: "× No publish authority", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <CheckSquare className="w-5 h-5 text-cyan-400" /> },
  { title: "Approver", sub: "APPROVALS", desc: "Signs off on validated content. Cannot self-approve content they created. SoD enforced structurally.", badge: "× Cannot self-approve", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <CheckSquare className="w-5 h-5 text-cyan-400" /> },
  { title: "Publisher", sub: "PUBLISHING CALENDAR", desc: "Releases signed, approved, version-current content only. Cannot modify after approval without re-routing.", badge: "× No post-approval edits", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <Send className="w-5 h-5 text-cyan-400" /> },
  { title: "Brand Steward", sub: "BRAND LIBRARY", desc: "Owns brand standards, approved claims, and policy versions. All changes are versioned and audited.", badge: "× No content execution", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <BookOpen className="w-5 h-5 text-cyan-400" /> },
  { title: "Compliance Officer", sub: "AUDIT & EVIDENCE", desc: "Regulated sign-off authority, audit access, and evidence export rights. Legal hold on Command plans.", badge: "Scope: regulated content", badgeColor: "bg-white/5 border-white/10 text-white/40", icon: <Shield className="w-5 h-5 text-red-400" /> },
  { title: "Executive Viewer", sub: "COMMAND CENTER", desc: "Board-grade read-only dashboards. ROI evidence and governance status. No operational authority.", badge: "Read-only · No execution", badgeColor: "bg-white/5 border-white/10 text-white/40", icon: <BarChart2 className="w-5 h-5 text-cyan-400" /> },
  { title: "Platform Admin", sub: "ADMINISTRATION HUB", desc: "Workspace configuration and integrations. Separated from security identity management by design.", badge: "× Separated from security admin", badgeColor: "bg-red-950/40 border-red-500/20 text-red-400", icon: <Settings className="w-5 h-5 text-cyan-400" /> },
];

function RoleAware() {
  return (
    <section className="bg-[#080F1B] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> ROLE-AWARE EXPERIENCE
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
            Agents adapt to roles.<br />Not the reverse.
          </h2>
          <p className="text-white/50 max-w-xl">
            The agent does not decide what the user can do. The role does. Access denial is explicit, explainable, and logged.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((r) => (
            <div key={r.title} className="bg-[#0a0f1e] border border-white/8 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                {r.icon}
              </div>
              <h3 className="text-white font-bold text-lg">{r.title}</h3>
              <p className="text-xs font-mono text-white/30 tracking-wider mb-3">→ {r.sub}</p>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{r.desc}</p>
              <span className={`inline-block border rounded px-3 py-1 text-xs font-mono ${r.badgeColor}`}>{r.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Use Cases ── */
const USE_CASES = [
  { num: "01", icon: <Rocket className="w-5 h-5 text-cyan-400" />, title: "Launch campaigns faster without bypassing governance", desc: "Agents draft, check, route, and prepare content in parallel — compressing time-to-publish without removing approval gates.", target: "reduced campaign time-to-publish" },
  { num: "02", icon: <BookOpen className="w-5 h-5 text-cyan-400" />, title: "Maintain brand consistency across portfolios", desc: "Content Agent applies Brand Library checks on every draft across every brand. Off-brand outputs are flagged before review — not after publication.", target: "reduced off-brand publication rate" },
  { num: "03", icon: <Clock className="w-5 h-5 text-cyan-400" />, title: "Reduce approval bottlenecks and SLA drift", desc: "Approval workflows make bottlenecks visible: who holds what, for how long, at which stage. Converts governance from a blocker into a managed process.", target: "improved approval SLA compliance" },
  { num: "04", icon: <Globe className="w-5 h-5 text-cyan-400" />, title: "Coordinate multi-brand, multi-region operations", desc: "Regional Brand Libraries, jurisdiction-aware policies, and brand-scoped access — consistent governance without constant central oversight.", target: "consistent governance across regions" },
  { num: "05", icon: <AlertTriangle className="w-5 h-5 text-cyan-400" />, title: "Control sensitive communications before they go public", desc: "Engagement Agent classifies and routes sensitive interactions to the appropriate review path before any public response is drafted.", target: "no unauthorized sensitive responses" },
  { num: "06", icon: <BarChart2 className="w-5 h-5 text-cyan-400" />, title: "Prove marketing contribution to Finance and the Board", desc: "Revenue Attribution Agent produces evidence-grade attribution with logged model assumptions that survives CFO and board scrutiny.", target: "finance-verifiable marketing ROI" },
];

function UseCases() {
  return (
    <section className="bg-[#0C1523] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> USE CASES
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">What teams actually do<br />with ZoikoVertex.</h2>
          <p className="text-white/50 max-w-xl mx-auto mb-16">
            The value is the operational shift — faster campaigns, fewer brand incidents, visible bottlenecks, and defensible governance evidence.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((u) => (
            <div key={u.num} className="bg-[#0a0f1e] border border-white/8 rounded-2xl p-6">
              <span className="text-3xl font-black text-white/10 block mb-3">{u.num}</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                {u.icon}
              </div>
              <h3 className="text-white font-bold mb-2">{u.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{u.desc}</p>
              <div className="border border-green-500/40 bg-green-950/40 rounded-lg px-3 py-1.5 font-mono text-xs text-green-400">
                <span className="mr-2">Target:</span>{u.target}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Leader Personas ── */
const PERSONAS = [
  { role: "CMO", icon: <BarChart2 className="w-3.5 h-3.5" />, quote: "If AI publishes something wrong at scale, I own it — and I can't explain what happened.", answer: "ZoikoVertex gives you a complete approval chain, brand policy enforcement, and an audit trail for every piece of content.", badge: "Signed approval chain + audit export" },
  { role: "HEAD OF BRAND", icon: <BookOpen className="w-3.5 h-3.5" />, quote: "Agencies and regional teams are generating content that doesn't match our standards.", answer: "Brand Library policies are enforced as code — not guidelines. Every draft is checked before review.", badge: "Brand integrity scorecard" },
  { role: "DIGITAL MARKETING DIRECTOR", icon: <Settings className="w-3.5 h-3.5" />, quote: "We're running six tools and nothing connects. Approvals happen in email.", answer: "One governed layer for strategy, content, approvals, publishing, engagement, and attribution.", badge: "Workflow consolidation audit" },
  { role: "COMPLIANCE LEADER", icon: <Shield className="w-3.5 h-3.5" />, quote: "I can't approve an AI tool I can't audit. How do I defend this to regulators?", answer: "Every agent action is logged with actor identity, role, policy version, and timestamp. Evidence Vault for regulatory review.", badge: "Evidence Vault + policy version history" },
  { role: "CIO / CTO", icon: <Lock className="w-3.5 h-3.5" />, quote: "Another AI tool with vague security claims and no real identity architecture.", answer: "RBAC + ABAC, SSO/SAML/SCIM, separation of duties, MFA. Security administration separated from identity management by design.", badge: "Security architecture summary" },
  { role: "AGENCY LEADER", icon: <Globe className="w-3.5 h-3.5" />, quote: "We need AI velocity across clients without losing client governance accountability.", answer: "Multi-client workspaces, client-scoped roles, client-specific Brand Libraries, and per-client approval chain evidence.", badge: "Per-client signed approval chains" },
];

function LeaderPersonas() {
  return (
    <section className="bg-[#080F1B] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> BUILT FOR EVERY LEADER
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Each leader gets<br />their version of the answer.</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Different roles carry different anxieties. Each persona sees their own problem — and the answer to it.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PERSONAS.map((p) => (
            <div key={p.role} className="bg-[#0a0f1e] border border-white/8 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-widest mb-3">
                {p.icon} {p.role}
              </div>
              <blockquote className="border-l-2 border-white/20 pl-4 text-white font-bold text-base leading-snug mb-4">
                {p.quote}
              </blockquote>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{p.answer}</p>
              <div className="border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white/30 flex items-center gap-2">
                <FileText className="w-3 h-3" /> {p.badge}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Enterprise Trust ── */
const SecurityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none" style={{flexShrink:0}}><path d="M5.67109 7.67305C5.25403 7.67305 4.86763 7.77425 4.51189 7.97665C4.15616 8.17905 3.87709 8.45811 3.67469 8.81385C3.47229 9.16958 3.37109 9.55598 3.37109 9.97305C3.37109 10.1816 3.44469 10.3594 3.59189 10.5066C3.73909 10.6538 3.92003 10.7274 4.13469 10.7274C4.34936 10.7274 4.53029 10.6538 4.67749 10.5066C4.82469 10.3594 4.89829 10.1785 4.89829 9.96385C4.89829 9.74918 4.97189 9.56825 5.11909 9.42105C5.26629 9.27385 5.44723 9.20025 5.66189 9.20025C5.87656 9.20025 6.05749 9.12665 6.20469 8.97945C6.35189 8.83225 6.42549 8.65131 6.42549 8.43665C6.42549 8.22198 6.35189 8.04105 6.20469 7.89385C6.05749 7.74665 5.87963 7.67305 5.67109 7.67305ZM4.89829 8.42745C4.89829 8.64825 4.97189 8.83225 5.11909 8.97945C5.26629 9.12665 5.45029 9.20025 5.67109 9.20025H13.3255C13.5463 9.20025 13.7303 9.12665 13.8775 8.97945C14.0247 8.83225 14.0983 8.65131 14.0983 8.43665C14.0983 8.22198 14.0247 8.04105 13.8775 7.89385C13.7303 7.74665 13.5463 7.67305 13.3255 7.67305H5.67109C5.45029 7.67305 5.26629 7.74665 5.11909 7.89385C4.97189 8.04105 4.89829 8.21891 4.89829 8.42745ZM15.6255 9.97305C15.6255 9.55598 15.5243 9.16958 15.3219 8.81385C15.1195 8.45811 14.8404 8.17905 14.4847 7.97665C14.129 7.77425 13.7426 7.67305 13.3255 7.67305C13.117 7.67305 12.9391 7.74665 12.7919 7.89385C12.6447 8.04105 12.5711 8.22198 12.5711 8.43665C12.5711 8.65131 12.6447 8.83225 12.7919 8.97945C12.9391 9.12665 13.12 9.20025 13.3347 9.20025C13.5494 9.20025 13.7303 9.27385 13.8775 9.42105C14.0247 9.56825 14.0983 9.74918 14.0983 9.96385C14.0983 10.1785 14.1719 10.3594 14.3191 10.5066C14.4663 10.6538 14.6472 10.7274 14.8619 10.7274C15.0766 10.7274 15.2575 10.6538 15.4047 10.5066C15.5519 10.3594 15.6255 10.1816 15.6255 9.97305ZM14.8711 9.20025C14.6503 9.20025 14.4663 9.27385 14.3191 9.42105C14.1719 9.56825 14.0983 9.75225 14.0983 9.97305V14.573C14.0983 14.7816 14.1719 14.9594 14.3191 15.1066C14.4663 15.2538 14.6472 15.3274 14.8619 15.3274C15.0766 15.3274 15.2575 15.2538 15.4047 15.1066C15.5519 14.9594 15.6255 14.7816 15.6255 14.573V9.97305C15.6255 9.75225 15.5519 9.56825 15.4047 9.42105C15.2575 9.27385 15.0796 9.20025 14.8711 9.20025ZM13.3255 16.873C13.7426 16.873 14.129 16.7688 14.4847 16.5602C14.8404 16.3517 15.1195 16.0726 15.3219 15.723C15.5243 15.3734 15.6255 14.9901 15.6255 14.573C15.6255 14.3522 15.5519 14.1682 15.4047 14.021C15.2575 13.8738 15.0766 13.8002 14.8619 13.8002C14.6472 13.8002 14.4663 13.8738 14.3191 14.021C14.1719 14.1682 14.0983 14.3492 14.0983 14.5638C14.0983 14.7785 14.0247 14.9594 13.8775 15.1066C13.7303 15.2538 13.5494 15.3274 13.3347 15.3274C13.12 15.3274 12.9391 15.4041 12.7919 15.5574C12.6447 15.7108 12.5711 15.8917 12.5711 16.1002C12.5711 16.3088 12.6447 16.4897 12.7919 16.643C12.9391 16.7964 13.117 16.873 13.3255 16.873ZM14.0983 16.1002C14.0983 15.8917 14.0247 15.7108 13.8775 15.5574C13.7303 15.4041 13.5463 15.3274 13.3255 15.3274H5.67109C5.45029 15.3274 5.26629 15.4041 5.11909 15.5574C4.97189 15.7108 4.89829 15.8917 4.89829 16.1002C4.89829 16.3088 4.97189 16.4897 5.11909 16.643C5.26629 16.7964 5.45029 16.873 5.67109 16.873H13.3255C13.5463 16.873 13.7303 16.7964 13.8775 16.643C14.0247 16.4897 14.0983 16.3088 14.0983 16.1002ZM3.37109 14.573C3.37109 14.9901 3.47229 15.3734 3.67469 15.723C3.87709 16.0726 4.15616 16.3517 4.51189 16.5602C4.86763 16.7688 5.25403 16.873 5.67109 16.873C5.87963 16.873 6.05749 16.7964 6.20469 16.643C6.35189 16.4897 6.42549 16.3088 6.42549 16.1002C6.42549 15.8917 6.35189 15.7108 6.20469 15.5574C6.05749 15.4041 5.87656 15.3274 5.66189 15.3274C5.44723 15.3274 5.26629 15.2538 5.11909 15.1066C4.97189 14.9594 4.89829 14.7785 4.89829 14.5638C4.89829 14.3492 4.82469 14.1682 4.67749 14.021C4.53029 13.8738 4.34936 13.8002 4.13469 13.8002C3.92003 13.8002 3.73909 13.8738 3.59189 14.021C3.44469 14.1682 3.37109 14.3522 3.37109 14.573ZM4.12549 15.3274C4.34629 15.3274 4.53029 15.2538 4.67749 15.1066C4.82469 14.9594 4.89829 14.7816 4.89829 14.573V9.97305C4.89829 9.75225 4.82469 9.56825 4.67749 9.42105C4.53029 9.27385 4.34936 9.20025 4.13469 9.20025C3.92003 9.20025 3.73909 9.27385 3.59189 9.42105C3.44469 9.56825 3.37109 9.75225 3.37109 9.97305V14.573C3.37109 14.7816 3.44469 14.9594 3.59189 15.1066C3.73909 15.2538 3.91696 15.3274 4.12549 15.3274ZM7.97109 12.273C7.97109 12.6901 8.11829 13.0489 8.41269 13.3494C8.70709 13.65 9.06896 13.8002 9.49829 13.8002C9.92763 13.8002 10.2895 13.65 10.5839 13.3494C10.8783 13.0489 11.0255 12.6901 11.0255 12.273C11.0255 12.0522 10.9519 11.8682 10.8047 11.721C10.6575 11.5738 10.4766 11.5002 10.2619 11.5002C10.0472 11.5002 9.86629 11.5738 9.71909 11.721C9.57189 11.8682 9.49829 12.0522 9.49829 12.273C9.49829 12.0522 9.42469 11.8682 9.27749 11.721C9.13029 11.5738 8.94936 11.5002 8.73469 11.5002C8.52003 11.5002 8.33909 11.5738 8.19189 11.721C8.04469 11.8682 7.97109 12.0522 7.97109 12.273ZM11.0255 12.273C11.0255 11.8437 10.8783 11.4788 10.5839 11.1782C10.2895 10.8777 9.92763 10.7274 9.49829 10.7274C9.06896 10.7274 8.70709 10.8777 8.41269 11.1782C8.11829 11.4788 7.97109 11.8437 7.97109 12.273C7.97109 12.4816 8.04469 12.6594 8.19189 12.8066C8.33909 12.9538 8.52003 13.0274 8.73469 13.0274C8.94936 13.0274 9.13029 12.9538 9.27749 12.8066C9.42469 12.6594 9.49829 12.4816 9.49829 12.273C9.49829 12.4816 9.57189 12.6594 9.71909 12.8066C9.86629 12.9538 10.0472 13.0274 10.2619 13.0274C10.4766 13.0274 10.6575 12.9538 10.8047 12.8066C10.9519 12.6594 11.0255 12.4816 11.0255 12.273ZM6.42549 9.20025C6.64629 9.20025 6.83029 9.12665 6.97749 8.97945C7.12469 8.83225 7.19829 8.64825 7.19829 8.42745V5.37305C7.19829 5.15225 7.12469 4.96825 6.97749 4.82105C6.83029 4.67385 6.64936 4.60025 6.43469 4.60025C6.22003 4.60025 6.03909 4.67385 5.89189 4.82105C5.74469 4.96825 5.67109 5.15225 5.67109 5.37305V8.42745C5.67109 8.64825 5.74469 8.83225 5.89189 8.97945C6.03909 9.12665 6.21696 9.20025 6.42549 9.20025ZM13.3255 5.37305C13.3255 4.67385 13.1538 4.02985 12.8103 3.44105C12.4668 2.85225 12.0038 2.38611 11.4211 2.04265C10.8384 1.69918 10.1975 1.52745 9.49829 1.52745C8.79909 1.52745 8.15816 1.69918 7.57549 2.04265C6.99283 2.38611 6.52976 2.85225 6.18629 3.44105C5.84283 4.02985 5.67109 4.67385 5.67109 5.37305C5.67109 5.58158 5.74469 5.75945 5.89189 5.90665C6.03909 6.05385 6.22003 6.12745 6.43469 6.12745C6.64936 6.12745 6.83029 6.05385 6.97749 5.90665C7.12469 5.75945 7.19829 5.58158 7.19829 5.37305C7.19829 4.95598 7.30256 4.56958 7.51109 4.21385C7.71963 3.85811 7.99869 3.57905 8.34829 3.37665C8.69789 3.17425 9.08123 3.07305 9.49829 3.07305C9.91536 3.07305 10.2987 3.17425 10.6483 3.37665C10.9979 3.57905 11.277 3.85811 11.4855 4.21385C11.694 4.56958 11.7983 4.95598 11.7983 5.37305C11.7983 5.58158 11.8719 5.75945 12.0191 5.90665C12.1663 6.05385 12.3472 6.12745 12.5619 6.12745C12.7766 6.12745 12.9575 6.05385 13.1047 5.90665C13.2519 5.75945 13.3255 5.58158 13.3255 5.37305ZM12.5711 4.60025C12.3503 4.60025 12.1663 4.67385 12.0191 4.82105C11.8719 4.96825 11.7983 5.15225 11.7983 5.37305V8.42745C11.7983 8.64825 11.8719 8.83225 12.0191 8.97945C12.1663 9.12665 12.3472 9.20025 12.5619 9.20025C12.7766 9.20025 12.9575 9.12665 13.1047 8.97945C13.2519 8.83225 13.3255 8.64825 13.3255 8.42745V5.37305C13.3255 5.15225 13.2519 4.96825 13.1047 4.82105C12.9575 4.67385 12.7796 4.60025 12.5711 4.60025Z" fill="#20E7F2"/></svg>;
const PrivacyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none" style={{flexShrink:0}}><path d="M8.98464 2.87068C9.95371 3.72935 11.0516 4.37335 12.2782 4.80268C13.5049 5.23202 14.7622 5.42215 16.0502 5.37308C16.2588 5.36082 16.4366 5.27495 16.5838 5.11548C16.731 4.95602 16.7985 4.77202 16.7862 4.56348C16.774 4.35495 16.6881 4.18015 16.5286 4.03908C16.3692 3.89802 16.1852 3.82748 15.9766 3.82748C14.8849 3.88882 13.8208 3.73548 12.7842 3.36748C11.7477 2.99948 10.8246 2.45362 10.015 1.72988C9.85558 1.58268 9.66851 1.51828 9.45384 1.53668C9.23918 1.55508 9.06131 1.64095 8.92024 1.79428C8.77918 1.94762 8.71784 2.13162 8.73624 2.34628C8.75464 2.56095 8.83744 2.73575 8.98464 2.87068ZM9.68384 16.8363C10.9964 16.5051 12.1862 15.9286 13.2534 15.1067C14.3206 14.2848 15.1885 13.2851 15.857 12.1075C16.5256 10.9299 16.9365 9.67255 17.0898 8.33548C17.2432 6.99842 17.1297 5.67975 16.7494 4.37948C16.6881 4.18322 16.5654 4.03295 16.3814 3.92868C16.1974 3.82442 16.0042 3.80295 15.8018 3.86428C15.5994 3.92562 15.4461 4.04828 15.3418 4.23228C15.2376 4.41628 15.2161 4.61255 15.2774 4.82108C15.5964 5.91282 15.6914 7.02602 15.5626 8.16068C15.4338 9.29535 15.0873 10.3595 14.523 11.3531C13.9588 12.3467 13.2258 13.19 12.3242 13.8831C11.4226 14.5761 10.4198 15.0699 9.31584 15.3643C9.10731 15.4134 8.94784 15.5299 8.83744 15.7139C8.72704 15.8979 8.69944 16.0911 8.75464 16.2935C8.80984 16.4959 8.92944 16.6523 9.11344 16.7627C9.29744 16.8731 9.48758 16.8976 9.68384 16.8363ZM2.25024 4.37948C1.86998 5.67975 1.75651 6.99842 1.90984 8.33548C2.06318 9.67255 2.47411 10.9299 3.14264 12.1075C3.81118 13.2851 4.67904 14.2848 5.74624 15.1067C6.81344 15.9286 8.00331 16.5051 9.31584 16.8363C9.51211 16.8976 9.70224 16.8731 9.88624 16.7627C10.0702 16.6523 10.1898 16.4959 10.245 16.2935C10.3002 16.0911 10.2726 15.8979 10.1622 15.7139C10.0518 15.5299 9.89237 15.4134 9.68384 15.3643C8.57984 15.0699 7.57704 14.5761 6.67544 13.8831C5.77384 13.19 5.04091 12.3467 4.47664 11.3531C3.91238 10.3595 3.56584 9.29535 3.43704 8.16068C3.30824 7.02602 3.40331 5.91282 3.72224 4.82108C3.78358 4.61255 3.76211 4.41628 3.65784 4.23228C3.55358 4.04828 3.40024 3.92562 3.19784 3.86428C2.99544 3.80295 2.80224 3.82442 2.61824 3.92868C2.43424 4.03295 2.31158 4.18322 2.25024 4.37948ZM2.94944 5.37308C4.23744 5.42215 5.49478 5.23202 6.72144 4.80268C7.94811 4.37335 9.04598 3.72935 10.015 2.87068C10.1622 2.73575 10.245 2.56095 10.2634 2.34628C10.2818 2.13162 10.2205 1.94762 10.0794 1.79428C9.93838 1.64095 9.76051 1.55508 9.54584 1.53668C9.33118 1.51828 9.14411 1.58268 8.98464 1.72988C8.17504 2.45362 7.25198 2.99948 6.21544 3.36748C5.17891 3.73548 4.11478 3.88882 3.02304 3.82748C2.81451 3.82748 2.63051 3.89802 2.47104 4.03908C2.31158 4.18015 2.22571 4.35495 2.21344 4.56348C2.20118 4.77202 2.26864 4.95602 2.41584 5.11548C2.56304 5.27495 2.74091 5.36082 2.94944 5.37308Z" fill="#20E7F2"/></svg>;
const GovernanceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none" style={{flexShrink:0}}><path d="M11.0281 1.52699C10.8196 1.52699 10.6417 1.60366 10.4945 1.757C10.3473 1.91033 10.2737 2.09126 10.2737 2.2998V5.3726C10.2737 5.58113 10.3473 5.759 10.4945 5.9062C10.6417 6.0534 10.8227 6.127 11.0373 6.127C11.252 6.127 11.4329 6.0534 11.5801 5.9062C11.7273 5.759 11.8009 5.58113 11.8009 5.3726V2.2998C11.8009 2.09126 11.7273 1.91033 11.5801 1.757C11.4329 1.60366 11.2489 1.52699 11.0281 1.52699ZM10.2737 5.3726C10.2737 5.78966 10.4209 6.14846 10.7153 6.449C11.0097 6.74953 11.3716 6.8998 11.8009 6.8998C12.0095 6.8998 12.1904 6.8262 12.3437 6.679C12.4971 6.5318 12.5737 6.35086 12.5737 6.1362C12.5737 5.92153 12.4971 5.7406 12.3437 5.5934C12.1904 5.4462 12.0095 5.3726 11.8009 5.3726C11.8009 5.1518 11.7273 4.9678 11.5801 4.8206C11.4329 4.6734 11.252 4.5998 11.0373 4.5998C10.8227 4.5998 10.6417 4.6734 10.4945 4.8206C10.3473 4.9678 10.2737 5.1518 10.2737 5.3726ZM11.0281 6.127C11.0281 6.3478 11.1048 6.5318 11.2581 6.679C11.4115 6.8262 11.5924 6.8998 11.8009 6.8998H14.8737C15.0823 6.8998 15.2601 6.8262 15.4073 6.679C15.5545 6.5318 15.6281 6.35086 15.6281 6.1362C15.6281 5.92153 15.5545 5.7406 15.4073 5.5934C15.2601 5.4462 15.0823 5.3726 14.8737 5.3726H11.8009C11.5924 5.3726 11.4115 5.4462 11.2581 5.5934C11.1048 5.7406 11.0281 5.91846 11.0281 6.127ZM4.12812 6.8998C4.34893 6.8998 4.53293 6.8262 4.68012 6.679C4.82733 6.5318 4.90093 6.3478 4.90093 6.127V3.827C4.90093 3.61846 4.82733 3.4406 4.68012 3.2934C4.53293 3.1462 4.35199 3.0726 4.13733 3.0726C3.92266 3.0726 3.74173 3.1462 3.59453 3.2934C3.44732 3.4406 3.37373 3.61846 3.37373 3.827V6.127C3.37373 6.3478 3.44732 6.5318 3.59453 6.679C3.74173 6.8262 3.91959 6.8998 4.12812 6.8998ZM5.67373 1.52699C5.25666 1.52699 4.87026 1.63126 4.51453 1.8398C4.15879 2.04833 3.87972 2.3274 3.67733 2.677C3.47493 3.0266 3.37373 3.40993 3.37373 3.827C3.37373 4.0478 3.44732 4.2318 3.59453 4.37899C3.74173 4.5262 3.92266 4.5998 4.13733 4.5998C4.35199 4.5998 4.53293 4.5262 4.68012 4.37899C4.82733 4.2318 4.90093 4.05086 4.90093 3.83619C4.90093 3.62153 4.97452 3.4406 5.12173 3.2934C5.26893 3.1462 5.44986 3.0726 5.66453 3.0726C5.87919 3.0726 6.06012 2.99593 6.20732 2.8426C6.35453 2.68926 6.42812 2.50833 6.42812 2.2998C6.42812 2.09126 6.35453 1.91033 6.20732 1.757C6.06012 1.60366 5.88226 1.52699 5.67373 1.52699ZM4.90093 2.2998C4.90093 2.50833 4.97452 2.68926 5.12173 2.8426C5.26893 2.99593 5.45292 3.0726 5.67373 3.0726H11.0281C11.2489 3.0726 11.4329 2.99593 11.5801 2.8426C11.7273 2.68926 11.8009 2.50833 11.8009 2.2998C11.8009 2.09126 11.7273 1.91033 11.5801 1.757C11.4329 1.60366 11.2489 1.52699 11.0281 1.52699H5.67373C5.45292 1.52699 5.26893 1.60366 5.12173 1.757C4.97452 1.91033 4.90093 2.09126 4.90093 2.2998ZM10.4945 1.7662C10.3473 1.91339 10.2737 2.09126 10.2737 2.2998C10.2737 2.50833 10.3473 2.6862 10.4945 2.8334L14.3217 6.679C14.4689 6.8262 14.6499 6.8998 14.8645 6.8998C15.0792 6.8998 15.2601 6.8262 15.4073 6.679C15.5545 6.5318 15.6281 6.35086 15.6281 6.1362C15.6281 5.92153 15.5545 5.7406 15.4073 5.5934L11.5801 1.7662C11.4329 1.60673 11.252 1.52699 11.0373 1.52699C10.8227 1.52699 10.6417 1.60673 10.4945 1.7662ZM14.8737 5.3726C14.6529 5.3726 14.4689 5.4462 14.3217 5.5934C14.1745 5.7406 14.1009 5.91846 14.1009 6.127V14.5726C14.1009 14.7811 14.1745 14.959 14.3217 15.1062C14.4689 15.2534 14.6499 15.327 14.8645 15.327C15.0792 15.327 15.2601 15.2534 15.4073 15.1062C15.5545 14.959 15.6281 14.7811 15.6281 14.5726V6.127C15.6281 5.91846 15.5545 5.7406 15.4073 5.5934C15.2601 5.4462 15.0823 5.3726 14.8737 5.3726ZM13.3281 16.8726C13.7452 16.8726 14.1316 16.7683 14.4873 16.5598C14.8431 16.3513 15.1221 16.0722 15.3245 15.7226C15.5269 15.373 15.6281 14.9897 15.6281 14.5726C15.6281 14.3518 15.5545 14.1678 15.4073 14.0206C15.2601 13.8734 15.0792 13.7998 14.8645 13.7998C14.6499 13.7998 14.4689 13.8734 14.3217 14.0206C14.1745 14.1678 14.1009 14.3487 14.1009 14.5634C14.1009 14.7781 14.0273 14.959 13.8801 15.1062C13.7329 15.2534 13.552 15.327 13.3373 15.327C13.1227 15.327 12.9417 15.4037 12.7945 15.557C12.6473 15.7103 12.5737 15.8913 12.5737 16.0998C12.5737 16.3083 12.6473 16.4893 12.7945 16.6426C12.9417 16.7959 13.1196 16.8726 13.3281 16.8726ZM14.1009 16.0998C14.1009 15.8913 14.0273 15.7103 13.8801 15.557C13.7329 15.4037 13.5489 15.327 13.3281 15.327H9.50093C9.29239 15.327 9.11146 15.4037 8.95813 15.557C8.80479 15.7103 8.72813 15.8913 8.72813 16.0998C8.72813 16.3083 8.80479 16.4893 8.95813 16.6426C9.11146 16.7959 9.29239 16.8726 9.50093 16.8726H13.3281C13.5489 16.8726 13.7329 16.7959 13.8801 16.6426C14.0273 16.4893 14.1009 16.3083 14.1009 16.0998ZM1.82812 10.727C1.82812 11.2913 1.96612 11.8065 2.24213 12.2726C2.51812 12.7387 2.89226 13.1098 3.36453 13.3858C3.83679 13.6618 4.34893 13.7998 4.90093 13.7998C5.45292 13.7998 5.96506 13.6618 6.43733 13.3858C6.90959 13.1098 7.28373 12.7387 7.55973 12.2726C7.83573 11.8065 7.97373 11.2913 7.97373 10.727C7.97373 10.5185 7.89706 10.3406 7.74373 10.1934C7.59039 10.0462 7.40946 9.97259 7.20093 9.97259C6.99239 9.97259 6.81146 10.0462 6.65812 10.1934C6.50479 10.3406 6.42812 10.5185 6.42812 10.727C6.42812 11.1563 6.28093 11.5213 5.98653 11.8218C5.69213 12.1223 5.33026 12.2726 4.90093 12.2726C4.47159 12.2726 4.10972 12.1223 3.81533 11.8218C3.52093 11.5213 3.37373 11.1563 3.37373 10.727C3.37373 10.5185 3.29706 10.3406 3.14373 10.1934C2.99039 10.0462 2.80946 9.97259 2.60093 9.97259C2.39239 9.97259 2.21146 10.0462 2.05813 10.1934C1.90479 10.3406 1.82812 10.5185 1.82812 10.727ZM7.97373 10.727C7.97373 10.175 7.83573 9.66593 7.55973 9.19979C7.28373 8.73366 6.90959 8.3626 6.43733 8.0866C5.96506 7.8106 5.45292 7.6726 4.90093 7.6726C4.34893 7.6726 3.83679 7.8106 3.36453 8.0866C2.89226 8.3626 2.51812 8.73366 2.24213 9.19979C1.96612 9.66593 1.82812 10.175 1.82812 10.727C1.82812 10.9478 1.90479 11.1318 2.05813 11.279C2.21146 11.4262 2.39239 11.4998 2.60093 11.4998C2.80946 11.4998 2.99039 11.4262 3.14373 11.279C3.29706 11.1318 3.37373 10.9478 3.37373 10.727C3.37373 10.3099 3.52093 9.95113 3.81533 9.6506C4.10972 9.35006 4.47159 9.19979 4.90093 9.19979C5.33026 9.19979 5.69213 9.35006 5.98653 9.6506C6.28093 9.95113 6.42812 10.3099 6.42812 10.727C6.42812 10.9478 6.50479 11.1318 6.65812 11.279C6.81146 11.4262 6.99239 11.4998 7.20093 11.4998C7.40946 11.4998 7.59039 11.4262 7.74373 11.279C7.89706 11.1318 7.97373 10.9478 7.97373 10.727ZM3.96253 12.291C3.76626 12.2419 3.57613 12.2665 3.39213 12.3646C3.20812 12.4627 3.08546 12.6099 3.02412 12.8062L1.86493 16.6518C1.80359 16.8481 1.82506 17.0413 1.92932 17.2314C2.03359 17.4215 2.18692 17.5442 2.38933 17.5994C2.59172 17.6546 2.78493 17.6331 2.96892 17.535C3.15293 17.4369 3.27559 17.2897 3.33693 17.0934L4.47773 13.2478C4.53906 13.0515 4.52066 12.8583 4.42253 12.6682C4.32439 12.4781 4.17106 12.3523 3.96253 12.291ZM1.92013 17.2038C2.00599 17.4001 2.15012 17.5319 2.35252 17.5994C2.55493 17.6669 2.75426 17.6515 2.95053 17.5534L5.25052 16.3942C5.43453 16.3083 5.56026 16.1642 5.62773 15.9618C5.69519 15.7594 5.68292 15.5631 5.59092 15.373C5.49892 15.1829 5.35173 15.0541 5.14933 14.9866C4.94693 14.9191 4.74759 14.9345 4.55133 15.0326L2.25133 16.1734C2.06733 16.2715 1.94159 16.4218 1.87413 16.6242C1.80666 16.8266 1.82199 17.0198 1.92013 17.2038ZM4.22012 15.3822C4.12199 15.5662 4.10666 15.7594 4.17412 15.9618C4.24159 16.1642 4.36733 16.3083 4.55133 16.3942L6.85133 17.5534C7.04759 17.6515 7.24693 17.6669 7.44933 17.5994C7.65173 17.5319 7.79892 17.4031 7.89092 17.213C7.98292 17.0229 7.99519 16.8266 7.92773 16.6242C7.86026 16.4218 7.73453 16.2715 7.55053 16.1734L5.25052 15.0326C5.05426 14.9345 4.85493 14.9191 4.65252 14.9866C4.45012 15.0541 4.30599 15.1859 4.22012 15.3822ZM7.42173 17.6086C7.61799 17.5473 7.76826 17.4215 7.87253 17.2314C7.97679 17.0413 7.99826 16.8481 7.93692 16.6518L6.77773 12.8062C6.71639 12.6099 6.59373 12.4627 6.40973 12.3646C6.22573 12.2665 6.03253 12.245 5.83012 12.3002C5.62773 12.3554 5.47746 12.4781 5.37933 12.6682C5.28119 12.8583 5.26279 13.0515 5.32413 13.2478L6.46493 17.0934C6.52626 17.2897 6.64893 17.4369 6.83293 17.535C7.01693 17.6331 7.21319 17.6577 7.42173 17.6086Z" fill="#20E7F2"/></svg>;
const ComplianceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none" style={{flexShrink:0}}><path d="M1.82812 16.1002C1.82812 16.3088 1.90479 16.4897 2.05813 16.643C2.21146 16.7964 2.39239 16.873 2.60093 16.873H16.4009C16.6095 16.873 16.7904 16.7964 16.9437 16.643C17.0971 16.4897 17.1737 16.3088 17.1737 16.1002C17.1737 15.8917 17.0971 15.7108 16.9437 15.5574C16.7904 15.4041 16.6095 15.3274 16.4009 15.3274H2.60093C2.39239 15.3274 2.21146 15.4041 2.05813 15.5574C1.90479 15.7108 1.82812 15.8917 1.82812 16.1002ZM1.82812 7.67305C1.82812 7.88158 1.90479 8.05945 2.05813 8.20665C2.21146 8.35385 2.39239 8.42745 2.60093 8.42745H16.4009C16.6095 8.42745 16.7904 8.35385 16.9437 8.20665C17.0971 8.05945 17.1737 7.87851 17.1737 7.66385C17.1737 7.44918 17.0971 7.26825 16.9437 7.12105C16.7904 6.97385 16.6095 6.90025 16.4009 6.90025H2.60093C2.39239 6.90025 2.21146 6.97385 2.05813 7.12105C1.90479 7.26825 1.82812 7.45225 1.82812 7.67305ZM3.42893 4.89465C3.51479 5.09091 3.65586 5.22891 3.85212 5.30865C4.04839 5.38838 4.24466 5.38531 4.44093 5.29945L9.79533 2.99945C9.99159 2.91358 10.1296 2.77251 10.2093 2.57625C10.2891 2.37998 10.286 2.18678 10.2001 1.99665C10.1143 1.80651 9.97319 1.67158 9.77693 1.59185C9.58066 1.51211 9.39053 1.51518 9.20653 1.60105L3.83372 3.90105C3.63746 3.98691 3.49946 4.12798 3.41973 4.32425C3.33999 4.52051 3.34306 4.71065 3.42893 4.89465ZM8.80173 2.00585C8.71586 2.18985 8.71279 2.37998 8.79253 2.57625C8.87226 2.77251 9.01026 2.91358 9.20653 2.99945L14.5609 5.29945C14.7572 5.38531 14.9535 5.38838 15.1497 5.30865C15.346 5.22891 15.4871 5.09398 15.5729 4.90385C15.6588 4.71371 15.6619 4.52051 15.5821 4.32425C15.5024 4.12798 15.3644 3.98691 15.1681 3.90105L9.79533 1.60105C9.61133 1.51518 9.42119 1.51211 9.22493 1.59185C9.02866 1.67158 8.88759 1.80958 8.80173 2.00585ZM3.37373 6.90025C3.15293 6.90025 2.96892 6.97385 2.82173 7.12105C2.67453 7.26825 2.60093 7.45225 2.60093 7.67305V16.1002C2.60093 16.3088 2.67453 16.4897 2.82173 16.643C2.96892 16.7964 3.14986 16.873 3.36453 16.873C3.57919 16.873 3.76013 16.7964 3.90733 16.643C4.05453 16.4897 4.12812 16.3088 4.12812 16.1002V7.67305C4.12812 7.45225 4.05453 7.26825 3.90733 7.12105C3.76013 6.97385 3.58226 6.90025 3.37373 6.90025ZM15.6281 6.90025C15.4196 6.90025 15.2417 6.97385 15.0945 7.12105C14.9473 7.26825 14.8737 7.45225 14.8737 7.67305V16.1002C14.8737 16.3088 14.9473 16.4897 15.0945 16.643C15.2417 16.7964 15.4227 16.873 15.6373 16.873C15.852 16.873 16.0329 16.7964 16.1801 16.643C16.3273 16.4897 16.4009 16.3088 16.4009 16.1002V7.67305C16.4009 7.45225 16.3273 7.26825 16.1801 7.12105C16.0329 6.97385 15.8489 6.90025 15.6281 6.90025ZM6.42812 9.97305C6.21959 9.97305 6.04173 10.0466 5.89453 10.1938C5.74733 10.341 5.67373 10.5189 5.67373 10.7274V13.0274C5.67373 13.2482 5.74733 13.4322 5.89453 13.5794C6.04173 13.7266 6.22266 13.8002 6.43733 13.8002C6.65199 13.8002 6.83293 13.7266 6.98012 13.5794C7.12733 13.4322 7.20093 13.2482 7.20093 13.0274V10.7274C7.20093 10.5189 7.12733 10.341 6.98012 10.1938C6.83293 10.0466 6.64893 9.97305 6.42812 9.97305ZM9.50093 9.97305C9.29239 9.97305 9.11146 10.0466 8.95813 10.1938C8.80479 10.341 8.72813 10.5189 8.72813 10.7274V13.0274C8.72813 13.2482 8.80479 13.4322 8.95813 13.5794C9.11146 13.7266 9.29239 13.8002 9.50093 13.8002C9.70946 13.8002 9.89039 13.7266 10.0437 13.5794C10.1971 13.4322 10.2737 13.2482 10.2737 13.0274V10.7274C10.2737 10.5189 10.1971 10.341 10.0437 10.1938C9.89039 10.0466 9.70946 9.97305 9.50093 9.97305ZM12.5737 9.97305C12.3529 9.97305 12.1689 10.0466 12.0217 10.1938C11.8745 10.341 11.8009 10.5189 11.8009 10.7274V13.0274C11.8009 13.2482 11.8745 13.4322 12.0217 13.5794C12.1689 13.7266 12.3499 13.8002 12.5645 13.8002C12.7792 13.8002 12.9601 13.7266 13.1073 13.5794C13.2545 13.4322 13.3281 13.2482 13.3281 13.0274V10.7274C13.3281 10.5189 13.2545 10.341 13.1073 10.1938C12.9601 10.0466 12.7823 9.97305 12.5737 9.97305Z" fill="#20E7F2"/></svg>;
const ResponsibleAIIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none" style={{flexShrink:0}}><path d="M6.4274 2.30025C6.01034 2.30025 5.627 2.40451 5.2774 2.61305C4.9278 2.82158 4.64874 3.10065 4.4402 3.45025C4.23167 3.79985 4.1274 4.18318 4.1274 4.60025C4.1274 4.80878 4.20407 4.98971 4.3574 5.14305C4.51074 5.29638 4.69167 5.37305 4.9002 5.37305C5.10874 5.37305 5.28967 5.29638 5.443 5.14305C5.59634 4.98971 5.673 4.80878 5.673 4.60025C5.673 4.39171 5.7466 4.21078 5.8938 4.05745C6.041 3.90411 6.22194 3.82745 6.4366 3.82745C6.65127 3.82745 6.8322 3.75385 6.9794 3.60665C7.1266 3.45945 7.2002 3.27851 7.2002 3.06385C7.2002 2.84918 7.1266 2.66825 6.9794 2.52105C6.8322 2.37385 6.6482 2.30025 6.4274 2.30025ZM5.673 3.07305C5.673 3.28158 5.7466 3.45945 5.8938 3.60665C6.041 3.75385 6.21887 3.82745 6.4274 3.82745H12.573C12.7815 3.82745 12.9594 3.75385 13.1066 3.60665C13.2538 3.45945 13.3274 3.27851 13.3274 3.06385C13.3274 2.84918 13.2538 2.66825 13.1066 2.52105C12.9594 2.37385 12.7815 2.30025 12.573 2.30025H6.4274C6.21887 2.30025 6.041 2.37385 5.8938 2.52105C5.7466 2.66825 5.673 2.85225 5.673 3.07305ZM14.873 4.60025C14.873 4.18318 14.7687 3.79985 14.5602 3.45025C14.3517 3.10065 14.0726 2.82158 13.723 2.61305C13.3734 2.40451 12.9901 2.30025 12.573 2.30025C12.3522 2.30025 12.1682 2.37385 12.021 2.52105C11.8738 2.66825 11.8002 2.84918 11.8002 3.06385C11.8002 3.27851 11.8738 3.45945 12.021 3.60665C12.1682 3.75385 12.3491 3.82745 12.5638 3.82745C12.7785 3.82745 12.9594 3.90411 13.1066 4.05745C13.2538 4.21078 13.3274 4.39171 13.3274 4.60025C13.3274 4.80878 13.4041 4.98971 13.5574 5.14305C13.7107 5.29638 13.8917 5.37305 14.1002 5.37305C14.3087 5.37305 14.4897 5.29638 14.643 5.14305C14.7963 4.98971 14.873 4.80878 14.873 4.60025ZM14.1002 3.82745C13.8917 3.82745 13.7107 3.90411 13.5574 4.05745C13.4041 4.21078 13.3274 4.39171 13.3274 4.60025V7.67305C13.3274 7.88158 13.4041 8.05945 13.5574 8.20665C13.7107 8.35385 13.8917 8.42745 14.1002 8.42745C14.3087 8.42745 14.4897 8.35385 14.643 8.20665C14.7963 8.05945 14.873 7.88158 14.873 7.67305V4.60025C14.873 4.39171 14.7963 4.21078 14.643 4.05745C14.4897 3.90411 14.3087 3.82745 14.1002 3.82745ZM12.573 9.97305C12.9901 9.97305 13.3734 9.86878 13.723 9.66025C14.0726 9.45171 14.3517 9.17265 14.5602 8.82305C14.7687 8.47345 14.873 8.09011 14.873 7.67305C14.873 7.45225 14.7963 7.26825 14.643 7.12105C14.4897 6.97385 14.3087 6.90025 14.1002 6.90025C13.8917 6.90025 13.7107 6.97385 13.5574 7.12105C13.4041 7.26825 13.3274 7.44918 13.3274 7.66385C13.3274 7.87851 13.2538 8.05945 13.1066 8.20665C12.9594 8.35385 12.7785 8.42745 12.5638 8.42745C12.3491 8.42745 12.1682 8.50411 12.021 8.65745C11.8738 8.81078 11.8002 8.99171 11.8002 9.20025C11.8002 9.40878 11.8738 9.58971 12.021 9.74305C12.1682 9.89638 12.3522 9.97305 12.573 9.97305ZM13.3274 9.20025C13.3274 8.99171 13.2538 8.81078 13.1066 8.65745C12.9594 8.50411 12.7815 8.42745 12.573 8.42745H6.4274C6.21887 8.42745 6.041 8.50411 5.8938 8.65745C5.7466 8.81078 5.673 8.99171 5.673 9.20025C5.673 9.40878 5.7466 9.58971 5.8938 9.74305C6.041 9.89638 6.21887 9.97305 6.4274 9.97305H12.573C12.7815 9.97305 12.9594 9.89638 13.1066 9.74305C13.2538 9.58971 13.3274 9.40878 13.3274 9.20025ZM4.1274 7.67305C4.1274 8.09011 4.23167 8.47345 4.4402 8.82305C4.64874 9.17265 4.9278 9.45171 5.2774 9.66025C5.627 9.86878 6.01034 9.97305 6.4274 9.97305C6.6482 9.97305 6.8322 9.89638 6.9794 9.74305C7.1266 9.58971 7.2002 9.40878 7.2002 9.20025C7.2002 8.99171 7.1266 8.81078 6.9794 8.65745C6.8322 8.50411 6.65127 8.42745 6.4366 8.42745C6.22194 8.42745 6.041 8.35385 5.8938 8.20665C5.7466 8.05945 5.673 7.87851 5.673 7.66385C5.673 7.44918 5.59634 7.26825 5.443 7.12105C5.28967 6.97385 5.10874 6.90025 4.9002 6.90025C4.69167 6.90025 4.51074 6.97385 4.3574 7.12105C4.20407 7.26825 4.1274 7.45225 4.1274 7.67305ZM4.9002 8.42745C5.10874 8.42745 5.28967 8.35385 5.443 8.20665C5.59634 8.05945 5.673 7.88158 5.673 7.67305V4.60025C5.673 4.39171 5.59634 4.21078 5.443 4.05745C5.28967 3.90411 5.10874 3.82745 4.9002 3.82745C4.69167 3.82745 4.51074 3.90411 4.3574 4.05745C4.20407 4.21078 4.1274 4.39171 4.1274 4.60025V7.67305C4.1274 7.88158 4.20407 8.05945 4.3574 8.20665C4.51074 8.35385 4.69167 8.42745 4.9002 8.42745ZM9.50021 0.773046C9.29167 0.773046 9.11074 0.846647 8.95741 0.993847C8.80407 1.14105 8.72741 1.31891 8.72741 1.52745V3.07305C8.72741 3.28158 8.80407 3.45945 8.95741 3.60665C9.11074 3.75385 9.29167 3.82745 9.50021 3.82745C9.70874 3.82745 9.88967 3.75385 10.043 3.60665C10.1963 3.45945 10.273 3.28158 10.273 3.07305V1.52745C10.273 1.31891 10.1963 1.14105 10.043 0.993847C9.88967 0.846647 9.70874 0.773046 9.50021 0.773046ZM7.2002 8.42745C6.99167 8.42745 6.81074 8.50411 6.6574 8.65745C6.50407 8.81078 6.4274 8.99171 6.4274 9.20025V16.1002C6.4274 16.3088 6.50407 16.4897 6.6574 16.643C6.81074 16.7964 6.99167 16.873 7.2002 16.873C7.40874 16.873 7.58967 16.7964 7.743 16.643C7.89634 16.4897 7.973 16.3088 7.973 16.1002V9.20025C7.973 8.99171 7.89634 8.81078 7.743 8.65745C7.58967 8.50411 7.40874 8.42745 7.2002 8.42745ZM11.8002 8.42745C11.5917 8.42745 11.4107 8.50411 11.2574 8.65745C11.1041 8.81078 11.0274 8.99171 11.0274 9.20025V16.1002C11.0274 16.3088 11.1041 16.4897 11.2574 16.643C11.4107 16.7964 11.5917 16.873 11.8002 16.873C12.0087 16.873 12.1897 16.7964 12.343 16.643C12.4963 16.4897 12.573 16.3088 12.573 16.1002V9.20025C12.573 8.99171 12.4963 8.81078 12.343 8.65745C12.1897 8.50411 12.0087 8.42745 11.8002 8.42745ZM3.4466 12.6042C3.54474 12.8005 3.695 12.9324 3.8974 12.9998C4.0998 13.0673 4.293 13.052 4.477 12.9538L7.5498 11.4266C7.7338 11.3285 7.85954 11.1782 7.927 10.9758C7.99447 10.7734 7.9822 10.5772 7.8902 10.387C7.7982 10.1969 7.651 10.0681 7.4486 10.0006C7.2462 9.93318 7.04687 9.94851 6.8506 10.0466L3.7962 11.5738C3.59994 11.672 3.46807 11.8222 3.4006 12.0246C3.33314 12.227 3.34847 12.4202 3.4466 12.6042ZM11.1194 10.3962C11.0213 10.5802 11.0059 10.7734 11.0734 10.9758C11.1409 11.1782 11.2666 11.3285 11.4506 11.4266L14.5234 12.9538C14.7074 13.052 14.9006 13.0673 15.103 12.9998C15.3054 12.9324 15.4557 12.8036 15.5538 12.6134C15.6519 12.4233 15.6673 12.227 15.5998 12.0246C15.5323 11.8222 15.4005 11.672 15.2042 11.5738L12.1498 10.0466C11.9535 9.94851 11.7542 9.93318 11.5518 10.0006C11.3494 10.0681 11.2053 10.2 11.1194 10.3962ZM6.4274 13.8002C6.4274 14.0088 6.50407 14.1897 6.6574 14.343C6.81074 14.4964 6.99167 14.573 7.2002 14.573H11.8002C12.0087 14.573 12.1897 14.4964 12.343 14.343C12.4963 14.1897 12.573 14.0088 12.573 13.8002C12.573 13.5917 12.4963 13.4108 12.343 13.2574C12.1897 13.1041 12.0087 13.0274 11.8002 13.0274H7.2002C6.99167 13.0274 6.81074 13.1041 6.6574 13.2574C6.50407 13.4108 6.4274 13.5917 6.4274 13.8002ZM7.973 5.37305C7.7522 5.37305 7.5682 5.44665 7.421 5.59385C7.2738 5.74105 7.2002 5.91891 7.2002 6.12745V6.14585C7.2002 6.35438 7.2738 6.53225 7.421 6.67945C7.5682 6.82665 7.74914 6.90025 7.9638 6.90025C8.17847 6.90025 8.35941 6.82665 8.50661 6.67945C8.6538 6.53225 8.72741 6.35438 8.72741 6.14585V6.12745C8.72741 5.91891 8.6538 5.74105 8.50661 5.59385C8.35941 5.44665 8.18154 5.37305 7.973 5.37305ZM11.0274 5.37305C10.8189 5.37305 10.641 5.44665 10.4938 5.59385C10.3466 5.74105 10.273 5.91891 10.273 6.12745V6.14585C10.273 6.35438 10.3466 6.53225 10.4938 6.67945C10.641 6.82665 10.8219 6.90025 11.0366 6.90025C11.2513 6.90025 11.4322 6.82665 11.5794 6.67945C11.7266 6.53225 11.8002 6.35438 11.8002 6.14585V6.12745C11.8002 5.91891 11.7266 5.74105 11.5794 5.59385C11.4322 5.44665 11.2482 5.37305 11.0274 5.37305Z" fill="#20E7F2"/></svg>;

const TRUST_PILLARS = [
  {
    title: "Security", icon: <SecurityIcon />,
    items: ["SSO / SAML / SCIM", "MFA + IP allowlisting", "Encryption in transit + at rest", "Audit log streaming", "Security admin separation"],
  },
  {
    title: "Privacy", icon: <PrivacyIcon />,
    items: ["GDPR-aligned controls", "Data residency options", "DSR workflows", "Retention schedules", "Sub-processor transparency"],
  },
  {
    title: "Governance", icon: <GovernanceIcon />,
    items: ["Policy-as-code", "Approval workflows", "Separation of duties", "Override + exception log", "Immutable audit trail"],
  },
  {
    title: "Compliance", icon: <ComplianceIcon />,
    items: ["Financial promotions", "Pharmaceutical review", "Advertising standards", "Sector packs (Command)", "Regulated content controls"],
  },
  {
    title: "Responsible AI", icon: <ResponsibleAIIcon />,
    items: ["Human-in-the-loop defaults", "Source grounding enforced", "Autonomy tier controls", "Error review workflows", "EU AI Act-aware design"],
  },
];

function EnterpriseTrust() {
  return (
    <section className="bg-[#0C1523] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> ENTERPRISE TRUST
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Built for procurement,<br />not just demos.</h2>
          <p className="text-white/50 max-w-md mx-auto">Trust evidence pre-staged — five pillars, each naming its control and artifact.</p>
        </div>
        <div className="grid grid-cols-5 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/8">
          {TRUST_PILLARS.map((p) => (
            <div key={p.title} className="bg-[#0C1523] p-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-900/20 border border-cyan-500/20 flex items-center justify-center mb-4">
                {p.icon}
              </div>
              <h3 className="text-white font-bold mb-3">{p.title}</h3>
              <ul className="space-y-2">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-white/50">
                    <span className="text-cyan-400 mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
const FAQS = [
  { q: "Are ZoikoVertex agents fully autonomous?", a: "No. Every agent operates within defined autonomy tiers. High-impact actions — publishing, budget commits, sensitive responses — require human approval before execution." },
  { q: "How do we control brand voice across multiple brands and regions?", a: "Brand Library policies are versioned and scoped per brand and region. Every agent checks against the relevant policy set before generating or routing content." },
  { q: "What is available for security and procurement review?", a: "Full security architecture summary, SOC 2 Type II report, GDPR data processing addendum, and role attestation reports are available on request." },
  { q: "Can an agent publish without approval?", a: "No. Publishing Agent verifies a complete, signed approval chain — including policy version, embargo status, and publishing window — before any release." },
  { q: "Is ZoikoVertex suitable for regulated industries?", a: "Yes. Sector packs for financial promotions, pharmaceutical review, and advertising standards are available on Scale and Command plans." },
  { q: "Which plan includes all five agents?", a: "All five agents are available from Pro tier. Scale includes all five in advanced multi-brand mode. Command adds custom models and board-grade evidence packs." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const left = FAQS.filter((_, i) => i % 2 === 0);
  const right = FAQS.filter((_, i) => i % 2 !== 0);

  return (
    <section className="bg-[#080F1B] py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-cyan-400" /> FAQ
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">The questions before<br />the demo.</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Enterprise buyers ask about autonomy, approvals, brand control, regulated suitability, and security before committing to a deep demo.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-x-8">
          {[left, right].map((col, ci) => (
            <div key={ci} className="space-y-0">
              {col.map((faq) => {
                const idx = FAQS.indexOf(faq);
                return (
                  <div key={idx} className="border-t border-white/8">
                    <button
                      className="w-full text-left py-5 flex items-start justify-between gap-4"
                      onClick={() => setOpen(open === idx ? null : idx)}
                    >
                      <span className="text-white font-semibold text-sm">{faq.q}</span>
                      <span className="text-white/40 text-lg shrink-0">{open === idx ? "×" : "∨"}</span>
                    </button>
                    {open === idx && (
                      <p className="text-white/50 text-sm pb-5 leading-relaxed">{faq.a}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ── */
/* ── Page ── */
export default function AIAgentsPage() {
  return (
    <main className="min-h-screen bg-[#0C1523]">
      <div>
        <Hero />
        <Ticker />
        <Distinction />
        <FiveAgents />
        <OperatingModel />
        <Governance />
        <PlanAccess />
        <RoleAware />
        <UseCases />
        <LeaderPersonas />
        <EnterpriseTrust />
        <FAQ />
      </div>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/footer/Footer";
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
    <div className="border-y border-white/10 bg-[#0a0f1e] py-3 overflow-hidden">
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
    <section className="bg-[#080812] pt-32 pb-20 px-6">
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

        {/* Orbit diagram */}
        <div className="relative flex items-center justify-center h-[480px]">
          {/* Outer ring */}
          <div className="absolute w-[360px] h-[360px] rounded-full border border-white/5" />
          <div className="absolute w-[240px] h-[240px] rounded-full border border-white/8" />

          {/* Center */}
          <div className="absolute w-20 h-20 rounded-full bg-[#0d1a2e] border border-cyan-400/30 flex flex-col items-center justify-center z-10">
            <Shield className="w-6 h-6 text-cyan-400 mb-0.5" />
            <span className="text-[9px] text-white/50 font-bold tracking-wider">GOVERNANCE</span>
            <span className="text-[10px] text-white font-bold">Core</span>
          </div>

          {/* Top — Strategy */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl bg-[#0d1a2e] border border-white/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-[10px] font-bold text-white/60 tracking-wider">STRATEGY</span>
            <span className="text-[9px] text-white/30">Campaign Direction</span>
            <div className="mt-1 bg-[#0d1a2e] border border-white/15 rounded px-2 py-0.5 text-[9px] text-white/70 font-mono">
              19 DEFAULT ROLES
            </div>
          </div>

          {/* Right — Content */}
          <div className="absolute right-0 top-1/4 flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl bg-[#0d1a2e] border border-white/10 flex items-center justify-center">
              <Pencil className="w-6 h-6 text-white/60" />
            </div>
            <span className="text-[10px] font-bold text-white/60 tracking-wider">CONTENT</span>
            <span className="text-[9px] text-white/30">Brand-grounded Drafts</span>
          </div>

          {/* Bottom-right — Publishing */}
          <div className="absolute right-4 bottom-1/4 flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl bg-[#1a2e1a] border border-green-500/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-green-400" />
            </div>
            <div className="bg-green-900/40 border border-green-500/30 rounded px-2 py-0.5 text-[9px] text-green-400 font-mono">
              ✓ 100% APPROVAL-GATED
            </div>
          </div>

          {/* Bottom — Engagement */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl bg-[#2a1e0a] border border-amber-500/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-[10px] font-bold text-white/60 tracking-wider">ENGAGEMENT</span>
            <span className="text-[9px] text-white/30">Route &amp; Escalate</span>
            <div className="bg-[#0d1a2e] border border-white/15 rounded px-2 py-0.5 text-[9px] text-white/70 font-mono flex items-center gap-1">
              <span>🤖</span> 5 AI AGENTS
            </div>
          </div>

          {/* Left — Revenue */}
          <div className="absolute left-0 top-1/3 flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-2xl bg-[#0d1a2e] border border-white/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white/60" />
            </div>
            <span className="text-[10px] font-bold text-white/60 tracking-wider">REVENUE</span>
            <span className="text-[9px] text-white/30">Attribution &amp; ROI</span>
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
    <section className="bg-[#080812] py-24 px-6">
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
    icon: <Brain className="w-6 h-6 text-cyan-400" />,
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
    icon: <Pencil className="w-6 h-6 text-white/70" />,
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
    icon: <MessageCircle className="w-6 h-6 text-amber-400" />,
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
    icon: <TrendingUp className="w-6 h-6 text-white/60" />,
    iconBg: "bg-white/5 border-white/10",
  },
];

const PLAN_COLORS: Record<string, string> = {
  Audit: "border-white/20 text-white/50",
  Pro: "border-white/20 text-white/50",
  Scale: "border-cyan-400/40 text-cyan-400",
  Command: "border-white/20 text-white/50",
};

function FiveAgents() {
  return (
    <section className="bg-[#06060f] py-24 px-6">
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
  { num: "01", title: "Connect", role: "Knowledge Mgr", tag: "Assets · Libraries", icon: <Database className="w-5 h-5 text-cyan-400" /> },
  { num: "02", title: "Apply Standards", role: "Brand Steward", tag: "Voice · Claims", icon: <BookOpen className="w-5 h-5 text-cyan-400" /> },
  { num: "03", title: "Set Policies", role: "Gov. Admin", tag: "Roles · Autonomy", icon: <Settings className="w-5 h-5 text-cyan-400" /> },
  { num: "04", title: "Generate", role: "Agent Operator", tag: "Drafts · Plans", icon: <Zap className="w-5 h-5 text-cyan-400" /> },
  { num: "05", title: "Route for Review", role: "Reviewer · Validator", tag: "Queue · Approval", icon: <Eye className="w-5 h-5 text-cyan-400" /> },
  { num: "06", title: "Execute", role: "Publisher", tag: "Signed · Current", icon: <Send className="w-5 h-5 text-cyan-400" /> },
  { num: "07", title: "Evidence", role: "Analyst · Auditor", tag: "Evidence Vault", icon: <FileText className="w-5 h-5 text-cyan-400" /> },
];

function OperatingModel() {
  return (
    <section className="bg-[#080812] py-24 px-6">
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
        <div className="border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 mb-6 bg-[#0a0f1e]">
          <span className="text-xs font-bold tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-lg px-3 py-1.5">AI ORCHESTRATION</span>
          {["Strategy Agent", "Content Agent", "Publishing Agent", "Engagement Agent", "Revenue Attribution Agent"].map((a) => (
            <span key={a} className="text-xs text-white/40 border border-white/10 rounded-lg px-3 py-1.5">{a}</span>
          ))}
        </div>

        {/* Stages */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {STAGES.map((s) => (
            <div key={s.num} className="bg-[#0a0f1e] border border-white/8 rounded-xl p-3 flex flex-col items-center text-center">
              <span className="text-white/20 text-xs font-mono mb-2">{s.num}</span>
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                {s.icon}
              </div>
              <p className="text-white font-bold text-xs mb-1">{s.title}</p>
              <p className="text-white/30 text-[10px] mb-2">{s.role}</p>
              <span className="text-[10px] border border-white/10 rounded-full px-2 py-0.5 text-white/40">{s.tag}</span>
            </div>
          ))}
        </div>

        {/* Governance bar */}
        <div className="border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 bg-[#0a0f1e]">
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
    <section className="bg-[#06060f] py-24 px-6">
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
            <div key={c.title} className="bg-[#0a0f1e] border border-white/8 rounded-2xl p-6">
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

function Cell({ val, highlight }: { val: CellValue; highlight?: boolean }) {
  if (val === "") return <td className="px-4 py-2" />;
  if (val === false) return <td className="px-4 py-3 text-center text-white/20">✕</td>;
  const isCheck = val === "✓";
  return (
    <td className={`px-4 py-3 text-center text-sm ${highlight ? (isCheck ? "text-green-400 font-bold" : "text-cyan-400 font-semibold") : "text-white/50"}`}>
      {val as string}
    </td>
  );
}

function PlanAccess() {
  return (
    <section className="bg-[#080812] py-24 px-6">
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
                  <th key={p} className={`px-4 py-4 text-center text-xs font-bold tracking-widest ${i === 2 ? "text-cyan-400 border-b-2 border-cyan-400" : "text-white/30"}`}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row, i) =>
                row.section ? (
                  <tr key={i} className="bg-[#0a0f1e]">
                    <td colSpan={5} className="px-4 py-2 text-xs font-bold text-cyan-400 tracking-widest">{row.label}</td>
                  </tr>
                ) : (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 text-sm text-white/70">{row.label}</td>
                    <Cell val={row.audit} />
                    <Cell val={row.pro} />
                    <Cell val={row.scale} highlight />
                    <Cell val={row.command} />
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/8 bg-[#0a0f1e]">
                <td className="px-4 py-4 text-xs text-white/30">Scale includes all five agents in advanced multi-brand mode.</td>
                {[
                  { label: "Request Audit", style: "border border-white/20 text-white/60" },
                  { label: "Start Pro Trial", style: "border border-white/20 text-white/60" },
                  { label: "Book Scale Call", style: "bg-cyan-400 text-black font-bold" },
                  { label: "Command Brief", style: "border border-white/20 text-white/60" },
                ].map((b) => (
                  <td key={b.label} className="px-4 py-4 text-center">
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
    <section className="bg-[#06060f] py-24 px-6">
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
    <section className="bg-[#080812] py-24 px-6">
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
              <div className="border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white/30">
                <span className="text-white/20 mr-2">Target:</span>{u.target}
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
    <section className="bg-[#06060f] py-24 px-6">
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
const TRUST_PILLARS = [
  {
    title: "Security", icon: <Lock className="w-5 h-5 text-cyan-400" />,
    items: ["SSO / SAML / SCIM", "MFA + IP allowlisting", "Encryption in transit + at rest", "Audit log streaming", "Security admin separation"],
  },
  {
    title: "Privacy", icon: <Shield className="w-5 h-5 text-cyan-400" />,
    items: ["GDPR-aligned controls", "Data residency options", "DSR workflows", "Retention schedules", "Sub-processor transparency"],
  },
  {
    title: "Governance", icon: <FileText className="w-5 h-5 text-cyan-400" />,
    items: ["Policy-as-code", "Approval workflows", "Separation of duties", "Override + exception log", "Immutable audit trail"],
  },
  {
    title: "Compliance", icon: <CheckSquare className="w-5 h-5 text-cyan-400" />,
    items: ["Financial promotions", "Pharmaceutical review", "Advertising standards", "Sector packs (Command)", "Regulated content controls"],
  },
  {
    title: "Responsible AI", icon: <Brain className="w-5 h-5 text-cyan-400" />,
    items: ["Human-in-the-loop defaults", "Source grounding enforced", "Autonomy tier controls", "Error review workflows", "EU AI Act-aware design"],
  },
];

function EnterpriseTrust() {
  return (
    <section className="bg-[#080812] py-24 px-6">
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
            <div key={p.title} className="bg-[#080812] p-6">
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
    <section className="bg-[#06060f] py-24 px-6">
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
function CTA() {
  return (
    <section className="py-24 px-6" style={{ background: "linear-gradient(160deg,#0d1a35 0%,#080d1a 100%)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-cyan-400" /> READY TO DEPLOY
        </p>
        <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6">
          Five agents.<br />One governed layer.<br />Measurable outcomes.
        </h2>
        <p className="text-white/50 text-sm max-w-xl mx-auto mb-10">
          Deploy in 72 hours. No code required. Every agent action logged, governed, and audit-ready from day one.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="https://getzoikovertex.com/request-demo" className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-8 py-3.5 rounded-xl transition-all text-sm">
            Request a Demo →
          </Link>
          <Link href="https://getzoikovertex.com/signup" className="border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:bg-white/5 text-sm">
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Page ── */
export default function AIAgentsPage() {
  return (
    <main className="min-h-screen bg-[#080812]">
      <div className="pt-16">
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
        <CTA />
      </div>
      <Footer />
    </main>
  );
}

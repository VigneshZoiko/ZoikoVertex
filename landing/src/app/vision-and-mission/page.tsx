"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Sparkles,
  Brain,
  FileText,
  BarChart2,
  Building2,
  TrendingUp,
  ShieldAlert,
  GitBranch,
  AlertCircle,
  FileX,
  Unlink,
  ChevronDown,
  ArrowRight,
  Lock,
  UserCheck,
  BookOpen,
  Shield,
} from "lucide-react";

/* ─── Colors ──────────────────────────────────────────────────────────────── */
const TEAL = "#20E7F2";
const AMBER = "#C8A84C";
const PAGE_BG = "#080F1B";
const VISION_CARD_BG = "#0e1a10";
const MISSION_CARD_BG = "#071620";

/* ─── Data ────────────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  { icon: <Zap size={12} />, label: "SPEED WITH CONTROL" },
  { icon: <Sparkles size={12} />, label: "CREATIVITY WITH GOVERNANCE" },
  { icon: <Brain size={12} />, label: "AI WITH HUMAN OVERSIGHT" },
  { icon: <FileText size={12} />, label: "EVIDENCE WITH EVERY CRITICAL ACTION" },
];

const DOCTRINE_BULLETS = [
  { icon: <Zap size={13} />, label: "Speed with control" },
  { icon: <Sparkles size={13} />, label: "Creativity with governance" },
  { icon: <Brain size={13} />, label: "AI with human oversight" },
  { icon: <FileText size={13} />, label: "Evidence with every action" },
  { icon: <BarChart2 size={13} />, label: "Performance with context" },
  { icon: <Building2 size={13} />, label: "Enterprise accountability" },
];

const PROBLEMS = [
  {
    icon: <TrendingUp size={16} />,
    title: "Content volume is rising",
    body: "More channels, more formats, more markets — without proportionally more oversight.",
  },
  {
    icon: <ShieldAlert size={16} />,
    title: "AI output needs review",
    body: "AI-generated content can be off-brand, legally sensitive, or factually wrong without human checks.",
  },
  {
    icon: <GitBranch size={16} />,
    title: "Approval chains are fragmented",
    body: "Reviews happen across email, Slack, meetings, and docs — with no auditable record.",
  },
  {
    icon: <AlertCircle size={16} />,
    title: "Brand risk is increasing",
    body: "Inconsistent tone, unauthorized claims, outdated messaging — brand incidents are costly.",
  },
  {
    icon: <FileX size={16} />,
    title: "Evidence is often missing",
    body: "When something goes wrong, teams cannot reconstruct what was approved, by whom, or when.",
  },
  {
    icon: <Unlink size={16} />,
    title: "Performance is disconnected",
    body: "Results cannot be linked back to specific decisions, approvals, or governance actions.",
  },
];

const VISION_PILLARS = [
  {
    num: "01",
    icon: <Zap size={18} />,
    title: "Speed With Control",
    body: "Enable faster marketing execution while preserving review, authorization, and workflow visibility at every step.",
  },
  {
    num: "02",
    icon: <Sparkles size={18} />,
    title: "Creativity With Governance",
    body: "Support creative output at scale while protecting brand standards, organizational quality, and accountability.",
  },
  {
    num: "03",
    icon: <Brain size={18} />,
    title: "AI With Human Oversight",
    body: "Use AI to assist work — not to remove judgment, responsibility, or approval authority from the people who need to own the outcome.",
  },
  {
    num: "04",
    icon: <FileText size={18} />,
    title: "Evidence With Every Critical Action",
    body: "Make meaningful decisions, approvals, and workflow events easier to review, understand, and trust — by design, not as an afterthought.",
  },
  {
    num: "05",
    icon: <BarChart2 size={18} />,
    title: "Performance With Context",
    body: "Connect outcomes to the workflow, approvals, campaigns, and content decisions that produced them — so teams can learn and improve.",
  },
  {
    num: "06",
    icon: <Building2 size={18} />,
    title: "Enterprise Accountability",
    body: "Help teams explain what happened, who decided, and why the work moved forward — for legal, compliance, executive, and brand review.",
  },
];

const MISSION_LIST = [
  {
    icon: <Lock size={15} />,
    title: "Make governance usable",
    body: "Governance should feel like a natural part of the workflow — not a bureaucratic obstacle bolted on after the fact.",
  },
  {
    icon: <Brain size={15} />,
    title: "Make AI accountable",
    body: "AI-assisted actions should be traceable, policy-aware, and subject to human review for sensitive decisions.",
  },
  {
    icon: <Shield size={15} />,
    title: "Make brand control practical",
    body: "Brand standards should be enforced through systems, not just style guides that people forget to read.",
  },
  {
    icon: <FileText size={15} />,
    title: "Make evidence automatic",
    body: "Audit trails, approval records, and evidence should be created naturally as work happens — not reconstructed after.",
  },
  {
    icon: <Building2 size={15} />,
    title: "Make enterprise adoption easier",
    body: "Security, privacy, procurement, legal, and compliance review should be supported by the platform from day one.",
  },
];

const QA_CARDS = [
  {
    num: "01",
    q: "Who created this campaign?",
    a: "Which team, which individual, which workspace?",
  },
  {
    num: "02",
    q: "What AI assistance was used?",
    a: "Which suggestions were accepted, modified, or discarded?",
  },
  {
    num: "03",
    q: "Who reviewed it?",
    a: "What feedback was given, what changes were requested?",
  },
  {
    num: "04",
    q: "Was compliance review required?",
    a: "Was it completed, and by whom?",
  },
  {
    num: "05",
    q: "Who approved publication?",
    a: "With what authority, under which policy version?",
  },
  {
    num: "06",
    q: "What evidence exists?",
    a: "Can it be exported, reviewed, and trusted by legal?",
  },
  {
    num: "07",
    q: "What changed after approval?",
    a: "Was any modification made post sign-off?",
  },
  {
    num: "08",
    q: "What should the team learn?",
    a: "How does performance connect back to decisions and governance?",
  },
];

const FUTURE_CARDS = [
  {
    title: "Governed AI Agents",
    body: "AI agents that operate with defined boundaries, human oversight gates, and full audit visibility — so organizations can scale AI assistance without losing accountability.",
  },
  {
    title: "Campaign Intelligence",
    body: "Performance intelligence that connects campaign outcomes back to the governance decisions, approvals, and content choices that produced them.",
  },
  {
    title: "Evidence-Led Operations",
    body: "A comprehensive evidence layer that turns audit records into operational learning — helping teams improve governance, brand standards, and execution discipline over time.",
  },
  {
    title: "Enterprise Integrations",
    body: "Deep integrations with CRM, analytics, identity management, DAM, legal tools, and enterprise infrastructure — governed by the same approval and evidence systems.",
  },
  {
    title: "Industry-Specific Governance",
    body: "Pre-built governance packs for financial services, healthcare, telecom, retail, and other regulated industries — aligned with sector-specific approval and evidence requirements.",
  },
  {
    title: "Multi-Brand Command",
    body: "A centralized operating view for multi-brand organizations — governing AI-assisted marketing across multiple brands, regions, and channels from a single accountability layer.",
  },
];

const EVAL_CARDS = [
  {
    icon: <BookOpen size={18} />,
    title: "About Zoiko Group",
    body: "The industry technology group behind ZoikoVertex and the wider platform ecosystem.",
    cta: "Explore",
    href: "/about",
  },
  {
    icon: <UserCheck size={18} />,
    title: "Leadership",
    body: "The governance-led leadership model guiding product, technology, responsible AI, and commercial outcomes.",
    cta: "Explore",
    href: "/leadership",
  },
  {
    icon: <Brain size={18} />,
    title: "Responsible AI",
    body: "How ZoikoVertex approaches human oversight, AI-assisted workflow boundaries, and accountability.",
    cta: "Read",
    href: "/responsible-ai",
  },
  {
    icon: <Shield size={18} />,
    title: "Security",
    body: "Access controls, audit logs, data protection practices, and enterprise security review documentation.",
    cta: "View",
    href: "/security",
  },
];

const FAQS = [
  {
    q: "What is the vision of ZoikoVertex?",
    a: "To become the trusted operating layer for governed AI marketing — where organizations can create, approve, manage, measure, and evidence marketing work with speed, intelligence, and control.",
  },
  {
    q: "What is the mission of ZoikoVertex?",
    a: "To help enterprise teams, agencies, and multi-brand organizations use AI-assisted marketing workflows responsibly — with governance, evidence, and accountability built in.",
  },
  {
    q: "Why was ZoikoVertex created?",
    a: "Marketing execution has accelerated, but governance has not kept pace. ZoikoVertex was built to close that gap — giving teams the controls, evidence, and accountability that serious enterprise marketing operations require.",
  },
  {
    q: "What problem does ZoikoVertex solve?",
    a: "Fragmented approval chains, ungoverned AI output, missing evidence trails, disconnected performance data, and brand risk from uncontrolled content operations at scale.",
  },
  {
    q: "Is ZoikoVertex only a social media scheduler?",
    a: "No. ZoikoVertex is a governed AI marketing operating system. Scheduling is one capability within a broader platform covering approval workflows, AI agent governance, evidence vaults, brand control, and performance intelligence.",
  },
  {
    q: "Does ZoikoVertex replace human review or compliance teams?",
    a: "No. ZoikoVertex is designed to support human review — not replace it. The platform routes work to the right people, captures decisions, and creates the evidence trail that compliance and legal teams need.",
  },
  {
    q: "Why does marketing need auditability?",
    a: "When something goes wrong — a wrong claim, an unapproved asset, an off-brand message — organizations need to answer hard questions fast. Auditability makes those answers available by design, not by investigation.",
  },
  {
    q: "How does ZoikoVertex balance speed and governance?",
    a: "By embedding governance into the workflow rather than bolting it on after the fact. Approval routing, AI assistance, and evidence capture happen in the same flow as content creation — so speed and accountability are not in tension.",
  },
];

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="block w-5 h-px" style={{ background: TEAL }} />
      <span
        className="text-[10px] font-bold tracking-[0.18em] uppercase"
        style={{ color: TEAL }}
      >
        {text}
      </span>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border rounded-xl px-5 py-4 transition-colors"
      style={{
        borderColor: open ? "rgba(32,231,242,0.2)" : "rgba(255,255,255,0.07)",
        background: open ? "rgba(32,231,242,0.04)" : "transparent",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-white leading-snug">{q}</span>
        <ChevronDown
          size={16}
          className="shrink-0 mt-0.5 transition-transform"
          style={{
            color: TEAL,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>
      {open && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          {a}
        </p>
      )}
    </button>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function VisionMissionPage() {
  return (
    <div style={{ background: PAGE_BG }} className="text-white min-h-screen">

      {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 text-[10px] font-bold tracking-[0.16em] uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>ZoikoVertex</span>
          <span>/</span>
          <span>Company</span>
          <span>/</span>
          <span style={{ color: TEAL }}>Vision &amp; Mission</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Left */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border mb-6 text-[10px] font-bold tracking-[0.14em] uppercase"
              style={{ borderColor: "rgba(32,231,242,0.25)", color: TEAL, background: "rgba(32,231,242,0.06)" }}
            >
              <span style={{ color: TEAL }}>•</span>
              Strategic Doctrine — Page 06
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              <span className="block text-white">Vision &amp;</span>
              <span className="block" style={{ color: TEAL }}>Mission.</span>
            </h1>

            <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color: "rgba(255,255,255,0.55)" }}>
              ZoikoVertex exists to help organizations scale AI-assisted marketing with speed, creativity, governance, brand control, auditability, and accountable human oversight.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: TEAL, color: "#080F1B" }}
              >
                <ArrowRight size={15} />
                Explore ZoikoVertex
              </Link>
              <Link
                href="/responsible-ai"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)" }}
              >
                <Shield size={14} />
                View Responsible AI
              </Link>
            </div>

            <p
              className="text-xs leading-relaxed max-w-sm"
              style={{ fontFamily: "var(--font-jetbrains), monospace", color: "rgba(255,255,255,0.25)" }}
            >
              Built for organizations that need faster marketing execution without losing control, evidence, or accountability.
            </p>
          </div>

          {/* Right — Doctrine card */}
          <div
            className="rounded-2xl border p-6 sm:p-7"
            style={{ borderColor: "rgba(32,231,242,0.18)", background: "rgba(32,231,242,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Lock size={12} style={{ color: TEAL }} />
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase" style={{ color: TEAL }}>
                Locked Page Doctrine
              </span>
            </div>

            <blockquote className="text-lg sm:text-xl font-bold leading-snug mb-6" style={{ color: "rgba(255,255,255,0.9)" }}>
              &ldquo;ZoikoVertex exists to help organizations scale AI-assisted marketing with{" "}
              <span style={{ color: TEAL }}>speed, creativity, governance, brand control, auditability</span>
              , and accountable human oversight.&rdquo;
            </blockquote>

            <ul className="space-y-2.5">
              {DOCTRINE_BULLETS.map((b) => (
                <li key={b.label} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                  <span style={{ color: TEAL }}>{b.icon}</span>
                  {b.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 2. Ticker ─────────────────────────────────────────────────────── */}
      <div
        className="border-y overflow-hidden py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-0 animate-[ticker_25s_linear_infinite] w-max">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-2 px-6 text-[10px] font-bold tracking-[0.16em] uppercase shrink-0"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <span style={{ color: TEAL }}>{item.icon}</span>
              {item.label}
              {i < [...TICKER_ITEMS, ...TICKER_ITEMS].length - 1 && (
                <span className="ml-6 opacity-20">|</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. Vision & Mission cards ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-12">
          <SectionLabel text="The Two Anchor Statements" />
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Vision. Mission.
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
            The two statements that guide every product, design, engineering, and commercial decision at ZoikoVertex.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Vision */}
          <div
            className="rounded-2xl border p-8 sm:p-10"
            style={{
              background: VISION_CARD_BG,
              borderColor: `${AMBER}33`,
              borderLeftColor: AMBER,
              borderLeftWidth: "3px",
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="block w-4 h-px" style={{ background: AMBER }} />
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase" style={{ color: AMBER }}>
                Vision
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold leading-snug text-white">
              To become the{" "}
              <span style={{ color: AMBER }}>trusted operating layer</span>{" "}
              for governed AI marketing, where organizations can create, approve, manage, measure, and evidence marketing work with speed, intelligence, and control.
            </p>
          </div>

          {/* Mission */}
          <div
            className="rounded-2xl border p-8 sm:p-10"
            style={{
              background: MISSION_CARD_BG,
              borderColor: `${TEAL}33`,
              borderLeftColor: TEAL,
              borderLeftWidth: "3px",
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="block w-4 h-px" style={{ background: TEAL }} />
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase" style={{ color: TEAL }}>
                Mission
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold leading-snug text-white">
              To help enterprise teams, agencies, and multi-brand organizations use{" "}
              <span style={{ color: TEAL }}>AI-assisted marketing workflows responsibly</span>{" "}
              by combining human oversight, approval governance, brand standards, audit trails, evidence records, and performance intelligence in one controlled platform.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Market Problem ─────────────────────────────────────────────── */}
      <section
        className="py-20 sm:py-24"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left */}
            <div>
              <SectionLabel text="The Market Problem" />
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
                <span className="text-white">Marketing has accelerated.</span>
                <br />
                <span style={{ color: TEAL }}>Governance has not kept up.</span>
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                Modern marketing teams are expected to produce more content, manage more channels, personalize more campaigns, coordinate more stakeholders, and prove more impact. AI tools increase speed — but speed without governance creates risk.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                ZoikoVertex is built to close that gap. Not by slowing teams down, but by giving them the controls, evidence, and accountability that serious enterprise marketing operations require.
              </p>
            </div>

            {/* Right — 2×3 grid */}
            <div className="grid grid-cols-2 gap-3">
              {PROBLEMS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
                >
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3"
                    style={{ background: "rgba(32,231,242,0.08)", color: TEAL }}
                  >
                    {p.icon}
                  </span>
                  <h3 className="text-sm font-bold text-white mb-1.5">{p.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. ZoikoVertex Vision pillars ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-14">
          <SectionLabel text="ZoikoVertex Vision" />
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4 max-w-2xl mx-auto leading-tight">
            The trusted operating layer for governed AI marketing operations.
          </h2>
          <p className="text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            ZoikoVertex&apos;s vision is to move organizations from disconnected marketing activity to controlled, intelligent, evidence-backed execution — where every critical action is approved by the right people, traceable, and connected to outcomes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VISION_PILLARS.map((p) => (
            <div
              key={p.num}
              className="rounded-xl border p-6"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
            >
              <span
                className="block text-3xl font-black mb-4"
                style={{ color: "rgba(255,255,255,0.08)", fontVariantNumeric: "tabular-nums" }}
              >
                {p.num}
              </span>
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-4"
                style={{ background: "rgba(32,231,242,0.08)", color: TEAL }}
              >
                {p.icon}
              </span>
              <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. Mission deep-dive ──────────────────────────────────────────── */}
      <section
        className="py-20 sm:py-24"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left */}
            <div>
              <SectionLabel text="ZoikoVertex Mission" />
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
                <span className="text-white">To help enterprise teams use </span>
                <span style={{ color: TEAL }}>AI-assisted marketing workflows responsibly</span>
                <span className="text-white"> — with governance, evidence, and accountability built in.</span>
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                The mission translates the vision into daily product behavior. It guides every feature prioritization, design decision, engineering trade-off, and commercial conversation.
              </p>
              <Link
                href="/platform"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: TEAL, color: "#080F1B" }}
              >
                <ArrowRight size={15} />
                Explore the Platform
              </Link>
            </div>

            {/* Right — list */}
            <div className="space-y-3">
              {MISSION_LIST.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-xl border p-4"
                  style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                >
                  <span
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: "rgba(32,231,242,0.08)", color: TEAL }}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">{item.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Why This Mission Matters ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-10 mb-12">
          <div>
            <SectionLabel text="Why This Mission Matters" />
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              The questions ZoikoVertex is built to answer.
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              For enterprise teams, marketing execution is no longer only a creative function. It is a governance challenge, a brand-risk function, a collaboration problem, a performance system, and an accountability issue.
            </p>
          </div>
          <div className="flex items-end">
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              When something goes wrong with a campaign — a wrong claim, an unapproved asset, an off-brand message — organizations need to answer hard questions fast. ZoikoVertex is designed to make those answers available by design, not by investigation.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QA_CARDS.map((card) => (
            <div
              key={card.num}
              className="rounded-xl border p-4"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
            >
              <span
                className="block text-xs font-black mb-3"
                style={{ color: "rgba(255,255,255,0.2)", fontVariantNumeric: "tabular-nums" }}
              >
                {card.num}
              </span>
              <h3 className="text-sm font-bold text-white mb-1.5">{card.q}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                {card.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Future Direction ───────────────────────────────────────────── */}
      <section
        className="py-20 sm:py-24"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <SectionLabel text="Future Direction" />
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white max-w-2xl leading-tight">
              Building toward a fully governed AI marketing operating system.
            </h2>
          </div>

          {/* Globe card */}
          <div className="relative rounded-2xl overflow-hidden mb-6 min-h-[280px] sm:min-h-[360px]">
            <Image
              src="/images/vision-and-mission/globe-satellite-vision.png"
              alt="Global governed AI marketing operations"
              fill
              className="object-cover object-center"
              priority={false}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, rgba(8,15,27,0.92) 45%, rgba(8,15,27,0.3) 100%)" }}
            />
            <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end">
              <span
                className="text-[10px] font-bold tracking-[0.16em] uppercase mb-3 block"
                style={{ color: TEAL }}
              >
                Where ZoikoVertex is heading
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight max-w-md">
                One governed environment for the{" "}
                <span style={{ color: TEAL }}>full lifecycle</span>{" "}
                of AI-assisted marketing.
              </h3>
            </div>
          </div>

          {/* 2×3 roadmap cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FUTURE_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border p-5"
                style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
              >
                <span
                  className="text-[9px] font-bold tracking-[0.16em] uppercase block mb-3"
                  style={{ color: TEAL }}
                >
                  Future Direction
                </span>
                <h3 className="text-sm font-bold text-white mb-2">{c.title}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {c.body}
                </p>
                <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Roadmap priority — not yet confirmed as live.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Continue Evaluation ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="text-center mb-10">
          <SectionLabel text="Trust & Strategy Cluster" />
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Continue your evaluation.
          </h2>
          <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
            Deeper content for enterprise buyers, partners, security reviewers, and prospective team members evaluating ZoikoVertex.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {EVAL_CARDS.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border p-5 flex flex-col"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)" }}
            >
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-4"
                style={{ background: "rgba(32,231,242,0.08)", color: TEAL }}
              >
                {c.icon}
              </span>
              <h3 className="text-sm font-bold text-white mb-2">{c.title}</h3>
              <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                {c.body}
              </p>
              <Link
                href={c.href}
                className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ color: TEAL }}
              >
                {c.cta}
                <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Questions about why ZoikoVertex exists.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

    </div>
  );
}

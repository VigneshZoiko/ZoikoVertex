"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/navbar/Navbar";
import {
  Users, CheckSquare, FileText, Lock, Bot,
  ShieldCheck, GitBranch, AlertTriangle,
  Eye, Cpu, Check, X, ChevronDown, MessageSquare,
} from "lucide-react";

/* ── Feature strip ─────────────────────────────────────────────── */
const FEATURES = [
  { icon: Users,       title: "Role-Based Access",     desc: "Permissions by workspace, role, and authority level across every team." },
  { icon: CheckSquare, title: "Approval Governance",   desc: "Structured review and sign-off before any sensitive marketing action." },
  { icon: FileText,    title: "Audit Logs",            desc: "Immutable records of every user action, decision, and publishing event." },
  { icon: Lock,        title: "Data Protection",       desc: "Encryption in transit and at rest with workspace-level data segmentation." },
  { icon: Bot,         title: "AI Oversight",          desc: "Human review gates and policy routing for every AI-assisted action." },
];

/* ── Protection scope cards ────────────────────────────────────── */
const SCOPE_CARDS = [
  {
    tag: "Brand Assets",
    title: "Brand assets, templates & approved messaging",
    desc: "Logos, tone-of-voice, campaign visuals, approved claims, and style frameworks — all governed and versioned.",
    img: "/images/security/brand-assets.png",
    tall: true,
  },
  {
    tag: "Content Workflows",
    title: "Drafts, revisions & approval status",
    desc: "Every content state from AI suggestion to signed approval is tracked and evidenced.",
    img: "/images/security/content-workflows.png",
  },
  {
    tag: "Campaign Operations",
    title: "Campaign plans, approvals & publishing decisions",
    desc: "Launch approvals, targeting records, and publishing decisions preserved as evidence.",
    img: "/images/security/campaign-operations.png",
  },
  {
    tag: "User Permissions",
    title: "Roles, workspace access & approval rights",
    desc: "",
    img: "/images/security/user-permissions.png",
  },
  {
    tag: "Approval Evidence",
    title: "Decision history & governance outcomes",
    desc: "",
    img: "/images/security/approval-evidence.png",
  },
];

/* ── Access control features ───────────────────────────────────── */
const ACCESS_FEATURES = [
  {
    icon: Users,
    title: "Role-Based Access Control",
    desc: "Assign users to defined roles based on responsibility, authority, and workspace requirements.",
  },
  {
    icon: ShieldCheck,
    title: "Least-Privilege Operating Model",
    desc: "Users receive only the access required for their role — no broader permissions by default.",
  },
  {
    icon: GitBranch,
    title: "Workspace-Level Separation",
    desc: "Separate brands, departments, regions, clients, or campaigns with clear access boundaries.",
  },
];

const ROLE_TAGS = ["Workspace Owner", "Governance Admin", "Approver", "Publisher", "Creator", "Reviewer", "Auditor", "External Collaborator"];

/* ── Approval governance features ─────────────────────────────── */
const APPROVAL_FEATURES = [
  {
    icon: GitBranch,
    title: "Multi-Step Review Chains",
    desc: "Content review → brand validation → compliance check → approver sign-off → publishing authorization.",
  },
  {
    icon: Users,
    title: "Approval Authority Controls",
    desc: "Limit final approval rights to users with the appropriate role, workspace authority, or governance responsibility.",
  },
  {
    icon: AlertTriangle,
    title: "Exception Handling",
    desc: "Flag missing approvals, rejected content, incomplete reviews, or unauthorized workflow changes automatically.",
  },
];

/* ── Audit log bullets ─────────────────────────────────────────── */
const AUDIT_BULLETS = [
  "User activity records across the workspace",
  "Approval history — reviewed, approved, escalated",
  "Publishing evidence connected to approved activity",
  "Policy and governance configuration events",
  "Auditor access without editing or publishing rights",
];

/* ── Evidence timeline ─────────────────────────────────────────── */
const TIMELINE = [
  { time: "09:12 UTC · May 14", event: "Draft created — brief uploaded",                   sub: "Creator: J. Barlow",                                    color: "bg-[#20E7F2]",  bold: false },
  { time: "09:14 UTC · May 14", event: "AI suggestion generated — Policy v2.4 applied",    sub: "Agent: Content Agent",                                  color: "bg-purple-400", bold: false },
  { time: "11:03 UTC · May 14", event: "Brand rule checked — Financial promotions passed", sub: "System · Brand Library v1.9",                           color: "bg-[#20E7F2]",  bold: false },
  { time: "14:22 UTC · May 14", event: "Reviewer requested changes — 2 annotations",       sub: "Reviewer: M. Okonkwo",                                   color: "bg-amber-400",  bold: false },
  { time: "10:31 UTC · May 15", event: "Approver signed off — Signature: #AE-0041",        sub: "Approver: S. Chen",                                     color: "bg-[#20E7F2]",  bold: false },
  { time: "11:00 UTC · May 15", event: "Publisher released — content hash matched",        sub: "Publisher: L. Adeyemi",                                 color: "bg-[#20E7F2]",  bold: false },
  { time: "11:00 UTC · May 15", event: "Audit record preserved — Evidence ID: AE-0041",   sub: "System · Append-only · Cannot be modified",             color: "bg-[#20E7F2]",  bold: true  },
];

/* ── Permission matrix ─────────────────────────────────────────── */
const PERM_ROWS = [
  { cap: "Create draft",       creator: true,  reviewer: false, approver: false, auditor: "View" },
  { cap: "Review content",     creator: false, reviewer: true,  approver: true,  auditor: "View" },
  { cap: "Approve campaign",   creator: false, reviewer: false, approver: true,  auditor: "View" },
  { cap: "Publish content",    creator: false, reviewer: false, approver: false, auditor: "View" },
  { cap: "Modify governance",  creator: false, reviewer: false, approver: false, auditor: "View" },
  { cap: "Access audit records", creator: false, reviewer: "Limited", approver: "Limited", auditor: true },
];

/* ── AI workflow features ──────────────────────────────────────── */
const AI_FEATURES = [
  { icon: Bot,         title: "AI assists — governance decides",          desc: "AI may draft and suggest, but governed workflows determine what can be approved, published, or escalated." },
  { icon: Users,       title: "Human review for sensitive actions",       desc: "Workflows require human sign-off before brand-sensitive or regulated content moves forward." },
  { icon: Eye,         title: "Full audit visibility",                    desc: "Every AI-assisted action is traceable within the workflow record — what was used, what was discarded, who approved it." },
  { icon: Cpu,         title: "Policy-aware AI actions",                  desc: "Governance rules align AI output with brand standards and approval requirements at the point of generation." },
];

/* ── Enterprise tags ───────────────────────────────────────────── */
const ENTERPRISE_TAGS = ["Data protection practices", "Role-based permissions", "Audit logging", "Approval workflows", "AI governance", "Workspace separation", "Incident response", "Data retention"];

/* ── FAQ ───────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "Is ZoikoVertex a secure AI marketing platform?",
    a: "Yes. ZoikoVertex is built with enterprise security at its core — role-based access, encrypted data, immutable audit logs, and governed AI workflows ensure every action is traceable and authorized.",
  },
  {
    q: "Does ZoikoVertex support role-based access control?",
    a: "ZoikoVertex provides 12 defined roles including Workspace Owner, Governance Admin, Approver, Publisher, Creator, Reviewer, Auditor, and External Collaborator — each with precise, independently permissioned capabilities.",
  },
  {
    q: "How are audit logs maintained?",
    a: "All audit logs are append-only and tamper-evident. Every user action, AI-assisted step, approval decision, and publishing event is recorded with timestamps, actor identifiers, and content hashes.",
  },
  {
    q: "How does ZoikoVertex govern AI-assisted workflows?",
    a: "AI may suggest and draft content, but every AI-assisted action passes through the same governance workflow as human-created content. No AI output can be published without the appropriate human approval chain.",
  },
  {
    q: "Can external agencies use ZoikoVertex securely?",
    a: "Yes. External Collaborator roles provide scoped access with no ability to modify governance settings, approve content, or access audit records beyond their assigned workspace.",
  },
  {
    q: "Does ZoikoVertex replace legal or compliance review?",
    a: "No. ZoikoVertex structures and evidences the marketing governance workflow — it is designed to support, not replace, legal, compliance, or regulatory review processes.",
  },
];

/* ── Footer columns ────────────────────────────────────────────── */
const FOOTER_COLS = [
  {
    heading: "PRODUCT",
    links: ["Platform Overview", "Agentic Architecture", "Executive Command Center", "AI Workflow Orchestration", "Approval Workflows", "ROI Engine", "Integrations"],
  },
  {
    heading: "SOLUTIONS",
    links: ["Enterprise Retail", "FinTech", "Healthcare", "B2B SaaS", "Logistics", "Telecom", "Agencies & Multi-Brand Teams"],
  },
  {
    heading: "RESOURCES",
    links: ["Resource Center", "Use Cases", "Demo Library", "ROI & Governance Audit", "Buyer Guides", "Product Updates", "FAQs"],
  },
  {
    heading: "COMPANY",
    links: ["About ZoikoVertex", "About Zoiko Group", "Leadership", "Vision & Mission", "Press & Media", "Competitor Benchmark", "Careers"],
  },
  {
    heading: "TRUST & LEGAL",
    links: ["Security", "Privacy Policy", "Terms of Service", "Cookie Preferences", "Compliance & Governance", "Responsible AI", "Auditability", "Data Processing Addendum"],
  },
];

/* ── Cell helper ───────────────────────────────────────────────── */
function Cell({ val }: { val: boolean | string }) {
  if (val === true)  return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
  if (val === false) return <X    className="w-4 h-4 text-white/20 mx-auto" />;
  return <span className="text-amber-400 text-xs font-mono">{val}</span>;
}

/* ── FAQ item ──────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left text-[15px] font-medium text-white/90 hover:text-white transition"
      >
        {q}
        <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 ml-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-5 text-sm text-white/55 leading-relaxed">{a}</p>}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#080d1a] text-white">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative min-h-[680px] flex items-center overflow-hidden pt-[68px]">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/security/first-page-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a] via-[#080d1a]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-[#080d1a]/40" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full grid lg:grid-cols-2 gap-12 items-center py-20">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#20E7F2]/25 bg-[#20E7F2]/5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Enterprise Security · Governed AI Marketing</span>
            </div>

            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.05] tracking-tight mb-6">
              Security built for{" "}
              <span className="text-[#20E7F2]">governed AI</span>{" "}
              marketing operations.
            </h1>

            <p className="text-[17px] text-white/60 leading-relaxed mb-10 max-w-[480px]">
              Structured access controls, approval governance, audit logs, and enterprise data protection — designed for organizations that need marketing execution they can trust.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:enterprise@zoikogroup.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
              >
                <MessageSquare className="w-4 h-4" />
                Contact Enterprise Sales
              </a>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-sm font-medium text-white/80 hover:bg-white/5 transition"
              >
                Request a Demo
              </Link>
            </div>
          </div>

          {/* Right — shield */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-[420px] h-[420px] drop-shadow-[0_0_80px_rgba(32,231,242,0.25)]">
              <Image src="/images/security/shield.png" alt="Security shield" fill className="object-contain" sizes="420px" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE STRIP ─────────────────────────────────────────── */}
      <section className="bg-[#0b1120] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/15 mb-4">
                <Icon className="w-4.5 h-4.5 text-[#20E7F2]" />
              </div>
              <p className="font-semibold text-white text-sm mb-1">{title}</p>
              <p className="text-[13px] text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROTECTION SCOPE ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Protection Scope</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-black leading-tight tracking-tight max-w-[640px] mb-5">
            Designed to protect the workflows behind modern marketing.
          </h2>
          <p className="text-white/50 text-[16px] max-w-[420px] leading-relaxed">
            ZoikoVertex protects the operational fabric of marketing execution — not just files or passwords.
          </p>
        </div>

        {/* Grid: 1 tall left + 2×2 right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-[580px]">
          {/* Tall left card */}
          <div className="relative rounded-2xl overflow-hidden lg:row-span-2">
            <Image src={SCOPE_CARDS[0].img} alt={SCOPE_CARDS[0].title} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="inline-block px-2 py-0.5 rounded border border-[#20E7F2]/40 text-[#20E7F2] text-[10px] font-mono tracking-widest mb-3">{SCOPE_CARDS[0].tag}</span>
              <h3 className="text-[18px] font-bold text-white mb-2">{SCOPE_CARDS[0].title}</h3>
              <p className="text-[13px] text-white/55 leading-relaxed">{SCOPE_CARDS[0].desc}</p>
            </div>
          </div>

          {/* Right 4 cards */}
          {SCOPE_CARDS.slice(1).map((card) => (
            <div key={card.tag} className="relative rounded-2xl overflow-hidden min-h-[260px]">
              <Image src={card.img} alt={card.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-[#080d1a]/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="inline-block px-2 py-0.5 rounded border border-[#20E7F2]/40 text-[#20E7F2] text-[10px] font-mono tracking-widest mb-2">{card.tag}</span>
                <h3 className="text-[15px] font-bold text-white">{card.title}</h3>
                {card.desc && <p className="text-[12px] text-white/50 mt-1 leading-relaxed">{card.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── IDENTITY & ACCESS CONTROL ─────────────────────────────── */}
      <section className="bg-[#0b1120]">
        <div className="grid lg:grid-cols-2 min-h-[560px]">
          {/* Left image — full bleed */}
          <div className="relative min-h-[400px] lg:min-h-[560px]">
            <Image
              src="/images/security/identity-access-control.png"
              alt="Identity and access control"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0b1120]/50" />
            {/* Stat badge */}
            <div className="absolute bottom-8 left-8 flex items-center gap-3 bg-[#080d1a]/90 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/20">
                <Users className="w-4 h-4 text-[#20E7F2]" />
              </div>
              <div>
                <p className="text-xl font-black text-white">12</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Defined Roles</p>
              </div>
            </div>
          </div>

          {/* Right content */}
          <div className="flex items-center py-16 px-10 lg:px-16 xl:px-20">
            <div className="max-w-[500px] w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-px bg-[#20E7F2]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Identity & Access Control</span>
              </div>
              <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] font-black leading-tight tracking-tight mb-5">
                Control who can create, approve, publish, and audit.
              </h2>
              <p className="text-white/50 text-[15px] leading-relaxed mb-8">
                Modern marketing teams include employees, agencies, contractors, legal reviewers, and external collaborators. ZoikoVertex assigns precise authority to each role.
              </p>

              <div className="space-y-3 mb-8">
                {ACCESS_FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/15">
                      <Icon className="w-3.5 h-3.5 text-[#20E7F2]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                      <p className="text-[12px] text-white/50 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {ROLE_TAGS.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono text-white/50">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APPROVAL GOVERNANCE ───────────────────────────────────── */}
      <section>
        <div className="grid lg:grid-cols-2 min-h-[560px]">
          {/* Left content */}
          <div className="flex items-center py-16 px-10 lg:px-16 xl:px-20 bg-[#080d1a]">
            <div className="max-w-[500px] w-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-6 h-px bg-[#20E7F2]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Approval Governance</span>
              </div>
              <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] font-black leading-tight tracking-tight mb-5">
                Governed approvals before anything moves forward.
              </h2>
              <p className="text-white/50 text-[15px] leading-relaxed mb-8">
                Marketing risk often begins before publishing. ZoikoVertex structures review chains so sensitive content always passes through the right people before release.
              </p>

              <div className="space-y-3">
                {APPROVAL_FEATURES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08]">
                      <Icon className="w-3.5 h-3.5 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                      <p className="text-[12px] text-white/50 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right image — full bleed */}
          <div className="relative min-h-[440px]">
            <Image
              src="/images/security/approval-governance.png"
              alt="Approval governance team"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#080d1a]/20" />
            {/* Stat badge */}
            <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-[#080d1a]/90 border border-emerald-500/30 rounded-xl px-4 py-2.5 backdrop-blur-sm">
              <Check className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-lg font-black text-white leading-none">100%</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Approval-Gated</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AUDIT LOGS ────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden bg-[#080d1a]">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/security/audit-bg.png" alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Audit Logs & Evidence</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] font-black leading-tight tracking-tight mb-5">
              Every action leaves a permanent, inspectable record.
            </h2>
            <p className="text-white/50 text-[15px] leading-relaxed mb-8">
              ZoikoVertex maintains visibility into marketing decisions — user actions, approvals, publishing events, governance changes, and AI-assisted workflow steps.
            </p>
            <div className="space-y-3">
              {AUDIT_BULLETS.map((b) => (
                <div key={b} className="flex items-center gap-3 text-[14px] text-white/65">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* Right — timeline mockup */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1424]/80 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Evidence Timeline — Campaign #Q3-2026</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/25 text-[#20E7F2] text-[10px] font-mono">⊕ Immutable</span>
            </div>
            <div className="p-5 space-y-0">
              {TIMELINE.map((item, i) => (
                <div key={i} className="flex gap-4 relative">
                  {/* Line */}
                  {i < TIMELINE.length - 1 && (
                    <div className="absolute left-[7px] top-5 bottom-0 w-px bg-white/[0.06]" />
                  )}
                  <div className={`mt-1.5 w-3.5 h-3.5 rounded-full ${item.color} shrink-0 ring-4 ring-[#0d1424] z-10`} />
                  <div className="pb-5">
                    <p className="text-[10px] text-white/30 font-mono mb-0.5">{item.time}</p>
                    <p className={`text-[13px] font-medium ${item.bold ? "text-[#20E7F2]" : "text-white/85"}`}>{item.event}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PERMISSION MATRIX + AI WORKFLOW ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid lg:grid-cols-2 gap-16">
        {/* Permission matrix */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Permission Matrix</span>
          </div>
          <h2 className="text-[clamp(1.6rem,2.5vw,2.4rem)] font-black leading-tight tracking-tight mb-4">
            Who can do what — clearly defined.
          </h2>
          <p className="text-white/50 text-[14px] leading-relaxed mb-8">
            Every action requires the right role. Visibility does not equal authority — every capability is independently permissioned.
          </p>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-white/30">Capability</th>
                  {["Creator", "Reviewer", "Approver", "Auditor"].map((h) => (
                    <th key={h} className="px-3 py-3 text-[10px] font-mono uppercase tracking-widest text-white/30 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_ROWS.map((row, i) => (
                  <tr key={i} className={`border-b border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                    <td className="px-4 py-3 text-[13px] text-white/70">{row.cap}</td>
                    <td className="px-3 py-3 text-center"><Cell val={row.creator} /></td>
                    <td className="px-3 py-3 text-center"><Cell val={row.reviewer} /></td>
                    <td className="px-3 py-3 text-center"><Cell val={row.approver} /></td>
                    <td className="px-3 py-3 text-center"><Cell val={row.auditor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI workflow security */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-6 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">AI Workflow Security</span>
          </div>
          <h2 className="text-[clamp(1.6rem,2.5vw,2.4rem)] font-black leading-tight tracking-tight mb-4">
            AI that assists — without bypassing accountability.
          </h2>
          <p className="text-white/50 text-[14px] leading-relaxed mb-8">
            ZoikoVertex supports AI-assisted workflows while preserving human review, approval controls, and full audit visibility.
          </p>

          <div className="space-y-3">
            {AI_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#20E7F2]/10 border border-[#20E7F2]/15">
                  <Icon className="w-4 h-4 text-[#20E7F2]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white mb-1">{title}</p>
                  <p className="text-[12px] text-white/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE REVIEW + FAQ ────────────────────────────────── */}
      <section className="bg-[#0b1120] py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-start">
          {/* Left card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#080d1a] overflow-hidden">
            <div className="relative h-[220px]">
              <Image
                src="/images/security/enterprise-review.png"
                alt="Enterprise security review"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent" />
              <div className="absolute bottom-5 left-6 right-6">
                <p className="text-[16px] font-bold text-white">Need a formal security review?</p>
                <p className="text-[13px] text-white/55 mt-1">Our team supports enterprise security, procurement, and governance discussions.</p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-px bg-[#20E7F2]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#20E7F2]">Enterprise Security Review</span>
              </div>
              <h3 className="text-[20px] font-black leading-tight mb-3">Built for procurement and security review.</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-5">
                ZoikoVertex supports structured evaluation by security, legal, procurement, compliance, IT, and executive stakeholders.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {ENTERPRISE_TAGS.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-white/45">{tag}</span>
                ))}
              </div>

              <a
                href="mailto:enterprise@zoikogroup.com"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition"
              >
                <MessageSquare className="w-4 h-4" />
                Contact Enterprise Sales
              </a>
            </div>
          </div>

          {/* Right FAQ */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Security FAQ</span>
            </div>
            <h2 className="text-[clamp(1.6rem,2.5vw,2.6rem)] font-black leading-tight tracking-tight mb-8">
              Questions before the security review.
            </h2>

            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-[#06090f] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-10">
          {/* Top row */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-10 mb-14">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <Image src="/images/zoikovertexlogo.png" alt="ZoikoVertex" width={160} height={30} className="h-7 w-auto mb-4" />
              <p className="text-[13px] text-white/45 leading-relaxed max-w-[220px] mb-6">
                The governed autonomous digital marketing operating system <span className="text-white/65 font-medium">where marketing becomes measurable infrastructure.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {["SOC 2 Type II", "ISO 27001", "GDPR", "Responsible AI", "Audit-Ready"].map((badge) => (
                  <span key={badge} className="px-2 py-0.5 rounded border border-white/10 text-[9px] font-bold uppercase tracking-wider text-white/35">• {badge}</span>
                ))}
              </div>
            </div>

            {/* Columns */}
            {FOOTER_COLS.map((col) => (
              <div key={col.heading} className="col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-4">{col.heading}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Locations */}
          <div className="border-t border-white/[0.06] pt-10 mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-5">Contact & Locations</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                {["Contact Sales", "Support", "Partnerships"].map((l) => (
                  <a key={l} href="#" className="block text-[13px] text-white/50 hover:text-white transition-colors">{l}</a>
                ))}
              </div>
              <div className="md:border-l md:border-white/[0.06] md:pl-8">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#20E7F2] mb-2">• Headquarters</p>
                <p className="text-[13px] text-white/50 leading-relaxed">1401 21st Street, Suite R, Sacramento,<br />CA 95811, USA</p>
              </div>
              <div className="md:border-l md:border-white/[0.06] md:pl-8">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#20E7F2] mb-2">• EU Headquarters</p>
                <p className="text-[13px] text-white/50 leading-relaxed">67–69 Great Portland Street, 5th Floor,<br />London W1W 5PF, UK</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/25">2026 ZoikoVertex | All rights reserved | ZoikoVertex is a platform operated by Zoiko Tech Inc.</p>
            <div className="flex items-center gap-6 text-[12px] text-white/35">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
              <Link href="/terms"   className="hover:text-white/60 transition-colors">Terms of Service</Link>
              <a href="#"           className="hover:text-white/60 transition-colors">Cookie Preferences</a>
              <Link href="/security" className="hover:text-white/60 transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

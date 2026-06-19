"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Table2,
  LayoutGrid,
  Code2,
  Bot,
  Lock,
  BarChart2,
  Eye,
  FileText,
  AlertTriangle,
  Check,
  ChevronDown,
  Mail,
  ShieldCheck,
  ClipboardList,
  Monitor,
  Users,
} from "lucide-react";

/* ── Hero role pills ────────────────────────────────────────────── */
const ROLE_PILLS = [
  { icon: Table2,     label: "Executive oversight" },
  { icon: LayoutGrid, label: "Product discipline" },
  { icon: Bot,        label: "Responsible AI leadership" },
  { icon: Lock,       label: "Security & privacy ownership" },
  { icon: Users,      label: "Customer accountability" },
];

/* ── Hero bottom category cards ─────────────────────────────────── */
const HERO_CARDS = [
  {
    icon: Table2,
    title: "Executive Oversight",
    desc: "Strategic direction, corporate accountability, and long-term platform vision from Zoiko Group leadership.",
  },
  {
    icon: LayoutGrid,
    title: "Product Leadership",
    desc: "Roadmap discipline, buyer alignment, workflow architecture, and measurable enterprise value.",
  },
  {
    icon: ShieldCheck,
    title: "Technology Leadership",
    desc: "Engineering quality, scalability, security alignment, integrations, and platform reliability.",
  },
  {
    icon: Bot,
    title: "Governance Leadership",
    desc: "Responsible AI, approval controls, auditability, policy design, and evidence records.",
  },
  {
    icon: Users,
    title: "Customer Leadership",
    desc: "Enterprise adoption, buyer enablement, onboarding readiness, support, and commercial execution.",
  },
];

/* ── Lennox skill tags ───────────────────────────────────────────── */
const LENNOX_TAGS = [
  "Strategic Oversight",
  "Platform Vision",
  "Enterprise Positioning",
  "Governance Direction",
];

/* ── Leadership Operating Model cards ───────────────────────────── */
const MODEL_CARDS = [
  {
    num: "01",
    icon: Table2,
    title: "Corporate Oversight",
    desc: "Aligns ZoikoVertex with Zoiko Group's strategic direction, governance expectations, and long-term platform ecosystem.",
  },
  {
    num: "02",
    icon: LayoutGrid,
    title: "Product Direction",
    desc: "Defines customer problems, feature priorities, workflow architecture, and measurable enterprise value.",
  },
  {
    num: "03",
    icon: Code2,
    title: "Technology Execution",
    desc: "Owns architecture, engineering standards, scalability, integrations, reliability, and secure implementation.",
  },
  {
    num: "04",
    icon: Bot,
    title: "Governance & Responsible AI",
    desc: "Shapes human oversight, AI-assisted workflow boundaries, approval controls, auditability, and evidence records.",
  },
  {
    num: "05",
    icon: Lock,
    title: "Security & Privacy",
    desc: "Embeds access control, data protection, privacy documentation, AI data handling, and enterprise review readiness.",
  },
  {
    num: "06",
    icon: BarChart2,
    title: "Customer & Commercial",
    desc: "Aligns customer needs, sales strategy, onboarding, support, enterprise buyer expectations, and feedback loops.",
  },
];

/* ── Leadership profiles ─────────────────────────────────────────── */
const PROFILES = [
  {
    img: "/images/leadership/cpo-profile.png",
    nameWhite: "[Chief Product",
    nameCyan: "Officer.]",
    role: "PRODUCT STRATEGY & ROADMAP",
    desc: "Translates enterprise marketing problems into platform capabilities, defines roadmap priorities, and ensures governance requirements are embedded in every product decision.",
  },
  {
    img: "/images/leadership/ai-gov-lead-profile.png",
    nameWhite: "[Responsible AI",
    nameCyan: "& Gov Lead.]",
    role: "AI OVERSIGHT · POLICY · AUDITABILITY",
    desc: "Shapes AI-assisted workflow boundaries, human review expectations, escalation models, and audit records to ensure AI enhances capability without removing accountability.",
  },
  {
    img: "/images/leadership/security-lead-profile.png",
    nameWhite: "[Security &",
    nameCyan: "Privacy Lead.]",
    role: "ACCESS CONTROL · DATA PROTECTION · TRUST",
    desc: "Owns access control, platform hardening, secure development, incident readiness, privacy documentation, AI data practices, and enterprise procurement documentation.",
  },
  {
    img: "/images/leadership/design-lead-profile.png",
    nameWhite: "[Design &",
    nameCyan: "UX Lead.]",
    role: "WORKFLOW CLARITY · ACCESSIBILITY · TRUST UX",
    desc: "Translates governance complexity into intuitive workflows — clear permissions, AI output clarity, action-led dashboards, and enterprise brand consistency across the platform.",
  },
];

/* ── Responsible AI responsibilities ────────────────────────────── */
const AI_RESPONSIBILITIES = [
  {
    icon: Check,
    title: "Define AI-assisted workflow boundaries",
    desc: "Establish clear limits on what AI can suggest, draft, or execute without human authorization.",
  },
  {
    icon: Eye,
    title: "Establish human review expectations",
    desc: "Set mandatory human gates for sensitive actions — regulated content, brand-critical decisions, and crisis communications.",
  },
  {
    icon: FileText,
    title: "Maintain responsible AI documentation",
    desc: "Produce and maintain documentation that enterprise buyers, procurement teams, and legal reviewers can evaluate.",
  },
  {
    icon: AlertTriangle,
    title: "Review high-risk automation scenarios",
    desc: "Identify and govern scenarios where AI automation could create brand, legal, regulatory, or reputational exposure.",
  },
];

/* ── Trust ownership table ───────────────────────────────────────── */
const TRUST_ROWS = [
  {
    fn: "Security",
    badge: "Security Lead",
    scope:
      "Access control, authentication, platform hardening, monitoring, secure development, incident readiness, and security review.",
  },
  {
    fn: "Privacy",
    badge: "Privacy Lead",
    scope:
      "Personal information, customer content, AI-assisted workflow data, cookies, retention, privacy rights, and documentation.",
  },
  {
    fn: "Responsible AI",
    badge: "AI & Gov Lead",
    scope:
      "Human oversight, workflow boundaries, approval controls, auditability, evidence records, and AI governance documentation.",
  },
  {
    fn: "Legal Review",
    badge: "Legal Lead",
    scope:
      "Terms of Service, Privacy Policy, DPA, subprocessors, customer contracts, and acceptable-use boundaries.",
  },
  {
    fn: "Enterprise Review",
    badge: "Commercial Lead",
    scope:
      "Security questionnaires, procurement review, vendor onboarding, legal redlines, and customer assurance documentation.",
  },
  {
    fn: "Product Governance",
    badge: "Product Lead",
    scope:
      "Roadmap discipline, governance requirements in features, approval workflow architecture, and enterprise buyer alignment.",
  },
];

/* ── Leadership principles ───────────────────────────────────────── */
const PRINCIPLES = [
  {
    num: "01",
    prefix: "Governed",
    keyword: "Speed",
    desc: "Move quickly while preserving approval controls, review discipline, and platform accountability. Speed without governance is reckless.",
  },
  {
    num: "02",
    prefix: "Clear",
    keyword: "Ownership",
    desc: "Every critical function should have visible responsibility — from product decisions to security review, audit evidence to customer outcomes.",
  },
  {
    num: "03",
    prefix: "Human",
    keyword: "Accountability",
    desc: "AI-assisted workflows must remain subject to human judgment, organizational authority, and customer governance expectations.",
  },
  {
    num: "04",
    prefix: "Enterprise",
    keyword: "Readiness",
    desc: "Product, design, security, privacy, and legal documentation must support serious buyer scrutiny at every stage of evaluation.",
  },
  {
    num: "05",
    prefix: "Evidence Over",
    keyword: "Assertion",
    desc: "Important workflows should create records that can be reviewed, understood, and trusted — not just promised.",
  },
  {
    num: "06",
    prefix: "Customer-Centered",
    keyword: "Discipline",
    desc: "Leadership decisions guided by practical customer problems, not unnecessary complexity or novelty for its own sake.",
  },
  {
    num: "07",
    prefix: "Responsible",
    keyword: "Innovation",
    desc: "Advance AI capability without promoting reckless automation, unsupported compliance claims, or unapproved governance assertions.",
  },
  {
    num: "08",
    prefix: "Design",
    keyword: "Clarity",
    desc: "Complex governance workflows should be made easier to understand — powerful to administrators, clear to creators, credible to executives.",
  },
];

/* ── Why leadership matters checklist ───────────────────────────── */
const WHY_CHECKLIST = [
  "Clear product ownership and roadmap discipline",
  "Technology and engineering accountability",
  "Responsible AI governance with visible ownership",
  "Security and privacy oversight for enterprise review",
  "Legal and compliance review readiness",
  "Enterprise support, onboarding, and escalation pathways",
  "Transparent documentation and realistic product claims",
  "Roadmap feedback loops and brand consistency",
];

/* ── Media topics ────────────────────────────────────────────────── */
const MEDIA_TOPICS = [
  { icon: Bot,       label: "Governed AI marketing operations" },
  { icon: ShieldCheck, label: "Responsible AI in public-facing content workflows" },
  { icon: Check,     label: "Marketing approval governance and auditability" },
  { icon: Table2,    label: "Enterprise software product development" },
  { icon: Monitor,   label: "AI, brand protection, and human oversight" },
  { icon: BarChart2, label: "Multi-brand marketing governance" },
];

/* ── FAQ ─────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "Who leads ZoikoVertex?",
    a: "ZoikoVertex is led under the executive oversight of Lennox McLeod, Founder and Executive Chairman of Zoiko Group, with dedicated leadership functions across product, technology, governance, security, and customer success.",
  },
  {
    q: "Is ZoikoVertex part of Zoiko Group?",
    a: "Yes. ZoikoVertex is a product of Zoiko Tech Inc., which operates within the Zoiko Group portfolio of multi-industry technology companies.",
  },
  {
    q: "Why does ZoikoVertex need responsible AI leadership?",
    a: "AI-assisted marketing platforms require human oversight structures to remain accountable. ZoikoVertex embeds responsible AI leadership to ensure approval controls, auditability, and governance boundaries are part of the platform design — not an afterthought.",
  },
  {
    q: "Who is the Founder and Executive Chairman of Zoiko Group?",
    a: "Lennox McLeod is the Founder and Executive Chairman of Zoiko Group, guiding multi-industry technology development across AI, telecom, workforce systems, digital operations, and enterprise software.",
  },
  {
    q: "What leadership functions support ZoikoVertex?",
    a: "ZoikoVertex is supported by six leadership domains: Corporate Oversight, Product Direction, Technology Execution, Governance & Responsible AI, Security & Privacy, and Customer & Commercial.",
  },
  {
    q: "Why should enterprise buyers review ZoikoVertex leadership?",
    a: "Enterprise buyers evaluate not just platform capability but the credibility and accountability of the company behind the product — including product ownership, responsible AI governance, security oversight, and legal readiness.",
  },
];

/* ── FaqItem component ───────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left text-[14px] font-medium text-white/85 hover:text-white transition gap-4"
      >
        <span>{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/35 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-[13.5px] text-white/50 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

/* ── Section label ───────────────────────────────────────────────── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-4 h-px bg-[#20E7F2]" />
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#20E7F2]">
        {text}
      </span>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function LeadershipPage() {
  return (
    <div className="min-h-screen bg-[#080d1a] text-white">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col justify-end overflow-hidden min-h-[520px] md:min-h-[580px]">
        {/* Background image + overlays */}
        <div className="absolute inset-0">
          <Image
            src="/images/leadership/hero-banner.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#080d1a]/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/20 via-transparent to-[#080d1a]/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a]/70 via-transparent to-transparent" />
        </div>

        {/* Hero text content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 lg:px-12 pt-36 pb-10">
          <h1 className="text-[clamp(2.6rem,6vw,5rem)] font-black leading-[1.0] mb-5">
            Leadership<br />
            Behind <span className="text-[#20E7F2]">ZoikoVertex.</span>
          </h1>
          <p className="text-white/65 text-[14.5px] md:text-[15px] max-w-[420px] mb-8 leading-relaxed">
            A governance-led leadership model connecting founder oversight,
            product discipline, engineering execution, responsible AI, security,
            design authority, and customer accountability.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#20E7F2] text-[#080d1a] text-[13px] font-bold hover:bg-[#18d4df] transition"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Request an Enterprise Demo
            </Link>
            <Link
              href="/governance"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 text-white text-[13px] font-medium hover:border-white/50 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#20E7F2]" />
              View Responsible AI
            </Link>
          </div>

          {/* Role pills row */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
              {ROLE_PILLS.map((r) => (
                <span
                  key={r.label}
                  className="inline-flex items-center gap-1.5 text-[11px] text-white/45 font-mono uppercase tracking-wider"
                >
                  <r.icon className="w-3 h-3 text-[#20E7F2]/60" />
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5-card strip */}
        <div className="relative z-10 bg-[#0b1120]/95 border-t border-white/8 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-7 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
            {HERO_CARDS.map((c) => (
              <div key={c.title}>
                <div className="w-9 h-9 rounded-lg bg-[#20E7F2]/12 flex items-center justify-center mb-3 border border-[#20E7F2]/20">
                  <c.icon className="w-[18px] h-[18px] text-[#20E7F2]" />
                </div>
                <h3 className="text-[12.5px] font-bold text-white mb-1 leading-snug">{c.title}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LENNOX MCLEOD ────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          {/* Photo */}
          <div className="relative max-w-sm lg:max-w-full">
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
              <Image
                src="/images/leadership/lennox-mcleod.png"
                alt="Lennox McLeod, Founder and Executive Chairman, Zoiko Group"
                fill
                className="object-cover object-top"
                style={{ filter: "grayscale(100%)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a]/30 to-transparent" />
            </div>
            {/* Badge overlay */}
            <div className="absolute bottom-5 left-5">
              <span className="inline-block px-3 py-1.5 bg-[#080d1a]/80 backdrop-blur-sm border border-white/15 text-[9px] font-mono uppercase tracking-[0.2em] text-[#20E7F2] rounded-md">
                Founder &amp; Executive Chairman
              </span>
            </div>
          </div>

          {/* Bio content */}
          <div>
            <SectionLabel text="Founder & Executive Oversight" />

            <h2 className="text-[clamp(3rem,7vw,5.5rem)] font-black leading-none mb-4">
              Lennox<br />
              <span className="text-[#20E7F2]">McLeod.</span>
            </h2>

            <div className="flex items-center gap-2 mb-8">
              <div className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
                Founder and Executive Chairman, Zoiko Group
              </span>
            </div>

            <div className="space-y-4 text-[14px] text-white/65 leading-[1.8] mb-8">
              <p>
                Lennox McLeod is the Founder and Executive Chairman of Zoiko
                Group, guiding the development of multi-industry technology
                platforms across AI, telecom, workforce systems, digital
                operations, media, communications, and enterprise software. His
                role in ZoikoVertex encompasses strategic oversight, platform
                vision, enterprise positioning, governance direction, and
                category-defining product ambition.
              </p>
              <p>
                Under his leadership, Zoiko Group builds platforms that combine
                entrepreneurial speed with enterprise discipline — exploring new
                technologies while maintaining a strong focus on governance,
                commercial value, and long-term trust.
              </p>
            </div>

            {/* Blockquote */}
            <blockquote className="border-l-[3px] border-[#20E7F2] pl-5 py-4 pr-5 bg-[#20E7F2]/6 rounded-r-xl mb-8">
              <p className="text-[14px] text-white font-semibold leading-relaxed mb-3">
                &ldquo;ZoikoVertex is not being built to automate marketing recklessly.
                It is being built to help organizations move faster while
                preserving the controls, evidence, and accountability that
                serious enterprises require.&rdquo;
              </p>
              <cite className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-[#20E7F2] not-italic">
                Lennox McLeod · Founder and Executive Chairman, Zoiko Group
              </cite>
            </blockquote>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {LENNOX_TAGS.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full border border-amber-500/35 text-amber-300/65 text-[11px] font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP OPERATING MODEL ───────────────────────────── */}
      <section className="py-24 bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="Leadership Operating Model" />
            <h2 className="text-[clamp(1.8rem,4vw,3.2rem)] font-black mb-4">
              A leadership model built around accountability.
            </h2>
            <p className="text-white/50 text-[15px] max-w-2xl mx-auto leading-relaxed">
              ZoikoVertex requires leadership across multiple operating domains
              — from AI-assisted workflows and governance controls to security,
              privacy, design, and customer trust.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODEL_CARDS.map((c) => (
              <div
                key={c.num}
                className="relative p-7 rounded-xl border border-white/8 bg-[#0d1424] overflow-hidden hover:border-white/14 transition-colors"
              >
                <span className="absolute top-4 right-5 text-[64px] font-black text-white/[0.04] leading-none select-none pointer-events-none">
                  {c.num}
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#20E7F2]/10 flex items-center justify-center mb-5 border border-[#20E7F2]/15">
                  <c.icon className="w-[18px] h-[18px] text-[#20E7F2]" />
                </div>
                <h3 className="text-[14.5px] font-bold text-white mb-2">{c.title}</h3>
                <p className="text-[13px] text-white/42 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP FUNCTIONS ─────────────────────────────────── */}
      <section className="py-24 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <SectionLabel text="Executive Leadership" />
          <h2 className="text-[clamp(1.7rem,3.5vw,2.8rem)] font-black mb-3">
            Leadership functions behind ZoikoVertex.
          </h2>
          <p className="text-white/48 text-[14px] mb-14 max-w-xl leading-relaxed">
            Each role exists to make the platform more useful, secure,
            governable, and commercially valuable for enterprise customers.
            Profiles are published as appointments are finalized.
          </p>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
            {PROFILES.map((p) => (
              <div key={p.nameCyan} className="flex gap-5 items-start">
                {/* Photo */}
                <div
                  className="relative rounded-lg overflow-hidden shrink-0"
                  style={{ width: "130px", height: "160px", filter: "grayscale(100%)" }}
                >
                  <Image
                    src={p.img}
                    alt={`${p.nameWhite} ${p.nameCyan}`.replace(/[\[\]]/g, "")}
                    fill
                    className="object-cover object-top"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[1.2rem] font-black leading-tight mb-2">
                    <span className="text-white">{p.nameWhite}</span>
                    <br />
                    <span className="text-[#20E7F2]">{p.nameCyan}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="w-3 h-px bg-[#20E7F2]" />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#20E7F2]/75">
                      {p.role}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-white/55 leading-relaxed mb-3">
                    {p.desc}
                  </p>
                  <p className="text-[11px] text-white/28 italic">
                    Profile pending final confirmation
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESPONSIBLE AI ───────────────────────────────────────── */}
      <section className="py-24 bg-[#0b1120] relative overflow-hidden">
        {/* Decorative circuit bg on right side */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 70% 50%, #20E7F2 0%, transparent 60%)`,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <SectionLabel text="Responsible AI Leadership" />
            <h2 className="text-[clamp(1.7rem,3.5vw,2.8rem)] font-black leading-tight mb-6">
              Responsible AI requires leadership ownership.
            </h2>
            <p className="text-white/55 text-[14px] leading-[1.85] mb-8">
              ZoikoVertex is designed for AI-assisted marketing operations where
              organizations retain control over approvals, publishing, brand
              standards, and evidence. Responsible AI cannot be treated as a
              decorative statement — it must be owned.
            </p>
            <div className="p-5 rounded-xl bg-[#20E7F2]/8 border border-[#20E7F2]/18">
              <p className="text-[13.5px] text-white font-medium leading-relaxed italic">
                &ldquo;ZoikoVertex leadership should never position AI as a
                replacement for organizational responsibility. The platform must
                help teams use AI with clearer control, stronger review
                pathways, and better evidence.&rdquo;
              </p>
            </div>
          </div>

          {/* Right */}
          <div>
            <SectionLabel text="Leadership Responsibilities" />
            <div className="space-y-3">
              {AI_RESPONSIBILITIES.map((r) => (
                <div
                  key={r.title}
                  className="flex gap-4 p-4 rounded-lg border border-white/8 bg-[#0d1424]/70 hover:border-white/14 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-[#20E7F2]/12 flex items-center justify-center shrink-0 border border-[#20E7F2]/15">
                    <r.icon className="w-4 h-4 text-[#20E7F2]" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-semibold text-white mb-1">
                      {r.title}
                    </h4>
                    <p className="text-[12.5px] text-white/45 leading-relaxed">
                      {r.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST FUNCTIONS TABLE ────────────────────────────────── */}
      <section className="py-24 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <SectionLabel text="Security, Privacy & Compliance" />
          <h2 className="text-[clamp(1.7rem,3.5vw,2.8rem)] font-black mb-3">
            Trust functions with clear ownership.
          </h2>
          <p className="text-white/48 text-[14px] mb-12 max-w-lg leading-relaxed">
            Enterprise AI platforms are evaluated not only on capability, but on
            trust. Security, privacy, compliance readiness, and auditability
            must be visible leadership priorities.
          </p>

          <div className="rounded-xl overflow-hidden border border-white/10">
            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-[180px,180px,1fr] bg-[#0d1a2e]/90 px-6 py-4 gap-4 text-[9.5px] font-mono uppercase tracking-[0.18em] text-white/40 border-b border-white/10">
              <span>Trust Function</span>
              <span>Leadership Ownership</span>
              <span>Scope</span>
            </div>
            {/* Rows */}
            {TRUST_ROWS.map((r, i) => (
              <div
                key={r.fn}
                className={`flex flex-col md:grid md:grid-cols-[180px,180px,1fr] px-6 py-4 gap-3 md:gap-4 border-t border-white/7 items-start md:items-center hover:bg-[#0d1424]/60 transition-colors ${
                  i % 2 === 0 ? "bg-[#0a0f1e]" : "bg-[#080d1a]"
                }`}
              >
                <span className="text-[13.5px] text-white/75">{r.fn}</span>
                <span>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#20E7F2]/15 border border-[#20E7F2]/30 text-[#20E7F2] text-[11px] font-medium font-mono tracking-wide">
                    {r.badge}
                  </span>
                </span>
                <span className="text-[13px] text-white/45 leading-relaxed">
                  {r.scope}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP PRINCIPLES ────────────────────────────────── */}
      <section className="py-24 bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <SectionLabel text="Leadership Principles" />
          <h2 className="text-[clamp(1.7rem,3.5vw,2.8rem)] font-black mb-12">
            Eight principles. One operating standard.
          </h2>

          <div className="rounded-xl border border-white/10 overflow-hidden">
            {PRINCIPLES.map((p, i) => (
              <div
                key={p.num}
                className={`flex flex-col sm:grid sm:grid-cols-[100px,1fr,1fr] lg:grid-cols-[100px,280px,1fr] items-start sm:items-center px-8 lg:px-10 py-9 lg:py-10 gap-4 sm:gap-8 lg:gap-14 hover:bg-[#0d1424]/50 transition-colors ${
                  i < PRINCIPLES.length - 1 ? "border-b border-white/7" : ""
                }`}
              >
                <span className="text-[3.5rem] lg:text-[4.5rem] font-black text-[#20E7F2]/18 leading-none select-none">
                  {p.num}
                </span>
                <span className="text-[15px] font-bold text-white">
                  {p.prefix}{" "}
                  <span className="text-[#20E7F2]">{p.keyword}</span>
                </span>
                <span className="text-[13.5px] text-white/40 leading-relaxed">
                  {p.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY LEADERSHIP MATTERS ───────────────────────────────── */}
      <section className="py-24 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Photo + float badges */}
          <div className="relative max-w-md lg:max-w-full">
            <div className="relative rounded-2xl overflow-hidden aspect-square">
              <Image
                src="/images/leadership/why-leadership-matters.png"
                alt="Enterprise leadership team meeting"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a]/50 via-transparent to-transparent" />
            </div>
            {/* Top-left badge */}
            <div className="absolute top-5 left-5 bg-[#0b1120]/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/12">
              <div className="text-2xl font-black text-white leading-none mb-0.5">8</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/45">
                Leadership Functions
              </div>
            </div>
            {/* Bottom-right badge */}
            <div className="absolute bottom-5 right-5 bg-[#0b1120]/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/12">
              <div className="text-2xl font-black text-[#20E7F2] leading-none mb-0.5">100%</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/45">
                Governance-Led
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <SectionLabel text="Enterprise Buyer Confidence" />
            <h2 className="text-[clamp(1.7rem,3.5vw,2.8rem)] font-black leading-tight mb-5">
              Why leadership matters to enterprise buyers.
            </h2>
            <p className="text-white/55 text-[14px] leading-[1.85] mb-8">
              Enterprise buyers are not only purchasing a feature set. They are
              evaluating long-term product development, responsible AI use,
              security expectations, customer accountability, and the credibility
              of the company behind the platform.
            </p>

            <ul className="space-y-3 mb-10">
              {WHY_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13.5px] text-white/65">
                  <Check className="w-4 h-4 text-[#20E7F2] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-[13px] font-bold hover:bg-[#18d4df] transition"
            >
              <ClipboardList className="w-4 h-4" />
              Request Enterprise Evaluation
            </Link>
          </div>
        </div>
      </section>

      {/* ── MEDIA & SPEAKING ─────────────────────────────────────── */}
      <section className="py-24 bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          {/* Left content */}
          <div>
            <SectionLabel text="Media & Speaking" />
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black leading-tight mb-5">
              Leadership commentary and media inquiries.
            </h2>
            <p className="text-white/55 text-[14px] leading-[1.85] mb-8">
              ZoikoVertex leadership provides commentary on governed AI marketing
              operations, responsible AI adoption, brand governance, and the
              future of accountable automation.
            </p>

            <div className="space-y-2 mb-8">
              {MEDIA_TOPICS.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#0d1424] border border-white/8 hover:border-white/14 transition-colors"
                >
                  <t.icon className="w-4 h-4 text-[#20E7F2] shrink-0" />
                  <span className="text-[13px] text-white/65">{t.label}</span>
                </div>
              ))}
            </div>

            <a
              href="mailto:press@zoikovertex.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-[13px] font-bold hover:bg-[#18d4df] transition"
            >
              <Mail className="w-4 h-4" />
              Contact Press &amp; Media
            </a>
          </div>

          {/* Right: photo */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] lg:aspect-auto lg:h-[420px]">
            <Image
              src="/images/leadership/media-speaking.png"
              alt="ZoikoVertex leadership speaking event"
              fill
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#20E7F2]">
              Leadership FAQ
            </span>
          </div>
          <h2 className="text-[clamp(1.7rem,3.5vw,2.8rem)] font-black text-center mb-16 leading-tight">
            Questions about the team<br className="hidden sm:block" /> behind ZoikoVertex.
          </h2>

          <div className="grid lg:grid-cols-2 gap-x-16">
            <div>
              {FAQS.slice(0, 3).map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
            <div>
              {FAQS.slice(3).map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

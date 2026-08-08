"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users, Database, Bot, Building2, Ban, CreditCard,
  Shield, FileText, Cookie, Lock, Globe,
  FileKey, ChevronDown, ChevronRight, ShieldCheck,
} from "lucide-react";

/* ── DATA ────────────────────────────────────────────────────────── */

const TOC: { id: string; title: string; num: number | null }[] = [
  { id: "acceptance",       title: "Acceptance of Terms",              num: 1  },
  { id: "eligibility",      title: "Eligibility & Users",              num: 2  },
  { id: "accounts",         title: "Accounts & Workspaces",            num: 3  },
  { id: "subscriptions",    title: "Subscriptions & Billing",          num: 4  },
  { id: "enterprise",       title: "Enterprise Agreements",            num: 5  },
  { id: "content",          title: "Customer Content",                 num: 6  },
  { id: "ai-workflows",     title: "AI-Assisted Workflows",            num: 7  },
  { id: "platform-rights",  title: "Platform Rights & IP",             num: 8  },
  { id: "acceptable-use",   title: "Acceptable Use",                   num: 9  },
  { id: "third-party",      title: "Third-Party Integrations",         num: 10 },
  { id: "security",         title: "Security Responsibilities",        num: 11 },
  { id: "privacy-data",     title: "Privacy & Data Processing",        num: 12 },
  { id: "audit-logs",       title: "Audit Logs & Evidence",            num: 13 },
  { id: "availability",     title: "Service Availability",             num: 14 },
  { id: "support",          title: "Support & Communications",         num: 15 },
  { id: "suspension",       title: "Suspension & Termination",         num: 16 },
  { id: "disclaimers",      title: "Disclaimers",                      num: 17 },
  { id: "liability",        title: "Limitation of Liability",          num: 18 },
  { id: "indemnification",  title: "Indemnification",                  num: 19 },
  { id: "governing-law",    title: "Governing Law & Disputes",         num: 20 },
  { id: "changes",          title: "Changes to These Terms",           num: 21 },
  { id: "contact-info",     title: "Contact Information",              num: 22 },
  { id: "faq",              title: "FAQ",                              num: null },
  { id: "related",          title: "Related Pages",                    num: null },
];

const GLANCE = [
  {
    icon: Users,
    iconBg: "bg-blue-100 text-blue-600",
    label: "WHO CAN USE ZOIKOVERTEX",
    text: "ZoikoVertex is a B2B platform for organizations, enterprise teams, agencies, and authorized professional users. Customer administrators are responsible for users they invite.",
  },
  {
    icon: Database,
    iconBg: "bg-yellow-100 text-yellow-600",
    label: "YOUR CONTENT STAYS YOURS",
    text: "Customers retain ownership of customer content. ZoikoVertex needs a limited license to host, process, and use content only to provide, secure, support, and improve the service.",
  },
  {
    icon: Bot,
    iconBg: "bg-green-100 text-green-600",
    label: "AI OUTPUTS NEED HUMAN REVIEW",
    text: "AI-assisted features are assistive tools. Users must review, verify, and approve AI outputs before publication, reliance, or external distribution. AI does not replace human judgment.",
  },
  {
    icon: Building2,
    iconBg: "bg-purple-100 text-purple-600",
    label: "ENTERPRISE AGREEMENTS MAY OVERRIDE",
    text: "Signed enterprise agreements, order forms, DPAs, and SLAs may supplement or override these online Terms where expressly stated in writing.",
  },
  {
    icon: Ban,
    iconBg: "bg-red-100 text-red-600",
    label: "MISUSE HAS CONSEQUENCES",
    text: "Prohibited use, non-payment, security risk, legal risk, or breach of these Terms may result in suspension or termination of access.",
  },
  {
    icon: CreditCard,
    iconBg: "bg-amber-100 text-amber-600",
    label: "SUBSCRIPTIONS AUTO-RENEW",
    text: "Subscriptions renew automatically unless cancelled before the renewal date. Free trials do not automatically convert to paid plans — conversion requires an affirmative purchase. Billing, cancellation, and refund rules must be reviewed before subscribing.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What are the ZoikoVertex Terms of Service?",
    a: "These Terms govern your access to and use of the ZoikoVertex platform, including accounts, subscriptions, customer content, AI-assisted workflows, acceptable use, integrations, audit logs, suspension, termination, and enterprise agreements.",
  },
  {
    q: "Who can use ZoikoVertex?",
    a: "ZoikoVertex is designed for business and organizational use by enterprise teams, agencies, multi-brand organizations, and professional users. Users must have authority to act on behalf of their organization and meet applicable age requirements.",
  },
  {
    q: "Who owns content uploaded to ZoikoVertex?",
    a: "Customers retain ownership of their customer content. ZoikoVertex receives only a limited license to host, process, and transmit content as needed to provide, secure, support, and improve the service.",
  },
  {
    q: "Can users rely on AI-assisted outputs without review?",
    a: "No. AI-assisted features are assistive tools that support human judgment — they do not replace it. Users must review, verify, and approve AI outputs before publication, reliance, or external distribution.",
  },
  {
    q: "What uses of ZoikoVertex are prohibited?",
    a: "Prohibited uses include unlawful, deceptive, harmful, infringing, or abusive activity; impersonation; bypassing security or governance controls; unauthorized scraping or model extraction; and using ZoikoVertex in industries or jurisdictions where prohibited by applicable law.",
  },
  {
    q: "How do ZoikoVertex subscriptions and cancellations work?",
    a: "Standard subscriptions are billed monthly for Vertex Growth and Vertex Scale. Vertex Starter is a free, permanent tier with no payment method required. Annual, usage-based, or custom enterprise billing applies only where separately approved and disclosed at checkout or in an order form. Subscriptions renew automatically unless cancelled before the renewal date; cancellation takes effect at the end of the current paid period. ZoikoVertex does not apply hidden usage charges — no fees arise from failed AI jobs, failed publishes, pending invitations, or approvals unless an add-on is affirmatively accepted.",
  },
  {
    q: "Do enterprise customers have separate terms?",
    a: "Yes. Enterprise customers may have signed agreements — including master agreements, order forms, DPAs, and SLAs — that supplement or override these online Terms where expressly stated. Signed enterprise agreements take priority over these Terms.",
  },
  {
    q: "How do these Terms relate to the Privacy Policy and DPA?",
    a: "These Terms govern platform access and use. The Privacy Policy governs ZoikoVertex's handling of personal information. The Data Processing Addendum governs enterprise processing of customer personal data inside workspaces. All three documents apply in enterprise relationships.",
  },
];

/* ── SUB-COMPONENTS ──────────────────────────────────────────────── */

function Badge({ label, variant }: { label: string; variant: string }) {
  const styles: Record<string, string> = {
    blue:   "border-blue-300 text-blue-700 bg-blue-50",
    gray:   "border-gray-300 text-gray-500 bg-gray-50",
    amber:  "border-amber-300 text-amber-700 bg-amber-50",
    orange: "border-orange-300 text-orange-700 bg-orange-50",
    purple: "border-purple-300 text-purple-700 bg-purple-50",
    teal:   "border-teal-300 text-teal-700 bg-teal-50",
    red:    "border-red-300 text-red-700 bg-red-50",
    indigo: "border-indigo-300 text-indigo-700 bg-indigo-50",
    green:  "border-green-300 text-green-700 bg-green-50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${styles[variant] ?? styles.gray}`}>
      {label}
    </span>
  );
}

function SectionHeading({
  id, title, badge, num,
}: {
  id: string; title: string; badge?: { label: string; variant: string }; num: number;
}) {
  return (
    <>
      <p className="sm:hidden text-[9px] font-mono font-bold uppercase tracking-[0.22em] text-gray-400 mb-2">
        Section {String(num).padStart(2, "0")}
      </p>
      <h2
        id={id}
        className="text-[22px] font-black text-gray-900 tracking-tight scroll-mt-24 flex items-center flex-wrap gap-1.5"
      >
        {title}
        {badge && (
          <span className="hidden sm:inline">
            <Badge label={badge.label} variant={badge.variant} />
          </span>
        )}
      </h2>
      {badge && (
        <div className="mt-2 sm:hidden">
          <Badge label={badge.label} variant={badge.variant} />
        </div>
      )}
    </>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[14.5px] text-gray-700 leading-[1.75]">{children}</p>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#20E7F2] shrink-0" />
          <span className="text-[14px] text-gray-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CalloutBox({
  lead, text, variant = "teal",
}: {
  lead: string; text: string; variant?: "teal" | "amber" | "indigo";
}) {
  const s = {
    teal:   "border-[#20E7F2] bg-sky-50/60",
    amber:  "border-amber-400 bg-amber-50/60",
    indigo: "border-indigo-400 bg-indigo-50/60",
  };
  return (
    <div className={`mt-5 border-l-4 ${s[variant]} px-5 py-4 rounded-r-xl`}>
      <p className="text-[13.5px] text-gray-800 leading-relaxed">
        <span className="font-bold">{lead}</span> {text}
      </p>
    </div>
  );
}

function InfoBox({ lead, text }: { lead: string; text: string }) {
  return (
    <div className="mt-5 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
      <span className="text-amber-500 text-base shrink-0 mt-0.5">ⓘ</span>
      <p className="text-[13.5px] text-gray-800 leading-relaxed">
        <span className="font-bold">{lead}</span> {text}
      </p>
    </div>
  );
}

function DataTable({
  headers, rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm" style={{ minWidth: "420px" }}>
        <thead>
          <tr className="bg-[#0d1424]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3.5 text-[13px] text-gray-700 leading-relaxed align-top ${j === 0 ? "font-medium text-gray-800" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberedTable({
  header, rows,
}: {
  header: string;
  rows: { num: number; label: string; desc: string }[];
}) {
  return (
    <div className="mt-4 rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-[#0d1424] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{header}</p>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map(({ num, label, desc }) => (
            <tr key={num} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3.5 text-[13px] font-bold text-gray-400 w-8 align-top">{num}</td>
              <td className="px-4 py-3.5 text-[13px] font-medium text-gray-800 align-top w-44">{label}</td>
              <td className="hidden sm:table-cell px-4 py-3.5 text-[13px] text-gray-600 leading-relaxed align-top">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Divider() {
  return <hr className="my-10 border-gray-100" />;
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div id="faq" className="scroll-mt-24">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">FAQ</p>
      <h3 className="text-[20px] font-black text-gray-900 mb-1">Frequently Asked Questions</h3>
      <p className="text-[13.5px] text-gray-500 mb-5">Quick answers to common questions about the ZoikoVertex Terms of Service.</p>
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {FAQ_ITEMS.map(({ q, a }, i) => (
          <div key={q} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
            >
              <span className="text-[13.5px] font-medium text-gray-800 pr-4">{q}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
            </button>
            {openIdx === i && (
              <div className="px-5 pb-4">
                <p className="text-[13px] text-gray-500 leading-relaxed">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PAGE ────────────────────────────────────────────────────────── */

export default function TermsPage() {
  const [activeId, setActiveId] = useState(TOC[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveId(entry.target.id); break; }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    TOC.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f6f8]">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 sm:py-20">

          {/* Mobile breadcrumb */}
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-6 flex-wrap sm:hidden">
            <span>ZoikoVertex</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span>Trust &amp; Legal</span>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-white/60">Terms of Service</span>
          </div>

          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-black text-white tracking-tight leading-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-[15px] text-white/50 max-w-[600px] leading-relaxed">
            These Terms govern access to and use of ZoikoVertex — including accounts, subscriptions, customer content, AI-assisted workflows, acceptable use, integrations, audit logs, suspension, termination, and enterprise agreements.
          </p>

          {/* Mobile: metadata + CTAs + pre-publication notice */}
          <div className="sm:hidden">
            <div className="border-t border-white/10 mt-8 pt-6 mb-6 space-y-3">
              {[
                { label: "EFFECTIVE",     value: "[To be confirmed by legal]" },
                { label: "LAST UPDATED",  value: "[To be confirmed by legal]" },
                { label: "ENTITY",        value: "Zoiko Tech Inc. · Zoiko Group" },
                { label: "LEGAL CONTACT", value: "[legal@zoikovertex.com]" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline gap-2 text-[11px] flex-wrap">
                  <span className="font-mono font-bold text-white/30 tracking-wider shrink-0">{label}</span>
                  <span className="text-white/65">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 mb-8">
              <button className="inline-flex items-center gap-2 bg-[#20E7F2] text-[#080d1a] font-bold px-6 py-3 rounded-full text-[13px] w-fit">
                <FileText className="w-4 h-4" />
                Contact Legal
              </button>
              <div className="flex gap-2.5 flex-wrap">
                <button className="inline-flex items-center gap-2 border border-white/25 text-white/80 font-semibold px-5 py-2.5 rounded-full text-[13px]">
                  <FileKey className="w-4 h-4" />
                  View DPA
                </button>
                <button className="inline-flex items-center gap-2 border border-white/25 text-white/80 font-semibold px-5 py-2.5 rounded-full text-[13px]">
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </button>
              </div>
            </div>

            <div className="border border-amber-400/30 bg-amber-400/[0.08] rounded-xl px-4 py-4 flex gap-3">
              <span className="text-amber-400 shrink-0 mt-0.5 text-base">⚠</span>
              <p className="text-[11px] font-mono leading-relaxed text-amber-300/80">
                <span className="font-bold text-amber-300">Pre-publication notice for legal and product review.</span>{" "}
                These Terms must be finalized by counsel before publication. Legal entity, subscription mechanics, AI provider terms, customer content rights, acceptable use boundaries, enterprise agreement hierarchy, suspension triggers, termination consequences, liability caps, indemnification scope, and governing law must all be confirmed. All bracketed fields require legal sign-off. Do not publish until all launch blockers are resolved.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── TERMS AT A GLANCE ─────────────────────────────────── */}
      <section className="bg-[#eef0f4] py-16 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">

          {/* Mobile heading */}
          <div className="sm:hidden mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#20E7F2]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#20E7F2]">Terms at a Glance</p>
            </div>
            <h2 className="text-[2rem] font-black text-gray-900 tracking-tight leading-tight mb-3">
              Plain English, first.
            </h2>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              Six things you should understand about the ZoikoVertex Terms of Service before reading the full text.
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden sm:block text-center mb-10">
            <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-black text-gray-900 tracking-tight mb-2">
              Terms at a Glance
            </h2>
            <p className="text-[14px] text-gray-500 max-w-[560px] mx-auto leading-relaxed">
              Six things you should understand about the ZoikoVertex Terms of Service before reading the full text.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLANCE.map(({ icon: Icon, iconBg, label, text }) => (
              <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-white/80 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5">{label}</p>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN: SIDEBAR + CONTENT ───────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12">
        <div className="flex gap-12 items-start">

          {/* LEFT — sticky TOC (desktop only) */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-[88px]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Contents</p>
            <nav className="space-y-0.5">
              {TOC.map((item) => {
                const isActive = activeId === item.id;
                const isSpecial = item.num === null;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`flex items-start gap-2 py-1.5 rounded-lg text-[11.5px] transition-colors leading-snug ${
                      isActive
                        ? isSpecial
                          ? "text-[#0d8d9a] font-semibold border-l-2 border-[#20E7F2] pl-2.5 rounded-l-none"
                          : "text-[#0d8d9a] font-semibold bg-[#20E7F2]/10 px-2.5"
                        : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2.5"
                    }`}
                  >
                    {item.num !== null && (
                      <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${isActive ? "text-[#20E7F2]" : "text-gray-300"}`}>
                        {String(item.num).padStart(2, "0")}
                      </span>
                    )}
                    {item.title}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* RIGHT — content */}
          <main className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 sm:px-6 lg:px-8 py-8 lg:py-10">

            {/* 1. Acceptance of Terms */}
            <SectionHeading id="acceptance" title="Acceptance of Terms" badge={{ label: "All users", variant: "blue" }} num={1} />
            <Body>By creating an account, accessing the platform, accepting a trial, executing an order form, or otherwise using ZoikoVertex, you agree to be bound by these Terms of Service and any policies or documents incorporated by reference.</Body>
            <Body>If you are accepting these Terms on behalf of an organization, you represent that you have the authority to bind that organization. If you do not accept these Terms, you must stop using ZoikoVertex immediately.</Body>
            <CalloutBox lead="Customer responsibility for authorized users." text="Customers are responsible for ensuring all authorized users, external collaborators, agencies, and contractors accessing their workspace comply with these Terms." />

            <Divider />

            {/* 2. Eligibility & Users */}
            <SectionHeading id="eligibility" title="Eligibility and Authorized Users" badge={{ label: "B2B platform", variant: "gray" }} num={2} />
            <Body>ZoikoVertex is designed primarily for business and organizational use by enterprise teams, agencies, multi-brand organizations, and professional users. Users must meet the minimum age required by applicable law and have authority to act on behalf of their organization where required.</Body>
            <BulletList items={[
              "Users must be at least [minimum age — to be confirmed by legal] years old",
              "Customer administrators are responsible for user roles, permissions, and workspace access",
              "Credential sharing, impersonation, and unauthorized workspace access are prohibited",
              "External collaborators, agencies, contractors, and freelancers must be managed by the customer",
              "ZoikoVertex reserves the right to verify eligibility and decline or terminate accounts",
            ]} />

            <Divider />

            {/* 3. Accounts & Workspaces */}
            <SectionHeading id="accounts" title="Accounts, Workspaces, and Administration" badge={{ label: "Admin", variant: "amber" }} num={3} />
            <Body>Account holders must provide accurate and complete information and keep it current. Customers control workspace configuration, role assignments, approval authority, brand governance settings, and administrative permissions within their account.</Body>
            <BulletList items={[
              "Users must protect account credentials and use appropriate authentication",
              "Suspected unauthorized access must be reported to ZoikoVertex immediately",
              "Customers are responsible for activity occurring under accounts they control",
              "Departed users and external collaborators should be removed promptly",
              "Role-based access, workspace boundaries, and approval authority operate as configured by the customer administrator",
            ]} />
            <CalloutBox lead="Administrative visibility." text="Customer administrators may see user activity, workflow records, approval history, and audit events within their workspace depending on permissions and plan configuration." />

            <Divider />

            {/* 4. Subscriptions & Billing */}
            <SectionHeading id="subscriptions" title="Plans, Subscriptions, Billing, and Cancellation" badge={{ label: "Financial", variant: "orange" }} num={4} />
            <Body>Access to ZoikoVertex is provided through subscription plans: Vertex Starter (free, permanent), Vertex Growth, Vertex Scale, and Vertex Corporate. Vertex Starter requires no payment method and does not automatically convert to a paid plan. Plan features, limits, and prices vary by tier or order form. By subscribing, customers authorize ZoikoVertex or its payment processor to charge applicable fees and taxes.</Body>
            <CalloutBox lead="No hidden usage charges." text="ZoikoVertex does not bill for failed, cancelled, denied, or duplicate AI jobs, failed publishes, pending invitations, external collaborators, or approvals. Customer advertising and media spend paid to third-party providers is separate from ZoikoVertex subscription fees and is not charged through the ZoikoVertex payment method by default." />
            <DataTable
              headers={["TOPIC", "REQUIRED UNDERSTANDING"]}
              rows={[
                ["Billing Cycle",         "Standard self-serve plans are billed monthly. Annual, usage-based, or custom enterprise billing applies only where separately approved and disclosed at checkout or in the order form."],
                ["Auto-Renewal",          "Subscriptions renew automatically unless cancelled before the renewal date. Renewal period, billing timing, and notice are disclosed at checkout or in the order form."],
                ["Free Trials",           "Vertex Growth may be evaluated through a 14-day trial that requires no card. Trials do not automatically convert to paid plans; conversion requires an affirmative purchase. At trial expiry, access returns to Vertex Starter functionality unless a purchase is completed. [Trial length and mechanics to be confirmed by legal.]"],
                ["Cancellation",          "Customers may cancel through the admin console or by contacting support. Cancellation takes effect at the end of the current paid period unless otherwise stated."],
                ["Refunds",               "[Refund policy to be confirmed by legal and aligned with applicable law and checkout terms.]"],
                ["Taxes",                 "Customers are responsible for applicable taxes, including sales tax, VAT, GST, withholding, and similar charges, unless ZoikoVertex is required by law to collect them."],
                ["Non-Payment",           "Failure to pay may result in account suspension. Outstanding fees remain due after suspension or termination."],
                ["Data After Cancellation","Customers should export data before cancellation takes effect. [Export window, retention, and deletion timing to be confirmed.]"],
              ]}
            />
            <InfoBox lead="Legal confirmation required." text="All subscription mechanics — including billing cycles, renewal timing, trial conversion, cancellation methods, refund position, tax handling, and data-deletion timelines — must be confirmed before publication and aligned with checkout flows and order forms." />

            <Divider />

            {/* 5. Enterprise Agreements */}
            <SectionHeading id="enterprise" title="Enterprise Agreements and Order Forms" badge={{ label: "Enterprise", variant: "purple" }} num={5} />
            <Body>Enterprise customers may enter into signed agreements, order forms, Data Processing Addenda, Service-Level Agreements, statements of work, or written amendments that supplement or override these online Terms where expressly stated.</Body>
            <NumberedTable
              header="AGREEMENT HIERARCHY — CONTROLS FROM HIGHEST TO LOWEST PRIORITY"
              rows={[
                { num: 1, label: "Master / Enterprise Agreement", desc: "Controls core negotiated legal terms where expressly agreed in writing." },
                { num: 2, label: "Order Form",                    desc: "Defines plan, term, fees, users, usage, support, renewal, and customer-specific terms." },
                { num: 3, label: "Data Processing Addendum",      desc: "Governs qualifying processing of customer personal information." },
                { num: 4, label: "Service-Level Agreement",       desc: "Applies only where expressly included in the order form or written agreement." },
                { num: 5, label: "Online Terms of Service",       desc: "Default terms for platform use unless modified by written agreement." },
                { num: 6, label: "Product Policies & Docs",       desc: "Operational rules, feature guidance, acceptable use, and implementation details." },
              ]}
            />
            <CalloutBox lead="Conflict resolution." text="In the event of a conflict between documents, the highest-priority document in this hierarchy controls on that specific point, unless expressly agreed otherwise in writing." />
            <div className="sm:hidden mt-5">
              <button className="inline-flex items-center gap-2 bg-[#20E7F2] text-[#080d1a] font-bold px-5 py-2.5 rounded-full text-[13px]">
                <FileKey className="w-4 h-4" />
                View Data Processing Addendum
              </button>
            </div>

            <Divider />

            {/* 6. Customer Content */}
            <SectionHeading id="content" title="Customer Content" badge={{ label: "Your data", variant: "teal" }} num={6} />
            <Body>Customer content may include marketing drafts, campaign materials, brand assets, prompts, AI-assisted outputs, approval comments, publishing instructions, performance data, evidence records, audit logs, and workflow records submitted to or created within ZoikoVertex.</Body>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Lock,
                  label: "You retain ownership",
                  desc: "Customers retain ownership of their customer content, subject to the license needed to provide the service.",
                },
                {
                  icon: FileText,
                  label: "Limited platform license",
                  desc: "ZoikoVertex has a limited right to host, store, process, transmit, and use content only to operate, secure, support, and improve the service.",
                },
                {
                  icon: Users,
                  label: "Customer responsibility",
                  desc: "Customers must have all rights, permissions, consents, and lawful basis required to upload and use their content in ZoikoVertex.",
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="border border-gray-100 rounded-xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center mb-3">
                    <Icon className="w-3.5 h-3.5 text-[#0d8d9a]" />
                  </div>
                  <p className="text-[13px] font-bold text-gray-800 mb-1">{label}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <BulletList items={[
              "Customers remain responsible for content they approve, publish, export, distribute, or connect to third-party platforms",
              "Customers must not submit content that infringes rights, violates law, or breaches third-party terms",
              "Export and deletion timelines after cancellation or termination are described in Section 16 and confirmed by legal before publication",
            ]} />

            <Divider />

            {/* 7. AI-Assisted Workflows */}
            <SectionHeading id="ai-workflows" title="AI-Assisted Workflows and User Responsibility" badge={{ label: "High scrutiny", variant: "red" }} num={7} />
            <Body>ZoikoVertex supports AI-assisted marketing workflows. These features are assistive tools designed to support — not replace — human judgment, legal review, compliance review, brand review, regulatory review, and customer responsibility.</Body>
            <div className="mt-5 bg-[#0d1424] rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">AI-Assisted Workflow Rules</p>
                  <p className="text-[11px] text-white/40">These rules apply to all AI-assisted features in ZoikoVertex.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "REVIEW BEFORE USE",                  text: "Users must review, edit, verify, and approve AI-assisted outputs before reliance, publication, export, or external distribution." },
                  { label: "AI OUTPUT LIMITATIONS",              text: "AI outputs may be inaccurate, incomplete, biased, outdated, or unsuitable. ZoikoVertex does not warrant their accuracy, completeness, or fitness for any purpose." },
                  { label: "NOT PROFESSIONAL ADVICE",            text: "AI outputs are not legal, financial, medical, tax, employment, regulatory, or professional advice of any kind." },
                  { label: "CUSTOMER RESPONSIBILITY FOR INPUTS", text: "Customers are responsible for all prompts, inputs, datasets, content, and instructions submitted into AI-assisted workflows." },
                  { label: "OUTPUT OWNERSHIP",                   text: "[AI output ownership, provider restrictions, prompt retention, and training position — to be confirmed by legal and aligned with Privacy Policy, DPA, and provider terms.]" },
                  { label: "PROHIBITED AI USES",                 text: "High-risk, deceptive, discriminatory, manipulative, unlawful, infringing, unsafe, or security-abusive AI uses are strictly prohibited. See Section 9." },
                ].map(({ label, text }) => (
                  <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">{label}</p>
                    <p className="text-[12px] text-white/60 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <CalloutBox lead="Governance principle." text="ZoikoVertex is designed so that AI assists work — not replaces accountability. Human review, approval authority, and organizational responsibility remain with the customer at all times. See our Responsible AI page for platform design principles." />

            <Divider />

            {/* 8. Platform Rights & IP */}
            <SectionHeading id="platform-rights" title="Platform Rights and Intellectual Property" badge={{ label: "ZoikoVertex IP", variant: "indigo" }} num={8} />
            <Body>ZoikoVertex and its licensors own the platform, software, interfaces, workflows, designs, documentation, trademarks, service marks, logos, templates, analytics systems, governance tools, and all related technology. Customers receive only a limited, non-exclusive, non-transferable right to access and use the service in accordance with these Terms and any applicable order form.</Body>
            <BulletList items={[
              "No right to copy, reverse engineer, decompile, scrape, or extract the platform beyond permitted access",
              "No right to resell, sublicense, or create competing products through unauthorized use of the platform",
              "No right to remove, alter, or obscure any proprietary notices",
              "Feedback, suggestions, and ideas submitted to ZoikoVertex may be used without compensation or obligation unless otherwise agreed in writing",
              "No ownership rights are transferred except as expressly stated",
            ]} />

            <Divider />

            {/* 9. Acceptable Use */}
            <SectionHeading id="acceptable-use" title="Acceptable Use" badge={{ label: "Prohibited activity", variant: "orange" }} num={9} />
            <Body>Users must not use ZoikoVertex in any manner that is unlawful, deceptive, harmful, infringing, discriminatory, malicious, abusive, or contrary to these Terms. The following uses are expressly prohibited.</Body>
            <div className="mt-5 bg-[#0d1424] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-400/30 flex items-center justify-center shrink-0">
                  <Ban className="w-3.5 h-3.5 text-red-300" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">Prohibited Uses</p>
                  <p className="text-[11px] text-white/40">Any of the following may result in immediate suspension or termination of access.</p>
                </div>
              </div>
              <ul className="px-5 py-4 space-y-3">
                {[
                  "Unlawful, deceptive, fraudulent, harmful, or abusive use of the platform or its features",
                  "Impersonation, false affiliation, misleading endorsement, phishing, scams, spam, social engineering, or unauthorized tracking",
                  "Attempting to bypass permissions, approval controls, rate limits, security controls, workspace boundaries, or access restrictions",
                  "Uploading prohibited, unnecessary, highly sensitive, or unlawfully obtained data without express contractual authorization",
                  "Using AI-assisted features for manipulation, unlawful targeting, discrimination, political misinformation, regulated professional advice, or unsafe automation",
                  "Unauthorized resale, sublicensing, scraping, harvesting, model extraction, or competitive misuse of the platform or its outputs",
                  "Transmitting malware, viruses, disruptive code, or content that damages systems, data, or other users",
                  "Using ZoikoVertex in industries, activities, or jurisdictions where such use is prohibited by applicable law or expressly restricted by ZoikoVertex policy",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-red-400 shrink-0 text-sm font-bold mt-0.5">✕</span>
                    <span className="text-[13px] text-white/60 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Divider />

            {/* 10. Third-Party Integrations */}
            <SectionHeading id="third-party" title="Third-Party Services and Integrations" badge={{ label: "External platforms", variant: "green" }} num={10} />
            <Body>ZoikoVertex may connect with third-party services including social networks, advertising platforms, analytics tools, identity providers, CRM systems, storage platforms, AI providers, payment processors, and collaboration tools. These services are governed by their own terms, APIs, availability, data practices, and platform policies.</Body>
            <BulletList items={[
              "Customers authorize data exchange when connecting third-party accounts to ZoikoVertex",
              "ZoikoVertex is not responsible for third-party downtime, API restrictions, policy changes, content removals, ad rejections, or account restrictions",
              "Customers remain responsible for connected account permissions, credentials, configuration, and published activity",
              "Third-party platform rules — including advertising policies, content standards, and API terms — apply to customer activity conducted through ZoikoVertex",
            ]} />

            <Divider />

            {/* 11. Security Responsibilities */}
            <SectionHeading id="security" title="Security Responsibilities" badge={{ label: "Shared model", variant: "blue" }} num={11} />
            <Body>ZoikoVertex is designed to maintain reasonable administrative, technical, and organizational safeguards appropriate to a B2B AI marketing operations platform. Security is a shared responsibility between ZoikoVertex and its customers.</Body>
            <CalloutBox variant="teal"  lead="ZoikoVertex responsibility:" text="Maintain platform security controls, access management, monitoring, secure development practices, and incident readiness as described in our Security page." />
            <CalloutBox variant="amber" lead="Customer responsibility:"  text="Protect credentials, use appropriate authentication, assign correct roles, remove departed users, monitor external collaborators, secure connected third-party accounts, and notify ZoikoVertex promptly of suspected unauthorized access." />
            <InfoBox lead="No security guarantee." text="No system can provide absolute security. ZoikoVertex does not guarantee that the platform will be free of unauthorized access, data breaches, vulnerabilities, or security incidents." />

            <Divider />

            {/* 12. Privacy & Data Processing */}
            <SectionHeading id="privacy-data" title="Privacy, Cookies, and Data Processing" badge={{ label: "Related documents", variant: "teal" }} num={12} />
            <Body>The collection, use, sharing, retention, and protection of personal information in connection with ZoikoVertex is governed by our Privacy Policy. Cookie choices are managed through our Cookie Preferences page. Enterprise processing of customer personal information is governed by the Data Processing Addendum.</Body>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Lock,    title: "Privacy Policy",           desc: "Explains how ZoikoVertex collects, uses, shares, retains, and protects personal information.", href: "/privacy" },
                { icon: Cookie,  title: "Cookie Preferences",       desc: "Manage non-essential cookie settings including analytics and marketing cookies.",              href: "#" },
                { icon: FileKey, title: "Data Processing Addendum", desc: "Governs processing of customer personal information under enterprise agreements.",             href: "#" },
              ].map(({ icon: Icon, title, desc, href }) => (
                <Link key={title} href={href} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/60 transition-colors group block">
                  <div className="w-7 h-7 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center mb-3">
                    <Icon className="w-3.5 h-3.5 text-[#0d8d9a]" />
                  </div>
                  <p className="text-[13px] font-bold text-gray-800 group-hover:text-[#0d8d9a] transition-colors mb-1">{title}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{desc}</p>
                </Link>
              ))}
            </div>

            <Divider />

            {/* 13. Audit Logs & Evidence */}
            <SectionHeading id="audit-logs" title="Audit Logs, Evidence Records, and Administrative Visibility" badge={{ label: "Platform records", variant: "purple" }} num={13} />
            <Body>ZoikoVertex may generate workflow records, approval history, audit logs, evidence records, security logs, administrative activity records, and system events in connection with platform use.</Body>
            <BulletList items={[
              "Customer administrators, approvers, reviewers, and auditors may have visibility into workspace activity depending on their role and plan configuration",
              "Records may be used for security, troubleshooting, governance, support, legal compliance, enforcement, dispute resolution, and customer reporting",
              "Retention may vary by customer settings, order form, DPA, applicable legal requirements, platform security needs, and operational obligations",
              "Customers should export or archive records they need before cancellation or termination takes effect",
            ]} />
            <CalloutBox lead="Evidence records." text="ZoikoVertex is designed to create audit records naturally as workflow activity occurs. See our Auditability page for platform design principles around evidence." />

            <Divider />

            {/* 14. Service Availability */}
            <SectionHeading id="availability" title="Service Availability, Changes, and Beta Features" badge={{ label: "Expectations", variant: "gray" }} num={14} />
            <Body>ZoikoVertex will make reasonable efforts to provide reliable platform access. However, no uptime commitment is made unless expressly backed by a signed Service-Level Agreement included in a customer&apos;s order form or written agreement.</Body>
            <BulletList items={[
              "ZoikoVertex may update features, APIs, integrations, interfaces, workflows, plans, pricing, or platform behavior with reasonable notice where practicable",
              "Beta, preview, experimental, or early-access features are provided as-is and may be incomplete, unstable, changed, or withdrawn without notice",
              "Scheduled maintenance, emergency incidents, security events, or third-party API changes may temporarily affect access or functionality",
              "ZoikoVertex may discontinue the service or specific features with appropriate notice as determined by applicable law and customer agreement",
            ]} />

            <Divider />

            {/* 15. Support & Communications */}
            <SectionHeading id="support" title="Support, Maintenance, and Communications" badge={{ label: "Contact", variant: "green" }} num={15} />
            <Body>Support channels and response expectations may vary by plan, tier, order form, or enterprise agreement. No guaranteed response time is provided unless expressly included in a signed SLA or order form.</Body>
            <BulletList items={[
              "Customers must maintain accurate administrator, billing, security, and support contact information",
              "ZoikoVertex may send service, security, billing, product, maintenance, legal, and administrative communications to the addresses on record",
              "Customers are responsible for ensuring notices reach the appropriate personnel within their organization",
            ]} />

            <Divider />

            {/* 16. Suspension & Termination */}
            <SectionHeading id="suspension" title="Suspension and Termination" badge={{ label: "Account restrictions", variant: "orange" }} num={16} />
            <Body>ZoikoVertex may suspend or terminate access to the platform in response to the following:</Body>
            <BulletList items={[
              "Non-payment of applicable fees after the applicable grace period",
              "Breach of these Terms, acceptable use requirements, or applicable law",
              "Security risk, unauthorized access, or suspicious platform activity",
              "Legal risk, regulatory requirement, or third-party platform enforcement action",
              "Misuse of AI-assisted features, prohibited use, or excessive platform burden",
            ]} />
            <CalloutBox lead="Post-termination." text="Following termination — customer-initiated or by ZoikoVertex — access ends as of the effective termination date. Customers should export required data before termination. Outstanding fees remain payable. Audit logs, evidence records, and workflow data are handled according to the DPA, order form, and applicable legal requirements. [Exact export window and deletion timeline to be confirmed by legal.]" />

            <Divider />

            {/* 17. Disclaimers */}
            <SectionHeading id="disclaimers" title="Disclaimers" badge={{ label: "As-is service", variant: "gray" }} num={17} />
            <Body>To the fullest extent permitted by applicable law, ZoikoVertex is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, title, and non-infringement.</Body>
            <Body>ZoikoVertex does not warrant:</Body>
            <BulletList items={[
              "Uninterrupted, error-free, secure, or risk-free platform operation unless backed by a signed SLA",
              "Specific marketing performance, revenue, engagement, conversions, ROI, or campaign outcomes",
              "Accuracy, completeness, suitability, non-infringement, or freedom from bias of any AI-assisted output",
              "That connected third-party platforms will function, approve content, or maintain their policies",
              "That the platform satisfies any legal, regulatory, or compliance requirement applicable to the customer's business",
            ]} />
            <CalloutBox variant="amber" lead="No professional advice." text="Nothing in ZoikoVertex or its outputs constitutes legal, financial, medical, tax, employment, regulatory, or professional advice. Customers remain solely responsible for review by qualified professionals." />

            <Divider />

            {/* 18. Limitation of Liability */}
            <SectionHeading id="liability" title="Limitation of Liability" badge={{ label: "Liability cap", variant: "orange" }} num={18} />
            <Body>To the fullest extent permitted by applicable law, ZoikoVertex&apos;s total cumulative liability to a customer arising out of or relating to these Terms or the service shall not exceed [liability cap — to be determined by counsel based on pricing, insurance, jurisdiction, and enterprise strategy].</Body>
            <Body>ZoikoVertex shall not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost goodwill, lost data, business interruption, or marketing losses, even if advised of the possibility of such damages.</Body>
            <InfoBox lead="Legal confirmation required." text="Liability cap, exclusions, exceptions required by applicable law, DPA-related liability alignment, and enterprise-negotiation strategy must be confirmed by counsel before publication." />

            <Divider />

            {/* 19. Indemnification */}
            <SectionHeading id="indemnification" title="Indemnification" badge={{ label: "Customer obligations", variant: "purple" }} num={19} />
            <Body>Customers agree to indemnify, defend, and hold harmless ZoikoVertex, its affiliates, officers, directors, employees, agents, and licensors from and against claims, liabilities, damages, costs, and expenses (including reasonable legal fees) arising from or related to:</Body>
            <BulletList items={[
              "Customer content, including intellectual property infringement, privacy violations, or rights violations",
              "Unlawful marketing, advertising, or campaign activity conducted through the platform",
              "Misuse of AI-assisted features or violation of acceptable use requirements",
              "Breach of customer representations, warranties, or obligations under these Terms",
              "Unauthorized access caused by customer failure to manage credentials, roles, or collaborators",
              "Third-party platform policy violations arising from customer activity",
              "Agency-client disputes arising from use of customer workspaces",
            ]} />

            <Divider />

            {/* 20. Governing Law & Disputes */}
            <SectionHeading id="governing-law" title="Governing Law and Dispute Resolution" badge={{ label: "Legal framework", variant: "blue" }} num={20} />
            <Body>These Terms shall be governed by and construed in accordance with the laws of [governing jurisdiction — to be confirmed by legal], without regard to conflict of law principles.</Body>
            <InfoBox lead="Legal confirmation required." text="Governing law, venue, court or arbitration forum, informal dispute process, class-action and jury-trial waiver appropriateness, injunctive relief provisions, consumer-law exceptions, and enterprise-agreement override must all be confirmed by counsel before publication." />
            <BulletList items={[
              "Disputes should first be addressed through the informal notice and resolution process described in the final published Terms",
              "ZoikoVertex may seek injunctive or equitable relief for IP infringement, platform misuse, security breaches, or confidentiality violations without following any informal dispute process",
              "Enterprise agreements may include separate dispute resolution provisions that override these online Terms",
            ]} />

            <Divider />

            {/* 21. Changes to These Terms */}
            <SectionHeading id="changes" title="Changes to These Terms" badge={{ label: "Updates", variant: "green" }} num={21} />
            <Body>ZoikoVertex may update these Terms from time to time. When material changes are made, ZoikoVertex will provide notice through the platform, email, or other appropriate means as required by applicable law. The effective date at the top of these Terms will be updated accordingly.</Body>
            <BulletList items={[
              "Continued use of ZoikoVertex after the effective date of updated Terms constitutes acceptance of the updated Terms",
              "If you do not accept updated Terms, you must stop using ZoikoVertex before the updated Terms take effect",
              "Enterprise agreement exceptions may apply where written agreements include change-notification or consent requirements",
              "Prior versions may be archived for enterprise review where operationally supported",
            ]} />

            <Divider />

            {/* 22. Contact Information */}
            <SectionHeading id="contact-info" title="Contact Information" badge={{ label: "Get in touch", variant: "teal" }} num={22} />
            <Body>For legal inquiries, enterprise contracting, and Terms-related questions, use the following contact routes.</Body>
            <div className="mt-5 bg-[#0d1424] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.05]">
                {[
                  { label: "LEGAL EMAIL",           value: "[legal@zoikovertex.com — to be confirmed]",              link: false, href: "" },
                  { label: "PRIVACY CONTACT",        value: "View Privacy Policy",                                    link: true,  href: "/privacy" },
                  { label: "REGISTERED ADDRESS",     value: "[Zoiko Tech Inc. — registered address to be confirmed by legal]", link: false, href: "" },
                  { label: "ENTERPRISE CONTRACTING", value: "Contact Enterprise Sales",                               link: true,  href: "#" },
                  { label: "CUSTOMER SUPPORT",       value: "[Support route and response expectations — to be confirmed]", link: false, href: "" },
                  { label: "DATA PROCESSING",        value: "View Data Processing Addendum",                          link: true,  href: "#" },
                ].map(({ label, value, link, href }) => (
                  <div key={label} className="bg-[#0d1424] px-5 py-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">{label}</p>
                    {link ? (
                      <Link href={href} className="text-[13px] text-[#20E7F2] hover:underline">{value}</Link>
                    ) : (
                      <p className="text-[13px] text-amber-400/80 italic">{value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-row gap-3 flex-wrap">
              <button className="inline-flex items-center gap-2 bg-[#20E7F2] text-[#080d1a] font-bold px-6 py-3 rounded-full text-[13px] hover:bg-[#20E7F2]/90 transition-colors">
                <FileText className="w-4 h-4" />
                Contact Legal
              </button>
              <button className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-full text-[13px] hover:border-gray-300 transition-colors">
                <FileKey className="w-4 h-4" />
                View DPA
              </button>
            </div>

            <Divider />

            <FaqSection />

            <Divider />

            {/* Related Pages */}
            <div id="related" className="scroll-mt-24">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Related</p>
              <h3 className="text-[20px] font-black text-gray-900 mb-6">Related Legal and Trust Pages</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Lock,    title: "Privacy Policy",           desc: "How ZoikoVertex collects, uses, and protects personal information.",                    href: "/privacy"  },
                  { icon: FileKey, title: "Data Processing Addendum", desc: "Enterprise data processing terms for customer personal information.",                   href: "#"         },
                  { icon: Shield,  title: "Security",                 desc: "Platform access controls, audit logs, data protection, and enterprise security review.", href: "/security" },
                  { icon: Globe,   title: "Responsible AI",           desc: "AI-assisted workflow boundaries, human oversight, and governance principles.",           href: "#"         },
                ].map(({ icon: Icon, title, desc, href }) => (
                  <Link key={title} href={href} className="flex flex-col gap-3 p-4 rounded-xl hover:bg-[#20E7F2]/5 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-[#20E7F2]/10 border border-[#20E7F2]/20 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-[#0d8d9a]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-800 group-hover:text-[#0d8d9a] transition-colors">{title}</p>
                      <p className="mt-0.5 text-[11.5px] text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}

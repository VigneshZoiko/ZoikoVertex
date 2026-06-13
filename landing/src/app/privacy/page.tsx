"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  Database, Settings, Users, Bot, ShieldCheck, FileKey,
  Lock, Globe, Cookie, FileText, Cpu,
} from "lucide-react";

/* ── TOC sections ───────────────────────────────────────────────── */
const TOC = [
  { id: "scope",               title: "Scope of This Privacy Policy" },
  { id: "information-collect", title: "Information We Collect" },
  { id: "customer-content",    title: "Customer Content & Platform Data" },
  { id: "ai-workflow",         title: "AI-Assisted Workflow Data" },
  { id: "how-we-use",          title: "How We Use Information" },
  { id: "legal-bases",         title: "Legal Bases and Business Purposes" },
  { id: "cookies",             title: "Cookies & Similar Technologies" },
  { id: "how-we-share",        title: "How We Share Information" },
  { id: "international",       title: "International Data Transfers" },
  { id: "retention",           title: "Data Retention" },
  { id: "security",            title: "Security of Personal Information" },
  { id: "your-rights",         title: "Your Privacy Rights" },
  { id: "ccpa",                title: "California & U.S. State Privacy" },
  { id: "children",            title: "Children's Privacy" },
  { id: "enterprise-dpa",      title: "Enterprise Customers & DPA" },
  { id: "changes",             title: "Changes to This Privacy Policy" },
  { id: "contact",             title: "Contact for Data Privacy" },
];

/* ── At a Glance cards ──────────────────────────────────────────── */
const GLANCE = [
  {
    icon: Database,
    label: "WHAT WE COLLECT",
    iconBg: "bg-blue-100 text-blue-600",
    text: "Account details, usage data, customer content, support messages, cookie data, billing information, and integration data needed to operate the service.",
  },
  {
    icon: Settings,
    label: "HOW WE USE IT",
    iconBg: "bg-green-100 text-green-600",
    text: "To provide and improve ZoikoVertex, manage accounts, support governed marketing workflows, communicate with you, and comply with legal obligations.",
  },
  {
    icon: Users,
    label: "CUSTOMER CONTROL",
    iconBg: "bg-orange-100 text-orange-600",
    text: "Enterprise administrators control many workspace settings — roles, permissions, approvals, collaborators, and audit visibility within their organization.",
  },
  {
    icon: Bot,
    label: "AI-ASSISTED WORKFLOWS",
    iconBg: "bg-purple-100 text-purple-600",
    text: "ZoikoVertex supports AI-assisted marketing workflows. The policy explains what inputs are processed, whether prompts are stored, and how third-party AI providers are used.",
  },
  {
    icon: ShieldCheck,
    label: "YOUR PRIVACY RIGHTS",
    iconBg: "bg-amber-100 text-amber-600",
    text: "Depending on where you are, you may have rights to access, correct, delete, or restrict your personal information. We will explain how to exercise those rights.",
  },
  {
    icon: FileKey,
    label: "ENTERPRISE CUSTOMERS",
    iconBg: "bg-emerald-100 text-emerald-600",
    text: "Processing of enterprise customer data is governed by the customer agreement and Data Processing Addendum — separate from this general Privacy Policy.",
  },
];

/* ── Sub-components ─────────────────────────────────────────────── */
function Badge({ label, variant }: { label: string; variant: string }) {
  const styles: Record<string, string> = {
    gray:   "border-gray-300 text-gray-500 bg-gray-50",
    amber:  "border-amber-300 text-amber-700 bg-amber-50",
    purple: "border-purple-300 text-purple-700 bg-purple-50",
    blue:   "border-blue-300 text-blue-700 bg-blue-50",
    indigo: "border-indigo-300 text-indigo-700 bg-indigo-50",
    green:  "border-green-300 text-green-700 bg-green-50",
    orange: "border-orange-300 text-orange-700 bg-orange-50",
  };
  return (
    <span className={`ml-2.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${styles[variant] ?? styles.gray}`}>
      {label}
    </span>
  );
}

function SectionHeading({ id, title, badge }: { id: string; title: string; badge?: { label: string; variant: string } }) {
  return (
    <h2 id={id} className="text-[22px] font-black text-gray-900 tracking-tight flex items-center flex-wrap gap-1 scroll-mt-24">
      {title}
      {badge && <Badge label={badge.label} variant={badge.variant} />}
    </h2>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0d1424]">
            {headers.map((h) => (
              <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-5 py-3.5 text-[13.5px] text-gray-700 leading-relaxed ${j === 0 ? "font-medium text-gray-800 align-top" : ""}`}>
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

function CalloutBox({ lead, text }: { lead: string; text: string }) {
  return (
    <div className="mt-5 border-l-4 border-[#20E7F2] bg-sky-50/60 px-5 py-4 rounded-r-xl">
      <p className="text-[13.5px] text-gray-800 leading-relaxed">
        <span className="font-bold">{lead}</span> {text}
      </p>
    </div>
  );
}

function IndigoCallout({ lead, text, extra }: { lead: string; text: string; extra?: React.ReactNode }) {
  return (
    <div className="mt-5 border-l-4 border-indigo-400 bg-indigo-50/60 px-5 py-4 rounded-r-xl">
      <p className="text-[13.5px] text-gray-800 leading-relaxed">
        <span className="font-bold">{lead}</span> {text}
      </p>
      {extra}
    </div>
  );
}

function WarningBox({ lead, text }: { lead: string; text: string }) {
  return (
    <div className="mt-5 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
      <span className="text-amber-500 text-lg shrink-0 mt-0.5">⊙</span>
      <p className="text-[13.5px] text-gray-800 leading-relaxed">
        <span className="font-bold">{lead}</span> {text}
      </p>
    </div>
  );
}

function CookieBadge({ label, variant }: { label: string; variant: "required" | "manageable" | "consent" }) {
  const styles = {
    required:   "bg-red-50 text-red-600 border-red-200",
    manageable: "bg-green-50 text-green-600 border-green-200",
    consent:    "bg-amber-50 text-amber-600 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap ${styles[variant]}`}>
      {label}
    </span>
  );
}

function Divider() { return <hr className="my-10 border-gray-100" />; }

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[14.5px] text-gray-700 leading-[1.75]">{children}</p>;
}

/* ── FAQ accordion ──────────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: "What personal information does ZoikoVertex collect?", a: "We collect account information (name, email, job title, company), workspace and profile data, usage and activity data, customer content (drafts, approvals, audit logs), communications, billing details, integration data, and cookie/tracking data. See Section 2 for the full category table." },
  { q: "How does ZoikoVertex use personal information?", a: "Primarily to provide, operate, and improve the platform; manage user accounts and workspaces; authenticate users; enable marketing workflow features; provide support; process billing; analyze performance; detect security incidents; and comply with legal obligations." },
  { q: "Does ZoikoVertex use AI with customer content?", a: "ZoikoVertex supports AI-assisted marketing workflows. The specific inputs processed, storage practices, third-party AI providers, and admin controls are documented in Section 4. Details are subject to product confirmation before final publication." },
  { q: "Does ZoikoVertex sell or share personal information?", a: "ZoikoVertex does not sell personal information for monetary consideration. Whether sharing with advertising and analytics vendors constitutes 'selling' or 'sharing' under U.S. state law is subject to legal review. See Sections 8 and 13." },
  { q: "Can users manage cookies?", a: "Yes. Non-essential cookies — including analytics and marketing cookies — can be managed via the Cookie Preferences centre. Strictly necessary cookies cannot be disabled as they are required for platform operation." },
  { q: "How long does ZoikoVertex retain personal information?", a: "Retention periods vary by data type: active account data is kept during the subscription and a reasonable period after closure; billing records are held for 7 years; audit logs for at least 12 months; support records typically 3 years. See Section 10." },
  { q: "Can users request access, deletion, or correction?", a: "Yes. Depending on your location you may have rights to access, correct, delete, port, restrict, or object to processing of your personal information. Submit requests to privacy@zoikogroup.com. We respond within 30 days (45 days where permitted)." },
  { q: "How does the Privacy Policy relate to the Data Processing Addendum?", a: "This Privacy Policy covers ZoikoVertex's own processing of personal data. The DPA covers ZoikoVertex's processing of personal data on behalf of enterprise customers inside their workspaces. Both documents apply in enterprise relationships." },
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="mt-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">FAQ</p>
      <h3 className="text-[20px] font-black text-gray-900 mb-1">Frequently Asked Privacy Questions</h3>
      <p className="text-[13.5px] text-gray-500 mb-5">Quick answers for the most common questions about ZoikoVertex data privacy.</p>
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {FAQ_ITEMS.map(({ q, a }, i) => (
          <div key={q} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
            >
              <span className="text-[13.5px] font-medium text-gray-800 pr-4">{q}</span>
              <span className="text-gray-400 shrink-0 text-lg leading-none">{openIdx === i ? "−" : "+"}</span>
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

/* ══════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════ */
export default function PrivacyPage() {
  const [activeId, setActiveId] = useState(TOC[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
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

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="bg-[#162d4a] pt-[68px]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <h1 className="text-[clamp(2.2rem,4vw,3.2rem)] font-black text-white tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-[16px] text-white/60 max-w-[520px] leading-relaxed">
            How ZoikoVertex collects, uses, shares, and protects personal information — and your choices.
          </p>
        </div>
      </section>

      {/* ── PRIVACY AT A GLANCE ───────────────────────────────────── */}
      <section className="bg-[#eef0f4] py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[13px] font-black uppercase tracking-[0.25em] text-gray-900">
              Privacy at a Glance
            </h2>
            <p className="mt-2 text-[14.5px] text-gray-500 max-w-[580px] mx-auto">
              Six things you should know about how ZoikoVertex handles your information — before reading the full policy.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLANCE.map(({ icon: Icon, label, iconBg, text }) => (
              <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-white/80">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5">{label}</p>
                <p className="text-[13px] text-gray-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN: SIDEBAR + CONTENT ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="flex gap-12 items-start">

          {/* LEFT — sticky TOC */}
          <aside className="hidden lg:block w-52 shrink-0 sticky top-[88px]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Contents</p>
            <nav className="space-y-0.5">
              {TOC.map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-colors leading-snug ${
                    activeId === item.id
                      ? "text-[#0d8d9a] font-semibold bg-[#20E7F2]/10"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${activeId === item.id ? "text-[#20E7F2]" : "text-gray-300"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* RIGHT — content */}
          <main className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">

            {/* 1 ── Scope */}
            <SectionHeading id="scope" title="Scope of This Privacy Policy" />
            <Body>
              This Privacy Policy applies to ZoikoVertex, a governed agentic marketing operating system operated by Zoiko Tech Inc.
              (&quot;ZoikoVertex&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). It describes how we collect, use, disclose, and protect personal
              information when you visit our website at zoikovertex.com, use our platform, or interact with our services.
            </Body>
            <BulletList items={[
              "Website visitors and prospective customers browsing zoikovertex.com",
              "Individual users who register for or use the ZoikoVertex platform",
              "Enterprise customers and their workspace administrators, collaborators, and users",
              "Individuals who contact us for sales, support, partnerships, or employment",
            ]} />
            <CalloutBox
              lead="Enterprise customer data."
              text="If you are an enterprise customer, the processing of personal data within your workspace is primarily governed by your customer agreement and Data Processing Addendum (DPA) — not this general Privacy Policy. See Section 15."
            />

            <Divider />

            {/* 2 ── Information We Collect */}
            <SectionHeading id="information-collect" title="Information We Collect" />
            <Body>
              We collect personal information that you provide directly, that is generated through your use of the platform,
              and that is collected automatically through standard web technologies.
            </Body>
            <DataTable
              headers={["CATEGORY", "EXAMPLES"]}
              rows={[
                ["Account information", "Name, email address, job title, company name, password (hashed)"],
                ["Workspace & profile data", "Role assignments, permissions, workspace settings, profile photo"],
                ["Usage and activity data", "Pages visited, features used, actions taken, session duration, device and browser information"],
                ["Customer content", "Marketing drafts, campaign materials, approval records, audit logs, and other content submitted to the platform"],
                ["Communications", "Support tickets, emails, demo requests, feedback submissions, and chat messages"],
                ["Billing and payment", "Billing contact details and payment method references (card processing handled by our payment provider)"],
                ["Integration data", "OAuth tokens, connected social platform identifiers, and metadata from connected accounts"],
                ["Cookie and tracking data", "Session cookies, analytics identifiers, preference cookies — see Section 7"],
              ]}
            />

            <Divider />

            {/* 3 ── Customer Content */}
            <SectionHeading id="customer-content" title="Customer Content and Platform Data" badge={{ label: "Enterprise", variant: "amber" }} />
            <Body>
              ZoikoVertex may process customer content and platform data when users create, review, approve, validate, schedule,
              publish, analyze, or audit marketing activity inside a customer workspace.
            </Body>
            <p className="mt-4 text-[13.5px] font-semibold text-gray-800">Customer content may include:</p>
            <BulletList items={[
              "Marketing drafts, social media posts, and campaign materials",
              "Campaign plans, creative assets, and brand guidelines",
              "Approval comments, review notes, and validation decisions",
              "Publishing instructions and workflow decisions",
              "Performance records, analytics outputs, and reporting data",
              "Evidence records, audit logs, and governance configurations",
              "Workspace settings and role-permission configurations",
            ]} />
            <CalloutBox
              lead="Customer control."
              text="Customers control the content they submit to ZoikoVertex. Enterprise processing of customer content should be governed by the customer agreement and Data Processing Addendum — not this general Privacy Policy."
            />

            <Divider />

            {/* 4 ── AI-Assisted Workflow Data */}
            <SectionHeading id="ai-workflow" title="AI-Assisted Workflow Data" badge={{ label: "High scrutiny", variant: "purple" }} />
            <Body>
              ZoikoVertex supports AI-assisted marketing workflows. Depending on configuration and product functionality,
              users may provide prompts, drafts, campaign instructions, brand guidance, or workflow context to receive AI-assisted support.
              This section requires explicit confirmation before publication.
            </Body>
            <div className="mt-5 bg-[#0d1424] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">AI Processing Disclosure Status</p>
                  <p className="text-[11px] text-white/40">All items below must be confirmed by product and legal teams before publication.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "AI INPUTS PROCESSED", text: "[Types to be confirmed — e.g., text prompts, campaign briefs, brand guidelines]", placeholder: true },
                  { label: "PROMPT AND OUTPUT STORAGE", text: "[Whether stored and for how long — confirm with product]", placeholder: true },
                  { label: "CUSTOMER CONTENT USED FOR MODEL TRAINING", text: "[Confirm explicitly — this is high-scrutiny for enterprise buyers]", placeholder: true },
                  { label: "THIRD-PARTY AI PROVIDERS", text: "[Provider names, roles, and processing boundaries to be confirmed]", placeholder: true },
                  { label: "ADMIN CONTROLS FOR AI FEATURES", text: "[What admins can enable, disable, or configure]", placeholder: true },
                  { label: "AUDIT VISIBILITY FOR AI ACTIONS", text: "AI-assisted actions are traceable within the ZoikoVertex workflow record. See Auditability page.", placeholder: false },
                ].map(({ label, text, placeholder }) => (
                  <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-1.5">{label}</p>
                    <p className={`text-[12px] leading-relaxed ${placeholder ? "text-amber-400 italic" : "text-white/60"}`}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <WarningBox
              lead="Do not publish broad AI privacy claims"
              text='such as "AI never uses customer data" unless technically and contractually verified. The correct enterprise posture is specific, testable, and tied to product configuration, providers, retention, auditability, and customer agreements.'
            />

            <Divider />

            {/* 5 ── How We Use Information */}
            <SectionHeading id="how-we-use" title="How We Use Information" badge={{ label: "Purposes", variant: "blue" }} />
            <Body>
              ZoikoVertex uses personal information primarily to provide the platform, secure user accounts, support governed
              marketing workflows, communicate with customers, improve the service, and comply with legal or contractual obligations.
            </Body>
            <BulletList items={[
              "Provide, operate, maintain, secure, and improve the website and platform",
              "Create and manage user accounts and customer workspaces",
              "Authenticate users and protect accounts from unauthorized access",
              "Enable content creation, review, approval, publishing, and audit trails",
              "Provide customer support and resolve technical issues",
              "Process sales inquiries, demo requests, subscriptions, and billing",
              "Analyze website and product performance to improve our services",
              "Detect, prevent, and investigate security incidents and policy violations",
              "Enforce terms, contracts, and acceptable-use requirements",
              "Comply with legal, tax, regulatory, contractual, and audit obligations",
              "Manage recruiting and hiring where applicable",
            ]} />

            <Divider />

            {/* 6 ── Legal Bases */}
            <SectionHeading id="legal-bases" title="Legal Bases and Business Purposes" badge={{ label: "GDPR / Global", variant: "gray" }} />
            <Body>
              Where applicable law requires a legal basis for processing, ZoikoVertex relies on the following bases
              depending on the activity and jurisdiction.
            </Body>
            <DataTable
              headers={["PROCESSING ACTIVITY", "POTENTIAL LEGAL BASIS"]}
              rows={[
                ["Account creation and platform access", "Contract performance; service operation"],
                ["Customer support", "Contract performance; legitimate business interest"],
                ["Security monitoring", "Legitimate business interest; legal obligation"],
                ["Marketing communications", "Consent or legitimate business interest, depending on location"],
                ["Cookies and analytics", "Consent or legitimate business interest, depending on tool and jurisdiction"],
                ["Billing administration", "Contract performance; legal obligation"],
                ["Legal compliance", "Legal obligation"],
                ["Recruiting", "Pre-contract steps; legitimate business interest; consent where required"],
              ]}
            />

            <Divider />

            {/* 7 ── Cookies */}
            <SectionHeading id="cookies" title="Cookies, Analytics & Similar Technologies" badge={{ label: "Manage anytime", variant: "amber" }} />
            <Body>
              ZoikoVertex uses cookies and similar technologies on the website and platform. You can manage non-essential
              cookie preferences using the Cookie Preferences center.
            </Body>
            <DataTable
              headers={["CATEGORY", "PURPOSE", "YOUR CONTROL"]}
              rows={[
                ["Strictly Necessary", "Required for website and platform functionality, security, authentication, and session operation. Cannot be disabled without breaking core functionality.", <CookieBadge key="r" label="Required" variant="required" />],
                ["Preference", "Remember your choices such as region, language, or interface settings across visits.", <CookieBadge key="m" label="Manageable" variant="manageable" />],
                ["Analytics", "Understand how the site and platform are used — page views, session data, feature usage, and performance measurement.", <CookieBadge key="c1" label="Consent / Opt-out" variant="consent" />],
                ["Marketing", "Support campaign measurement, ad attribution, or relevant communication. May involve third-party ad or measurement services.", <CookieBadge key="c2" label="Consent / Opt-out" variant="consent" />],
              ]}
            />
            <div className="mt-5">
              <button className="inline-flex items-center gap-2 bg-[#20E7F2] text-[#080d1a] font-bold px-6 py-3 rounded-full text-[13px] hover:bg-[#20E7F2]/90 transition-colors cursor-pointer">
                <Cookie className="w-4 h-4" />
                Manage Cookie Preferences
              </button>
            </div>

            <Divider />

            {/* 8 ── How We Share */}
            <SectionHeading id="how-we-share" title="How We Share Information" badge={{ label: "Disclosure", variant: "indigo" }} />
            <Body>
              We do not sell personal information to third parties. We share information only as described below and only to
              support the operation, improvement, and security of the platform and business.
            </Body>
            <DataTable
              headers={["WITH WHOM", "WHY & WHAT"]}
              rows={[
                ["Service providers & subprocessors", "Hosting, infrastructure, analytics, support, communications, payment processing, AI services, security, and operational vendors. See our subprocessor list."],
                ["Customer administrators", "Enterprise admins may access user activity, workflow records, roles, permissions, and workspace data within their own organization."],
                ["Zoiko Group companies", "Information may be shared within Zoiko Group where appropriate for service delivery, administration, security, support, or business operations."],
                ["Professional advisors", "Lawyers, accountants, auditors, insurers, and consultants engaged in connection with ZoikoVertex's operations."],
                ["Legal & safety requirements", "Authorities, courts, or regulators where required by law or necessary to protect rights, users, systems, or security."],
                ["Business transfers", "In connection with a merger, acquisition, financing, restructuring, or sale of assets, subject to appropriate protections."],
              ]}
            />
            <WarningBox
              lead="U.S. state privacy review required."
              text='The verified position on sale or sharing of personal information for cross-context behavioral advertising must be confirmed by legal before publication. Do not publish "we do not sell or share" until advertising, analytics, cookie, and integration practices have been reviewed against applicable state law definitions.'
            />

            <Divider />

            {/* 9 ── International Transfers */}
            <SectionHeading id="international" title="International Data Transfers" badge={{ label: "Cross-border", variant: "blue" }} />
            <Body>
              ZoikoVertex is headquartered in the United States with EU operations in the United Kingdom. Personal information
              may be transferred to, stored in, or processed in countries other than the country in which you reside.
            </Body>
            <BulletList items={[
              "Transfers to the United States are subject to appropriate safeguards including Standard Contractual Clauses (SCCs) where required under GDPR",
              "ZoikoVertex relies on EU-approved transfer mechanisms for transfers from the European Economic Area (EEA), UK, and Switzerland",
              "Enterprise customers requiring specific data residency or transfer restrictions should contact us to confirm current processing locations",
              "Our subprocessors are contractually required to apply equivalent protections to any personal data they process",
            ]} />

            <Divider />

            {/* 10 ── Data Retention */}
            <SectionHeading id="retention" title="Data Retention" />
            <Body>
              We retain personal information for as long as necessary to provide the service, fulfill the purposes described
              in this policy, meet legal obligations, resolve disputes, and enforce agreements.
            </Body>
            <DataTable
              headers={["DATA TYPE", "RETENTION PERIOD"]}
              rows={[
                ["Active account data", "Retained for the duration of the subscription and a reasonable period after account closure"],
                ["Audit logs and evidence records", "Retained per customer agreement; minimum 12 months for platform governance records"],
                ["Support and communication records", "Typically 3 years from last interaction, or as required by applicable law"],
                ["Billing and transaction records", "7 years or as required by applicable tax and financial law"],
                ["Marketing and cookie data", "As set by consent or the relevant cookie lifespan, typically up to 24 months"],
                ["Recruiting and candidate data", "Up to 12 months from last interaction unless consent is given for longer retention"],
              ]}
            />

            <Divider />

            {/* 11 ── Security */}
            <SectionHeading id="security" title="Security of Personal Information" />
            <Body>
              ZoikoVertex implements technical, organisational, and administrative security measures to protect personal
              information against unauthorised access, disclosure, alteration, or destruction.
            </Body>
            <BulletList items={[
              "Encryption of data in transit (TLS) and at rest",
              "Role-based access controls and least-privilege operating model",
              "Audit logging of access to sensitive systems and data",
              "Workspace-level data isolation to prevent cross-customer access",
              "Vulnerability management and security monitoring",
              "Incident response procedures with documented notification timelines",
              "Vendor and subprocessor security assessments",
            ]} />
            <CalloutBox
              lead="Enterprise security review."
              text="ZoikoVertex supports formal security, procurement, and compliance review processes. Contact enterprise@zoikogroup.com or visit the Security page for documentation."
            />

            <Divider />

            {/* 12 ── Your Rights */}
            <SectionHeading id="your-rights" title="Your Privacy Rights" badge={{ label: "Rights", variant: "green" }} />
            <Body>
              Depending on your location and applicable law, you may have the following rights regarding your personal information.
              To exercise any of these rights, contact us at privacy@zoikogroup.com.
            </Body>
            <DataTable
              headers={["RIGHT", "DESCRIPTION"]}
              rows={[
                ["Access", "Request a copy of the personal information we hold about you"],
                ["Correction", "Request that we correct inaccurate or incomplete personal information"],
                ["Deletion", "Request that we delete your personal information, subject to applicable legal and contractual retention obligations"],
                ["Portability", "Receive your personal information in a structured, machine-readable format where technically feasible"],
                ["Objection", "Object to processing based on legitimate interests, including direct marketing"],
                ["Restriction", "Request that we restrict processing in certain circumstances"],
                ["Withdraw consent", "Where processing is based on consent, withdraw it at any time without affecting prior processing"],
                ["Complaint", "Lodge a complaint with the relevant data protection authority in your jurisdiction"],
              ]}
            />
            <Body>
              We will respond to all verified rights requests within 30 days, or 45 days where permitted by applicable law.
            </Body>

            <Divider />

            {/* 13 ── CCPA */}
            <SectionHeading id="ccpa" title="California & U.S. State Privacy" badge={{ label: "CCPA", variant: "orange" }} />
            <Body>
              If you are a California resident or resident of another U.S. state with applicable privacy law, you may have
              additional rights including: right to know, right to delete, right to correct, right to opt out of sale or sharing,
              and right to non-discrimination.
            </Body>
            <BulletList items={[
              "Right to know — categories of personal information collected and purposes for which it is used",
              "Right to delete — request deletion of personal information, subject to legal exceptions",
              "Right to correct — request correction of inaccurate personal information",
              "Right to opt out of sale or sharing — where applicable under state definitions",
              "Right to limit use of sensitive personal information — where applicable",
              "Right to non-discrimination — we will not discriminate against you for exercising privacy rights",
            ]} />
            <CalloutBox
              lead="California-specific notice."
              text="ZoikoVertex does not sell personal information for monetary consideration. Whether sharing with advertising and analytics vendors constitutes 'selling' or 'sharing' under the CPRA is subject to legal review. California residents may submit requests to privacy@zoikogroup.com."
            />

            <Divider />

            {/* 14 ── Children */}
            <SectionHeading id="children" title="Children's Privacy" />
            <Body>
              ZoikoVertex is an enterprise business platform and is not directed to children under the age of 16. We do not
              knowingly collect personal information from children under 16. If we become aware that we have collected personal
              information from a child under 16 without verifiable parental consent, we will take steps to delete that information.
              If you believe we have inadvertently collected such information, please contact us at privacy@zoikogroup.com.
            </Body>

            <Divider />

            {/* 15 ── Enterprise DPA */}
            <SectionHeading id="enterprise-dpa" title="Enterprise Customers and Data Processing Addendum" badge={{ label: "DPA", variant: "indigo" }} />
            <Body>
              Enterprise customers who process personal data belonging to their own customers, employees, or users within
              ZoikoVertex workspaces act as data controllers for that data. ZoikoVertex acts as a data processor in that context.
            </Body>
            <Body>Processing in the enterprise customer context is governed by:</Body>
            <BulletList items={[
              "The customer's master subscription or enterprise agreement with ZoikoVertex",
              "The Data Processing Addendum (DPA), which incorporates GDPR Article 28 requirements, Standard Contractual Clauses, and applicable state-law processing terms",
              "The subprocessor list, which identifies third-party processors engaged by ZoikoVertex",
            ]} />
            <IndigoCallout
              lead="Request the DPA."
              text="Enterprise customers who require a signed DPA should contact "
              extra={
                <span className="text-[13.5px] text-gray-800">
                  <a href="mailto:legal@zoikogroup.com" className="text-indigo-600 underline underline-offset-2">legal@zoikogroup.com</a>
                  {". The DPA governs data processing inside customer workspaces — this Privacy Policy governs ZoikoVertex's own processing of personal data."}
                </span>
              }
            />

            <Divider />

            {/* 16 ── Changes */}
            <SectionHeading id="changes" title="Changes to This Privacy Policy" />
            <Body>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements,
              or business operations. When we make material changes, we will update the &quot;Last Updated&quot; date and, where appropriate,
              notify registered users by email or via an in-platform notice.
            </Body>
            <Body>
              Continued use of the platform after the effective date of any update constitutes acceptance of the revised policy.
            </Body>

            <Divider />

            {/* 17 ── Contact */}
            <SectionHeading id="contact" title="Contact for Data Privacy" />
            <Body>
              For questions, requests, or complaints regarding this Privacy Policy or our data practices, please contact us:
            </Body>
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Privacy Enquiries</p>
                <a href="mailto:privacy@zoikogroup.com" className="text-[14px] font-semibold text-[#0d8d9a] hover:underline">
                  privacy@zoikogroup.com
                </a>
                <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">
                  Data subject rights requests, general privacy questions, and GDPR/CCPA inquiries.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Legal & DPA</p>
                <a href="mailto:legal@zoikogroup.com" className="text-[14px] font-semibold text-[#0d8d9a] hover:underline">
                  legal@zoikogroup.com
                </a>
                <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">
                  Enterprise DPA requests, subprocessor queries, and legal compliance matters.
                </p>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Registered Address</p>
              <p className="text-[13.5px] text-gray-700">Zoiko Tech Inc. · 1401 21st Street, Suite R, Sacramento, CA 95811, USA</p>
              <p className="mt-1 text-[13.5px] text-gray-700">EU Representative · 67–69 Great Portland Street, 5th Floor, London W1W 5PF, UK</p>
            </div>

            <Divider />

            {/* ── FAQ ───────────────────────────────────────────────── */}
            <FaqSection />

            <Divider />

            {/* ── Related Trust Pages ───────────────────────────────── */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Related</p>
              <h3 className="text-[20px] font-black text-gray-900 mb-6">Related Trust Pages</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Lock,     title: "Security",                     desc: "Access controls, audit logs, data protection, and enterprise security review.",         href: "/security" },
                  { icon: Cookie,   title: "Cookie Preferences",           desc: "Manage cookie categories and non-essential tracking preferences.",                     href: "#" },
                  { icon: FileText, title: "Data Processing Addendum",     desc: "Enterprise data processing terms for customer personal information.",                  href: "#" },
                  { icon: Globe,    title: "Responsible AI",               desc: "AI-assisted workflows, human oversight, and governance posture.",                      href: "#" },
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

      <Footer />
    </div>
  );
}

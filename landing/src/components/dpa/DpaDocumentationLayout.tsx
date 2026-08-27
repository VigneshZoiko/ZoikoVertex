"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Mail,
  List,
  Globe,
  FileText,
  Calendar,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Trash2,
  Users,
  Building,
  Clock,
  Code2,
  RefreshCw,
  Eye,
  Lock,
  Bell,
  ChevronDown,
  Cookie,
} from "lucide-react";

// --- NAVIGATION DATA ---
const navItems = [
  { id: "dpa-package", label: "1. DPA Package" },
  { id: "processing-schedule", label: "2. Processing Schedule" },
  { id: "customer-instructions", label: "3. Customer Instructions" },
  { id: "security-commitments", label: "4. Security Commitments" },
  { id: "subprocessors", label: "5. Subprocessors" },
  { id: "international-transfers", label: "6. International Transfers" },
  { id: "data-subject-rights", label: "7. Data Subject Rights" },
  { id: "deletion-return", label: "8. Deletion & Return" },
  { id: "breach-support", label: "9. Breach Support" },
];

const secondaryNavItems = [
  { id: "faq", label: "FAQ" },
  { id: "trust-review-contact", label: "Related Pages" },
];

const quickActions = [
  { label: "Download DPA", icon: Download, href: "#download" },
  { label: "Contact Privacy Team", icon: Mail, href: "#contact" },
  { label: "View Subprocessors", icon: List, href: "#subprocessors" },
  { label: "Transfer Documentation", icon: Globe, href: "#transfers" },
];

// Place this data array at the top of your file
const relatedPagesData = [
  {
    title: "Privacy Policy",
    description:
      "Personal data collection, use, sharing, retention, and rights for website visitors and customers.",
    icon: FileText,
    href: "#",
  },
  {
    title: "Security",
    description:
      "Technical and organizational security measures, access controls, audit logging, and certification posture.",
    icon: ShieldCheck,
    href: "#",
  },
  {
    title: "Compliance & Governance",
    description:
      "Enterprise governance posture, responsible AI, auditability, and framework alignment.",
    icon: Building2,
    href: "#",
  },
  {
    title: "Cookie Preferences",
    description:
      "Manage analytics, marketing, and tracking choices. Control consent and view the consent record.",
    icon: Cookie,
    href: "#",
  },
];

// --- SECTION 01 DPA PACKAGE DATA ---
interface DpaCard {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeStyle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const dpaPackageCards: DpaCard[] = [
  {
    id: "addendum",
    title: "Data Processing Addendum",
    description:
      "Primary processor/service-provider agreement governing how ZoikoVertex processes customer personal data when providing the service.",
    badge: "Current v1.0",
    badgeStyle: "bg-[#DCFCE7] text-[#16A34A]",
    icon: FileText,
    iconBg: "bg-[#E6F9F6]",
    iconColor: "text-[#00D2B4]",
  },
  {
    id: "schedule",
    title: "Data Processing Schedule",
    description:
      "Defines processing subject matter, duration, nature, purpose, data categories, data subject categories, roles, and retention.",
    badge: "Versioned",
    badgeStyle: "bg-[#E0F2FE] text-[#0284C7]",
    icon: Calendar,
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#D97706]",
  },
  {
    id: "security",
    title: "Technical & Organizational Measures",
    description:
      "Security schedule summarizing encryption, access control, audit logging, vulnerability management, incident response, and business continuity.",
    badge: "Current",
    badgeStyle: "bg-[#DCFCE7] text-[#16A34A]",
    icon: ShieldCheck,
    iconBg: "bg-[#DCFCE7]",
    iconColor: "text-[#16A34A]",
  },
  {
    id: "subprocessor-list",
    title: "Subprocessor List",
    description:
      "Lists material subprocessors, their service purpose, data categories, region, and notification process. Maintained and versioned separately.",
    badge: "Versioned • Updatable",
    badgeStyle: "bg-[#E0F2FE] text-[#0284C7]",
    icon: Building2,
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-[#9333EA]",
  },
  {
    id: "transfer-schedule",
    title: "International Transfer Schedule",
    description:
      "SCC, UK Addendum or IDTA pathway, and transfer impact assessment support materials for cross-border processing.",
    badge: "Enterprise available",
    badgeStyle: "bg-[#F3E8FF] text-[#9333EA]",
    icon: Globe,
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#D97706]",
  },
  {
    id: "deletion-procedure",
    title: "Deletion & Return Procedure",
    description:
      "Termination window, export process, deletion workflow, backup expiry, legal hold exceptions, and evidence record retention.",
    badge: "Requires review",
    badgeStyle: "bg-[#FEF3C7] text-[#D97706]",
    icon: Trash2,
    iconBg: "bg-[#E0F2FE]",
    iconColor: "text-[#0284C7]",
  },
];

// Place this data array at the top of your file or section
const customerInstructionsData = [
  {
    channel: "Agreement and DPA",
    expressed:
      "Primary written instructions and processing boundaries. Supersedes conflicting oral or informal instructions.",
  },
  {
    channel: "Workspace configuration",
    expressed:
      "Customer-selected roles, retention settings, integrations, agent controls, approval workflows, evidence policies, and access permissions.",
  },
  {
    channel: "Authorized user actions",
    expressed:
      "Actions by authorized users within their permissions are treated as customer-directed use and are bound by the agreement.",
  },
  {
    channel: "Support requests",
    expressed:
      "Support instructions must be authenticated, logged, limited to service needs, and within the scope of the agreement and DPA.",
  },
  {
    channel: "Prohibited instructions",
    expressed:
      "ZoikoVertex will not accept instructions that violate applicable law, security obligations, third-party rights, product scope, or the terms of the agreement.",
  },
];

// Place this data array at the top of your file
const securityCommitmentsData = [
  {
    title: "Encryption",
    description:
      "Encryption in transit (TLS) and at rest for customer data. Implementation details in the security schedule.",
    icon: Lock,
  },
  {
    title: "Access control",
    description:
      "Role-based access, least-privilege principles, MFA for privileged accounts, access logging, and access reviews.",
    icon: Users,
  },
  {
    title: "Tenant isolation",
    description:
      "Customer data is scoped to workspace and tenant boundaries. Customer records are logically separated.",
    icon: Building,
  },
  {
    title: "Audit and logging",
    description:
      "Audit Trail, Identity Ledger, Evidence Vault, export logs, and retention action records support security and legal obligations.",
    icon: Clock,
  },
  {
    title: "Secure development",
    description:
      "Code review, vulnerability management, penetration testing, dependency security, and change management controls.",
    icon: Code2,
  },
  {
    title: "Incident response",
    description:
      "Security event detection, triage, customer notification workflow, evidence preservation, and remediation tracking.",
    icon: AlertTriangle,
  },
  {
    title: "Business continuity",
    description:
      "Regular backups, disaster recovery approach, service resilience measures, and recovery objectives where available.",
    icon: RefreshCw,
  },
  {
    title: "Sub-vendor security",
    description:
      "Material subprocessors are subject to written security and data protection requirements equivalent to or better than those in the DPA.",
    icon: Eye,
  },
  {
    title: "Assurance documentation",
    description:
      "Security schedule, third-party assessments, and audit support documentation available to enterprise customers on request.",
    icon: ShieldCheck,
  },
];

// Place this data array at the top of your file
const subprocessorData = [
  {
    category: "Cloud infrastructure",
    purpose: "Hosting, compute, storage, CDN, and network delivery",
    dataCategories: "All customer data in scope",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "Database services",
    purpose: "Structured data storage, backups, and replication",
    dataCategories: "Workflow, account, and audit data",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "Security and monitoring",
    purpose: "Threat detection, vulnerability scanning, audit logging, SIEM",
    dataCategories: "Security and access log data",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "Authentication services",
    purpose: "Identity verification, MFA, SSO",
    dataCategories: "Authentication credentials and session metadata",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "Analytics (where applicable)",
    purpose: "Website analytics and product telemetry",
    dataCategories: "Anonymized or aggregated usage data",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "Support platform",
    purpose: "Customer support ticketing and communication",
    dataCategories: "Support contact and case data",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "Payment processing",
    purpose: "Billing and subscription management",
    dataCategories: "Billing contact and payment metadata",
    region: "[Confirm regions]",
    status: "[Confirm vendor]",
  },
  {
    category: "AI model providers (where applicable)",
    purpose: "AI-assisted workflow and generation features",
    dataCategories: "Prompt and workflow content where applicable",
    region: "[Confirm regions]",
    status: "[Confirm vendor and data position]",
  },
];

// Place this data array at the top of your file
const transferMechanismsData = [
  {
    tag: "EU / EEA TRANSFERS",
    title: "Standard Contractual Clauses (SCCs)",
    description:
      "Where personal data is transferred from the EU/EEA to a country without an adequacy decision, ZoikoVertex relies on EU Standard Contractual Clauses as adopted by the European Commission.",
  },
  {
    tag: "UK TRANSFERS",
    title: "UK Addendum or IDTA",
    description:
      "Where personal data is transferred from the UK, ZoikoVertex uses the UK International Data Transfer Addendum or IDTA pathway as applicable and approved by the ICO.",
  },
  {
    tag: "ADEQUACY DECISIONS",
    title: "Recognised adequacy",
    description:
      "Where applicable adequacy decisions exist for the destination country, ZoikoVertex may rely on those decisions as the transfer mechanism in addition to contractual safeguards.",
  },
  {
    tag: "ENTERPRISE CUSTOMERS",
    title: "Transfer impact support",
    description:
      "Enterprise customers may request transfer impact assessment documentation, encryption position, subprocessor regional deployment details, and supplementary technical measures for their own TIA process.",
  },
];

// Place this data array at the top of your file (or with your TypeScript interface if applicable)
import { Edit3, Ban, Shield, UserCheck } from "lucide-react";

interface SubjectRightsItem {
  title: string;
  description: string;
  icon: React.ElementType;
}

const dataSubjectRightsData: SubjectRightsItem[] = [
  {
    title: "Access and portability",
    description:
      "ZoikoVertex provides reasonable assistance to customers in exporting or locating relevant data where technically possible within the product.",
    icon: Eye,
  },
  {
    title: "Correction",
    description:
      "Supported through customer-controlled configuration and support process. Append-only governance records may not be mutable where audit integrity requires it.",
    icon: Edit3,
  },
  {
    title: "Deletion and erasure",
    description:
      "Supported subject to retention obligations, legal holds, security logs, billing records, backup cycles, dispute needs, and applicable law.",
    icon: Trash2,
  },
  {
    title: "Restriction and objection",
    description:
      "ZoikoVertex assists where product configuration or the support workflow can restrict processing within the bounds of the agreement.",
    icon: Ban,
  },
  {
    title: "US state privacy requests",
    description:
      "ZoikoVertex supports applicable customer obligations under CCPA/CPRA and similar laws through contract-defined assistance and configuration support.",
    icon: Shield,
  },
  {
    title: "Verification requirement",
    description:
      "Requests require authenticated customer authorization and appropriate role permissions before ZoikoVertex actions any privacy rights assistance.",
    icon: UserCheck,
  },
];

// Place this data array at the top of your file
const deletionRetentionData = [
  {
    stage: "During service term",
    position:
      "Customers may configure retention settings and export certain records subject to permissions, product capabilities, and the agreement.",
  },
  {
    stage: "At termination",
    position:
      "Customers are entitled to a defined window to export customer data before deletion procedures commence. The window and process are specified in the agreement or DPA.",
  },
  {
    stage: "Deletion",
    position:
      "Deletion applies to active systems subject to backup cycles, retention obligations, legal holds, security logs, billing records, tax requirements, dispute needs, and legal obligations.",
  },
  {
    stage: "Backups",
    position:
      "Backups expire on a rolling schedule defined in the security schedule. They should not be treated as customer-accessible archives or as a substitute for active data exports.",
  },
  {
    stage: "Legal holds",
    position:
      "Records subject to legal hold, regulatory inquiry, security investigation, contractual preservation, or dispute must not be deleted until the hold is released through the defined process.",
  },
  {
    stage: "Evidence records",
    position:
      "Certain audit, evidence, and identity records may be retained as required for security, legal defense, compliance obligations, and contract administration beyond the standard deletion window.",
  },
];

// Place this data array at the top of your file

const incidentSupportData = [
  {
    label: "Detection and assessment:",
    content:
      "Security events are detected, triaged, and assessed to determine whether a reportable personal data breach has occurred under applicable law.",
  },
  {
    label: "Customer notification:",
    content:
      "Enterprise customers will be notified without undue delay after ZoikoVertex becomes aware of a confirmed breach affecting their personal data, in line with the DPA and applicable law. The DPA will define the applicable notification window — no fixed hour commitment is stated publicly without legal and operational confirmation.",
  },
  {
    label: "Information provided:",
    content:
      "Nature of the incident, affected data categories where known, approximate number of data subjects where determinable, mitigation steps taken, recommended customer actions, and a designated point of contact.",
  },
  {
    label: "Evidence preservation:",
    content:
      "Relevant audit, identity, access, and forensic records are preserved to support investigation, regulatory reporting, and legal defense.",
  },
  {
    label: "Customer cooperation:",
    content:
      "ZoikoVertex provides reasonable assistance for regulatory notification, contractual reporting, and data subject notification obligations where required by the DPA or applicable law.",
  },
];

// Place this data array at the top of your file
const faqData = [
  {
    id: "item-1",
    question:
      "Does ZoikoVertex enter into custom Data Processing Agreements (DPAs)?",
    answer:
      "ZoikoVertex provides a standard DPA designed to meet EU, UK, and US privacy requirements. Custom DPA terms or redlines are available for enterprise tier contracts upon review by our legal team.",
  },
  {
    id: "item-2",
    question: "Where is customer personal data stored and processed?",
    answer:
      "Data hosting and processing depends on your deployment configuration. Primary infrastructure is hosted in secure, tier-3 data centers, with optional regional residency controls available for enterprise plans.",
  },
  {
    id: "item-3",
    question: "How are subprocessor updates communicated to customers?",
    answer:
      "We notify subscribed enterprise customers in advance of any material changes to our subprocessor list via email or in-app admin notifications, allowing time for review and objection per the DPA terms.",
  },
  {
    id: "item-4",
    question:
      "What security certifications and third-party audit reports are available?",
    answer:
      "Enterprise customers can request our Technical and Organizational Measures (TOMs) schedule, SOC 2 reports, and independent penetration testing summaries through the Privacy & Security team.",
  },
  {
    id: "item-5",
    question:
      "How does ZoikoVertex handle data subject access and deletion requests?",
    answer:
      "As a data processor, ZoikoVertex provides self-serve export and deletion features in the product, along with technical support to assist controllers in responding to data subject requests.",
  },
];

function FaqAccordion({ items }: { items: typeof faqData }) {
  // Keep track of open item ID (defaults to the first item being open)
  const [openId, setOpenId] = useState<string | null>("item-1");

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm transition-all overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-sm text-[#0F172A] hover:text-[#00D2B4] transition-colors cursor-pointer"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-[#00D2B4]" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-4 pt-1 text-xs text-[#64748B] leading-relaxed border-t border-[#F8FAFC]">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DpaDocumentationLayout() {
  const [activeId, setActiveId] = useState("dpa-package");

  const scrollToSection = (id: string) => {
    setActiveId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen font-sans text-[#0F172A] py-12 px-4 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start">
        {/* ================= LEFT FIXED / STICKY SIDEBAR ================= */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 self-start space-y-8 font-sans">
          {/* Main Contents Menu */}
          <div>
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-4 border-b border-[#E2E8F0] pb-2">
              CONTENTS
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left text-xs sm:text-[13px] py-1.5 px-2 rounded-md transition-colors block ${
                      isActive
                        ? "text-[#00D2B4] font-semibold bg-[#E6F9F6]/50"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="my-4 border-t border-[#E2E8F0]" />

            {/* Secondary Pages */}
            <nav className="space-y-1.5">
              {secondaryNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="w-full text-left text-xs sm:text-[13px] text-[#64748B] hover:text-[#0F172A] py-1.5 px-2 rounded-md block transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-3 border-b border-[#E2E8F0] pb-2">
              QUICK ACTIONS
            </div>
            <div className="space-y-2.5">
              {quickActions.map((action, idx) => {
                const IconComp = action.icon;
                return (
                  <a
                    key={idx}
                    href={action.href}
                    className="flex items-center gap-2 text-xs text-[#00D2B4] hover:text-[#00B89D] font-medium transition-colors"
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span>{action.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ================= RIGHT MAIN CONTENT AREA ================= */}
        <main className="flex-1 w-full min-w-0 space-y-16 md:ml-6">
          {/* SECTION 01: DPA PACKAGE OVERVIEW */}
          <section id="dpa-package" className="scroll-mt-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 01
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    DPA Package Overview
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#E6F9F6] text-[#00A890] border border-[#00D2B4]/30 uppercase">
                    Legal package
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed mb-4">
                  The ZoikoVertex data processing legal package consists of
                  several related documents. The core DPA governs the overall
                  processor relationship. Schedules provide the specific
                  processing terms, security measures, transfer documentation,
                  and subprocessor list that supplement the master agreement.
                </p>
                <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed font-normal">
                  <strong className="font-semibold">Document hierarchy:</strong>{" "}
                  Customer agreement → Data Processing Addendum → Security
                  Schedule → Subprocessor List → International Transfer Schedule
                  → Data Processing Schedule. Where documents conflict, the
                  customer agreement and DPA take precedence over schedules
                  unless otherwise specified.
                </p>
              </div>

              {/* Cards Grid */}
              <div className="space-y-3.5 mb-6">
                {dpaPackageCards.map((card) => {
                  const IconComponent = card.icon;
                  return (
                    <div
                      key={card.id}
                      className="p-4 sm:p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <IconComponent
                            className={`w-4 h-4 ${card.iconColor}`}
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#0F172A] tracking-tight mb-1">
                            {card.title}
                          </h3>
                          <p className="text-xs text-[#64748B] leading-relaxed max-w-2xl font-normal">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        <span
                          className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-semibold ${card.badgeStyle} shadow-sm`}
                        >
                          {card.badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Execution Banner */}
              <div className="p-4 rounded-xl bg-white border-l-4 border-l-[#C9A84C] shadow-sm mb-6">
                <p className="text-sm text-[#64748B] leading-relaxed">
                  <strong className="text-[#3A4558] font-semibold">
                    How to execute the DPA:
                  </strong>{" "}
                  Download the DPA package using the button below, or contact
                  the Privacy & Security team to initiate a formal enterprise
                  review, negotiate jurisdiction-specific terms, or request a
                  countersigned copy. The public page does not constitute a
                  legally binding agreement.
                </p>
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="button"
                  className="bg-[#20E7F2] hover:bg-[#1CD0DA] text-[#06090F] font-bold text-xs sm:text-sm px-6 py-3 rounded-full inline-flex items-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download DPA Package</span>
                </button>
              </div>
            </motion.div>
          </section>

          {/* SECTION 02: PROCESSING SCHEDULE */}
          <section id="processing-schedule" className="scroll-mt-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6 border-t border-t-[#E2E6ED] pt-5">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 02
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Processing Schedule
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20 uppercase">
                    GDPR Article 28
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  The processing schedule defines the core parameters of
                  ZoikoVertex&apos;s role as processor or service provider for
                  customer personal data. This summary reflects the intended DPA
                  position and must be confirmed by counsel before publication.
                </p>
              </div>

              {/* Table 1: Core Parameters */}
              <div className="rounded-xl overflow-hidden shadow-sm mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A0F1D] border-b border-[#E2E8F0] font-mono text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider">
                        <th className="py-3 px-4 sm:px-5 w-1/4">FIELD</th>
                        <th className="py-3 px-4 sm:px-5">DESCRIPTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Subject matter
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Provision of ZoikoVertex services for governed agentic
                          workflows, approvals, integrations, analytics,
                          evidence, auditability, and customer-configured
                          workflow operations.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Duration
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Term of the customer agreement plus any deletion,
                          return, retention, backup, legal hold, and dispute
                          periods specified in the DPA or customer contract.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Nature of processing
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Hosting, storage, retrieval, transmission,
                          organization, analysis, generation, logging, evidence
                          preservation, workflow orchestration, support,
                          security monitoring, and deletion/return.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Purpose of processing
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          To provide, secure, support, improve, troubleshoot,
                          audit, and evidence ZoikoVertex services according to
                          customer instructions and product configuration.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Customer role
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Generally controller or business for customer content
                          and authorized user data, subject to the agreement and
                          deployment model.
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          ZoikoVertex role
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Generally processor or service provider for customer
                          personal data processed through the service. May act
                          as controller for limited account, billing, security,
                          and business operations data.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-heading */}
              <h3 className="text-sm font-bold text-[#0F172A] mb-3 tracking-tight">
                Data subjects and personal data categories
              </h3>

              {/* Table 2: Data Categories */}
              <div className="rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A0F1D] border-b border-[#E2E8F0] font-mono text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider">
                        <th className="py-3 px-4 sm:px-5 w-1/4">CATEGORY</th>
                        <th className="py-3 px-4 sm:px-5 w-1/2">
                          PERSONAL DATA INCLUDED
                        </th>
                        <th className="py-3 px-4 sm:px-5 w-1/4">NOTES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Authorized users
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Name, work email, role, permissions, workspace
                          membership, authentication status, activity logs,
                          session metadata.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          Core product user data
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Customer personnel
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Contact information, organizational context, approver
                          identity, support contacts, and administrative
                          records.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          Account administration
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Workflow and content data
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Campaigns, prompts, AI outputs, messages, comments,
                          approval records, workflow state, evidence records,
                          audit trail references, files, and attachments
                          included by customer.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          Customer-controlled scope
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Integration metadata
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Connected platform identifiers, token status metadata
                          (not raw tokens), API call logs, webhook metadata,
                          external object IDs, and sync status.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          No raw credentials stored
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Usage and telemetry
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Feature usage, performance metrics, error logs, agent
                          execution metadata, session analytics.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          Service improvement; minimize where possible
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Security and audit logs
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          IP/session/device metadata, privileged action logs,
                          failed access events, export records, retention
                          actions.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          Security and legal defense
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                          Billing and contract data
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                          Billing contacts, subscription metadata, invoice
                          records, tax and procurement records.
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                          Accounting and contractual obligations
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sensitive Data Notice */}
              <div className="p-4 rounded-xl bg-[#FEFCE8] shadow-sm flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A]">Sensitive data:</strong>{" "}
                  Customers should not submit sensitive personal data —
                  including health, financial, biometric, or regulated-category
                  data — unless expressly supported by the product scope,
                  customer contract, applicable jurisdiction, and configured
                  safeguards. The DPA will define the governing position.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 03: CUSTOMER INSTRUCTIONS */}
          <section id="customer-instructions" className="scroll-mt-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6 border-t border-t-[#E2E6ED] pt-8">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 03
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Customer Instructions
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B] uppercase">
                    Processing boundaries
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  ZoikoVertex processes customer personal data according to
                  documented customer instructions. Instructions are expressed
                  through the agreement, product configuration, authorized user
                  actions, support requests, and written instructions accepted
                  by ZoikoVertex.
                </p>
              </div>

              {/* Table: Instruction Channels */}
              <div className="rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A0F1D] font-mono text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider">
                        <th className="py-3.5 px-5 w-1/3">
                          INSTRUCTION CHANNEL
                        </th>
                        <th className="py-3.5 px-5">
                          HOW INSTRUCTIONS ARE EXPRESSED
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {customerInstructionsData.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[#F8FAFC]/60 transition-colors"
                        >
                          <td className="py-4 px-5 font-medium text-[#0F172A] align-top">
                            {item.channel}
                          </td>
                          <td className="py-4 px-5 text-[#64748B] leading-relaxed align-top">
                            {item.expressed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accent Callout Banner */}
              <div className="p-4 sm:p-5 rounded-xl shadow-sm border-l-4 border-l-[#00D2B4]">
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] font-semibold">
                    Processing outside instructions:
                  </strong>{" "}
                  If ZoikoVertex is required by applicable law to process
                  customer personal data beyond customer instructions,
                  ZoikoVertex will inform the customer unless prohibited by law.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 04: SECURITY COMMITMENTS */}
          <section id="security-commitments" className="scroll-mt-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 04
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Security Commitments
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#DCFCE7] text-[#16A34A] uppercase">
                    TOMs
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  The ZoikoVertex Technical and Organizational Measures schedule
                  documents the security controls applied to customer personal
                  data. A high-level summary is provided below. Enterprise
                  customers may request the full security schedule and
                  third-party assessment documentation through the Privacy &
                  Security team.
                </p>
              </div>

              {/* 3x3 Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {securityCommitmentsData.map((item, idx) => {
                  const IconName = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-[#E6F9F6] flex items-center justify-center mb-4">
                          <IconName className="w-4 h-4 text-[#00D2B4]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#0F172A] tracking-tight mb-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="bg-[#0A0F1D] hover:bg-[#151D30] text-white font-medium text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00D2B4]" />
                  <span>View Security Page</span>
                </button>
                <button
                  type="button"
                  className="bg-[#0A0F1D] hover:bg-[#151D30] text-white font-medium text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#00D2B4]" />
                  <span>View Auditability</span>
                </button>
              </div>
            </motion.div>
          </section>

          {/* SECTION 05: SUBPROCESSOR TRANSPARENCY */}
          <section id="subprocessors" className="scroll-mt-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 05
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Subprocessor Transparency
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#F3E8FF] text-[#9333EA] uppercase">
                    Vendor list
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  ZoikoVertex uses carefully selected subprocessors to provide
                  hosting, infrastructure, security, analytics, communications,
                  support, and payment-related services. Each material
                  subprocessor is bound by written terms that protect customer
                  personal data to an equivalent standard.
                </p>
              </div>

              {/* Change Notification Callout Box */}
              <div className="p-4 sm:p-5 bg-white rounded-xl shadow-sm mb-6 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-[#E6F9F6] flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-[#00D2B4]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] mb-1">
                    Subprocessor change notifications
                  </h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    ZoikoVertex provides advance notice of material subprocessor
                    changes. Enterprise customers may subscribe to change
                    notifications and raise objections through the process
                    defined in the DPA. New subprocessors are not activated
                    until the notice period has elapsed or the customer has
                    consented.
                  </p>
                </div>
              </div>

              {/* Subprocessors Table */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A0F1D] font-mono text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider">
                        <th className="py-3.5 px-4 sm:px-5 w-1/5">
                          SERVICE CATEGORY
                        </th>
                        <th className="py-3.5 px-4 sm:px-5 w-1/4">PURPOSE</th>
                        <th className="py-3.5 px-4 sm:px-5 w-1/4">
                          DATA CATEGORIES
                        </th>
                        <th className="py-3.5 px-4 sm:px-5 w-1/8">REGION</th>
                        <th className="py-3.5 px-4 sm:px-5 w-1/8">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {subprocessorData.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[#F8FAFC]/60 transition-colors"
                        >
                          <td className="py-4 px-4 sm:px-5 font-medium text-[#0F172A] align-top">
                            {item.category}
                          </td>
                          <td className="py-4 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                            {item.purpose}
                          </td>
                          <td className="py-4 px-4 sm:px-5 text-[#64748B] leading-relaxed align-top">
                            {item.dataCategories}
                          </td>
                          <td className="py-4 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                            {item.region}
                          </td>
                          <td className="py-4 px-4 sm:px-5 font-mono text-[11px] text-[#94A3B8] align-top">
                            {item.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accent Disclaimer Banner */}
              <div className="p-4 sm:p-5 rounded-xl bg-white shadow-sm border-l-4 border-l-[#C9A84C]">
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] font-semibold">
                    Vendor list confirmation required before publication.
                  </strong>{" "}
                  The live page must only list confirmed, approved
                  subprocessors. Categories above are illustrative. Enterprise
                  customers requiring early access to the confirmed vendor list
                  may contact the Privacy & Security team. Each listed vendor
                  must be bound by a written data processing agreement before
                  being added to the live list.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 06: INTERNATIONAL DATA TRANSFERS */}
          <section
            id="international-transfers"
            className="scroll-mt-8 space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 06
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    International Data Transfers
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706] uppercase">
                    Global assurance
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Because ZoikoVertex is a global platform, customer data may be
                  processed in multiple jurisdictions depending on deployment
                  configuration, infrastructure locations, support model, and
                  subprocessor geography. All cross-border transfers are
                  governed by an approved transfer mechanism.
                </p>
              </div>

              {/* 2x2 Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {transferMechanismsData.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#94A3B8] uppercase block mb-2">
                        {item.tag}
                      </span>
                      <h3 className="text-sm font-bold text-[#0F172A] tracking-tight mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Accent Callout Banner */}
              <div className="p-4 sm:p-5 rounded-xl bg-white shadow-sm border-l-4 border-l-[#00D2B4]">
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] font-semibold">
                    Regional configuration:
                  </strong>{" "}
                  Enterprise customers may request regional hosting or transfer
                  restrictions where commercially and technically available.
                  Contact the Privacy & Security team to discuss
                  deployment-specific transfer configuration and available
                  documentation.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 07: DATA SUBJECT RIGHTS ASSISTANCE */}
          <section id="data-subject-rights" className="scroll-mt-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 07
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Data Subject Rights Assistance
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#20E7F20F] shadow-sm text-[#20E7F2] uppercase">
                    Privacy rights
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  ZoikoVertex assists customers in fulfilling their obligations
                  to data subjects under applicable privacy laws, including GDPR
                  Article 28(3)(e). Assistance is provided through product
                  configuration, export capabilities, support processes, and
                  defined cooperation workflows.
                </p>
              </div>

              {/* 3x2 Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {dataSubjectRightsData.map((item, idx) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-8 h-8 rounded-lg bg-[#20E7F20F] shadow-sm flex items-center justify-center mb-4">
                          <IconComponent className="w-4 h-4 text-[#20E7F2]" />
                        </div>
                        <h3 className="text-sm font-bold text-[#0F172A] tracking-tight mb-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Accent Callout Banner */}
              <div className="p-4 sm:p-5 rounded-xl bg-white shadow-sm border-l-4 border-l-[#00D2B4]">
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] font-semibold">
                    Not a data subject&apos;s direct contact point:
                  </strong>{" "}
                  ZoikoVertex is generally processor for customer data. Data
                  subjects should direct access, deletion, and correction
                  requests to the customer as data controller. ZoikoVertex
                  assists customers in fulfilling those obligations through the
                  mechanisms described above.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 08: DELETION, RETURN, AND RETENTION */}
          <section
            id="deletion-return"
            className="scroll-mt-8 space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 08
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Deletion, Return, and Retention
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B] uppercase">
                    Data lifecycle
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Customer data lifecycle is governed by the agreement, DPA,
                  customer configuration, applicable law, retention obligations,
                  backup cycles, and legal hold requirements.
                </p>
              </div>

              {/* Table: Data Lifecycle Stages */}
              <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A0F1D] font-mono text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider">
                        <th className="py-3.5 px-5 w-1/4">STAGE</th>
                        <th className="py-3.5 px-5">ZOIKOVERTEX POSITION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {deletionRetentionData.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[#F8FAFC]/60 transition-colors"
                        >
                          <td className="py-4 px-5 font-medium text-[#0F172A] align-top">
                            {item.stage}
                          </td>
                          <td className="py-4 px-5 text-[#64748B] leading-relaxed align-top">
                            {item.position}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Accent Callout Banner with #F59E0B left border */}
              <div className="p-4 sm:p-5 rounded-xl bg-white shadow-sm border-l-4 border-l-[#F59E0B]">
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] font-semibold">
                    Customer data minimization:
                  </strong>{" "}
                  ZoikoVertex&apos;s position is to retain customer personal data
                  only as long as reasonably necessary for the stated purpose,
                  security, legal obligations, dispute resolution, and the
                  agreement. Customers may configure retention settings within
                  product capabilities to align with their own data minimization
                  obligations.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 09: SECURITY INCIDENT & BREACH SUPPORT */}
          <section
            id="breach-support"
            className="scroll-mt-8 space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  SECTION 09
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Security Incident & Breach Support
                  </h2>
                  {/* Security badge using exact requested styling */}
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#EF444414] text-[#EF4444] uppercase">
                    Security
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  ZoikoVertex maintains an incident response capability and
                  commits to cooperate with affected enterprise customers in the
                  event of a confirmed personal data breach or security event
                  affecting customer data.
                </p>
              </div>

              {/* Bulleted List Container */}
              <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-6">
                <ul className="space-y-6">
                  {incidentSupportData.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-xs leading-relaxed"
                    >
                      {/* Custom cyan bullet point color */}
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-[#20E7F2]" />
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-4 w-full">
                        <span className="font-bold text-[#0F172A] sm:col-span-1">
                          {item.label}
                        </span>
                        <span className="text-[#64748B] sm:col-span-3">
                          {item.content}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warning Callout Box */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#C9A84C0A] shadow-sm flex items-start gap-3.5">
                <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <p className="text-xs text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A] font-semibold">
                    No fixed public notification window:
                  </strong>{" "}
                  ZoikoVertex does not state a fixed breach notification hour
                  publicly unless operationally guaranteed and approved by
                  legal. The DPA defines the applicable notification commitment.
                  The 72-hour GDPR supervisory authority window applies to the
                  customer as controller — ZoikoVertex&apos;s obligation to the
                  customer as processor is defined contractually.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION 10: FREQUENTLY ASKED QUESTIONS */}
          <section id="faq" className="scroll-mt-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  FAQ
                </div>
                <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8F0]">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                    Frequently Asked Questions
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B] uppercase">
                    AEO
                  </span>
                </div>
              </div>

              {/* Interactive Accordion FAQs */}
              {/* <FaqAccordion items={faqData} /> */}
            </motion.div>
          </section>

          {/* SECTION 11: RELATED PAGES & CONTACT FOOTER */}
          <section id="trust-review-contact" className="scroll-mt-8 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Upper Part: Related Pages */}
              <div>
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase mb-1">
                  RELATED PAGES
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] mb-6">
                  Continue your trust review
                </h2>

                {/* 4-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {relatedPagesData.map((page, idx) => {
                    const IconComponent = page.icon;
                    return (
                      <a
                        key={idx}
                        href={page.href}
                        className="group p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="w-8 h-8 rounded-lg bg-[#E6F9F6] flex items-center justify-center mb-4 group-hover:bg-[#00D2B4]/20 transition-colors">
                            <IconComponent className="w-4 h-4 text-[#00D2B4]" />
                          </div>
                          <h3 className="text-sm font-bold text-[#0F172A] tracking-tight mb-2 group-hover:text-[#00D2B4] transition-colors">
                            {page.title}
                          </h3>
                          <p className="text-xs text-[#64748B] leading-relaxed font-normal">
                            {page.description}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Lower Part: Dark Contact Banner */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] mb-4">
                  Contact the Privacy & Security Team
                </h2>

                <div className="p-6 sm:p-8 bg-[#0A0F1D] rounded-2xl shadow-sm text-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div>
                        <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#64748B] uppercase mb-1">
                          PRIVACY INQUIRIES AND DPA REQUESTS
                        </div>
                        <p className="font-mono text-xs text-[#20E7F2]">
                          [privacy@zoikovertex.com] · [TBC by legal]
                        </p>
                      </div>

                      <div>
                        <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#64748B] uppercase mb-1">
                          SECURITY AND INCIDENT REPORTS
                        </div>
                        <p className="font-mono text-xs text-[#20E7F2]">
                          [security@zoikovertex.com] · [TBC by legal]
                        </p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div>
                        <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#64748B] uppercase mb-1">
                          SUBPROCESSOR NOTIFICATIONS
                        </div>
                        <p className="font-mono text-xs text-[#20E7F2]">
                          [privacy@zoikovertex.com] · [TBC]
                        </p>
                      </div>

                      <div>
                        <div className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#64748B] uppercase mb-1">
                          ENTERPRISE DPA EXECUTION
                        </div>
                        <p className="text-xs italic text-[#C9A84C] font-medium leading-relaxed">
                          Contact alliances or your account team to initiate
                          formal DPA review and countersignature.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}

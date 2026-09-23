import Link from "next/link";
import {
  Bot,
  CircleCheck,
  Clock,
  ExternalLink,
  FileKey,
  FileText,
  HeartPulse,
  Lock,
  Mail,
  Search,
  Server,
  Shield,
  type LucideIcon,
} from "lucide-react";
import {
  CONTAINER,
  Eyebrow,
  IconTile,
  Pill,
  SECURITY_EMAIL,
  SECURITY_MAILTO,
  SectionLede,
  SectionTitle,
  type Tone,
} from "./shared";

type Access = "public" | "nda" | "progress" | "request";

const ACCESS: Record<Access, { label: string; tone: Tone; icon: LucideIcon }> = {
  public: { label: "Public", tone: "green", icon: CircleCheck },
  nda: { label: "NDA required", tone: "gold", icon: Lock },
  progress: { label: "In progress", tone: "cyan", icon: Clock },
  request: { label: "On request", tone: "cyan", icon: CircleCheck },
};

const DOCUMENTS: {
  icon: LucideIcon;
  tone: Tone;
  access: Access;
  title: string;
  body: string;
  meta: string;
  cta: string;
  href: string;
}[] = [
  {
    icon: Lock,
    tone: "cyan",
    access: "public",
    title: "Privacy Policy",
    body: "How ZoikoVertex collects, processes, stores, and transfers personal data across the platform and its corporate operations. Covers data subject rights, retention, and lawful basis.",
    meta: "Last updated: 2025",
    cta: "View document",
    href: "/privacy",
  },
  {
    icon: FileKey,
    tone: "gold",
    access: "public",
    title: "Data Processing Addendum (DPA)",
    body: "Controller-processor obligations, data subject rights support, sub-processing terms, international transfer mechanisms (SCCs/IDTA), retention, and security requirements for enterprise customers.",
    meta: "Last updated: 2025",
    cta: "View & request execution",
    href: "/dpa",
  },
  {
    icon: FileText,
    tone: "cyan",
    access: "public",
    title: "Terms of Service",
    body: "Platform usage terms, subscription conditions, acceptable use policy, intellectual property, liability limitations, and governing law for ZoikoVertex platform customers.",
    meta: "Last updated: 2025",
    cta: "View document",
    href: "/terms",
  },
  {
    icon: Shield,
    tone: "green",
    access: "nda",
    title: "Information Security Policy",
    body: "ZoikoVertex information security policy covering risk management, access controls, incident response, vulnerability management, change management, and security governance.",
    meta: "Available under NDA",
    cta: "Request access",
    href: SECURITY_MAILTO,
  },
  {
    icon: Search,
    tone: "green",
    access: "nda",
    title: "Penetration Testing Summary",
    body: "Executive summary of the most recent third-party penetration testing engagement — scope, methodology, material findings, and remediation status. Full report available under NDA for enterprise prospects.",
    meta: "Annual cadence · Under NDA",
    cta: "Request summary",
    href: SECURITY_MAILTO,
  },
  {
    icon: Server,
    tone: "violet",
    access: "progress",
    title: "SOC 2 Type I Report",
    body: "SOC 2 Type I report documenting the description of ZoikoVertex's system and the suitability of the design of controls across security, availability, and confidentiality trust service criteria.",
    meta: "Available under NDA · Enterprise prospects",
    cta: "Request report",
    href: SECURITY_MAILTO,
  },
  {
    icon: Lock,
    tone: "gold",
    access: "nda",
    title: "ISO 27001 ISMS Documentation",
    body: "Information Security Management System documentation including risk assessment methodology, statement of applicability, control framework, and audit preparation materials.",
    meta: "Available under NDA",
    cta: "Request access",
    href: SECURITY_MAILTO,
  },
  {
    icon: Bot,
    tone: "violet",
    access: "public",
    title: "Responsible AI Policy",
    body: "ZoikoVertex's public statement of AI governance principles — human oversight, transparency, fairness, privacy-safe operations, accountability, and NIST AI RMF alignment.",
    meta: "Public document",
    cta: "View document",
    href: "/responsible-ai",
  },
  {
    icon: HeartPulse,
    tone: "green",
    access: "request",
    title: "Business Associate Agreement (BAA)",
    body: "HIPAA Business Associate Agreement for healthcare organisations processing protected health information through ZoikoVertex workflows. Available to qualified healthcare customers on Enterprise tier.",
    meta: "Enterprise tier · Healthcare customers",
    cta: "Request BAA",
    href: SECURITY_MAILTO,
  },
];

const CTA_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 text-right text-[10.5px] font-medium uppercase tracking-[0.1em] text-[#20E7F2] transition-colors hover:text-[#20E7F2]/75 font-[family-name:var(--font-jetbrains)]";

export default function TrustCenterDocuments() {
  return (
    <section id="documents" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow tone="gold">Trust Documents</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Every document your legal, compliance, and procurement teams need.
      </SectionTitle>
      <SectionLede>
        Core trust documents are available for enterprise review. Some
        documents require NDA execution or are shared in the context of a
        formal enterprise procurement process.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOCUMENTS.map(({ icon, tone, access, title, body, meta, cta, href }) => {
          const a = ACCESS[access];
          const isMail = href.startsWith("mailto:");
          const CtaIcon = isMail ? Mail : ExternalLink;
          return (
            <article
              key={title}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#0b1120] p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <IconTile icon={icon} tone={tone} />
                <Pill tone={a.tone} icon={a.icon}>
                  {a.label}
                </Pill>
              </div>
              <h3 className="mt-5 text-base font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-[13px] font-light leading-[1.55] text-white/50">{body}</p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/10 pt-4">
                <span className="text-[9.5px] text-white/25 font-[family-name:var(--font-jetbrains)]">
                  {meta}
                </span>
                {isMail ? (
                  <a href={href} className={CTA_CLASS}>
                    {cta}
                    <CtaIcon className="h-3 w-3" strokeWidth={2} />
                  </a>
                ) : (
                  <Link href={href} className={CTA_CLASS}>
                    {cta}
                    <CtaIcon className="h-3 w-3" strokeWidth={2} />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex gap-4 rounded-2xl border border-white/10 bg-[#0e1626] px-6 py-6">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#20E7F2]" strokeWidth={2} />
        <p className="text-[13px] font-light leading-[1.6] text-white/50">
          For documents available under NDA, contact{" "}
          <a href={SECURITY_MAILTO} className="text-[#20E7F2] hover:underline">
            {SECURITY_EMAIL}
          </a>{" "}
          with your organisation name, procurement context, and the documents
          required. We respond within 2 business days for active enterprise
          evaluations.
        </p>
      </div>
    </section>
  );
}

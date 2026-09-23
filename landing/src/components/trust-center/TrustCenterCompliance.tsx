import {
  Bot,
  Building2,
  ChartColumn,
  Check,
  Clock,
  Globe,
  HeartPulse,
  Info,
  Lock,
  Settings2,
  ShieldCheck,
  Store,
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
  TONES,
  type Tone,
} from "./shared";

type Status = "progress" | "compliant" | "aligned" | "configurable" | "monitoring";

const STATUS: Record<Status, { tone: Tone; icon: LucideIcon; accent: Tone }> = {
  progress: { tone: "amber", icon: Clock, accent: "amber" },
  configurable: { tone: "amber", icon: Settings2, accent: "amber" },
  compliant: { tone: "cyan", icon: Check, accent: "cyan" },
  aligned: { tone: "cyan", icon: Check, accent: "cyan" },
  monitoring: { tone: "cyan", icon: Check, accent: "cyan" },
};

const FRAMEWORKS: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: string;
  status: Status;
  statusLabel: string;
  detail: string;
  note?: string;
}[] = [
  {
    icon: ShieldCheck,
    tone: "amber",
    title: "SOC 2 Type II",
    body: "Service Organization Control 2 — Type II audit covering security, availability, processing integrity, confidentiality, and privacy trust service criteria.",
    status: "progress",
    statusLabel: "Audit in progress",
    detail: "Covers all production platform components, data processing operations, and enterprise customer data handling.",
    note: "Type II report expected H2 2025. Type I report available under NDA for enterprise prospects.",
  },
  {
    icon: Lock,
    tone: "amber",
    title: "ISO 27001",
    body: "International standard for information security management systems — covering risk assessment, controls, policies, and continuous improvement.",
    status: "progress",
    statusLabel: "Certification in progress",
    detail: "Covers information security management system for ZoikoVertex platform, infrastructure, and operations.",
    note: "Certification targeted H1 2026. ISMS documentation available for enterprise review under NDA.",
  },
  {
    icon: Building2,
    tone: "cyan",
    title: "GDPR",
    body: "General Data Protection Regulation — EU/EEA data protection framework covering personal data processing, data subject rights, and cross-border transfer mechanisms.",
    status: "compliant",
    statusLabel: "Compliant",
    detail: "Data processing agreements, privacy-by-design architecture, SCCs for international transfers, data subject rights processes, and DPA execution for enterprise customers.",
  },
  {
    icon: Store,
    tone: "cyan",
    title: "CCPA",
    body: "California Consumer Privacy Act — California privacy framework covering consumer rights, data sale opt-outs, and data disclosure obligations.",
    status: "compliant",
    statusLabel: "Compliant",
    detail: "Privacy notices, consumer rights requests, data sale opt-out mechanisms, and CPRA alignment for California-based data subjects.",
  },
  {
    icon: Bot,
    tone: "violet",
    title: "NIST AI RMF",
    body: "NIST Artificial Intelligence Risk Management Framework — covering AI risk identification, management, oversight, and governance documentation.",
    status: "aligned",
    statusLabel: "Aligned",
    detail: "AI risk identification through policy checks, risk management through approval workflows, oversight through Audit Engine, documentation through Evidence Vault.",
  },
  {
    icon: HeartPulse,
    tone: "amber",
    title: "HIPAA",
    body: "Health Insurance Portability and Accountability Act — US framework for protected health information handling in marketing and operational contexts.",
    status: "configurable",
    statusLabel: "Configurable",
    detail: "HIPAA-aligned workflow configurations available for healthcare customers. Business Associate Agreement (BAA) available upon request.",
    note: "BAA execution and HIPAA configuration review conducted during enterprise healthcare onboarding.",
  },
  {
    icon: ChartColumn,
    tone: "amber",
    title: "FCA / MiFID II",
    body: "UK Financial Conduct Authority and EU Markets in Financial Instruments Directive II — financial promotions and investment marketing compliance.",
    status: "configurable",
    statusLabel: "Configurable",
    detail: "Financial promotion policy rules, fair balance enforcement, risk warning templates, and jurisdiction-specific advertising standard rules configurable for UK and EU financial services customers.",
  },
  {
    icon: Globe,
    tone: "green",
    title: "EU AI Act",
    body: "European Union Artificial Intelligence Act — high-risk AI system requirements, transparency obligations, human oversight controls, and documentation requirements.",
    status: "monitoring",
    statusLabel: "Monitoring",
    detail: "ZoikoVertex governance architecture — human-in-the-loop controls, audit evidence, transparency, and oversight infrastructure — designed to align with EU AI Act obligations for enterprise deployments.",
    note: "Specific obligations depend on customer deployment context. Legal counsel review required for definitive assessment.",
  },
];

export default function TrustCenterCompliance() {
  return (
    <section id="compliance" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow tone="gold">Compliance &amp; Certifications</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Meeting the compliance standards enterprise procurement requires.
      </SectionTitle>
      <SectionLede className="max-w-[540px]">
        ZoikoVertex maintains and pursues certifications aligned with the
        enterprise security and compliance requirements of financial services,
        healthcare, retail, technology, and global regulated markets. Status
        reflects current programme maturity.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FRAMEWORKS.map(({ icon, tone, title, body, status, statusLabel, detail, note }) => {
          const s = STATUS[status];
          return (
            <article
              key={title}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] p-6"
            >
              <span className={`absolute inset-x-0 top-0 h-[3px] ${TONES[s.accent].bar}`} />
              <IconTile icon={icon} tone={tone} size="lg" />
              <h3 className="mt-5 text-lg font-extrabold text-white/90 font-[family-name:var(--font-bricolage)]">
                {title}
              </h3>
              <p className="mt-1.5 text-[13px] font-light leading-[1.4] text-white/60">{body}</p>
              <Pill tone={s.tone} icon={s.icon} className="mt-4">
                {statusLabel}
              </Pill>
              <p className="mt-4 text-xs font-light leading-[1.5] text-white/30">{detail}</p>
              {note && (
                <p className="mt-3 text-[9.5px] italic leading-[1.5] text-white/25 font-[family-name:var(--font-jetbrains)]">
                  {note}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl border border-white/10 bg-[#0e1626] p-6">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E8B768]" strokeWidth={2} />
        <p className="text-[11px] leading-[1.6] text-white/50 font-[family-name:var(--font-jetbrains)]">
          Certification and compliance status reflects current programme
          maturity and is updated as certifications progress. This overview is
          for reference purposes only and does not constitute legal advice.
          Specific compliance obligations depend on your organisation&apos;s
          jurisdiction, industry, customer base, and contractual requirements.
          Enterprise customers should conduct their own legal and compliance
          assessment. Certification documentation available to enterprise
          prospects under NDA — contact{" "}
          <a href={SECURITY_MAILTO} className="text-[#20E7F2] underline underline-offset-2">
            {SECURITY_EMAIL}
          </a>
          .
        </p>
      </div>
    </section>
  );
}

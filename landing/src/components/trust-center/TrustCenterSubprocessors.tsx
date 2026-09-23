import Link from "next/link";
import { Bot, ChartColumn, Cloud, Database, FileKey, Mail, ShieldEllipsis, type LucideIcon } from "lucide-react";
import { CONTAINER, Eyebrow, IconTile, SectionLede, SectionTitle } from "./shared";

const CATEGORIES: { icon: LucideIcon; title: string; vendors: string; body: string }[] = [
  {
    icon: Cloud,
    title: "Cloud infrastructure",
    vendors: "Amazon Web Services (AWS) · Primary hosting and compute",
    body: "All customer data hosted on AWS infrastructure. AWS maintains SOC 2 Type II, ISO 27001, and sector-specific certifications. Data residency controlled by customer configuration.",
  },
  {
    icon: Bot,
    title: "AI model providers",
    vendors: "Anthropic · OpenAI · Selected foundation model providers",
    body: "AI inference processed through enterprise API agreements with no customer data retention for model training. Prompt and output data sealed in Evidence Vault, not shared with model providers beyond inference.",
  },
  {
    icon: Database,
    title: "Data storage and databases",
    vendors: "AWS RDS · AWS S3 · AWS ElastiCache",
    body: "Customer data stored in encrypted, access-controlled AWS managed database and storage services. Encryption at rest using AES-256. Customer data isolated per tenant.",
  },
  {
    icon: Mail,
    title: "Transactional communications",
    vendors: "Selected transactional email providers",
    body: "Transactional notifications and approval communications handled by enterprise email infrastructure providers. No customer campaign content transmitted through transactional email providers.",
  },
  {
    icon: ChartColumn,
    title: "Product analytics and monitoring",
    vendors: "Observability platform · Error tracking · Performance monitoring",
    body: "Product telemetry and error data processed for platform reliability monitoring. No customer content or personal data transmitted to analytics subprocessors. Data minimisation applied by design.",
  },
  {
    icon: ShieldEllipsis,
    title: "Security tooling",
    vendors: "SIEM · Vulnerability management · Penetration testing partners",
    body: "Security monitoring, vulnerability scanning, and annual penetration testing conducted through enterprise security tooling and third-party security assessment firms. All security vendors subject to security review.",
  },
];

export default function TrustCenterSubprocessors() {
  return (
    <section id="subprocessors" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow>Vendor &amp; Subprocessor Management</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Every subprocessor categorised, reviewed, and disclosed.
      </SectionTitle>
      <SectionLede>
        ZoikoVertex engages a limited set of subprocessors to deliver the
        platform. Each category below is subject to security review,
        contractual data protection obligations, and advance change
        notification.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(({ icon, title, vendors, body }) => (
          <article key={title} className="bg-[#0b1120] p-6">
            <IconTile icon={icon} size="sm" />
            <h3 className="mt-4 text-[14px] font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
              {title}
            </h3>
            <p className="mt-1 text-[9.5px] leading-4 text-white/30 font-[family-name:var(--font-jetbrains)]">
              {vendors}
            </p>
            <p className="mt-2 text-[13px] font-light leading-[1.5] text-white/50">{body}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0b1120] p-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[500px]">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Subprocessor register
          </span>
          <p className="mt-2 text-[13px] font-light leading-[1.6] text-white/50">
            The full ZoikoVertex subprocessor register is available to
            enterprise customers via the DPA. Material changes to
            subprocessors are communicated with a minimum of 30 days&apos;
            advance notice, giving customers the right to object before changes
            take effect.
          </p>
        </div>
        <Link
          href="/dpa"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-white/15 px-7 py-3 text-sm text-white/90 transition-colors hover:border-white/30"
        >
          <FileKey className="h-3.5 w-3.5" strokeWidth={2} />
          View DPA &amp; Subprocessors
        </Link>
      </div>
    </section>
  );
}

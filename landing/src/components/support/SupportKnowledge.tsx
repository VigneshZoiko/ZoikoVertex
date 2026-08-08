import { Card, CONTAINER, MONO, SectionHead, SupportIcon } from "./shared";

type Resource = {
  icon: string;
  /** Amber marks evidence/governance material; slate marks neutral media. */
  tone: "cyan" | "amber" | "slate";
  title: string;
  desc: string;
  cta: string;
  href: string;
};

const RESOURCES: Resource[] = [
  {
    icon: "Top-help-articles.png",
    tone: "cyan",
    title: "Top help articles",
    desc: "The fastest fixes for the most common product and workflow questions.",
    cta: "Open Help Center",
    href: "/resources-hub",
  },
  {
    icon: "Getting-started-guides.png",
    tone: "cyan",
    title: "Getting started guides",
    desc: "Activation and onboarding paths to reach time-to-value quickly.",
    cta: "Start onboarding",
    href: "/resources-hub",
  },
  {
    icon: "Admin-configuration.png",
    tone: "slate",
    title: "Admin configuration",
    desc: "Configure roles, data, approvals, and governance for your workspace.",
    cta: "Admin guides",
    href: "/governance",
  },
  {
    icon: "Developer-docs.png",
    tone: "cyan",
    title: "Developer docs",
    desc: "APIs, webhooks, and integrations for technical teams and partners.",
    cta: "Read the docs",
    href: "/integrations",
  },
  {
    icon: "Audit-evidence-help.png",
    tone: "amber",
    title: "Audit & evidence help",
    desc: "Understand Audit Trail, Evidence Vault, Forensic Hub, and Identity Ledger.",
    cta: "Evidence guides",
    href: "/auditability",
  },
  {
    icon: "Video-walkthroughs.png",
    tone: "slate",
    title: "Video walkthroughs",
    desc: "Short guided demos and troubleshooting videos for common tasks.",
    cta: "Watch demos",
    href: "/demo-library",
  },
];

const CTA_TONE: Record<Resource["tone"], string> = {
  cyan: "text-[#20E7F2]",
  amber: "text-[#E8B768]",
  slate: "text-[#20E7F2]",
};

export default function SupportKnowledge() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Knowledge & self-service"
          title="Answer it yourself in minutes."
          lede="Most routine questions resolve without a ticket. Start here before you contact support."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((r) => (
            <Card key={r.title} className="flex flex-col">
              <SupportIcon file={r.icon} size={18} />

              <h3 className="mt-5 text-base font-bold leading-5 text-slate-100">
                {r.title}
              </h3>
              <p className="mt-3 text-xs font-normal leading-5 text-white/60">
                {r.desc}
              </p>

              <a
                href={r.href}
                className={`mt-auto pt-4 text-xs font-normal leading-4 transition-opacity hover:opacity-80 ${MONO} ${
                  CTA_TONE[r.tone]
                }`}
              >
                {r.cta} →
              </a>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

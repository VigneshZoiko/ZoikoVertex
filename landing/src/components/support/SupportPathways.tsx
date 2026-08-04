import {
  Card,
  CONTAINER,
  IconTile,
  MONO,
  SectionHead,
  SupportIcon,
  type Tone,
} from "./shared";

type Pathway = {
  icon: string;
  tone: Tone;
  title: string;
  audience: string;
  desc: string;
  cta: string;
  href: string;
};

const PATHWAYS: Pathway[] = [
  {
    icon: "Product-support.png",
    tone: "cyan",
    title: "Product support",
    audience: "Users · Admins · Operators",
    desc: "Help with modules, configuration, and everyday product questions across your workspace.",
    cta: "Open a request",
    href: "#new-request",
  },
  {
    icon: "AI-workflow-support.png",
    tone: "cyan",
    title: "AI workflow support",
    audience: "Agent operators · Campaign managers",
    desc: "Troubleshoot workflows, agents, approval stages, and error states with governance context.",
    cta: "Open a request",
    href: "#new-request",
  },
  {
    icon: "API-integration-support.png",
    tone: "cyan",
    title: "API & integration support",
    audience: "Developers · IT · Integration owners",
    desc: "Engineering-ready tickets with endpoints, error codes, logs, and environment detail.",
    cta: "Open a request",
    href: "#new-request",
  },
  {
    icon: "Security-privacy-support.png",
    tone: "amber",
    title: "Security & privacy support",
    audience: "Security · Legal · DPO · Compliance",
    desc: "Vulnerability reports, privacy requests, and compliance inquiries routed to specialist workflows.",
    cta: "Open a trust request",
    href: "#trust-routing",
  },
  {
    icon: "Billing-account-support.png",
    tone: "cyan",
    title: "Billing & account support",
    audience: "Owners · Billing admins · Procurement",
    desc: "Invoices, plans, purchase orders, and account changes with escalation to your account manager.",
    cta: "Open a request",
    href: "#new-request",
  },
  {
    icon: "Enterprise-support.png",
    tone: "amber",
    title: "Enterprise support",
    audience: "Admins · Procurement · Exec sponsors",
    desc: "Severity-based routing to enterprise support, customer success, or sales escalation.",
    cta: "Contact enterprise",
    href: "/contact-sales",
  },
];

export default function SupportPathways() {
  return (
    <section className="bg-[#0a1020] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Support pathways"
          title="Start with your problem, not our org chart."
          lede="Intent-based routing gets you to the fastest resolution — and sends sensitive requests to the right specialist queue."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PATHWAYS.map((p) => (
            <Card key={p.title} className="flex flex-col">
              <IconTile tone={p.tone}>
                <SupportIcon file={p.icon} size={18} />
              </IconTile>

              <h3 className="mt-5 text-base font-bold leading-5 text-slate-100">
                {p.title}
              </h3>
              <p
                className={`mt-1.5 text-xs font-normal uppercase leading-4 tracking-wide text-white/35 ${MONO}`}
              >
                {p.audience}
              </p>
              <p className="mt-3 text-xs font-normal leading-5 text-white/60">
                {p.desc}
              </p>

              <a
                href={p.href}
                className={`mt-auto pt-4 text-xs font-normal leading-4 transition-opacity hover:opacity-80 ${MONO} ${
                  p.tone === "amber" ? "text-[#E8B768]" : "text-[#20E7F2]"
                }`}
              >
                {p.cta} →
              </a>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

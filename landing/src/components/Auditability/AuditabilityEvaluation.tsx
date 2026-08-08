import Link from "next/link";
import { CONTAINER, Icon, SectionHead } from "./shared";

const OPTIONS: {
  icon: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  variant: "cyan" | "amber" | "outline";
}[] = [
  {
    icon: "demo",
    title: "Auditability demo",
    text: "See the five surfaces, evidence bundles, and export manifests live — mapped to your workflows.",
    cta: "Request an Auditability Demo",
    href: "/request-demo",
    variant: "cyan",
  },
  {
    icon: "brief",
    title: "Auditability brief",
    text: "A committee-ready overview of records, retention, holds, and export controls.",
    cta: "Download Auditability Brief",
    href: "/governance",
    variant: "amber",
  },
  {
    icon: "roiAudit",
    title: "ROI & Governance Audit",
    text: "Quantify faster reviews and lower governance friction alongside the evidence model.",
    cta: "Run ROI & Governance Audit",
    href: "/request-demo",
    variant: "outline",
  },
];

const BUTTON = {
  cyan: "bg-[#20E7F2] text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(32,231,242,0.55)] hover:opacity-90",
  amber:
    "bg-[#E8B768] text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(232,183,104,0.55)] hover:opacity-90",
  outline: "border border-white/20 text-slate-100 hover:border-white/40",
};

const TILE = {
  cyan: "border-[#20E7F2]/25 bg-[#20E7F2]/[0.08] text-[#20E7F2]",
  amber: "border-[#E8B768]/25 bg-[#E8B768]/[0.08] text-[#E8B768]",
  outline: "border-[#20E7F2]/25 bg-[#20E7F2]/[0.08] text-[#20E7F2]",
};

export default function AuditabilityEvaluation() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Prove it to your committee"
          title="Bring auditability into your evaluation."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {OPTIONS.map(({ icon, title, text, cta, href, variant }) => (
            <article
              key={title}
              className="flex flex-col rounded-xl border border-white/10 bg-[#111827] p-6"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${TILE[variant]}`}
              >
                <Icon name={icon} size={16} />
              </span>

              <h3 className="mt-6 text-base font-extrabold leading-5 text-slate-100 font-[family-name:var(--font-bricolage)]">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-xs font-normal leading-5 text-white/55">
                {text}
              </p>
              <Link
                href={href}
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-opacity ${BUTTON[variant]}`}
              >
                {cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

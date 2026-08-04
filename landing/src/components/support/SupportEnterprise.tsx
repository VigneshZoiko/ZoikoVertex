import Link from "next/link";
import { CONTAINER, DISPLAY, Eyebrow, MONO } from "./shared";

const CAPABILITIES = [
  {
    num: "01",
    title: "Implementation support",
    desc: "Guidance from setup to rollout across teams and markets.",
  },
  {
    num: "02",
    title: "Workflow optimization",
    desc: "Tune approval routing and agent controls for velocity.",
  },
  {
    num: "03",
    title: "Governance review",
    desc: "Configure policy, roles, evidence, and retention correctly.",
  },
  {
    num: "04",
    title: "Integration troubleshooting",
    desc: "Resolve connector and API issues with engineering detail.",
  },
  {
    num: "05",
    title: "Audit readiness",
    desc: "Prepare defensible evidence for security and procurement.",
  },
  {
    num: "06",
    title: "Executive support review",
    desc: "Escalation paths for sponsors and operational risk.",
  },
];

export default function SupportEnterprise() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <Eyebrow tone="amber">Enterprise support & customer success</Eyebrow>

        <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] p-6 sm:p-8 lg:p-10">
          {/* Amber top-left → teal bottom-right wash from the Figma panel. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(232,183,104,0.18),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_100%,rgba(32,231,242,0.14),transparent_55%)]" />
          </div>

          <div className="relative z-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
              <div>
                <h2
                  className={`max-w-[520px] text-[clamp(1.6rem,3vw,2.1rem)] font-extrabold leading-[1.15] tracking-tight text-slate-100 ${DISPLAY}`}
                >
                  Enterprise support for governed AI operations.
                </h2>
                <p className="mt-5 max-w-[560px] text-sm font-normal leading-6 text-white/65">
                  Running ZoikoVertex across teams, brands, agencies, regions, or
                  regulated workflows? Our enterprise support path routes urgent
                  issues, governance questions, and implementation needs to the
                  right specialist.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/contact-sales"
                  className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#EFC77E] to-[#D9A253] px-5 py-3.5 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(232,183,104,0.55)] transition-opacity hover:opacity-90"
                >
                  Contact Enterprise Support
                </Link>
                <Link
                  href="/roi-governance-audit"
                  className="inline-flex items-center justify-center rounded-[10px] border border-white/25 px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-white/45"
                >
                  Schedule Governance Review
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((c) => (
                <div
                  key={c.num}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <span
                    className={`text-[11px] font-normal leading-4 text-white/35 ${MONO}`}
                  >
                    {c.num}
                  </span>
                  <h3 className="mt-2.5 text-sm font-bold leading-5 text-slate-100">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-xs font-normal leading-5 text-white/55">
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

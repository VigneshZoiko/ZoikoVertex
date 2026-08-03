import Link from "next/link";
import { CONTAINER, Eyebrow, SectionLede, SectionTitle } from "./shared";

export default function AuditabilityFinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(32,231,242,0.14),transparent_65%)]" />
      </div>

      <div className={`${CONTAINER} relative py-24`}>
        <div className="flex flex-col items-center text-center">
          <Eyebrow center>ZoikoVertex auditability</Eyebrow>

          <SectionTitle className="mt-4 max-w-[540px]">
            The safest commercial path to agentic AI execution.
          </SectionTitle>

          <SectionLede className="mt-5 max-w-[620px]">
            Every material action traceable, every decision linkable, every actor
            bound to authority, every evidence package reviewable, every export
            defensible.
          </SectionLede>

          <div className="mt-10 flex flex-col flex-wrap justify-center gap-3.5 sm:flex-row">
            <Link
              href="/request-demo"
              className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#20E7F2] to-[#12c9d4] px-5 py-3.5 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(32,231,242,0.55)] ring-1 ring-[#20E7F2]/40 transition-opacity hover:opacity-90"
            >
              Request an Auditability Demo
            </Link>
            <Link
              href="/governance"
              className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#E8B768] to-[#d19f4d] px-5 py-3.5 text-sm font-semibold text-[#080d1a] shadow-[0_10px_30px_-12px_rgba(232,183,104,0.55)] ring-1 ring-[#E8B768]/40 transition-opacity hover:opacity-90"
            >
              Schedule a Governance Review
            </Link>
            <Link
              href="/governance"
              className="inline-flex items-center justify-center rounded-[10px] border border-white/25 px-5 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-white/45"
            >
              Download Auditability Brief
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

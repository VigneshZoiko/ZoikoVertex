import Link from "next/link";
import { ShieldCheck, Download } from "lucide-react";
import { BackdropImage, CONTAINER, Eyebrow, Icon } from "./shared";

export default function ResponsibleAIFinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <div className="absolute inset-0">
        <BackdropImage slot="finalCta" className="saturate-[0.25]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,13,26,0.92)_0%,rgba(8,13,26,0.97)_100%)]" />
      </div>

      <div className={`${CONTAINER} relative py-24`}>
        <div className="flex flex-col items-center text-center">
          <Eyebrow>Responsible AI · Governance</Eyebrow>

          <h2 className="mt-7 max-w-[720px] text-[clamp(1.9rem,3.6vw,2.6rem)] font-extrabold leading-[1.14] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
            AI that moves fast{" "}
            <span className="text-[#20E7F2]">without escaping governance.</span>
          </h2>

          <p className="mt-7 max-w-[620px] text-[15px] font-light leading-[1.85] text-white/50">
            Give your teams the speed of AI agents and your executives the
            control, oversight, and evidence they need to stand behind every
            action.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href="/request-demo"
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#20E7F2] px-7 py-3 text-sm font-bold text-[#080d1a] transition-colors hover:bg-[#20E7F2]/90"
            >
              <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={2.5} />
              Request a Responsible AI Review
            </Link>
            <Link
              href="/governance"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-white/10 px-7 py-3 text-sm font-normal text-white/90 transition-colors hover:border-white/30"
            >
              <Download className="h-[14px] w-[14px]" strokeWidth={2} />
              Download AI Governance Brief
            </Link>
          </div>

          <Link
            href="/auditability"
            className="mt-8 inline-flex items-center gap-2 text-xs font-medium text-white/50 transition-colors hover:text-white/90 font-[family-name:var(--font-jetbrains)]"
          >
            <Icon name="viewAuditability" size={12} />
            View Auditability
          </Link>
        </div>
      </div>
    </section>
  );
}

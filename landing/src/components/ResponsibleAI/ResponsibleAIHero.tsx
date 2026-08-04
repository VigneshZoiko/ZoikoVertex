import Link from "next/link";
import { ShieldCheck, Download } from "lucide-react";
import { BackdropImage, CONTAINER } from "./shared";
import ResponsibleAIFlowDiagram from "./ResponsibleAIFlowDiagram";

export default function ResponsibleAIHero() {
  return (
    <section className="relative overflow-hidden bg-[#080d1a]">
      <div className="absolute inset-0">
        <BackdropImage slot="hero" priority className="saturate-[0.3]" />
        <div className="absolute inset-0 bg-[linear-gradient(30deg,rgba(8,13,26,0.95)_0%,rgba(8,13,26,0.90)_44%,rgba(8,13,26,0.20)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-orange-400/[0.05] to-transparent" />
      </div>

      <div className={`${CONTAINER} relative z-10 py-16 lg:py-24`}>
        <div className="grid items-start gap-14 lg:grid-cols-[610px_1fr] lg:gap-10">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-1.5">
              <span className="h-[5px] w-[5px] rounded-[2px] bg-[#20E7F2]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                Governed Agentic Execution · Enterprise Trust
              </span>
            </div>

            <h1 className="mt-8 text-[clamp(2.4rem,5vw,4.3rem)] font-extrabold leading-[1.04] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
              Deploy AI agents
              <br />
              with control, oversight,{" "}
              <span className="text-[#20E7F2]">
                and
                <br />
                evidence.
              </span>
            </h1>

            <p className="mt-8 max-w-[610px] text-base font-light leading-8 text-white/50">
              ZoikoVertex helps enterprise teams use AI agents safely — combining
              policy controls, approval workflows, human oversight, risk
              classification, audit trails, evidence vaults, and responsible AI
              governance.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
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

            <p className="mt-10 max-w-[400px] text-[10.5px] font-medium leading-4 tracking-wide text-white/25 font-[family-name:var(--font-jetbrains)]">
              Human oversight · Policy guardrails · Audit trails · Evidence vault ·
              Role-based access · Governance-ready workflows
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ResponsibleAIFlowDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}

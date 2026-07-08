import Image from "next/image";
import { ROI_METRICS } from "./workflowOrchestration";

export default function WorkflowOrchestrationROI() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#22C55E]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#22C55E]">ROI & Operational Metrics</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white">
            Measurable value across speed, risk, and cost.
          </h2>
        </div>

        <div className="relative rounded-2xl border border-white/10 overflow-hidden p-8 lg:p-12 mb-6 min-h-[260px] flex flex-col justify-center">
          <Image
            src="/images/ai-workflow-orchestration/roi-banner-bg.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="1200px"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(8,17,32,0.97) 0%, rgba(8,17,32,0.85) 45%, rgba(8,17,32,0.35) 100%)",
            }}
          />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-3 block">
              Performance Benchmark
            </span>
            <h3 className="text-white font-black text-2xl lg:text-3xl leading-snug mb-4 max-w-xl">
              Connect execution to financial outcomes.
            </h3>
            <p className="text-white/50 text-[13.5px] leading-relaxed max-w-xl">
              ZoikoVertex links every governed workflow to measurable
              productivity, risk, and revenue impact — making the business
              case visible for CFOs, CIOs, and executive leadership.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROI_METRICS.map((m) => (
            <div key={m.label} className="rounded-2xl border border-white/10 bg-[#0d1420] p-6">
              <p className="text-[#20E7F2] font-black text-xl mb-1.5">{m.label}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 mb-3">{m.sub}</p>
              <p className="text-white/45 text-[12.5px] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

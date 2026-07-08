import Image from "next/image";
import { CONTROLS, CONTROL_STATS } from "./workflowOrchestration";

export default function WorkflowOrchestrationControls() {
  return (
    <section className="bg-[#080812] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#C9A84C]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">Governance & Control Plane</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-4">
            Control that stays with humans.
          </h2>
          <p className="text-white/45 text-[14.5px] leading-relaxed">
            Six control types prevent uncontrolled AI execution — built into
            the workflow architecture, not added after launch.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CONTROLS.map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-[#0d1420] overflow-hidden">
              <div className="relative h-40">
                <Image src={c.image} alt="" fill className="object-cover grayscale" sizes="400px" />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(8,8,18,0.00) 40%, rgba(8,8,18,0.95) 100%)" }}
                />
              </div>
              <div className="p-6">
                <span
                  className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
                  style={{ color: c.color, background: `${c.color}1A`, border: `1px solid ${c.color}40` }}
                >
                  {c.tag}
                </span>
                <h3 className="text-white font-bold text-[15px] mb-2">{c.title}</h3>
                <p className="text-white/50 text-[12.5px] leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/10">
          {CONTROL_STATS.map((s) => (
            <div key={s.label} className="bg-[#0d1420] p-8">
              <p className="text-[#20E7F2] font-black text-3xl mb-2">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2">{s.label}</p>
              <p className="text-white/45 text-[12.5px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

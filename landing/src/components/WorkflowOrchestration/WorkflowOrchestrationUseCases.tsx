import Image from "next/image";
import { USE_CASES } from "./workflowOrchestration";

export default function WorkflowOrchestrationUseCases() {
  return (
    <section className="bg-[#080812] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-10 max-w-xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Use Cases by Team</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white">
            The right workflow for every team.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/10">
          {USE_CASES.map((u) => (
            <div key={u.tag} className="relative min-h-[340px] bg-[#0b111e] flex flex-col justify-end p-6 overflow-hidden">
              <Image src={u.image} alt="" fill className="object-cover" sizes="280px" />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(0deg, rgba(8,8,18,0.97) 0%, rgba(8,8,18,0.55) 55%, rgba(8,8,18,0.10) 100%)",
                }}
              />
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#20E7F2] mb-3 block">
                  {u.tag}
                </span>
                <h3 className="text-white font-bold text-[16px] leading-snug mb-2">{u.title}</h3>
                <p className="text-white/50 text-[12.5px] leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

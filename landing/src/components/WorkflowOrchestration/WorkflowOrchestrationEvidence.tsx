import Image from "next/image";
import Link from "next/link";
import { EVIDENCE_ROWS } from "./workflowOrchestration";

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 1.4 13 3.3v4c0 3.4-2.4 6-5.5 6.7-3.1-.7-5.5-3.3-5.5-6.7v-4L7.5 1.4Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M5.2 7.4l1.7 1.7 3.1-3.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WorkflowOrchestrationEvidence() {
  return (
    <section className="bg-[#080812]">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[380px] lg:min-h-[560px] bg-[#0d1420] order-2 lg:order-1">
          <Image
            src="/images/ai-workflow-orchestration/evidence-section.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="50vw"
          />
        </div>

        <div className="bg-[#0d1420] p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-center order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Evidence & Auditability</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.4rem)] font-black leading-tight text-white mb-4">
            Every action traced, evidenced, and explained.
          </h2>
          <p className="text-white/45 text-[14px] leading-relaxed mb-7 max-w-md">
            ZoikoVertex does not collect evidence after the fact. Evidence
            is captured inside the workflow as it executes — linked to the
            decision, actor, policy, and outcome that produced it.
          </p>

          <div className="rounded-xl border border-white/10 overflow-x-auto mb-8">
            <table className="w-full text-left min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 px-4 py-3">Workflow Event</th>
                  <th className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 px-4 py-3">Linked System</th>
                  <th className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 px-4 py-3">Stored Output</th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE_ROWS.map((r, i) => (
                  <tr key={r.event} className={i < EVIDENCE_ROWS.length - 1 ? "border-b border-white/10" : ""}>
                    <td className="text-[#20E7F2] text-[12.5px] font-semibold px-4 py-3 whitespace-nowrap">{r.event}</td>
                    <td className="text-white/60 text-[12.5px] px-4 py-3">{r.linkedSystem}</td>
                    <td className="text-white/30 text-[11px] font-mono px-4 py-3">{r.storedOutput}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link
            href="/security"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition w-fit"
          >
            <ShieldIcon className="w-3.5 h-3.5" />
            Explore Auditability
          </Link>
        </div>
      </div>
    </section>
  );
}

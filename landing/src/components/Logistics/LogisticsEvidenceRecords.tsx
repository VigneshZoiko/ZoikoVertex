"use client";

import Image from "next/image";

const TAGS = ["Client communication evidence", "Partner records", "Service claim audit trail", "Exportable approval history"];

export default function LogisticsEvidenceRecords() {
  return (
    <section className="bg-[#080d1a]">
      <div className="grid lg:grid-cols-2 items-stretch">
        <div className="relative min-h-[360px] lg:min-h-[560px]">
          <Image
            src="/images/logistics/evidence-records.jpg"
            alt="Complete evidence records for logistics marketing decisions"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex items-center px-6 py-16 lg:px-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Client &amp; Partner Evidence Records</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
              Audit-ready evidence for every marketing decision.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7 max-w-[480px]">
              ZoikoVertex preserves a complete record of every logistics marketing decision — which operations team verified the service claim, who approved the client communication, what changed after review, and when publication was authorized.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {TAGS.map((t) => (
                <span key={t} className="text-[11.5px] font-medium text-[#20E7F2] bg-[#20E7F2]/10 border border-[#20E7F2]/25 rounded-full px-3.5 py-1.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";

const TAGS = ["Agency-to-client approval", "Internal review gates", "Client authorization records", "Change tracking", "Evidence preservation"];

export default function AgenciesApprovalWorkflows() {
  return (
    <section className="bg-[#080d1a]">
      <div className="grid lg:grid-cols-2 items-stretch">
        <div className="relative min-h-[360px] lg:min-h-[560px]">
          <Image
            src="/images/agencies/approval-workflow.png"
            alt="Agency-to-client approval workflow generating auditable evidence records"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#080d1a]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent" />
        </div>

        <div className="flex items-center px-6 py-16 lg:px-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Client Approval Governance</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
              Client approval workflows that generate real evidence records.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7 max-w-[480px]">
              ZoikoVertex routes agency work through structured client approval paths — from agency creator to internal review to client sign-off — with evidence records created at every stage. Clients see what they approved, when, and what changed.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {TAGS.map((t) => (
                <span
                  key={t}
                  className="text-[11.5px] font-medium text-[#20E7F2] rounded-full px-3.5 py-1.5"
                  style={{ border: "1px solid rgba(201, 168, 76, 0.25)", background: "rgba(201, 168, 76, 0.12)" }}
                >
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

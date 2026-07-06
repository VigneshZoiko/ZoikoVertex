"use client";

import Image from "next/image";

const TAGS = ["Client workspace isolation", "Brand-specific rules", "Independent approval paths", "Cross-client data separation"];

export default function AgenciesWorkspaceSeparation() {
  return (
    <section className="bg-[#080d1a]">
      <div className="grid lg:grid-cols-2 items-stretch">
        <div className="flex items-center px-6 py-16 lg:px-16 order-2 lg:order-1">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Multi-Brand Workspace Separation</span>
            </div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-5">
              Every client brand governed independently in its own workspace.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed mb-7 max-w-[480px]">
              ZoikoVertex gives agencies separate workspaces for each client — with client-specific brand standards, approval rules, role permissions, and evidence records. No cross-client data exposure. No shared approval chains that blur accountability.
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

        <div className="relative min-h-[360px] lg:min-h-[560px] order-1 lg:order-2">
          <Image
            src="/images/agencies/workspace-separation.png"
            alt="Isolated brand workspaces with independent governance rules per client"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#080d1a]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}

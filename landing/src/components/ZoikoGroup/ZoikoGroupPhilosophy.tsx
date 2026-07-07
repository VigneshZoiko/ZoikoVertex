"use client";

import Image from "next/image";

const TAGS = ["Approval workflows", "Audit trails", "Human oversight", "Evidence records"];

export default function ZoikoGroupPhilosophy() {
  return (
    <section className="bg-[#080d1a] pb-20 lg:pb-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden">
          <div className="relative min-h-[320px] lg:min-h-[440px]">
            <Image
              src="/images/zoiko-group/philosophy-office.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>

          <div className="bg-[#0b1120] flex flex-col justify-center p-8 lg:p-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-4 h-px bg-[#20E7F2]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Group Philosophy</span>
            </div>
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-black leading-tight text-white mb-5">
              Governance by design — not by addition.
            </h2>
            <p className="text-white/55 text-[14.5px] leading-relaxed mb-8 max-w-md">
              Every Zoiko Group platform ships with approval workflows, audit trails, and human oversight built into the core architecture — not added after launch.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-3.5 py-1.5 rounded-full border border-[#20E7F2]/25 bg-[#20E7F2]/[0.08] text-[12px] font-medium text-[#20E7F2]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

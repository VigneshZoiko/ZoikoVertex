"use client";

import { Truck, Map, Bot, Users, FileCheck2, Building2 } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Truck,
    title: "Service Claims Review",
    desc: "Route service level statements, coverage claims, transit time descriptions, and pricing communications to operations and legal for verification.",
  },
  {
    icon: Map,
    title: "Multi-Region Governance",
    desc: "Apply different approval paths for different countries, service territories, and operating partners — with workspace separation and regional permissions.",
  },
  {
    icon: Bot,
    title: "AI Governance for Operational Copy",
    desc: "Require operations team verification for all AI-assisted service claims before they advance — preventing inaccurate capability descriptions from publishing.",
  },
  {
    icon: Users,
    title: "Partner & Client Workflow Management",
    desc: "Control external collaborator access for agency partners, regional teams, and client communication workflows with defined permission boundaries.",
  },
  {
    icon: FileCheck2,
    title: "Service Claim Audit Trails",
    desc: "Maintain complete evidence records for logistics service claims, client communications, and campaign approvals — ready for client and partner audit.",
  },
  {
    icon: Building2,
    title: "Operations Alignment",
    desc: "Align marketing governance with operational reality — so what is marketed matches what is supported, with sign-off evidence at every stage.",
  },
];

export default function LogisticsCapabilities() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Platform Capabilities</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white max-w-2xl mx-auto">
            Governance capabilities for logistics marketing operations.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/[0.08] bg-[#101D2F] p-7">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-5 bg-[#20E7F2]/10 border border-[#20E7F2]/25">
                <c.icon className="w-5 h-5 text-[#20E7F2]" strokeWidth={1.5} />
              </div>
              <h3 className="text-white font-bold text-[15px] mb-2 leading-snug">{c.title}</h3>
              <p className="text-white/50 text-[13.5px] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

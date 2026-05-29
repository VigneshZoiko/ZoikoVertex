import { Zap, BarChart2, Activity, Shield, Users, Eye } from "lucide-react";

export default function AgentsGrid() {
  const agents = [
    {
      layer: "Strategic Control Layer",
      name: "Chief Strategy Agent",
      desc: "ZoikoVertex continuously monitors EBITDA targets, budget envelopes, and business context to automatically shift capital allocation toward highest-return marketing activity.",
      link: "Revenue & ROI Management →",
      icon: Zap,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
    {
      layer: "Financial & Optimization Layer",
      name: "Quantitative Ad Spend Agent",
      desc: "Analyses CPA, ROAS, and marginal return across every channel in real time. Reallocates budget within policy boundaries — no manual intervention required.",
      link: "Full bid optimisation →",
      icon: BarChart2,
      iconColor: "#6366f1",
      iconBg: "#ede9fe",
    },
    {
      layer: "Financial & Optimization Layer",
      name: "Revenue Forensic Agent",
      desc: "Multi-touch attribution that reconciles marketing performance to actual revenue. Gives finance teams a single version of ROI truth — defensible, board-ready, and audit-traceable.",
      link: "Multi-touch attribution →",
      icon: Activity,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
    {
      layer: "Governance & Risk Layer",
      name: "Compliance Sentry",
      desc: "Reviews all outputs against brand rules, legal requirements, and sector-specific controls. Nothing publishes without passing compliance review. Pre-authorises agent actions.",
      link: "Pre-authorise agent actions →",
      icon: Shield,
      iconColor: "#7c3aed",
      iconBg: "#ede9fe",
    },
    {
      layer: "Simulation Layer",
      name: "Synthetic Audience Engine",
      desc: "Predicts likely audience response before spend is committed. Test creative and targeting hypotheses against synthetic audiences — eliminate waste before it happens.",
      link: "Test spend before committing →",
      icon: Users,
      iconColor: "#0d9488",
      iconBg: "#ccfbf1",
    },
    {
      layer: "Execution Intelligence Layer",
      name: "Growth Optimisation Agent",
      desc: "Identifies inefficiency across your channels and creatives. Scales what works. Kills what doesn't. Tied directly to contribution margin, not vanity metrics.",
      link: "Continuous output optimisation →",
      icon: Eye,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
  ];

  return (
    <section className="bg-white py-24 px-6" id="agents">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-indigo-500 text-xs font-bold tracking-widest uppercase mb-3">
            — The Full Agent Operating System
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Every agent. Every capability.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            ZoikoVertex agents work together, and every function of your
            business is coordinated for the first time, constituting a full
            Marketing Operating System.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((a) => (
            <div
              key={a.name}
              className="bg-white rounded-2xl p-7 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
                style={{ background: a.iconBg }}
              >
                <a.icon
                  size={22}
                  style={{ color: a.iconColor }}
                  strokeWidth={1.8}
                />
              </div>
              <p
                className="text-[10px] font-bold tracking-widest uppercase mb-2"
                style={{ color: a.iconColor }}
              >
                {a.layer}
              </p>
              <h3 className="font-black text-gray-900 mb-3 text-base">
                {a.name}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed flex-1">
                {a.desc}
              </p>
              <a
                href="#"
                className="mt-5 text-sm font-semibold transition-colors hover:opacity-70"
                style={{ color: a.iconColor }}
              >
                {a.link}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

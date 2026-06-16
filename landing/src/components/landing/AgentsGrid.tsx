import { Zap, BarChart2, Activity, Shield, Users, Eye, Check } from "lucide-react";

export default function AgentsGrid() {
  const agents = [
    {
      layer: "Strategic Control Layer",
      name: "Chief Strategy Agent",
      desc: "Continuously aligns campaigns, channel priorities, and budget strategy to your revenue, EBITDA, and growth objectives. Integrates with ERP, inventory, pricing, and margin data via the Business Context Engine to keep every marketing decision economically rational.",
      link: "Revenue & EBITDA alignment",
      icon: Zap,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
    {
      layer: "Financial & Optimization Layer",
      name: "Quantitative Ad Spend Agent",
      desc: "Dynamically allocates and reallocates budget based on CPA, ROAS, marginal return, velocity, and real-time opportunity windows. Moves budget away from underperforming channels automatically — no manual intervention required.",
      link: "Dynamic budget reallocation",
      icon: BarChart2,
      iconColor: "#6366f1",
      iconBg: "#ede9fe",
    },
    {
      layer: "Financial & Optimization Layer",
      name: "Revenue Forensic Agent",
      desc: "Applies multi-touch attribution, cross-channel revenue mapping, and financial reconciliation so every activity can be traced to profit outcomes. Provides the audit-grade reporting finance teams actually trust — not marketing-only dashboard logic.",
      link: "Multi-touch attribution",
      icon: Activity,
      iconColor: "#0891b2",
      iconBg: "#e0f7ff",
    },
    {
      layer: "Governance & Risk Layer",
      name: "Compliance Sentry",
      desc: "Reviews all outputs against brand rules, advertising standards, privacy requirements, jurisdictional rules, and sector-specific restrictions before every execution. FinTech, Healthcare, and regulated-industry safe by design. Decision traceability for audit and escalation.",
      link: "Pre-publication legal review",
      icon: Shield,
      iconColor: "#7c3aed",
      iconBg: "#ede9fe",
    },
    {
      layer: "Simulation Layer",
      name: "Synthetic Audience Engine",
      desc: "Predicts likely audience response before spend is committed, simulates creative performance scenarios, and helps eliminate waste before live budget is deployed. The intelligence layer that makes your campaigns smarter before they launch.",
      link: "Pre-spend waste elimination",
      icon: Users,
      iconColor: "#0d9488",
      iconBg: "#ccfbf1",
    },
    {
      layer: "Execution Intelligence Layer",
      name: "Growth Optimisation Agent",
      desc: "Identifies inefficiency across your entire channel mix, scales what's winning, suppresses waste, and compounds performance continuously. The agent that turns yesterday's good campaign into tomorrow's performance benchmark — without human analysis.",
      link: "Continuous compounding performance",
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
              className="rounded-2xl p-7 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              style={{ background: "#F8FBFC", border: "1px solid rgba(0,0,0,0.06)" }}
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
              <div className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold w-fit"
                style={{ background: "#e8e9ff", color: "#4f46e5" }}
              >
                <Check size={14} strokeWidth={2.5} />
                {a.link}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

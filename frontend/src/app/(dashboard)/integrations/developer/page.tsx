"use client";

import { Terminal, Key, Webhook, Database, Activity, Code2, Cpu, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeveloperConsolePage() {
  const router = useRouter();

  const devOptions = [
    { name: "API Management", desc: "Manage platform access keys and OAuth credentials.", icon: Key, status: "Active", href: "/integrations/api" },
    { name: "Webhook Endpoints", desc: "Configure real-time event notifications for external systems.", icon: Webhook, status: "Configure", href: "/integrations/api?tab=webhooks" },
    { name: "Sandbox Environment", desc: "Test agent workflows and content generation without live publishing.", icon: Database, status: "Isolated", href: null },
    { name: "Execution Logs", desc: "Detailed technical trace of AI decision engine and API calls.", icon: Activity, status: "Healthy", href: null },
    { name: "SDK & Documentation", desc: "Access the ZoikoVertex library and integration guides.", icon: Code2, status: "v1.4.2", href: null },
    { name: "Resource Quotas", desc: "Monitor rate limits and compute usage for your API keys.", icon: Cpu, status: "42% Used", href: null },
    { name: "Security Audit Logs", desc: "Low-level system access and identity verification trails.", icon: ShieldAlert, status: "Encrypted", href: null },
    { name: "System Diagnostics", desc: "Check health of individual platform nodes and database clusters.", icon: Activity, status: "Online", href: "/integrations/health" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8 border-b border-[#222] pb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Terminal className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Developer Console</h1>
          <p className="text-[#888] text-sm mt-1">Advanced platform management and technical integration tools.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {devOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <div
              key={opt.name}
              onClick={() => opt.href && router.push(opt.href)}
              className={`p-5 rounded-2xl bg-[#111] border border-[#222] transition-all group ${opt.href ? "hover:border-indigo-500/30 cursor-pointer" : "opacity-60"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-[#1a1a1a] group-hover:bg-indigo-500/10 transition-colors">
                  <Icon className="w-5 h-5 text-[#888] group-hover:text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded-full uppercase tracking-wider">{opt.status}</span>
              </div>
              <h3 className="text-foreground font-semibold text-sm mb-2">{opt.name}</h3>
              <p className="text-[#666] text-xs leading-relaxed">{opt.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>
        <h4 className="text-foreground font-medium mb-2">Live System Health</h4>
        <p className="text-[#888] text-sm max-w-lg mb-4">All core platform services are operational. Latency for Decision Engine is currently 124ms.</p>
        <button className="text-xs font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest">View Status Page &rarr;</button>
      </div>
    </div>
  );
}

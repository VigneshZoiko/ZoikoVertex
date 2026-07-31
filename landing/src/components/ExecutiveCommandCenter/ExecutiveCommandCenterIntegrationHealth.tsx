"use client";

import { ShoppingCart, Globe, Users, BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Group = {
  icon: LucideIcon;
  category: string;
  title: string;
  connectors: string[];
  status: string;
  ok: boolean;
};

const GROUPS: Group[] = [
  {
    icon: ShoppingCart,
    category: "Commerce & E-Commerce",
    title: "Product and campaign publish",
    connectors: ["Shopify Plus", "Salesforce Commerce", "Adobe Commerce"],
    status: "All connectors healthy",
    ok: true,
  },
  {
    icon: Globe,
    category: "Social & Paid Media",
    title: "Campaign activation status",
    connectors: ["Meta", "Google Ads", "LinkedIn", "TikTok"],
    status: "1 connector — sync delayed",
    ok: false,
  },
  {
    icon: Users,
    category: "CRM & Customer Data",
    title: "Journey and attribution sync",
    connectors: ["Salesforce", "HubSpot", "Segment"],
    status: "All connectors healthy",
    ok: true,
  },
  {
    icon: BarChart3,
    category: "Analytics & BI",
    title: "ROI and performance data",
    connectors: ["GA4", "Looker", "Snowflake", "BigQuery"],
    status: "Data flowing — last sync 4m",
    ok: true,
  },
];

export default function ExecutiveCommandCenterIntegrationHealth() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Integration Health
          </span>
        </div>

        <h2 className="max-w-[520px] text-[clamp(1.9rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          The command center knows whether the operating layer is reliable.
        </h2>

        <p className="mt-6 max-w-[560px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          Integration health surfaces connector status, publish confirmation, sync
state, and webhook health — so executives can see whether AI-executed
work actually reached its destination.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GROUPS.map((g) => (
            <div
              key={g.category}
              className="rounded-2xl border border-white/10 bg-[#0E1626] p-5 flex flex-col"
            >
              <div className="flex items-center gap-2">
                <g.icon className="w-3.5 h-3.5 text-[#20E7F2]" strokeWidth={2} />
                <span className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
                  {g.category}
                </span>
              </div>

              <h3 className="mt-3 text-[15px] font-bold leading-snug text-white font-[family-name:var(--font-bricolage)]">
                {g.title}
              </h3>

              <div className="mt-4 flex flex-wrap gap-2">
                {g.connectors.map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-white/10 bg-[#0A111E] px-2.5 py-1 text-[10px] text-white/50 font-[family-name:var(--font-jetbrains)]"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-5 flex items-center gap-2">
                {g.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" strokeWidth={2} />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" strokeWidth={2} />
                )}
                <span
                  className={`text-[10.5px] font-[family-name:var(--font-jetbrains)] ${
                    g.ok ? "text-green-500" : "text-amber-500"
                  }`}
                >
                  {g.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { ShoppingCart, Users, Image as ImageIcon, Globe, Workflow, BarChart3, Lock, Megaphone, Plug } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = { icon: LucideIcon; title: string; tools: string; desc: string };

const CATEGORIES: Category[] = [
  {
    icon: ShoppingCart,
    title: "Commerce & E-commerce",
    tools: "Shopify Plus · Salesforce Commerce · Adobe Commerce",
    desc: "Connect campaign execution directly to product and commerce workflows.",
  },
  {
    icon: Users,
    title: "CRM & CDP",
    tools: "Salesforce · HubSpot · Braze · Segment · Klaviyo",
    desc: "Coordinate customer journeys and campaign governance across CRM data.",
  },
  {
    icon: ImageIcon,
    title: "DAM & PIM",
    tools: "Bynder · AEM Assets · Salsify · Akeneo · Acquia",
    desc: "Pull approved assets and product data directly into governed campaign workflows.",
  },
  {
    icon: Globe,
    title: "Social & Ads",
    tools: "Meta · TikTok · Google Ads · LinkedIn · Pinterest",
    desc: "Govern creative, approval, and publishing workflows across paid and organic channels.",
  },
  {
    icon: Workflow,
    title: "Collaboration & Work Management",
    tools: "Slack · Teams · Asana · Jira · Monday · Google Workspace",
    desc: "Bring approvals and workflow status into the tools teams already use.",
  },
  {
    icon: BarChart3,
    title: "Analytics & BI",
    tools: "GA4 · Looker · Power BI · Tableau · Snowflake · BigQuery",
    desc: "Measure ROI and campaign performance across channels and regions.",
  },
  {
    icon: Lock,
    title: "Security & Identity",
    tools: "Okta · Azure AD · Google Workspace · SCIM · SSO/SAML",
    desc: "Meet enterprise IT, access control, and identity governance requirements.",
  },
  {
    icon: Megaphone,
    title: "Retail Media Networks",
    tools: "In-house networks · Sponsored listings · Partner placements",
    desc: "Govern retail media campaign intake, creative approval, and publisher evidence.",
  },
];

export default function EnterpriseRetailIntegrations() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            Retail Integrations
          </span>
        </div>

        <h2 className="max-w-[540px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          ZoikoVertex sits above your existing retail stack — not instead of it.
        </h2>

        <p className="mt-7 max-w-[540px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          The governed orchestration layer that connects campaign execution, asset management,
          customer data, and publishing workflows across the enterprise retail technology estate.
        </p>

        <div className="mt-14 rounded-xl border border-white/[0.14] overflow-hidden grid sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div
              key={c.title}
              className="bg-[#0E1626] p-6 border-r border-b border-white/[0.14] last:border-r-0"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#20E7F2]/10 border border-[#20E7F2]/30">
                <c.icon className="w-4 h-4 text-[#20E7F2]" strokeWidth={2} />
              </div>

              <h3 className="mt-5 text-[15px] font-bold text-white font-[family-name:var(--font-bricolage)]">
                {c.title}
              </h3>

              <p className="mt-3 text-[10.5px] leading-[1.7] text-white/35 font-[family-name:var(--font-jetbrains)]">
                {c.tools}
              </p>

              <p className="mt-4 text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.14] bg-[#0E1626] p-6 flex items-start gap-4">
          <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-[#20E7F2]/10 border border-[#20E7F2]/30">
            <Plug className="w-4 h-4 text-[#20E7F2]" strokeWidth={2} />
          </div>
          <p className="text-[13px] font-light leading-6 text-white/50 font-[family-name:var(--font-jakarta)]">
            <span className="font-bold text-white">
              ZoikoVertex does not replace your retail stack.
            </span>{" "}
            It is the governed orchestration and evidence layer that sits above it — connecting
            workflows, approvals, and evidence across the tools you already operate.
          </p>
        </div>
      </div>
    </section>
  );
}

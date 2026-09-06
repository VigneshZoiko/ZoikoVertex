export type Layer = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  image: string;
};

export const LAYERS: Layer[] = [
  {
    id: "strategy",
    number: "01",
    title: "Business Goals & Operating Rules",
    subtitle: "Campaign objectives · policies · brand rules · risk posture",
    description:
      "Define what the business is trying to achieve. Every agent and workflow inherits these rules, policies, and guardrails before any execution begins.",
    tag: "Strategy Layer",
    color: "#C9A84C",
    colorBg: "rgba(201,168,76,0.12)",
    colorBorder: "rgba(201,168,76,0.25)",
    image: "/images/agentic-architecture/layer-01.jpg",
  },
  {
    id: "execution",
    number: "02",
    title: "Agentic Execution Layer",
    subtitle: "Planning · drafting · analysis · coordination · recommendations",
    description:
      "Specialized AI agents perform planning, drafting, analysis, recommendations, coordination, and execution support.",
    tag: "Execution Layer",
    color: "#20E7F2",
    colorBg: "rgba(32,231,242,0.10)",
    colorBorder: "rgba(32,231,242,0.22)",
    image: "/images/agentic-architecture/layer-05.png",
  },
  {
    id: "orchestration",
    number: "03",
    title: "Workflow Orchestration Layer",
    subtitle: "Tasks · dependencies · SLAs · escalations · human approvals",
    description:
      "Tasks, dependencies, assignments, SLAs, escalations, and human approvals are coordinated across teams.",
    tag: "Orchestration Layer",
    color: "#8B5CF6",
    colorBg: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.25)",
    image: "/images/agentic-architecture/layer-01.jpg",
  },
  {
    id: "governance",
    number: "04",
    title: "Governance & Policy Plane",
    subtitle: "Rules · approvals · risk gates · responsible AI controls",
    description:
      "Rules, approval thresholds, role permissions, risk classifications, responsible AI controls, and blocked actions.",
    tag: "Governance Layer",
    color: "#22C55E",
    colorBg: "rgba(34,197,94,0.09)",
    colorBorder: "rgba(34,197,94,0.22)",
    image: "/images/agentic-architecture/layer-04.png",
  },
  {
    id: "integration",
    number: "05",
    title: "Integration Fabric",
    subtitle: "CRM · channels · APIs · webhooks · data connectors",
    description:
      "CRM, social platforms, ad platforms, DAM, project tools, webhooks, APIs, and enterprise data connectors.",
    tag: "Integration Layer",
    color: "#F59E0B",
    colorBg: "rgba(245,158,11,0.09)",
    colorBorder: "rgba(245,158,11,0.22)",
    image: "/images/agentic-architecture/layer-05.png",
  },
  {
    id: "evidence",
    number: "06",
    title: "Evidence Layer",
    subtitle: "Audit trail · forensic hub · evidence vault · identity ledger",
    description:
      "Audit Trail, Forensic Hub, Evidence Vault, Identity Ledger, Legal Holds, and exportable proof of every decision.",
    tag: "Evidence Layer",
    color: "#EF4444",
    colorBg: "rgba(239,68,68,0.08)",
    colorBorder: "rgba(239,68,68,0.20)",
    image: "/images/agentic-architecture/layer-06.png",
  },
  {
    id: "command",
    number: "07",
    title: "Executive Command Center",
    subtitle: "Performance · risk · ROI · governance posture · oversight",
    description:
      "Leadership view of performance, risk, workload, ROI, agent impact, workflow health, and governance posture.",
    tag: "Command Layer",
    color: "#20E7F2",
    colorBg: "rgba(32,231,242,0.08)",
    colorBorder: "rgba(32,231,242,0.20)",
    image: "/images/agentic-architecture/layer-04.png",
  },
];

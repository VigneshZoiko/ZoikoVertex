export type Stage = {
  id: string;
  number: string;
  title: string;
  desc: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  fields: string[];
};

export const STAGES: Stage[] = [
  {
    id: "create",
    number: "01",
    title: "Create / Generate",
    desc: "AI agent produces output or human creates work within the workflow.",
    color: "#20E7F2",
    colorBg: "rgba(32,231,242,0.10)",
    colorBorder: "rgba(32,231,242,0.30)",
    fields: ["TRIGGER_TYPE", "ACTOR", "WORKSPACE_ID"],
  },
  {
    id: "classify",
    number: "02",
    title: "Classify Risk",
    desc: "Policy rules evaluate content type, channel, jurisdiction, and sensitivity.",
    color: "#F59E0B",
    colorBg: "rgba(245,158,11,0.10)",
    colorBorder: "rgba(245,158,11,0.25)",
    fields: ["POLICY_ID", "RISK_SCORE", "CONTENT_TYPE"],
  },
  {
    id: "route",
    number: "03",
    title: "Route Review",
    desc: "Work is routed to the right reviewer, approver, or governance path based on risk.",
    color: "#8B5CF6",
    colorBg: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.30)",
    fields: ["ROLE", "SLA", "ROUTING_RULE", "APPROVER_ID"],
  },
  {
    id: "decide",
    number: "04",
    title: "Decide",
    desc: "Reviewer or approver makes a decision: Approved, Rejected, Needs Changes, or Escalated.",
    color: "#22C55E",
    colorBg: "rgba(34,197,94,0.09)",
    colorBorder: "rgba(34,197,94,0.25)",
    fields: ["DECISION_ID", "APPROVER_ID", "RATIONALE"],
  },
  {
    id: "evidence",
    number: "05",
    title: "Capture Evidence",
    desc: "The decision links to Audit Trail, Decision Ledger, Evidence Vault, and Identity Ledger.",
    color: "#EF4444",
    colorBg: "rgba(239,68,68,0.08)",
    colorBorder: "rgba(239,68,68,0.22)",
    fields: ["EVIDENCE_ID", "SEAL_STATE", "IDENTITY_REF"],
  },
  {
    id: "publish",
    number: "06",
    title: "Publish or Block",
    desc: "Approved work executes. Rejected or escalated work is blocked, revised, or routed to Forensic Hub.",
    color: "#C9A84C",
    colorBg: "rgba(201,168,76,0.12)",
    colorBorder: "rgba(201,168,76,0.30)",
    fields: ["PUBLISH_STATUS", "BLOCK_REASON", "OUTCOME"],
  },
];

export const RISK_TIERS = [
  {
    tier: "LOW",
    color: "#22C55E",
    title: "Auto-approve within policy",
    desc: "Work that meets all brand, policy, and scope rules proceeds automatically — no human gate required. Fast and frictionless.",
  },
  {
    tier: "MEDIUM",
    color: "#C9A84C",
    title: "Reviewer required",
    desc: "Content or decisions with moderate brand, channel, or campaign sensitivity are routed to a human reviewer before advancing.",
  },
  {
    tier: "HIGH",
    color: "#EF4444",
    title: "Approver + evidence",
    desc: "High-impact outputs, regulated claims, or externally visible actions require a named approver and a sealed evidence record.",
  },
  {
    tier: "CRITICAL",
    color: "#8B5CF6",
    title: "Governance, legal, or Forensic Hub",
    desc: "Sensitive actions — policy overrides, crisis comms, regulated claims, or flagged outputs — escalate to governance or the Forensic Hub.",
  },
];

export const ROLES = [
  {
    icon: "eye",
    title: "Reviewer",
    desc: "First-pass review of content quality, accuracy, and brief alignment. No final authority.",
  },
  {
    icon: "check",
    title: "Validator",
    desc: "Policy, brand, and compliance validation before work advances to an approver.",
  },
  {
    icon: "person",
    title: "Approver",
    desc: "Final authority within defined limits. Decision is evidenced and linked to the approver's identity and role at that moment.",
  },
  {
    icon: "briefcase",
    title: "Governance Admin",
    desc: "Override capability, policy exception handling, and cross-workspace approval authority.",
  },
  {
    icon: "scale",
    title: "Legal / Compliance",
    desc: "Regulated claim review, legal hold management, and Forensic Hub escalation authority.",
  },
  {
    icon: "send",
    title: "Publisher",
    desc: "Executes approved publishing actions. Cannot proceed without completed approval chain.",
  },
  {
    icon: "book",
    title: "Executive Sign-off",
    desc: "Required for high-value or high-visibility decisions: major campaigns, crisis response, or board-level communications.",
  },
];

export const EVIDENCE_LINKS = [
  {
    icon: "history",
    number: "01",
    title: "Audit Trail",
    desc: "Records what happened: who submitted, who reviewed, what changed, and when every stage completed.",
    fields: ["EVENT_ID", "ACTOR", "TIMESTAMP"],
    color: "#20E7F2",
  },
  {
    icon: "clipboard",
    number: "02",
    title: "Decision Ledger",
    desc: "Records why: the rationale, conditions, policy state, and decision outcome at the moment of approval.",
    fields: ["DECISION_ID", "RATIONALE", "CONDITIONS"],
    color: "#C9A84C",
  },
  {
    icon: "lock",
    number: "03",
    title: "Evidence Vault",
    desc: "Seals the proof: prompts, outputs, approval attachments, policy check results, and version references.",
    fields: ["EVIDENCE_ID", "SEAL_STATE", "HASH"],
    color: "#EF4444",
  },
  {
    icon: "search",
    number: "04",
    title: "Forensic Hub",
    desc: "Available when a decision is disputed, flagged, or escalated. Reconstructs the complete case for governance review.",
    fields: ["CASE_ID", "ESCALATION_REASON", "SLA"],
    color: "#8B5CF6",
  },
  {
    icon: "badge",
    number: "05",
    title: "Identity Ledger",
    desc: "Binds the decision to the approver's verified role, authority scope, and session at the exact moment of sign-off.",
    fields: ["IDENTITY_REF", "ROLE", "AUTHORITY_SCOPE"],
    color: "#22C55E",
  },
];

export const EVIDENCE_STATS = [
  { value: "5", label: "Linked Evidence Systems" },
  { value: "Zero", label: "Undocumented Approvals" },
  { value: "Full trail", label: "Every Decision Defensible" },
];

export const TEMPLATES = [
  {
    tag: "CMO · Marketing Ops",
    title: "AI Campaign Review Workflow",
    desc: "Brief → Agent draft → Brand check → Reviewer → Approver → Publish → Evidence",
    image: "/images/approval-workflows/template-campaign-review.jpg",
    featured: true,
  },
  {
    tag: "Enterprise Retail",
    title: "Retail Campaign Launch",
    image: "/images/approval-workflows/template-retail-launch.jpg",
  },
  {
    tag: "Legal · Compliance",
    title: "Regulated Claim Review",
    image: "/images/approval-workflows/template-regulated-claim.jpg",
  },
  {
    tag: "C-Suite · COO",
    title: "Executive Announcement",
    image: "/images/approval-workflows/template-executive-announcement.jpg",
  },
  {
    tag: "Partnerships",
    title: "Partner Campaign",
    image: "/images/approval-workflows/template-partner-campaign.jpg",
  },
  {
    tag: "Finance · RevOps",
    title: "Budget Exception",
    image: "/images/security/campaign-operations.png",
  },
  {
    tag: "Comms · Executive",
    title: "Crisis Response",
    image: "/images/approval-workflows/template-crisis-response.jpg",
  },
];

export const OUTCOMES = [
  {
    value: "Cycle↓",
    label: "Approval Time",
    desc: "SLA automation and escalation paths reduce bottlenecks.",
  },
  {
    value: "Zero",
    label: "Unreviewed Publishes",
    desc: "Policy gates block publication until approval chain completes.",
  },
  {
    value: "Full",
    label: "Evidence Coverage",
    desc: "Every approval linked to a defensible audit record.",
  },
  {
    value: "Risk↓",
    label: "Policy Violations Prevented",
    desc: "Brand, legal, and compliance rules enforced before execution.",
  },
];

export const INTEGRATION_CATEGORIES = [
  {
    tag: "Social & Publishing",
    items: ["LinkedIn", "Meta", "X", "TikTok", "Google Ads"],
  },
  {
    tag: "Collaboration & Alerts",
    items: ["Slack", "Teams", "Email", "Webhooks"],
  },
  {
    tag: "CRM & Revenue",
    items: ["Salesforce", "HubSpot", "Zoho", "Dynamics"],
  },
  {
    tag: "Project & Work Tools",
    items: ["Jira", "Asana", "Monday", "Notion"],
  },
  {
    tag: "Identity & Security",
    items: ["SSO", "MFA-aware", "Role checks", "Audit hooks"],
  },
  {
    tag: "APIs & Webhooks",
    items: ["REST APIs", "Webhooks", "Event Streams"],
  },
];

export const FAQS = [
  {
    question: "What are AI approval workflows?",
    answer:
      "AI approval workflows are governed checkpoints that route AI-generated content, campaigns, and decisions through role-based human review before they publish or execute — with every step evidenced and auditable.",
  },
  {
    question: "How does ZoikoVertex decide who should approve work?",
    answer:
      "Risk is calculated from policy rules, content type, channel, jurisdiction, campaign sensitivity, and agent autonomy level — routing each piece of work to the reviewer, approver, or governance path with the right authority.",
  },
  {
    question: "Can ZoikoVertex block risky AI outputs?",
    answer:
      "Yes. Policy gates block publication until the required approval chain completes. High-risk or regulated outputs cannot proceed without a named approver and a sealed evidence record.",
  },
  {
    question: "Are approval decisions auditable?",
    answer:
      "Every decision links to five evidence systems — Audit Trail, Decision Ledger, Evidence Vault, Identity Ledger, and where escalated, the Forensic Hub — creating a complete, defensible governance trail.",
  },
  {
    question: "Can approvals be customized by team or client?",
    answer:
      "Yes. Approval templates are configurable by workspace, brand, client, risk level, and market — so agencies, multi-brand teams, and regulated industries can apply distinct approval rules per context.",
  },
  {
    question: "Does ZoikoVertex replace existing tools?",
    answer:
      "No. Approval workflows connect to the tools where work already happens — social and publishing platforms, CRM, project tools, collaboration apps, identity providers, and APIs — adding governance without replacing your stack.",
  },
];

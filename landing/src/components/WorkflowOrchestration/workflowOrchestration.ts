export type Stage = {
  id: string;
  number: string;
  title: string;
  shortDesc: string;
  detailDesc: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  fields: string[];
  image: string;
};

export const STAGES: Stage[] = [
  {
    id: "trigger",
    number: "01",
    title: "Trigger",
    shortDesc:
      "Workflow begins from user request, schedule, API, integration event, or governance rule.",
    detailDesc:
      "Connect AI work to real enterprise events. Triggers can be scheduled, event-driven, or initiated by humans, systems, or governance conditions.",
    color: "#C9A84C",
    colorBg: "rgba(201,168,76,0.10)",
    colorBorder: "rgba(201,168,76,0.30)",
    fields: ["trigger_type", "source_id", "tenant_id", "workspace_id", "object_id"],
    image: "/images/ai-workflow-orchestration/stage-01-trigger.jpg",
  },
  {
    id: "route",
    number: "02",
    title: "Route",
    shortDesc:
      "System routes the task to the right agent, human role, workflow lane, or approval group.",
    detailDesc:
      "Tasks are routed to the right agent, human role, workflow lane, or approval group based on routing rules, priority, and SLA targets.",
    color: "#20E7F2",
    colorBg: "rgba(32,231,242,0.10)",
    colorBorder: "rgba(32,231,242,0.30)",
    fields: ["routing_rule", "role", "agent_id", "priority", "sla"],
    image: "/images/ai-workflow-orchestration/stage-02-route.jpg",
  },
  {
    id: "execute",
    number: "03",
    title: "Execute",
    shortDesc:
      "AI agents, humans, or integrations perform assigned actions within defined policy boundaries.",
    detailDesc:
      "AI agents, human operators, or connected integrations carry out the assigned action inside the policy boundaries set for that workflow lane.",
    color: "#8B5CF6",
    colorBg: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.30)",
    fields: ["task_id", "actor_type", "action", "output_reference"],
    image: "/images/ai-workflow-orchestration/stage-03-execute.jpg",
  },
  {
    id: "verify",
    number: "04",
    title: "Verify",
    shortDesc:
      "Policy, brand, risk, quality, permissions, and data checks run before any stage can continue.",
    detailDesc:
      "Policy, brand, risk, quality, permissions, and data checks run automatically before the workflow is allowed to continue to the next stage.",
    color: "#22C55E",
    colorBg: "rgba(34,197,94,0.09)",
    colorBorder: "rgba(34,197,94,0.25)",
    fields: ["policy_id", "rule_result", "risk_score", "exception"],
    image: "/images/ai-workflow-orchestration/stage-04-verify.jpg",
  },
  {
    id: "approve",
    number: "05",
    title: "Approve",
    shortDesc:
      "Human review, multi-stage approval, or escalation occurs where required by workflow rules.",
    detailDesc:
      "Human review, multi-stage approval, or escalation is triggered wherever workflow rules require accountable sign-off before execution proceeds.",
    color: "#F59E0B",
    colorBg: "rgba(245,158,11,0.09)",
    colorBorder: "rgba(245,158,11,0.25)",
    fields: ["approval_stage", "decision_id", "approver_id", "status"],
    image: "/images/ai-workflow-orchestration/stage-05-approve.jpg",
  },
  {
    id: "record",
    number: "06",
    title: "Record",
    shortDesc:
      "Audit, evidence, ROI, and workflow metrics are captured for review, improvement, and governance.",
    detailDesc:
      "Audit events, evidence, ROI, and workflow metrics are captured for review, continuous improvement, and governance reporting.",
    color: "#EF4444",
    colorBg: "rgba(239,68,68,0.08)",
    colorBorder: "rgba(239,68,68,0.22)",
    fields: ["audit_event_id", "evidence_id", "roi_metric", "outcome"],
    image: "/images/ai-workflow-orchestration/stage-06-record.jpg",
  },
];

export const CONTROLS = [
  {
    tag: "HITL",
    color: "#22C55E",
    title: "Human-in-the-Loop Gates",
    desc: "Require review before high-risk actions, publishing, external communication, or policy overrides proceed.",
    image: "/images/ai-workflow-orchestration/control-hitl-gates.jpg",
  },
  {
    tag: "Control",
    color: "#20E7F2",
    title: "Autonomy Limits",
    desc: "Define what an AI agent can draft, recommend, execute, or publish without human approval. Prevents overreach.",
    image: "/images/ai-workflow-orchestration/control-autonomy-limits.jpg",
  },
  {
    tag: "Policy",
    color: "#C9A84C",
    title: "Policy Gates",
    desc: "Run brand, legal, privacy, jurisdiction, and restricted-claim rules before any workflow stage can continue.",
    image: "/images/ai-workflow-orchestration/control-policy-gates.jpg",
  },
  {
    tag: "Escalation",
    color: "#F87171",
    title: "Escalation Paths",
    desc: "Route exceptions to approvers, governance admins, security, or Forensic Hub with SLA tracking.",
    image: "/images/ai-workflow-orchestration/control-escalation-paths.jpg",
  },
  {
    tag: "Versioning",
    color: "#8B5CF6",
    title: "Version Control",
    desc: "Track workflow changes, releases, rollbacks, and approvals. Every change is auditable against a version record.",
    image: "/images/ai-workflow-orchestration/control-version-control.jpg",
  },
  {
    tag: "Evidence",
    color: "#F59E0B",
    title: "Evidence Capture",
    desc: "Define which workflow steps must produce sealed proof — prompts, outputs, decisions, and approvals.",
    image: "/images/ai-workflow-orchestration/control-evidence-capture.jpg",
  },
];

export const CONTROL_STATS = [
  {
    value: "6",
    label: "Control Types",
    desc: "Built into the workflow architecture from trigger to evidence.",
  },
  {
    value: "Zero",
    label: "Uncontrolled Actions",
    desc: "Every governed workflow action passes through at least one policy check.",
  },
  {
    value: "Full trail",
    label: "Evidence Coverage",
    desc: "Every material decision linked to an audit record, actor, policy, and outcome.",
  },
];

export const INTEGRATION_CATEGORIES = [
  {
    tag: "Social & Publishing",
    title: "Marketing channels",
    items: ["LinkedIn", "Meta", "X", "TikTok", "Google Ads"],
    note: "Channel availability varies. Verify current connectors.",
  },
  {
    tag: "CRM & Revenue",
    title: "Lead flow & attribution",
    items: ["Salesforce", "HubSpot", "Zoho", "Dynamics"],
    note: "Campaign attribution and sales handoff through CRM integrations.",
  },
  {
    tag: "Project & Work Tools",
    title: "Task coordination",
    items: ["Jira", "Asana", "Monday", "Notion", "ClickUp"],
    note: "Sync workflow states, task routing, and SLA visibility.",
  },
  {
    tag: "Communication",
    title: "Approvals & alerts",
    items: ["Slack", "Teams", "Email", "Webhooks"],
    note: "Real-time approval requests, escalation alerts, and status updates.",
  },
  {
    tag: "Storage & DAM",
    title: "Assets & evidence",
    items: ["Google Drive", "SharePoint", "Dropbox", "Box"],
    note: "Evidence attachments, version-controlled assets, and export records.",
  },
  {
    tag: "Security & Identity",
    title: "Access & audit events",
    items: ["MFA-aware", "Role checks", "SSO", "Audit hooks"],
    note: "Role change events, access grants, and permission checks link to workflow governance.",
  },
  {
    tag: "APIs & Webhooks",
    title: "Enterprise extensibility",
    items: ["REST APIs", "Webhooks", "Event Streams", "Data Connectors"],
    note: "Build custom workflow triggers, integration actions, and evidence pipelines.",
  },
  {
    tag: "Data & BI",
    title: "ROI & performance",
    items: ["Dashboard feeds", "ROI reports", "Executive summary"],
    note: "Workflow outcomes, performance metrics, and governance reports to BI tools.",
  },
];

export const EVIDENCE_ROWS = [
  {
    event: "Agent output",
    linkedSystem: "Audit Trail + Evidence Vault",
    storedOutput: "event_id · evidence_id · output_ref",
  },
  {
    event: "Approval decision",
    linkedSystem: "Decision Ledger + Audit Trail",
    storedOutput: "decision_id · actor · approval_stage",
  },
  {
    event: "Policy blocked",
    linkedSystem: "Policy Engine + Evidence Vault",
    storedOutput: "policy_id · risk_level · blocked_status",
  },
  {
    event: "Workflow escalated",
    linkedSystem: "Forensic Hub",
    storedOutput: "case_id · escalation_reason · SLA",
  },
  {
    event: "Sensitive actor action",
    linkedSystem: "Identity Ledger",
    storedOutput: "identity_ref · role · session · scope",
  },
  {
    event: "Evidence exported",
    linkedSystem: "Evidence Vault + Audit Trail",
    storedOutput: "export_id · manifest_hash · exported_by",
  },
];

export const ROI_METRICS = [
  {
    label: "Cycle time",
    sub: "Reduced",
    desc: "Time saved from request to approval or launch — quantified per workflow type.",
  },
  {
    label: "SLA",
    sub: "Approval Adherence",
    desc: "Percentage of approvals completed within target time. Shows operational discipline.",
  },
  {
    label: "Risk events",
    sub: "Blocked & Prevented",
    desc: "High-risk or non-compliant actions prevented before reaching execution or publication.",
  },
  {
    label: "Evidence",
    sub: "Coverage Score",
    desc: "Percentage of material workflow steps with linked evidence — governance maturity signal.",
  },
  {
    label: "AI assist",
    sub: "Rate per Workflow",
    desc: "Percentage of workflow steps assisted by AI or automation. Shows adoption without overclaiming.",
  },
  {
    label: "Review",
    sub: "Human Efficiency",
    desc: "Review throughput and average decision time — supports team capacity planning.",
  },
  {
    label: "Campaign",
    sub: "Execution Velocity",
    desc: "Time from brief to approved and published content. Connects to revenue speed to market.",
  },
  {
    label: "Cost-to-control",
    sub: "Ratio",
    desc: "Estimated savings versus governance and review overhead. CFO/CIO business case.",
  },
];

export const USE_CASES = [
  {
    tag: "Marketing Leadership",
    title: "Launch campaigns faster with governed AI review.",
    desc: "From brief to approved campaign — controlled at every stage.",
    image: "/images/ai-workflow-orchestration/usecase-marketing.jpg",
  },
  {
    tag: "Governance & Compliance",
    title: "Prevent policy violations and preserve evidence.",
    desc: "Policy gates, escalation paths, and evidence capture for every governed decision.",
    image: "/images/ai-workflow-orchestration/usecase-governance.jpg",
  },
  {
    tag: "IT & CTO",
    title: "Connect agent workflows to enterprise systems.",
    desc: "APIs, identity controls, webhooks, and audit infrastructure for governed agentic execution.",
    image: "/images/ai-workflow-orchestration/usecase-it-cto.jpg",
  },
  {
    tag: "Retail Operations",
    title: "Coordinate promotions with approvals and evidence.",
    desc: "Multi-channel execution, offer validation, and performance tracking across retail teams.",
    image: "/images/ai-workflow-orchestration/usecase-retail-ops.jpg",
  },
  {
    tag: "Executive Team",
    title: "See workflow risk, ROI, and execution status.",
    desc: "Command view of bottlenecks, exceptions, pending approvals, and performance outcomes.",
    image: "/images/ai-workflow-orchestration/usecase-executive.jpg",
  },
];

export const FAQS = [
  {
    question: "What is AI workflow orchestration?",
    answer:
      "AI workflow orchestration is the governed coordination of agents, human reviewers, policy checks, integrations, approvals, and evidence capture into a single controlled execution path — from trigger to record.",
  },
  {
    question: "How is ZoikoVertex different from automation?",
    answer:
      "Automation executes tasks blindly. ZoikoVertex wraps every workflow stage in policy gates, autonomy limits, approval routing, and evidence capture — so execution stays accountable and auditable.",
  },
  {
    question: "Can humans approve AI actions before execution?",
    answer:
      "Yes. Human-in-the-loop gates require review before high-risk actions, publishing, external communication, or policy overrides are allowed to proceed.",
  },
  {
    question: "What evidence is captured by the workflow?",
    answer:
      "Agent outputs, approval decisions, policy blocks, escalations, sensitive actor actions, and exports are all captured with linked audit, identity, and evidence records.",
  },
  {
    question: "Does it integrate with existing enterprise tools?",
    answer:
      "Yes. The integration fabric connects to marketing channels, CRMs, project tools, communication platforms, storage and DAM systems, identity providers, and developer APIs already in your stack.",
  },
  {
    question: "Who is AI Workflow Orchestration built for?",
    answer:
      "Marketing, governance and compliance, IT and engineering, operations, and executive teams that need AI-assisted execution without losing approval control or auditability.",
  },
  {
    question: "How does it connect to the ROI Engine?",
    answer:
      "Every governed workflow reports cycle time, SLA adherence, risk events blocked, evidence coverage, and cost-to-control metrics directly into the ROI Engine for CFO and CIO visibility.",
  },
];

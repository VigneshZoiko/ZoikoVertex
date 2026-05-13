export const ROLE_ARCHITECTURE = [
  {
    id: "WORKSPACE_OWNER",
    name: "Workspace Owner",
    category: "Strategic",
    layer: "Governance",
    description: "Legal ownership, billing, subscription, and highest authority across all modules.",
    responsibilities: ["Full access", "Billing management", "Enterprise configuration"]
  },
  {
    id: "ADMIN",
    name: "Administrator",
    category: "Operations",
    layer: "Build",
    description: "Daily management of users, integrations, and platform configuration.",
    responsibilities: ["User provisioning", "System health", "Integration setup"]
  },
  {
    id: "SECURITY_ADMIN",
    name: "Security Officer",
    category: "Security",
    layer: "Governance",
    description: "Managing SSO, MFA, access controls, and monitoring security audit logs.",
    responsibilities: ["Access control", "Security auditing", "Identity protection"]
  },
  {
    id: "GOVERNANCE_ADMIN",
    name: "Governance Lead",
    category: "Governance",
    layer: "Governance",
    description: "Non-negotiable oversight of approval rules, autonomy levels, and risk thresholds.",
    responsibilities: ["Approval policies", "Autonomy boundaries", "Rule enforcement"]
  },
  {
    id: "AGENT_ARCHITECT",
    name: "Agent Architect",
    category: "AI Engineering",
    layer: "Build",
    description: "Builds, configures, and tests AI agents and their operating rules.",
    responsibilities: ["Agent building", "Prompt engineering", "Workflow design"]
  },
  {
    id: "KNOWLEDGE_MANAGER",
    name: "Knowledge Manager",
    category: "AI Engineering",
    layer: "Build",
    description: "Manages knowledge bases, RAG integrity, and information source freshness.",
    responsibilities: ["Data curation", "RAG optimization", "Source validation"]
  },
  {
    id: "CREATOR",
    name: "Contributor",
    category: "Creative",
    layer: "Build",
    description: "Creates draft posts, prompts, and initial creative assets.",
    responsibilities: ["Content drafting", "Asset creation", "Draft submission"]
  },
  {
    id: "BRAND_REVIEWER",
    name: "Brand Manager",
    category: "Creative",
    layer: "Output",
    description: "Ensures all outputs align with corporate tone, voice, and visual identity.",
    responsibilities: ["Tone consistency", "Visual standards", "Brand alignment"]
  },
  {
    id: "APPROVER",
    name: "Approver",
    category: "Operations",
    layer: "Output",
    description: "Final authority to authorize high-risk content or system changes.",
    responsibilities: ["Final review", "Risk assessment", "Authorization"]
  },
  {
    id: "PUBLISHER",
    name: "Publisher",
    category: "Operations",
    layer: "Output",
    description: "Authorized to push content to live social, web, or external channels.",
    responsibilities: ["Scheduling", "Live publishing", "Platform management"]
  },
  {
    id: "COMPLIANCE_REVIEWER",
    name: "Compliance Officer",
    category: "Governance",
    layer: "Governance",
    description: "Verifies outputs against regulatory standards and legal mandates.",
    responsibilities: ["Legal review", "Regulatory audit", "Compliance check"]
  },
  {
    id: "ANALYST",
    name: "Analyst",
    category: "Insights",
    layer: "Output",
    description: "Interprets ROI, performance data, and agent efficiency metrics.",
    responsibilities: ["Performance tracking", "ROI reporting", "Data interpretation"]
  },
  {
    id: "PRIVACY_ADMIN",
    name: "Privacy Lead",
    category: "Security",
    layer: "Governance",
    description: "Managing data retention, PII scrubbing, and consent records.",
    responsibilities: ["Data privacy", "PII management", "Consent tracking"]
  },
  {
    id: "EXTERNAL_COLLABORATOR",
    name: "External Partner",
    category: "External",
    layer: "Build",
    description: "Restricted access for agencies or guest contractors.",
    responsibilities: ["Contractor access", "Limited scope", "External collaboration"]
  },
  {
    id: "VIEWER",
    name: "System Viewer",
    category: "Support",
    layer: "Output",
    description: "Basic read-only visibility into dashboards and reports.",
    responsibilities: ["Read-only access", "Reporting", "Dashboards"],
    groups: ["command", "admin"]
  }
];

export const ROLE_GROUP_MAPPING: Record<string, string[]> = {
  "platform": ["SUPERADMIN", "WORKSPACE_OWNER", "SECURITY_ADMIN"],
  "command": ["ADMIN", "MANAGER", "CREATOR", "WORKSPACE_OWNER", "AGENT_OPERATOR", "ANALYST", "VIEWER"],
  "media": ["ADMIN", "MANAGER", "CREATOR", "AGENT_ARCHITECT", "CAMPAIGN_MANAGER", "ASSET_MANAGER"],
  "validation": ["ADMIN", "MANAGER", "REVIEWER", "VALIDATOR", "APPROVER", "GOVERNANCE_ADMIN", "BRAND_REVIEWER"],
  "agents": ["ADMIN", "MANAGER", "AGENT_ARCHITECT", "AGENT_OPERATOR", "KNOWLEDGE_MANAGER", "PROMPT_MANAGER", "WORKFLOW_ARCHITECT"],
  "governance": ["ADMIN", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "AUDITOR", "RISK_MANAGER", "PRIVACY_ADMIN", "EVIDENCE_MANAGER"],
  "integrations": ["ADMIN", "DEVELOPER", "PLATFORM_ENGINEER", "DATA_CONNECTOR_ADMIN"],
  "access": ["ADMIN", "WORKSPACE_OWNER", "IDENTITY_MANAGER"],
  "admin": ["ADMIN", "SUPERADMIN", "WORKSPACE_OWNER", "BILLING_ADMIN"]
};

export const CONTROL_LAYERS = {
  BUILD: {
    name: "Build Control",
    color: "emerald",
    description: "Responsible for creating and configuring agents, prompts, and assets."
  },
  GOVERNANCE: {
    name: "Governance Control",
    color: "amber",
    description: "Responsible for setting policies, risk thresholds, and compliance rules."
  },
  OUTPUT: {
    name: "Output Control",
    color: "indigo",
    description: "Responsible for validating, approving, and publishing final results."
  }
};

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
    id: "AGENT_OPERATOR",
    name: "Agent Operator",
    category: "AI Engineering",
    layer: "Build",
    description: "Runs, monitors, pauses, and escalates live AI agents in production.",
    responsibilities: ["Live agent supervision", "Pause & escalation", "Operational monitoring"]
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
    id: "CAMPAIGN_MANAGER",
    name: "Campaign Manager",
    category: "Creative",
    layer: "Build",
    description: "Manages campaigns, publishing schedules, and content execution across channels.",
    responsibilities: ["Campaign planning", "Publishing coordination", "Content pipeline"]
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
    id: "REVIEWER",
    name: "Reviewer",
    category: "Operations",
    layer: "Output",
    description: "Performs general human-in-the-loop review of drafts and agent outputs.",
    responsibilities: ["Content review", "Draft feedback", "Review queue management"]
  },
  {
    id: "VALIDATOR",
    name: "Validator",
    category: "Operations",
    layer: "Output",
    description: "Higher-trust HITL validation for accuracy, brand fit, risk, and compliance readiness.",
    responsibilities: ["Accuracy verification", "Risk validation", "Claim evidence review"]
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
    id: "AUDITOR",
    name: "Auditor",
    category: "Governance",
    layer: "Governance",
    description: "Read-only access to audit trail, evidence vault, and publishing logs for investigation.",
    responsibilities: ["Audit review", "Evidence export", "Investigation support"]
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
    id: "DEVELOPER",
    name: "Developer",
    category: "Engineering",
    layer: "Build",
    description: "API keys, webhooks, sandbox access, integrations, and technical diagnostics.",
    responsibilities: ["API management", "Webhook configuration", "Integration diagnostics"]
  },
  {
    id: "EXTERNAL_COLLABORATOR",
    name: "External Partner",
    category: "External",
    layer: "Build",
    description: "Restricted access for agencies or guest contractors with scoped workspace visibility.",
    responsibilities: ["Contractor access", "Assigned tasks only", "External collaboration"]
  },
  {
    id: "VIEWER",
    name: "System Viewer",
    category: "Support",
    layer: "Output",
    description: "Basic read-only visibility into dashboards, reports, and permitted surfaces.",
    responsibilities: ["Read-only access", "Reporting", "Dashboards"]
  }
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  WORKSPACE_OWNER: ['*'],
  SUPERADMIN: ['*'],
  ADMIN: [
    'dashboard:view','operations:view','analytics:view','resources:view',
    'library:view','library:manage','projects:view','projects:manage',
    'campaigns:view','campaigns:manage','studio:view','studio:manage',
    'calendar:view','calendar:manage','publish:view','publish:manage',
    'inbox:view','inbox:manage',
    'queue:view','queue:manage','validation:view','validation:manage',
    'approvals:view','approvals:manage','brand-library:view',
    'quality:view','quality:manage','rules:view','rules:manage','exceptions:view','exceptions:manage',
    'agents:view','agents:manage','agent-operations:view','agent-operations:manage',
    'workflows:view','workflows:manage','prompts:view','prompts:manage',
    'autonomy:view','autonomy:manage','models:view','knowledge:view','knowledge:manage',
    'governance:view','governance:manage','brand:view','brand:manage',
    'policy:view','policy:manage','risk:view','risk:manage',
    'audit:view','evidence:view',
    'accounts:view','accounts:manage','connectors:view','connectors:manage',
    'api:view','api:manage','developer:view','developer:manage',
    'identity-ledger:view','integrations:view',
    'team:view','team:manage','roles:view','roles:manage',
    'units:view','units:manage','partners:view','external:view',
    'settings:view','settings:manage','billing:view',
    'security:view','security:manage','privacy:view','privacy:manage',
    'notifications:view','notifications:manage','status:view','crisis:view','support:view',
  ],
  GOVERNANCE_ADMIN: [
    'dashboard:view','operations:view',
    'governance:view','governance:manage','policy:view','policy:manage',
    'risk:view','risk:manage','audit:view','evidence:view',
    'rules:view','rules:manage','autonomy:view','autonomy:manage',
    'queue:view','validation:view','approvals:view','quality:view','exceptions:view',
    'agents:view','brand:view','brand-library:view','support:view',
  ],
  AGENT_ARCHITECT: [
    'dashboard:view','agents:view','agents:manage',
    'workflows:view','workflows:manage','prompts:view','prompts:manage',
    'knowledge:view','models:view','queue:view','governance:view','validation:view','support:view',
  ],
  AGENT_OPERATOR: [
    'dashboard:view','operations:view','agents:view',
    'agent-operations:view','agent-operations:manage','workflows:view',
    'queue:view','inbox:view','inbox:manage','models:view','crisis:view','support:view',
  ],
  KNOWLEDGE_MANAGER: [
    'dashboard:view','knowledge:view','knowledge:manage',
    'agents:view','audit:view','support:view',
  ],
  CAMPAIGN_MANAGER: [
    'dashboard:view','operations:view','analytics:view',
    'campaigns:view','campaigns:manage','projects:view','projects:manage',
    'library:view','library:manage','studio:view',
    'calendar:view','calendar:manage','publish:view',
    'inbox:view','inbox:manage','queue:view','support:view',
  ],
  CREATOR: [
    'dashboard:view','library:view','studio:view','studio:manage',
    'projects:view','campaigns:view','calendar:view',
    'queue:view','knowledge:view','support:view',
  ],
  REVIEWER: [
    'dashboard:view','queue:view','queue:manage',
    'library:view','projects:view','knowledge:view',
    'brand:view','brand-library:view','support:view',
  ],
  VALIDATOR: [
    'dashboard:view','queue:view','validation:view','validation:manage',
    'knowledge:view','brand:view','brand-library:view',
    'governance:view','audit:view','approvals:view','support:view',
  ],
  APPROVER: [
    'dashboard:view','approvals:view','approvals:manage',
    'validation:view','queue:view','brand:view','brand-library:view',
    'audit:view','support:view',
  ],
  PUBLISHER: [
    'dashboard:view','calendar:view','calendar:manage',
    'publish:view','publish:manage','accounts:view',
    'approvals:view','inbox:view','inbox:manage','support:view',
  ],
  COMPLIANCE_REVIEWER: [
    'dashboard:view','governance:view','risk:view',
    'audit:view','evidence:view','analytics:view','support:view',
  ],
  AUDITOR: [
    'dashboard:view','audit:view','evidence:view',
    'analytics:view','approvals:view','queue:view',
    'models:view','developer:view','identity-ledger:view','support:view',
  ],
  ANALYST: [
    'dashboard:view','analytics:view','projects:view','campaigns:view',
    'queue:view','support:view',
  ],
  SECURITY_ADMIN: [
    'dashboard:view','security:view','security:manage',
    'team:view','audit:view','support:view',
  ],
  PRIVACY_ADMIN: [
    'dashboard:view','privacy:view','privacy:manage',
    'audit:view','support:view',
  ],
  BRAND_REVIEWER: [
    'dashboard:view','queue:view','brand:view','brand:manage',
    'brand-library:view','brand-library:manage','quality:view','support:view',
  ],
  DEVELOPER: [
    'dashboard:view','developer:view','developer:manage',
    'accounts:view','connectors:view','api:view','api:manage',
    'integrations:view','identity-ledger:view','audit:view','support:view',
  ],
  EXTERNAL_COLLABORATOR: [
    'dashboard:view','external:view','projects:view','campaigns:view','queue:view','support:view',
  ],
  VIEWER: [
    'dashboard:view','analytics:view','projects:view','campaigns:view',
    'calendar:view','library:view','support:view',
  ],
};

export const ROLE_GROUP_MAPPING: Record<string, string[]> = {
  "platform": ["SUPERADMIN"],
  "command": ["ADMIN", "WORKSPACE_OWNER", "ANALYST", "CAMPAIGN_MANAGER", "AUDITOR", "GOVERNANCE_ADMIN"],
  "media": ["ADMIN", "WORKSPACE_OWNER", "CREATOR", "PUBLISHER", "CAMPAIGN_MANAGER", "ANALYST", "VIEWER", "EXTERNAL_COLLABORATOR"],
  "agents": ["ADMIN", "WORKSPACE_OWNER", "AGENT_ARCHITECT", "AGENT_OPERATOR", "KNOWLEDGE_MANAGER", "GOVERNANCE_ADMIN"],
  "governance": ["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "COMPLIANCE_REVIEWER", "BRAND_REVIEWER"],
  "validation": ["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "REVIEWER", "VALIDATOR", "APPROVER", "BRAND_REVIEWER", "CAMPAIGN_MANAGER"],
  "evidence": ["ADMIN", "WORKSPACE_OWNER", "GOVERNANCE_ADMIN", "AUDITOR", "COMPLIANCE_REVIEWER", "DEVELOPER"],
  "integrations": ["ADMIN", "WORKSPACE_OWNER", "DEVELOPER", "PUBLISHER", "AUDITOR"],
  "access": ["ADMIN", "WORKSPACE_OWNER", "SECURITY_ADMIN", "EXTERNAL_COLLABORATOR"],
  "admin": ["ADMIN", "WORKSPACE_OWNER", "SUPERADMIN", "SECURITY_ADMIN", "PRIVACY_ADMIN"]
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

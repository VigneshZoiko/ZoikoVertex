export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  WORKSPACE_OWNER: ['*'],
  SUPERADMIN: ['*'],
  ADMIN: [
    'dashboard:view', 'operations:view', 'analytics:view', 'resources:view',
    'library:view', 'library:manage', 'projects:view', 'projects:manage',
    'campaigns:view', 'campaigns:manage', 'studio:view', 'studio:manage',
    'calendar:view', 'calendar:manage', 'publish:view', 'publish:manage',
    'inbox:view', 'inbox:manage',
    'queue:view', 'queue:manage', 'validation:view', 'validation:manage',
    'approvals:view', 'approvals:manage', 'brand-library:view',
    'quality:view', 'quality:manage', 'rules:view', 'rules:manage', 'exceptions:view', 'exceptions:manage',
    'agents:view', 'agents:manage', 'operations:view', 'operations:manage',
    'workflows:view', 'workflows:manage', 'prompts:view', 'prompts:manage',
    'prompt.edit.own', 'prompt.edit.any',
    'autonomy:view', 'autonomy:manage', 'models:view', 'knowledge:view', 'knowledge:manage',
    'governance:view', 'governance:manage', 'brand:view', 'brand:manage',
    'policy:view', 'policy:manage', 'risk:view', 'risk:manage',
    'audit:view', 'evidence:view',
    'accounts:view', 'accounts:manage', 'connectors:view', 'connectors:manage',
    'api:view', 'api:manage', 'developer:view', 'developer:manage',
    'identity-ledger:view', 'integrations:view',
    'team:view', 'team:manage', 'roles:view', 'roles:manage',
    'units:view', 'units:manage', 'partners:view', 'external:view',
    'settings:view', 'settings:manage', 'billing:view',
    'security:view', 'security:manage', 'privacy:view', 'privacy:manage',
    'notifications:view', 'notifications:manage', 'status:view', 'crisis:view', 'support:view',
  ],
  GOVERNANCE_ADMIN: 
  [
    'dashboard:view', 'operations:view',
    'governance:view', 'governance:manage', 'policy:view', 'policy:manage',
    'risk:view', 'risk:manage', 'audit:view', 'evidence:view',
    'prompt.edit.any',
    'rules:view', 'rules:manage', 'autonomy:view', 'autonomy:manage',
    'queue:view', 'validation:view', 'approvals:view', 'approvals:manage', 'quality:view', 'exceptions:view',
    'agents:view', 'brand:view', 'brand-library:view', 'support:view',
  ],
  AGENT_ARCHITECT: [
    'dashboard:view', 'operations:view', 'operations:manage',
    'agents:view', 'agents:manage',
    'workflows:view', 'workflows:manage', 'prompts:view', 'prompts:manage',
    'prompt.edit.own',
    'knowledge:view', 'models:view', 'queue:view', 'governance:view', 'validation:view', 'support:view',
  ],
  AGENT_OPERATOR: [
    'dashboard:view', 'operations:view', 'agents:view',
    'operations:view', 'workflows:view', 'queue:view',
    'inbox:view', 'inbox:manage', 'models:view', 'crisis:view', 'support:view',
  ],
  KNOWLEDGE_MANAGER: [
    'dashboard:view', 'knowledge:view', 'knowledge:manage',
    'agents:view', 'audit:view', 'support:view',
  ],
  MANAGER: [
    'dashboard:view', 'operations:view', 'analytics:view',
    'library:view', 'library:manage', 'projects:view', 'projects:manage',
    'campaigns:view', 'calendar:view', 'calendar:manage', 'publish:view',
    'queue:view', 'queue:manage', 'quality:view', 'support:view',
  ],
  CAMPAIGN_MANAGER: [
    'dashboard:view', 'operations:view', 'analytics:view',
    'campaigns:view', 'campaigns:manage', 'projects:view', 'projects:manage',
    'library:view', 'library:manage', 'studio:view',
    'calendar:view', 'calendar:manage', 'publish:view',
    'inbox:view', 'inbox:manage', 'queue:view', 'support:view',
  ],
  CREATOR: [
    'dashboard:view', 'library:view', 'studio:view', 'studio:manage',
    'projects:view', 'campaigns:view', 'calendar:view',
    'queue:view', 'knowledge:view', 'support:view',
  ],
  REVIEWER: [
    'dashboard:view', 'queue:view', 'queue:manage',
    'library:view', 'projects:view', 'knowledge:view',
    'brand:view', 'brand-library:view', 'support:view',
  ],
  VALIDATOR: [
    'dashboard:view', 'queue:view', 'validation:view', 'validation:manage',
    'knowledge:view', 'brand:view', 'brand-library:view',
    'governance:view', 'audit:view', 'approvals:view', 'support:view',
  ],
  
  APPROVER: [
    'dashboard:view', 'approvals:view', 'approvals:manage',
    'validation:view', 'queue:view', 'brand:view', 'brand-library:view',
    'audit:view', 'support:view',
  ],
  PUBLISHER: [
    'dashboard:view', 'calendar:view', 'calendar:manage',
    'publish:view', 'publish:manage', 'accounts:view',
    'approvals:view', 'inbox:view', 'inbox:manage', 'support:view',
  ],
  COMPLIANCE_REVIEWER: [
    'dashboard:view', 'governance:view', 'risk:view',
    'audit:view', 'evidence:view', 'analytics:view', 'support:view',
  ],
  AUDITOR: [
    'dashboard:view', 'audit:view', 'evidence:view',
    'analytics:view', 'approvals:view', 'queue:view',
    'models:view', 'developer:view', 'identity-ledger:view', 'support:view',
  ],
  ANALYST: [
    'dashboard:view', 'analytics:view', 'projects:view', 'campaigns:view',
    'queue:view', 'support:view',
  ],
  MODEL_SUPERVISOR: [
    'dashboard:view', 'agents:view', 'operations:view', 'analytics:view', 'audit:view', 'support:view',
  ],
  SECURITY_ADMIN: [
    'dashboard:view', 'security:view', 'security:manage',
    'team:view', 'audit:view', 'support:view',
  ],
  PRIVACY_ADMIN: [
    'dashboard:view', 'privacy:view', 'privacy:manage',
    'audit:view', 'support:view',
  ],
  BRAND_REVIEWER: [
    'dashboard:view', 'queue:view', 'brand:view', 'brand:manage',
    'brand-library:view', 'brand-library:manage', 'quality:view', 'support:view',
  ],
  DEVELOPER: [
    'dashboard:view', 'developer:view', 'developer:manage',
    'accounts:view', 'connectors:view', 'api:view', 'api:manage',
    'integrations:view', 'identity-ledger:view', 'audit:view', 'support:view',
  ],
  EXTERNAL_COLLABORATOR: [
    'dashboard:view', 'external:view', 'projects:view', 'queue:view', 'support:view',
  ],
  VIEWER: [
    'dashboard:view', 'analytics:view', 'projects:view', 'campaigns:view',
    'calendar:view', 'library:view', 'support:view',
  ],
};

export function getPermissionsForRole(role: string | null | undefined): string[] {
  if (!role) return [];
  return ROLE_PERMISSIONS_MAP[String(role).toUpperCase()] || [];
}

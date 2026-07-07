-- Migration 83: Add missing values to the user_role enum
-- workspace_members.role is typed as user_role (ENUM), not TEXT.
-- Roles added after the initial enum definition were only valid in code but
-- not in the DB type, causing "invalid input value for enum" 500 errors.
-- ADD VALUE IF NOT EXISTS is idempotent — safe to run multiple times.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SECURITY_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GOVERNANCE_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENT_ARCHITECT';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENT_OPERATOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'KNOWLEDGE_MANAGER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CAMPAIGN_MANAGER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BRAND_REVIEWER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'COMPLIANCE_REVIEWER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AUDITOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ANALYST';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PRIVACY_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DEVELOPER';

SELECT 'Migration 83 — user_role enum updated with all missing role values' AS status;

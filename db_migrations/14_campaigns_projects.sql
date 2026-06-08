-- Migration 14: Campaigns enhancements + Projects table
-- campaigns table already exists from 04_canonical_schema.sql
-- Add missing operational columns + create projects table

-- ─── Enhance campaigns table ─────────────────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description  TEXT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platforms    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by   UUID NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS kpi_reach      INT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS kpi_engagement INT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS kpi_conversions INT NULL;

-- ─── Projects table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL,
  campaign_id   UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT NULL,
  -- status: 'DRAFT' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'
  status        TEXT NOT NULL DEFAULT 'DRAFT',
  platforms     TEXT[] NOT NULL DEFAULT '{}',
  assigned_to   UUID NULL,
  due_date      DATE NULL,
  content_count INT NOT NULL DEFAULT 0,
  created_by    UUID NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_workspace_idx  ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS projects_campaign_idx   ON projects(campaign_id);
CREATE INDEX IF NOT EXISTS projects_status_idx     ON projects(status);
CREATE INDEX IF NOT EXISTS campaigns_workspace_idx ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx    ON campaigns(status);

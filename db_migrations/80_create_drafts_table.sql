-- Migration 80: Create publish_drafts table for the Drafts feature
--
-- Drafts are per-user private workspaces where publishers can save content
-- before it's ready for governance/submission. Each draft is:
--   - Scoped to a workspace (tenant isolation via workspace_members)
--   - Private to its creator (only the creator can view/edit their own drafts)
--   - Visible to ADMIN/WORKSPACE_OWNER for oversight
--
-- RBAC:
--   PUBLISHER, CREATOR, CAMPAIGN_MANAGER, ADMIN, WORKSPACE_OWNER can create/view/edit drafts
--   ADMIN, WORKSPACE_OWNER can view all drafts in their workspace
--   Regular users can only see their own drafts

CREATE TABLE IF NOT EXISTS publish_drafts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES organizations(id),

  -- Draft metadata
  title           TEXT NOT NULL DEFAULT '',
  topic           TEXT NOT NULL DEFAULT '',
  content_type    TEXT NOT NULL DEFAULT 'Entertainment',

  -- Caption content (mirrors publish_intents format)
  universal_caption TEXT NOT NULL DEFAULT '',
  platform_captions JSONB NOT NULL DEFAULT '{}',      -- { "instagram": "...", "facebook": "...", etc }

  -- Media
  media_urls      TEXT[] NOT NULL DEFAULT '{}',         -- Array of storage URLs
  media_type      TEXT,                                  -- 'image', 'video', 'carousel'

  -- Target accounts (connected_account IDs saved for later)
  target_account_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Post types per platform
  platform_post_types JSONB NOT NULL DEFAULT '{}',       -- { "instagram": ["reel"], "youtube": ["short"] }

  -- Draft status
  -- status: 'ACTIVE' | 'ARCHIVED' | 'CONVERTED' (submitted as intent)
  status          TEXT NOT NULL DEFAULT 'ACTIVE',

  -- AI metadata (preserved from AI generation)
  ai_tone         TEXT NOT NULL DEFAULT 'professional',
  ai_length       TEXT NOT NULL DEFAULT 'medium',
  ai_style        TEXT NOT NULL DEFAULT '',
  ai_audience     TEXT NOT NULL DEFAULT 'General',
  use_emojis      BOOLEAN NOT NULL DEFAULT true,
  metrics         JSONB,                                 -- { viral_score, sentiment_score }

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_publish_drafts_workspace ON publish_drafts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_publish_drafts_creator   ON publish_drafts(creator_id);
CREATE INDEX IF NOT EXISTS idx_publish_drafts_status    ON publish_drafts(status);
CREATE INDEX IF NOT EXISTS idx_publish_drafts_updated   ON publish_drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE publish_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Creators can see their own drafts
DROP POLICY IF EXISTS drafts_own_access ON publish_drafts;
CREATE POLICY drafts_own_access ON publish_drafts
  FOR ALL USING (
    creator_id = auth.uid()
  );

-- Admins/owners can see all drafts in their workspace
DROP POLICY IF EXISTS drafts_admin_access ON publish_drafts;
CREATE POLICY drafts_admin_access ON publish_drafts
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN')
    )
  );

-- Superadmin can see everything
DROP POLICY IF EXISTS drafts_superadmin_access ON publish_drafts;
CREATE POLICY drafts_superadmin_access ON publish_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
  );

SELECT 'Migration 80 — publish_drafts table created' AS status;

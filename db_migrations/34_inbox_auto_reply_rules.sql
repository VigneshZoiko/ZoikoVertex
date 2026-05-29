-- Migration 34: Inbox Auto-Reply Rules
-- Workspace-scoped keyword → reply mappings used during sync
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inbox_auto_reply_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  rule_name    TEXT NOT NULL DEFAULT 'Untitled Rule',
  keywords     TEXT[] NOT NULL,
  reply_body   TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_auto_reply_workspace ON inbox_auto_reply_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inbox_auto_reply_active    ON inbox_auto_reply_rules(workspace_id, is_active);

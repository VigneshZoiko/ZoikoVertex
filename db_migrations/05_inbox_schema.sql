-- ZoikoVertex — Inbox & Engagement Schema
-- Migration 05: Governed Social Inbox
-- Run in Supabase SQL Editor after migrations 01-04

-- ─── INBOX MESSAGES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id        UUID NOT NULL,
  platform            TEXT NOT NULL DEFAULT 'INSTAGRAM',
  -- platform: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'TWITTER' | 'THREADS' | 'YOUTUBE'
  platform_message_id TEXT NULL,
  sender_name         TEXT NOT NULL,
  sender_handle       TEXT NULL,
  sender_profile_url  TEXT NULL,
  -- message_type: 'DM' | 'COMMENT' | 'MENTION' | 'REPLY'
  message_type        TEXT NOT NULL DEFAULT 'DM',
  message_body        TEXT NOT NULL,
  original_post_id    TEXT NULL,
  campaign_id         UUID NULL,
  -- status: UNREAD|OPEN|ASSIGNED|IN_PROGRESS|PENDING_REVIEW|ESCALATED|APPROVED|REJECTED|RESOLVED|ARCHIVED
  status              TEXT NOT NULL DEFAULT 'UNREAD',
  -- risk_level: LOW|MEDIUM|HIGH|CRITICAL
  risk_level          TEXT NOT NULL DEFAULT 'LOW',
  risk_category       TEXT NULL,
  -- sentiment: POSITIVE|NEUTRAL|NEGATIVE
  sentiment           TEXT NOT NULL DEFAULT 'NEUTRAL',
  assigned_to         UUID NULL,
  assigned_by         UUID NULL,
  assigned_at         TIMESTAMPTZ NULL,
  resolved_at         TIMESTAMPTZ NULL,
  archived_at         TIMESTAMPTZ NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INBOX REPLIES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_replies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  reply_body   TEXT NOT NULL,
  -- reply_type: 'manual' | 'ai_draft' | 'edited_ai'
  reply_type   TEXT NOT NULL DEFAULT 'manual',
  -- status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent'
  status       TEXT NOT NULL DEFAULT 'draft',
  ai_tone      TEXT NULL,
  created_by   UUID NOT NULL,
  approved_by  UUID NULL,
  sent_by      UUID NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at  TIMESTAMPTZ NULL,
  sent_at      TIMESTAMPTZ NULL
);

-- ─── INBOX ESCALATIONS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_escalations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id        UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL,
  escalation_reason TEXT NOT NULL,
  risk_category     TEXT NOT NULL,
  risk_level        TEXT NOT NULL DEFAULT 'HIGH',
  escalated_by      UUID NOT NULL,
  assigned_reviewer UUID NULL,
  -- review_status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'
  review_status     TEXT NOT NULL DEFAULT 'PENDING',
  -- decision: 'APPROVED' | 'REJECTED'
  decision          TEXT NULL,
  decision_note     TEXT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ NULL
);

-- ─── INBOX INTERNAL NOTES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  note_body    TEXT NOT NULL,
  created_by   UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INBOX AUDIT LOG ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_audit_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id     UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,
  workspace_id   UUID NOT NULL,
  action         TEXT NOT NULL,
  previous_value TEXT NULL,
  new_value      TEXT NULL,
  performed_by   UUID NOT NULL,
  performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inbox_messages_workspace   ON inbox_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_status      ON inbox_messages(status);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_platform    ON inbox_messages(platform);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_assigned    ON inbox_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_received    ON inbox_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_escalations_workspace ON inbox_escalations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inbox_escalations_status   ON inbox_escalations(review_status);
CREATE INDEX IF NOT EXISTS idx_inbox_notes_message        ON inbox_notes(message_id);
CREATE INDEX IF NOT EXISTS idx_inbox_audit_message        ON inbox_audit_log(message_id);
CREATE INDEX IF NOT EXISTS idx_inbox_audit_workspace      ON inbox_audit_log(workspace_id);

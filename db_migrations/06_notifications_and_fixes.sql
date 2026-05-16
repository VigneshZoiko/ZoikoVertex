-- ZoikoVertex — Migration 06: Notifications Table + Schema Fixes
-- Run in Supabase SQL Editor
-- Safe to run multiple times (idempotent)

-- ─── Notifications ────────────────────────────────────────────────────────────
-- Used by NotificationContext for in-app alerts, governance events, approvals, etc.

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  -- type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'GOVERNANCE' | 'APPROVAL' | 'SYSTEM'
  type       TEXT NOT NULL DEFAULT 'INFO',
  -- link: optional deep-link route within the app (e.g. '/governance/approvals')
  link       TEXT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow users to read only their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Backend service role bypasses RLS (supabaseAdmin already uses service_role key)

CREATE INDEX IF NOT EXISTS idx_notifications_user_id      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read    ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at   ON notifications(created_at DESC);

-- Seed a few example notifications for existing users (optional, dev only)
-- INSERT INTO notifications (user_id, title, body, type) SELECT id, 'Welcome to ZoikoVertex', 'Your account is ready.', 'SUCCESS' FROM auth.users LIMIT 5;

-- ─── Enable Realtime on notifications ─────────────────────────────────────────
-- Required for useRealtimeNotifications to work via Supabase channels
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── publish_intents: fix FK name for Supabase join ──────────────────────────
-- The getQueue controller does: creator:users!publish_intents_creator_id_fkey
-- This relies on a FK from publish_intents.creator_id → users.id
-- Ensure the FK exists with the correct naming convention Supabase expects.
-- (Only runs if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'publish_intents_creator_id_fkey'
      AND table_name = 'publish_intents'
  ) THEN
    ALTER TABLE publish_intents
      ADD CONSTRAINT publish_intents_creator_id_fkey
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

SELECT 'Migration 06 — notifications table and FK fixes applied successfully' AS status;

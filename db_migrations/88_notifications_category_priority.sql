-- ZoikoVertex — Migration 88: notifications.category + notifications.priority
-- Run in Supabase SQL Editor
-- Safe to run multiple times (idempotent)

-- Migration 06 created `notifications` with only:
--   id, user_id, title, body, type, link, read, created_at
--
-- Several system-generated notification writers already persist `category`
-- and `priority` (data-connector sync failures, risk posture alerts,
-- review escalations, payment failures). PostgREST rejects the unknown
-- columns with PGRST204, the callers ignore the returned error
-- ("non-blocking"), and the alerts are silently dropped — they never reach
-- the Notifications section.
--
-- The frontend reads these columns when present (NotificationContext
-- `formatNotification`) and derives sensible fallbacks from `type` when NULL,
-- so adding them as nullable columns is backward compatible.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT;

COMMENT ON COLUMN notifications.category IS 'UI category: SYSTEM | WORKFLOW | SECURITY | SOCIAL. Derived from type by the client when NULL.';
COMMENT ON COLUMN notifications.priority IS 'UI priority: LOW | MEDIUM | HIGH | URGENT. Derived from type by the client when NULL.';

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

SELECT 'Migration 88 — notifications category/priority columns applied successfully' AS status;

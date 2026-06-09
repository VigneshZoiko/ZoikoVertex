-- ============================================================
-- Fix: intent_status enum missing review-queue values
--
-- The "review queue UI overhaul" (commit 62111ae) routes publishes through a
-- review pipeline using statuses the original intent_status enum doesn't have,
-- so POST /api/v1/governance/submit fails with:
--   invalid input value for enum intent_status: "PENDING_REVIEW" (22P02)
-- which blocks ALL publishing. This adds the values used by submitIntent +
-- the transition/review flow. ADD VALUE IF NOT EXISTS is idempotent and safe.
--
-- NOTE: if your SQL client wraps this in a transaction and errors on
-- "ALTER TYPE ... ADD VALUE cannot run inside a transaction block", run each
-- ALTER line on its own.
-- ============================================================

ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'PENDING_VALIDATION';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'PENDING_AUTHORIZATION';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'PENDING_GOVERNANCE';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'CANCELLED';

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Fix: intent_status enum missing 'GOVERNANCE_BLOCKED'
--
-- The 6-agent post-validation chain (commit 507afc4) routes any agent BLOCK to
-- status 'GOVERNANCE_BLOCKED' in submitIntent (governanceController.ts). That
-- value is used pervasively across the codebase (safety/risk/monitoring/approval
-- dashboards, seed data) but was never added to the live intent_status enum, so
-- POST /api/v1/governance/submit fails with:
--   invalid input value for enum intent_status: "GOVERNANCE_BLOCKED" (22P02)
-- and the blocked post is never inserted (it "does not appear" at all). This was
-- latent until Approval-Rules keyword blocking actually started reaching BLOCK.
--
-- Same class of fix as intent_status_review_queue_values.sql.
-- ADD VALUE IF NOT EXISTS is idempotent and safe.
--
-- NOTE: if your SQL client wraps this in a transaction and errors on
-- "ALTER TYPE ... ADD VALUE cannot run inside a transaction block", run the
-- ALTER line on its own (outside any BEGIN/COMMIT).
-- ============================================================

ALTER TYPE intent_status ADD VALUE IF NOT EXISTS 'GOVERNANCE_BLOCKED';

NOTIFY pgrst, 'reload schema';

-- Migration 84: Commercial Billing Standard — ZV-COM-BILL-001
-- Implements the canonical commercial state machine:
--   organization.billing_classification   (§19) — only COMMERCIAL may live-charge
--   subscription.status ladder            (§13) — dunning / safe-execution states
--   trial fields                          (§6)  — 14-day no-card, no auto-convert
--   member.identity_class                 (§5)  — external collaborators never auto-promote
--   dunning tracking                      (§13) — payment failure aging on wallets
-- Safe to re-run (IF NOT EXISTS / idempotent).

-- ── 1. Workspace commercial classification ────────────────────────────────────
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS billing_classification TEXT NOT NULL DEFAULT 'FREE_STARTER',
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT NOT NULL DEFAULT 'FREE_ACTIVE',
  ADD COLUMN IF NOT EXISTS trial_starts_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commercial_effective_at TIMESTAMPTZ;

-- ── 2. Dunning tracking on wallets ────────────────────────────────────────────
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failure_count  INT NOT NULL DEFAULT 0;

-- ── 3. Member identity class (external collaborators ≠ internal seats) ────────
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS identity_class TEXT NOT NULL DEFAULT 'INTERNAL_USER';

-- ── 4. Constraints (idempotent) ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_billing_classification_check'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_billing_classification_check
      CHECK (billing_classification IN (
        'COMMERCIAL','FREE_STARTER','EVALUATION_NON_BILLABLE','INTERNAL',
        'DEMO','QA','STAGING','PARTNER_SANDBOX','MIGRATION_HOLD'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_subscription_status_check'
  ) THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_subscription_status_check
      CHECK (subscription_status IN (
        'FREE_ACTIVE','TRIAL_GROWTH','ACTIVE','PAST_DUE','COMMERCIAL_RESTRICTED',
        'EXECUTION_RESTRICTED','SUSPENDED_SAFE_MODE','CANCEL_AT_PERIOD_END',
        'CANCELED','TERMINATED'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_identity_class_check'
  ) THEN
    ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_identity_class_check
      CHECK (identity_class IN (
        'INTERNAL_USER','EXTERNAL_COLLABORATOR','SERVICE_ACCOUNT',
        'AGENT_PRINCIPAL','INTEGRATION_PRINCIPAL'
      ));
  END IF;
END $$;

-- ── 5. Backfill existing workspaces ───────────────────────────────────────────
-- ZV-COM-BILL-001 §19.1: existing workspaces are NON-BILLABLE by default until an
-- explicit COMMERCIAL conversion. Feature access continues to be driven by
-- plan_type, so this never locks anyone out — it only prevents accidental charging.
--
-- IMPORTANT: existing paid workspaces backfill to FREE_STARTER (chargeable, can
-- convert on affirmative checkout) — NOT to INTERNAL. INTERNAL/DEMO/QA/STAGING are
-- permanently non-convertible in assertClassificationChargeable(), so classifying a
-- paying customer workspace as INTERNAL would block it from ever resubscribing.
--
-- All existing workspaces (free AND paid-plan) start as FREE_STARTER — the column
-- default — and only convert to COMMERCIAL on an affirmative subscribe/checkout
-- action. This single statement documents the intent; feature access continues to
-- be driven by plan_type, so nobody is locked out.
UPDATE workspaces SET billing_classification = 'FREE_STARTER'
  WHERE billing_classification IS NULL OR billing_classification = '';

-- Derive an initial subscription_status for already-classified (paid) workspaces.
UPDATE workspaces w SET subscription_status = 'ACTIVE'
  FROM organizations o
  WHERE o.id = w.org_id
    AND w.plan_type IN ('STARTER','GROWTH','SCALE','ENTERPRISE')
    AND w.subscription_status = 'FREE_ACTIVE'
    AND o.premium_paid_until IS NOT NULL
    AND o.premium_paid_until > NOW();

-- Free workspaces stay FREE_ACTIVE; everything else keeps FREE_ACTIVE as a safe default.

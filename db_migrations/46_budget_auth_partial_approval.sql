-- Migration 46: Add PARTIALLY_APPROVED to budget_authorizations status constraint
-- Required for HIGH-tier ($500+) two-step approval flow

ALTER TABLE budget_authorizations
  DROP CONSTRAINT IF EXISTS budget_authorizations_status_check;

ALTER TABLE budget_authorizations
  ADD CONSTRAINT budget_authorizations_status_check
  CHECK (status IN (
    'PENDING',
    'PARTIALLY_APPROVED',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'CANCELLED'
  ));

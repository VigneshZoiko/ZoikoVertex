-- Migration 081: Add RETURNED_TO_CREATOR to approval enum types
--
-- The returnToCreator action was failing silently because the DB enums
-- did not include 'RETURNED_TO_CREATOR'. Both the approval_items status
-- column and the approval_decisions decision column use enum types that
-- must be extended before the action can succeed.

-- Add to approval_item_status (used by approval_items.approval_status)
ALTER TYPE approval_item_status ADD VALUE IF NOT EXISTS 'RETURNED_TO_CREATOR';

-- Add to approval_decision_value (used by approval_decisions.decision)
ALTER TYPE approval_decision_value ADD VALUE IF NOT EXISTS 'RETURNED_TO_CREATOR';

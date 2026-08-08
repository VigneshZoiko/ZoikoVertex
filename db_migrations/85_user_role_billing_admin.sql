-- Migration 85: Add BILLING_ADMIN to the user_role enum
-- ZV-COM-BILL-001 §22 — canonical Billing Admin with payment/billing authority.
-- Workspace Owner, Superadmin and Billing Admin manage billing; Governance Admin,
-- Approver, Publisher, Auditor, and External Collaborator never receive financial
-- authority.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BILLING_ADMIN';

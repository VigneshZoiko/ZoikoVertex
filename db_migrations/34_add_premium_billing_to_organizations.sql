-- Add premium billing columns to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS premium_paid_until TIMESTAMPTZ NULL;

-- Set existing ENTERPRISE/STARTER/GROWTH orgs to have a past premium date (unpaid)
UPDATE organizations
  SET premium_paid_until = '2024-01-01'::TIMESTAMPTZ
  WHERE plan_type IN ('STARTER', 'GROWTH', 'ENTERPRISE')
    AND premium_paid_until IS NULL;

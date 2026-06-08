-- Add plan_type to workspaces table
-- plan_type: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'FREE';

-- Set all existing workspaces to ENTERPRISE for dev/testing
UPDATE workspaces SET plan_type = 'ENTERPRISE';

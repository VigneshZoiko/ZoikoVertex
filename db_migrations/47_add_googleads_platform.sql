-- Migration 47: Add googleads to connected_accounts platform check constraint

ALTER TABLE connected_accounts
  DROP CONSTRAINT IF EXISTS connected_accounts_platform_check;

ALTER TABLE connected_accounts
  ADD CONSTRAINT connected_accounts_platform_check
  CHECK (platform IN (
    'facebook',
    'instagram',
    'linkedin',
    'twitter',
    'pinterest',
    'threads',
    'youtube',
    'googleads'
  ));

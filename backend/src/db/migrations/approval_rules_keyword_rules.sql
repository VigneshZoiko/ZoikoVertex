-- Add keyword_rules column to approval_rules table
-- keyword_rules stores an array of { keywords: string[], action: 'BLOCK'|'REQUEST_REVIEW', scopes: string[] }

ALTER TABLE public.approval_rules
  ADD COLUMN IF NOT EXISTS keyword_rules JSONB NOT NULL DEFAULT '[]';

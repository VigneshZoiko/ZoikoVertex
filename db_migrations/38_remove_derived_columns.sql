-- Migration 038: Remove derived columns from review_items
-- decision_eligibility_state and sla_status were stored but never kept in sync.
-- eligibility is computed per-user in the service layer (calculateEligibility),
-- so storing it causes drift risk. sla_status was never populated.

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'review_items' AND schemaname = 'public') THEN
    ALTER TABLE public.review_items DROP COLUMN IF EXISTS decision_eligibility_state;
    ALTER TABLE public.review_items DROP COLUMN IF EXISTS sla_status;
  END IF;
END $$;

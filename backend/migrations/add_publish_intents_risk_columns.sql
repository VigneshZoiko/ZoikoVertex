-- ============================================================
-- publish_intents: add safety-routing display columns
--
-- submitIntent (governanceController) records the agent's safety verdict on
-- each post so the Review Queue can show risk (green/red) and the auto-publish
-- rule (risk==0 + L4–L6 agent) can be audited. Without these columns the
-- insert previously 500'd: "Could not find the 'risk_level' column".
--
-- The backend now strips missing columns and still publishes, but applying
-- this migration enables the full risk display. Safe to run multiple times.
-- ============================================================

alter table public.publish_intents
  add column if not exists risk_level text,
  add column if not exists risk_score integer,
  add column if not exists agent_id  uuid;

-- Tell PostgREST (Supabase API) to pick up the new columns immediately.
notify pgrst, 'reload schema';

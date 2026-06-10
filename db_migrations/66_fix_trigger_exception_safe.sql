-- Migration 66: Make auth trigger exception-safe
-- The trigger on auth.users was throwing an unhandled exception which caused
-- Supabase to roll back the entire user insertion with "Database error saving new user".
-- Fix: wrap trigger body in EXCEPTION WHEN OTHERS so it NEVER blocks signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        full_name  = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation due to public.users sync failure.
  -- The backend upserts the row explicitly after signup anyway.
  RETURN NEW;
END;
$$;

-- Re-attach (drop+create to ensure it's registered)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Migration 66 — trigger made exception-safe' AS status;

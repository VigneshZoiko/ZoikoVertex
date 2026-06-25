-- Migration 10: increase media bucket file size limit to 500 MB
-- Default Supabase bucket limit is 50 MB; videos up to 500 MB must be allowed.

UPDATE storage.buckets
SET file_size_limit = 524288000   -- 500 MB in bytes
WHERE id = 'media';

-- Create the bucket if it does not exist yet (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 524288000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 524288000;

-- Migration 80: RLS policies for media_library and storage bucket setup
-- Ensures workspace-level isolation for media assets

-- Enable RLS on media_library (backend uses service_role which bypasses RLS,
-- but this prevents any accidental direct REST/anon access to the table)
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "media_library_workspace_read"   ON public.media_library;
DROP POLICY IF EXISTS "media_library_workspace_insert" ON public.media_library;
DROP POLICY IF EXISTS "media_library_workspace_delete" ON public.media_library;

-- Workspace members can read media in their workspace
CREATE POLICY "media_library_workspace_read"
  ON public.media_library
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can insert into their own workspace
CREATE POLICY "media_library_workspace_insert"
  ON public.media_library
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Only uploader, admin, or workspace owner can delete
CREATE POLICY "media_library_workspace_delete"
  ON public.media_library
  FOR DELETE
  USING (
    uploader_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('ADMIN', 'WORKSPACE_OWNER', 'SUPERADMIN')
    )
  );

-- ── Supabase Storage: media bucket setup ────────────────────────────────────
-- Run this in Supabase SQL Editor to create/configure the media bucket.
-- The bucket must be PUBLIC so uploaded media URLs work in the app and on
-- social platforms (images/videos are intended for public publishing).

-- Create bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,                    -- public: URLs accessible without auth token
  524288000,               -- 500 MB per file limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
    'video/mp4', 'video/mov', 'video/quicktime', 'video/webm', 'video/avi', 'video/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public          = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
    'video/mp4', 'video/mov', 'video/quicktime', 'video/webm', 'video/avi', 'video/ogg'
  ];

-- Drop existing storage policies before recreating (idempotent)
DROP POLICY IF EXISTS "storage_media_upload"      ON storage.objects;
DROP POLICY IF EXISTS "storage_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_media_delete_own"  ON storage.objects;

-- Storage RLS: allow authenticated users to upload to their own folder.
-- Supports two path patterns:
--   library/{userId}/{filename}  ← media library uploads
--   {userId}/{filename}          ← publish hub direct uploads
CREATE POLICY "storage_media_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (
      -- Library path: library/{userId}/...
      (
        (storage.foldername(name))[1] = 'library'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR
      -- Direct publish path: {userId}/...
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Storage RLS: allow public read of all media objects (bucket is public)
CREATE POLICY "storage_media_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'media');

-- Storage RLS: allow users to delete only their own files (both path patterns)
CREATE POLICY "storage_media_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text   -- library/{userId}/...
      OR (storage.foldername(name))[1] = auth.uid()::text -- {userId}/...
    )
  );

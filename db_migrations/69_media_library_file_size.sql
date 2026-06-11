-- Add file_size_bytes to media_library so storage items can show actual file sizes.
-- Existing rows get NULL (unknown size) until new uploads set it.
ALTER TABLE media_library
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT NULL;

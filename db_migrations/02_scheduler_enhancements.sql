-- ZoikoVertex Scheduling Module - Phase 2 Enhancements
-- Run this in your Supabase SQL Editor

-- 1. Add timezone column to posting_windows for AI recommendations
ALTER TABLE posting_windows ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- 2. Add workspace_id to scheduled_posts for multi-tenancy (your teammate will need to populate this)
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 3. Add version column for optimistic locking (prevents race conditions)
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 4. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_creator ON scheduled_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_posting_windows_lookup ON posting_windows(platform, audience_region, audience_age_group);

-- 5. Update existing posting_windows with timezone based on region
UPDATE posting_windows 
SET timezone = CASE 
  WHEN audience_region ILIKE '%US%EST%' THEN 'America/New_York'
  WHEN audience_region ILIKE '%US%PST%' THEN 'America/Los_Angeles'
  WHEN audience_region ILIKE '%UK%Europe%' THEN 'Europe/London'
  WHEN audience_region ILIKE '%Asia%Pacific%' THEN 'Asia/Tokyo'
  WHEN audience_region ILIKE '%Australia%' THEN 'Australia/Sydney'
  WHEN audience_region ILIKE '%India%' THEN 'Asia/Kolkata'
  ELSE 'UTC'
END
WHERE timezone IS NULL;

-- 6. Add RLS policy for scheduled_posts (basic - your teammate may need to refine)
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can view own scheduled posts" ON scheduled_posts 
  FOR SELECT USING (creator_id IN (
    SELECT id FROM auth.users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can insert own scheduled posts" ON scheduled_posts 
  FOR INSERT WITH CHECK (creator_id IN (
    SELECT id FROM auth.users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can update own scheduled posts" ON scheduled_posts 
  FOR UPDATE USING (creator_id IN (
    SELECT id FROM auth.users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own scheduled posts" ON scheduled_posts;
CREATE POLICY "Users can delete own scheduled posts" ON scheduled_posts 
  FOR DELETE USING (creator_id IN (
    SELECT id FROM auth.users WHERE id = auth.uid()
  ));

-- 7. Add RLS to posting_windows if not already
ALTER TABLE posting_windows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read posting windows" ON posting_windows;
CREATE POLICY "Anyone can read posting windows" ON posting_windows FOR SELECT USING (true);

SELECT 'Migration completed successfully!' as status;
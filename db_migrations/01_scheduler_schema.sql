-- ZoikoVertex Scheduling Module Schemas

-- 1. Posting Windows (For AI Recommendations)
CREATE TABLE IF NOT EXISTS posting_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    audience_region VARCHAR(100),
    audience_age_group VARCHAR(50),
    best_start_time TIME NOT NULL,
    best_end_time TIME NOT NULL,
    confidence_score NUMERIC(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some dummy AI recommended posting windows for testing
INSERT INTO posting_windows (platform, audience_region, audience_age_group, best_start_time, best_end_time, confidence_score)
VALUES 
    ('Instagram', 'US', '18-24', '18:00:00', '21:00:00', 0.95),
    ('Twitter', 'Global', '25-34', '12:00:00', '14:00:00', 0.88),
    ('LinkedIn', 'US', 'Professional', '08:00:00', '10:00:00', 0.92)
ON CONFLICT DO NOTHING;

-- 2. Posts Table (The core canonical model for scheduled content)
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL, -- references auth.users(id)
    campaign_id UUID,
    content TEXT NOT NULL,
    media_url TEXT,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    published_time TIMESTAMP WITH TIME ZONE,
    engagement_score NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Scheduler Jobs (For background worker queue state)
CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
    execution_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    retry_count INTEGER DEFAULT 0,
    next_attempt TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS Policies (Assuming Admin/Manager access needed)
ALTER TABLE posting_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_jobs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read posting windows
CREATE POLICY "Allow authenticated read access to posting windows" ON posting_windows FOR SELECT USING (auth.role() = 'authenticated');

-- For now, allow authenticated to do everything on scheduled posts/jobs (will lock down later with roles)
CREATE POLICY "Allow authenticated full access to scheduled posts" ON scheduled_posts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access to scheduler jobs" ON scheduler_jobs FOR ALL USING (auth.role() = 'authenticated');
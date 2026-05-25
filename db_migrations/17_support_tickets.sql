-- Support Tickets Table
-- Stores issues submitted by organization users via the Support & Docs page
-- Platform Owner (SUPERADMIN) manages these in the Support Queue

-- 1. Create table (no-op if already exists)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    urgency TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes (no-op if already exist)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_workspace ON support_tickets (workspace_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets (created_at DESC);

-- 3. Enable RLS (no-op if already enabled)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies then recreate (table is guaranteed to exist at this point)
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "SuperAdmin can read all tickets" ON support_tickets;
CREATE POLICY "SuperAdmin can read all tickets" ON support_tickets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
    );

DROP POLICY IF EXISTS "SuperAdmin can update any ticket" ON support_tickets;
CREATE POLICY "SuperAdmin can update any ticket" ON support_tickets
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_superadmin = true)
    );

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

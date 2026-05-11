-- ZoikoVertex Governance Enhancements
-- Adds risk classification, approval routes, and governance artifacts

-- 1. Add risk columns to publish_intents table
ALTER TABLE publish_intents 
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_factors TEXT[],
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS approval_level VARCHAR(50);

-- 2. Create approval_routes table for tracking approval workflows
CREATE TABLE IF NOT EXISTS approval_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id UUID REFERENCES publish_intents(id) ON DELETE CASCADE,
  required_approvals JSONB NOT NULL DEFAULT '[]',
  completed_approvals JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create governance_artifacts table for audit evidence
CREATE TABLE IF NOT EXISTS governance_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id UUID REFERENCES publish_intents(id) ON DELETE CASCADE,
  artifact_type VARCHAR(50) NOT NULL,
  evidence_data JSONB NOT NULL DEFAULT '{}',
  policy_version VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_publish_intents_risk ON publish_intents(risk_level, status);
CREATE INDEX IF NOT EXISTS idx_approval_routes_intent ON approval_routes(intent_id, status);
CREATE INDEX IF NOT EXISTS idx_governance_artifacts_intent ON governance_artifacts(intent_id, artifact_type);

-- 5. Enable Row Level Security
ALTER TABLE approval_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_artifacts ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view approval routes for their intents" 
ON approval_routes FOR SELECT 
USING (
  intent_id IN (
    SELECT id FROM publish_intents WHERE creator_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage approval routes" 
ON approval_routes FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.user_id = auth.uid() 
    AND workspace_members.role = 'ADMIN'
  )
);

CREATE POLICY "Users can view governance artifacts for their intents" 
ON governance_artifacts FOR SELECT 
USING (
  intent_id IN (
    SELECT id FROM publish_intents WHERE creator_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage governance artifacts" 
ON governance_artifacts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.user_id = auth.uid() 
    AND workspace_members.role = 'ADMIN'
  )
);

-- 7. Create function to automatically create approval route when intent is created
CREATE OR REPLACE FUNCTION create_approval_route_for_intent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create route if approval is required
  IF NEW.requires_approval AND NEW.approval_level IS NOT NULL THEN
    INSERT INTO approval_routes (intent_id, required_approvals, status)
    VALUES (
      NEW.id,
      jsonb_build_array(
        jsonb_build_object(
          'level', NEW.approval_level,
          'status', 'PENDING',
          'assigned_at', NOW()
        )
      ),
      'PENDING'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-create approval routes
DROP TRIGGER IF EXISTS trg_create_approval_route ON publish_intents;
CREATE TRIGGER trg_create_approval_route
  AFTER INSERT ON publish_intents
  FOR EACH ROW
  EXECUTE FUNCTION create_approval_route_for_intent();

-- 9. Insert sample governance artifacts for testing
INSERT INTO governance_artifacts (artifact_type, evidence_data, policy_version)
VALUES 
  ('policy_snapshot', '{"policy_id": "POL-001", "rules_applied": ["brand_safety", "compliance_check"]}', 'v1.0'),
  ('risk_assessment', '{"method": "pattern_matching", "confidence": 0.95}', 'v1.0')
ON CONFLICT DO NOTHING;

SELECT 'Governance enhancements applied successfully!' as status;
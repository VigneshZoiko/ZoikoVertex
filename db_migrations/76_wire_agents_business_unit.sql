-- Wire business_unit_id into agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_business_unit_id
  ON agents(business_unit_id);

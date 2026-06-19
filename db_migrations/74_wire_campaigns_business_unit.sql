-- Wire business_unit_id into campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_business_unit ON campaigns(business_unit_id);

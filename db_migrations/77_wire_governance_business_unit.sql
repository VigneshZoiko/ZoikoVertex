-- Wire business_unit_id into governance & approval core tables

-- publish_intents — the core content governance table
ALTER TABLE publish_intents
  ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_publish_intents_business_unit_id
  ON publish_intents(business_unit_id);

-- approval_items — central approval item table
ALTER TABLE approval_items
  ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_approval_items_business_unit_id
  ON approval_items(business_unit_id);

-- approval_rules — approval rule definitions
ALTER TABLE approval_rules
  ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_approval_rules_business_unit_id
  ON approval_rules(business_unit_id);

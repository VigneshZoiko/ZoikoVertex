-- Wire business_unit_id into workflow_templates
ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_business_unit_id
  ON workflow_templates(business_unit_id);

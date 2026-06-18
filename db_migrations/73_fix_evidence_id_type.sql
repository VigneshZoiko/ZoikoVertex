-- Fix evidence_id column type: uuid -> text
-- The evidence scope feature accepts free-text IDs from external evidence systems
ALTER TABLE business_unit_evidence_scope ALTER COLUMN evidence_id TYPE text USING evidence_id::text;

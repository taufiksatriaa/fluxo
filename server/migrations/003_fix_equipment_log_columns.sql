-- ====================================================================
-- Add condition history columns to equipment_logs
-- ====================================================================

ALTER TABLE equipment_logs
ADD COLUMN IF NOT EXISTS previous_condition equipment_condition,
ADD COLUMN IF NOT EXISTS new_condition equipment_condition;

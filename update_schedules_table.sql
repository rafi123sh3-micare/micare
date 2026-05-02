-- Update schedules table to rule-based system
-- Run this in Supabase SQL Editor

-- First, backup existing data (optional)
CREATE TABLE IF NOT EXISTS schedules_backup AS SELECT * FROM schedules;

-- Add new columns to existing table
ALTER TABLE schedules 
  ADD COLUMN IF NOT EXISTS selected_days TEXT[],
  ADD COLUMN IF NOT EXISTS repeat_weekly BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Migrate existing data: convert single date to rule-based
-- For existing rows, set start_date = date, selected_days = array of the weekday
UPDATE schedules 
SET 
  start_date = date,
  selected_days = ARRAY[(
    CASE EXTRACT(DOW FROM date::date)
      WHEN 0 THEN 'রবিবার'
      WHEN 1 THEN 'সোমবার'
      WHEN 2 THEN 'মঙ্গলবার'
      WHEN 3 THEN 'বুধবার'
      WHEN 4 THEN 'বৃহস্পতিবার'
      WHEN 5 THEN 'শুক্রবার'
      WHEN 6 THEN 'শনিবার'
    END
  )],
  repeat_weekly = COALESCE(is_repeating, FALSE)
WHERE start_date IS NULL;

-- Now drop the old 'date' column (optional, uncomment if needed)
-- ALTER TABLE schedules DROP COLUMN IF EXISTS date;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_doctor_id ON schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_end_date ON schedules(end_date);

-- Verify the migration
SELECT 
  id, 
  doctor_id, 
  start_time, 
  end_time, 
  selected_days, 
  repeat_weekly, 
  start_date, 
  end_date,
  status
FROM schedules 
LIMIT 5;

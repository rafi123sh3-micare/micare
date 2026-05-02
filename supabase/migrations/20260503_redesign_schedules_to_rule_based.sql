-- Redesign schedules table to rule-based system (no duplicate rows for recurring)

-- First, backup existing data (optional)
-- CREATE TABLE schedules_backup AS SELECT * FROM schedules;

-- Drop old table and recreate with new schema
DROP TABLE IF EXISTS schedules CASCADE;

CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  selected_days TEXT[] NOT NULL, -- Array of weekday names: ["Saturday", "Sunday", ...]
  repeat_weekly BOOLEAN DEFAULT FALSE,
  start_date DATE, -- When schedule becomes active (nullable)
  end_date DATE, -- Optional end date for the schedule (nullable)
  status TEXT DEFAULT 'pending', -- pending, active, confirmed, cancelled
  is_repeating BOOLEAN DEFAULT FALSE, -- Keep for backward compatibility
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_schedules_doctor_id ON schedules(doctor_id);
CREATE INDEX idx_schedules_start_date ON schedules(start_date);
CREATE INDEX idx_schedules_end_date ON schedules(end_date);

-- Enable RLS (Row Level Security)
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (adjust as needed)
CREATE POLICY "Allow all operations" ON schedules FOR ALL USING (true);

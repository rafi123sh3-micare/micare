-- Rule-based schedules system (NO duplicate rows for recurring)

-- First backup existing data
CREATE TABLE IF NOT EXISTS schedules_backup AS SELECT * FROM schedules;

-- Drop old table
DROP TABLE IF EXISTS schedules CASCADE;

-- Create new rule-based schedules table
CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  selected_days TEXT[] NOT NULL, -- Array of weekday names: {"Saturday", "Sunday", ...}
  repeat_weekly BOOLEAN DEFAULT FALSE,
  start_date DATE, -- When schedule becomes active (nullable)
  end_date DATE, -- Optional end date for the schedule (nullable)
  status TEXT DEFAULT 'pending', -- pending, active, confirmed, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_schedules_doctor_id ON schedules(doctor_id);
CREATE INDEX idx_schedules_start_date ON schedules(start_date);
CREATE INDEX idx_schedules_end_date ON schedules(end_date);

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (adjust as needed)
CREATE POLICY "Allow all operations" ON schedules FOR ALL USING (true);

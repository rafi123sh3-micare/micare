-- Migration: Remove UNIQUE constraint on patients.name
-- Date: 2026-06-09
-- Reason: Patient names should not be unique. Multiple patients can share the same name.
-- This was causing walk-in patients with the same name to incorrectly get the same patient_id.

-- Drop the UNIQUE constraint on patients.name if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patients_name_key' 
    AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients DROP CONSTRAINT patients_name_key;
    RAISE NOTICE 'Dropped UNIQUE constraint patients_name_key from patients.name';
  END IF;

  -- Also check any other unique constraints on the name column
  IF EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON i.indexrelid = c.oid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE c.relname LIKE '%patients%name%'
    AND i.indisunique = true
    AND a.attname = 'name'
  ) THEN
    RAISE NOTICE 'Found additional unique index on patients.name - please review manually if needed';
  END IF;
END $$;

-- Verify the migration
SELECT 
  tc.constraint_name, 
  tc.constraint_type, 
  kcu.column_name
FROM 
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE 
  tc.table_name = 'patients'
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

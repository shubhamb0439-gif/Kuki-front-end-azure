/*
  # Add Employment Type to Employees
  
  1. Changes to employees table
    - Add `employment_type` (text) - 'full_time', 'part_time', or 'contract'
    - This determines wage payment frequency:
      - full_time: Monthly wages
      - part_time: Daily wages
      - contract: One-time payment
    
  2. Purpose
    - Allows employers to specify employment type when adding employees
    - Automatically determines wage payment structure
    - Displayed in employer and employee dashboards
    
  3. Security
    - Maintain existing RLS policies
    - Field has sensible default of 'full_time'
*/

-- Add employment_type field to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE employees ADD COLUMN employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract'));
  END IF;
END $$;

-- Create index for faster filtering by employment type
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees(employment_type);
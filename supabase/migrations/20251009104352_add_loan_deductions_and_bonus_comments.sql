/*
  # Add Monthly Deductions, Tenure, and Bonus Comments
  
  1. Changes to employee_loans table
    - Add `monthly_deduction` (numeric) - amount to deduct per month
    - Add `tenure_months` (integer) - calculated tenure in months
    - Add `foreclosure_date` (timestamptz) - date when loan was foreclosed
    
  2. Changes to employee_bonuses table
    - Add `type` (text) - 'positive' or 'negative' (merit or demerit)
    - Add `comment` (text) - reason for merit/demerit
    - Rename conceptually to handle both merits and demerits
  
  3. Security
    - Maintain existing RLS policies
    - All new fields are optional with sensible defaults
*/

-- Add fields to employee_loans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_loans' AND column_name = 'monthly_deduction'
  ) THEN
    ALTER TABLE employee_loans ADD COLUMN monthly_deduction numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_loans' AND column_name = 'tenure_months'
  ) THEN
    ALTER TABLE employee_loans ADD COLUMN tenure_months integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_loans' AND column_name = 'foreclosure_date'
  ) THEN
    ALTER TABLE employee_loans ADD COLUMN foreclosure_date timestamptz;
  END IF;
END $$;

-- Add fields to employee_bonuses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_bonuses' AND column_name = 'type'
  ) THEN
    ALTER TABLE employee_bonuses ADD COLUMN type text DEFAULT 'positive' CHECK (type IN ('positive', 'negative'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_bonuses' AND column_name = 'comment'
  ) THEN
    ALTER TABLE employee_bonuses ADD COLUMN comment text DEFAULT '';
  END IF;
END $$;
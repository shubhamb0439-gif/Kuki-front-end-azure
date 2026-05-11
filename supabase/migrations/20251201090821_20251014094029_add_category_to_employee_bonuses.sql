/*
  # Add Category Field to Employee Bonuses
  
  1. Changes to employee_bonuses table
    - Add `category` (text) - 'bonus', 'merit', 'demerit', or 'advance'
    - This allows us to distinguish between different types of transactions
    
  2. Purpose
    - Advances should be subtracted from wages
    - Merits should be added to wages
    - Demerits should be subtracted from wages
    - Bonuses should be added to wages (one-time rewards)
    
  3. Security
    - Maintain existing RLS policies
    - Field is optional with sensible default
*/

-- Add category field to employee_bonuses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_bonuses' AND column_name = 'category'
  ) THEN
    ALTER TABLE employee_bonuses ADD COLUMN category text DEFAULT 'bonus' CHECK (category IN ('bonus', 'merit', 'demerit', 'advance'));
  END IF;
END $$;

-- Update existing records to set proper categories based on type and comment
UPDATE employee_bonuses
SET category = CASE
  WHEN type = 'positive' THEN 'merit'
  WHEN type = 'negative' THEN 'demerit'
  ELSE 'bonus'
END
WHERE category = 'bonus' AND type IS NOT NULL;
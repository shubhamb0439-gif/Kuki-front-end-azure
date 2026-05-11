/*
  # Add remaining_amount column to employee_loans
  
  1. Changes
    - Add `remaining_amount` column to `employee_loans` table
    - Default value is the total_amount for existing loans
    - This tracks how much is still owed on each loan
  
  2. Notes
    - For existing loans, remaining_amount will be set to total_amount
    - For paid loans, remaining_amount should be 0
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_loans' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE employee_loans ADD COLUMN remaining_amount numeric DEFAULT 0 NOT NULL;
    
    -- Update existing loans to set remaining_amount = total_amount - paid_amount
    UPDATE employee_loans 
    SET remaining_amount = total_amount - paid_amount
    WHERE status = 'active';
    
    -- Set remaining_amount to 0 for paid loans
    UPDATE employee_loans 
    SET remaining_amount = 0
    WHERE status = 'paid';
  END IF;
END $$;
/*
  # Add transaction date tracking
  
  1. Changes
    - Add `payment_date` to employee_wages for tracking when wages are paid via QR
    - Add `closure_date` to employee_loans for tracking when loan is fully paid
  
  2. Notes
    - employee_loans already has loan_date for grant tracking
    - employee_bonuses already has bonus_date for transaction tracking
    - All dates are timestamptz for proper timezone handling
*/

DO $$ 
BEGIN
  -- Add payment_date to employee_wages
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_wages' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN payment_date timestamptz;
  END IF;

  -- Add closure_date to employee_loans
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employee_loans' AND column_name = 'closure_date'
  ) THEN
    ALTER TABLE employee_loans ADD COLUMN closure_date timestamptz;
  END IF;
END $$;
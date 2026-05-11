/*
  # Fix employees table to support phone-based users

  ## Changes
    1. Make email field nullable in employees table
    2. Add phone field to employees table
    
  ## Reason
    - Users can now sign up with phone numbers only (without email)
    - When linking employee to employer, we need to store either email or phone
    - The email field was NOT NULL which caused failures for phone-only users
    
  ## Important Notes
    - This migration preserves existing data
    - Either email or phone must be present for each employee
*/

-- Make email nullable and add phone field to employees table
DO $$
BEGIN
  -- Make email nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'email' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;
  END IF;

  -- Add phone field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE employees ADD COLUMN phone text;
  END IF;
END $$;
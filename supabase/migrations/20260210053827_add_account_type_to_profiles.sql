/*
  # Add Account Type to Profiles

  1. Changes
    - Add `account_type` column to `profiles` table
      - Options: 'normal' | 'record_holder'
      - Default: 'normal'
      - Only applies to employers
    
  2. Purpose
    - Enable employers to choose between normal account (with QR verification)
      and record holder account (manual entry, no QR needed)
    
  3. Notes
    - Existing accounts will default to 'normal'
    - Record holder accounts can manually manage all employee operations
*/

-- Add account_type column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_type text DEFAULT 'normal' CHECK (account_type IN ('normal', 'record_holder'));
  END IF;
END $$;
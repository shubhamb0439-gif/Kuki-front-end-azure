/*
  # Add currency column to profiles table
  
  1. Changes
    - Add `currency` column to `profiles` table with default value 'USD'
    - This will store each user's preferred currency for all transactions
  
  2. Notes
    - Existing users will default to USD
    - Users can update their currency in Edit Profile
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'currency'
  ) THEN
    ALTER TABLE profiles ADD COLUMN currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;
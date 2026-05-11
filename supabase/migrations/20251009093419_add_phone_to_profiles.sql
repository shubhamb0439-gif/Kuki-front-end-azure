/*
  # Add phone column to profiles table

  1. Changes
    - Add `phone` column to `profiles` table for storing user phone numbers
  
  2. Updates
    - Add `phone` text column (nullable)
*/

-- Add phone column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;
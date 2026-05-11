/*
  # Add updated_at column to profiles table

  1. Changes
    - Add `updated_at` column to `profiles` table with default value of now()
    - This column will track when profile information was last modified

  2. Notes
    - Safe to add as it has a default value
    - Existing rows will automatically get the current timestamp
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

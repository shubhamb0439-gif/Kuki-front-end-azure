/*
  # Add Language Preferences System

  1. Changes
    - Add `preferred_language` column to `profiles` table
      - Stores user's selected language code (e.g., 'en', 'hi', 'kn', 'ta', 'te', 'mr')
      - Default is 'en' (English)
    - Add `detected_country` column to `profiles` table
      - Stores ISO country code detected from user's location
    - Update RLS policies to allow users to update their own language preferences
  
  2. Security
    - Existing RLS policies on `profiles` table allow users to update their own data
    - No additional policies needed
*/

-- Add language preference column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_language text DEFAULT 'en';
  END IF;
END $$;

-- Add detected country column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'detected_country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN detected_country text;
  END IF;
END $$;
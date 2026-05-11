/*
  # Add Phone Number Login Support

  1. Changes
    - Make email nullable (users can sign up with phone instead)
    - Ensure phone is unique and indexed
    - Add constraint to ensure at least email or phone exists
    
  2. Notes
    - Users can now sign up with either email or phone number
    - Both email and phone can be used for login
*/

-- Make email nullable
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Ensure phone is unique and indexed if not already
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_key ON profiles(phone) WHERE phone IS NOT NULL;

-- Add constraint to ensure at least email or phone exists
ALTER TABLE profiles ADD CONSTRAINT profiles_email_or_phone_required 
  CHECK (email IS NOT NULL OR phone IS NOT NULL);
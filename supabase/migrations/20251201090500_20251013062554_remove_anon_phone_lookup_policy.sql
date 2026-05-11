/*
  # Remove Anonymous Phone Lookup Policy

  1. Changes
    - Remove the policy that allowed anonymous phone lookups
    - This is no longer needed since we're using email-based auth with generated emails
    
  2. Security
    - Improves security by not exposing profile data to anonymous users
*/

-- Remove the policy that's no longer needed
DROP POLICY IF EXISTS "Allow phone lookup for login" ON profiles;
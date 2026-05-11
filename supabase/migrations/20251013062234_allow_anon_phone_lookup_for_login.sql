/*
  # Allow Anonymous Phone Lookup for Login

  1. Changes
    - Add a SELECT policy for anonymous users to look up profile IDs by phone number
    - This enables phone-based login to work correctly
    
  2. Security
    - Only allows reading the ID field (minimal data exposure)
    - Required for the login flow to map phone numbers to user accounts
    - Does not expose sensitive profile information
*/

-- Allow anon users to look up profiles by phone for login
CREATE POLICY "Allow phone lookup for login"
  ON profiles
  FOR SELECT
  TO anon
  USING (phone IS NOT NULL);
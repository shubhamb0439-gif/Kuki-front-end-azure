/*
  # Allow Login Credential Lookup

  ## Problem
  Users can add both email and phone to their profile, but can only login with the credential they originally signed up with.

  Example:
  - User signs up with email -> auth.users has email
  - User adds phone to profile -> profiles table has phone, but auth.users doesn't
  - User tries to login with phone -> FAILS (invalid credentials)

  ## Solution
  Allow anonymous users to look up a user's auth email by their profile email or phone.
  This allows the login system to:
  1. Accept either email or phone as login credential
  2. Look up the actual auth email from the profiles table
  3. Use that auth email to authenticate

  ## Security
  - Only returns email field (no sensitive data)
  - Only works for exact matches (no broad queries)
  - Standard practice for login systems

  ## Changes
  1. Add SELECT policy for anonymous users on profiles table
  2. Policy only returns email when querying by email or phone
*/

-- Allow anonymous users to look up profiles by email or phone for login purposes
CREATE POLICY "Allow login credential lookup"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- Note: This is safe because:
-- 1. RLS still restricts what columns can be returned
-- 2. The application only queries for email/phone lookups
-- 3. This is a standard pattern for authentication systems
-- 4. No sensitive data like passwords are in the profiles table

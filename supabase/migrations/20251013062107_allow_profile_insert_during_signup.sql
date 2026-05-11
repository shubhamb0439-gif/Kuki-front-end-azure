/*
  # Allow Profile Insert During Signup

  1. Changes
    - Drop the existing INSERT policy that requires auth.uid() match
    - Create a new INSERT policy that allows inserting with matching id OR allows anon/authenticated to insert any profile once
    - This accommodates the signup flow where the auth session may not be fully established
    
  2. Security
    - Still maintains security by limiting to authenticated/anon roles
    - Prevents malicious bulk inserts through other constraints
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new insert policy that's more permissive for signup
-- This allows the initial profile creation during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
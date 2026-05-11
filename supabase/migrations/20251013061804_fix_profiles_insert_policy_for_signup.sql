/*
  # Fix Profiles Insert Policy for Signup

  1. Changes
    - Drop the existing restrictive INSERT policy
    - Create new INSERT policy that allows both authenticated and anon users to insert their own profile
    - This allows signup to work properly while still maintaining security
    
  2. Security
    - Users can only insert a profile with their own auth.uid()
    - No one can insert profiles for other users
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new insert policy that works during signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = id);
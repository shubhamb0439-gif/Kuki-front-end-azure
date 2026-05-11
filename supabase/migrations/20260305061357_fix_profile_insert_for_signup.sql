/*
  # Fix Profile Insert Policy for Signup
  
  1. Problem
    - Users can only SELECT their own profile
    - Only admins can INSERT profiles
    - New signups fail because regular users cannot insert their own profile
  
  2. Solution
    - Add policy to allow authenticated users to insert their own profile during signup
    - Use auth.uid() to ensure users can only insert a profile with their own ID
  
  3. Security
    - Users can only insert a profile with id = auth.uid()
    - This prevents users from creating profiles for other users
*/

-- Drop if exists first
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

/*
  # Remove Duplicate Profile Insert Policy
  
  1. Problem
    - Two INSERT policies exist on profiles table
    - "Users can insert own profile" has WITH CHECK true (allows inserting any profile - security risk!)
    - "Users can insert own profile during signup" has correct WITH CHECK (auth.uid() = id)
  
  2. Solution
    - Drop the insecure policy that allows users to insert any profile
    - Keep only the secure policy that restricts users to inserting their own profile
  
  3. Security
    - After this change, users can only insert profiles with id = auth.uid()
    - Prevents users from creating profiles for other users
*/

-- Drop the insecure policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- The correct policy "Users can insert own profile during signup" remains

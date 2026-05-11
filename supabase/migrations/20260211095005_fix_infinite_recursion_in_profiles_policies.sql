/*
  # Fix Infinite Recursion in Profiles RLS Policies

  1. Problem
    - Admin policies were checking the profiles table within profiles policies
    - This caused infinite recursion: checking profiles requires checking if user is admin,
      which requires checking profiles, which requires checking if user is admin...

  2. Solution
    - Store admin role in auth.jwt() metadata instead
    - Use auth.jwt() -> 'user_metadata' -> 'role' to check admin status
    - This breaks the recursive loop since JWT metadata doesn't trigger RLS

  3. Changes
    - Drop existing admin policies that cause recursion
    - Create new admin policies using JWT metadata
    - Update admin user's metadata to include role
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new admin policies using JWT metadata (no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Update existing admin user's metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

/*
  # Add Admin INSERT and DELETE Policies (No Recursion)

  1. Changes
    - Add INSERT policy for admins using JWT metadata
    - Add DELETE policy for admins using JWT metadata
    - These policies use auth.jwt() to avoid infinite recursion
*/

-- Admin can insert any profile
CREATE POLICY "Admins can insert all profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Admin can delete any profile
CREATE POLICY "Admins can delete all profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

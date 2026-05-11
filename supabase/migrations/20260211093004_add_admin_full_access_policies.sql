/*
  # Add Admin Full Access Policies

  1. Changes
    - Grant admin users full read access to all tables
    - Admin can view all profiles, employees, job postings, applications, loans, bonuses, etc.
  
  2. Security
    - Only users with role = 'admin' get these permissions
    - Admins need visibility into all platform data for management purposes
*/

-- Allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

-- Allow admins to view all employees
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

-- Allow admins to view all job postings
DROP POLICY IF EXISTS "Admins can view all job postings" ON job_postings;
CREATE POLICY "Admins can view all job postings"
  ON job_postings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

-- Allow admins to view all job applications
DROP POLICY IF EXISTS "Admins can view all job applications" ON job_applications;
CREATE POLICY "Admins can view all job applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

-- Allow admins to view all employee loans
DROP POLICY IF EXISTS "Admins can view all employee loans" ON employee_loans;
CREATE POLICY "Admins can view all employee loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

-- Allow admins to view all employee bonuses
DROP POLICY IF EXISTS "Admins can view all employee bonuses" ON employee_bonuses;
CREATE POLICY "Admins can view all employee bonuses"
  ON employee_bonuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

-- Allow admins to update profiles (for ads_enabled field)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
    )
  );

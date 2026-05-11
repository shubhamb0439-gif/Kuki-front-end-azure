/*
  # Fix Profiles RLS for Employee-Employer Access

  1. Changes
    - Add policy to allow employees to view their employer's profile
    - Add policy to allow employers to view their employees' profiles
    - Keep existing policies intact
  
  2. Security
    - Employees can only see profiles of their linked employers
    - Employers can only see profiles of their linked employees
    - Users can still see their own profiles
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create new policies that allow proper access

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Employees can read their employer's profile
CREATE POLICY "Employees can read employer profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = profiles.id
      AND employees.user_id = auth.uid()
    )
  );

-- Employers can read their employees' profiles
CREATE POLICY "Employers can read employee profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = profiles.id
      AND employees.employer_id = auth.uid()
    )
  );

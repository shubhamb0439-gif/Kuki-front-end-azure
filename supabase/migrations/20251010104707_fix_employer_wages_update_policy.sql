/*
  # Fix Employer Wages Update Policy

  1. Problem
    - "Employers can manage employee wages" policy has cmd='ALL' but no with_check
    - This blocks UPDATE operations even though employer_id matches
    - Result: Wages cannot be updated, only inserted

  2. Solution
    - Drop the old ALL policy
    - Create separate INSERT, UPDATE, DELETE policies with proper with_check
    - This allows employers to properly update existing wage records

  3. Security
    - Maintains same security level: only employer_id = auth.uid()
    - Adds proper with_check for UPDATE operations
*/

-- Drop the old ALL policy
DROP POLICY IF EXISTS "Employers can manage employee wages" ON employee_wages;

-- Create separate policies with proper with_check

-- Allow employers to INSERT new wage records
CREATE POLICY "Employers can insert employee wages"
  ON employee_wages FOR INSERT
  TO authenticated
  WITH CHECK (employer_id = auth.uid());

-- Allow employers to UPDATE existing wage records
CREATE POLICY "Employers can update employee wages"
  ON employee_wages FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Allow employers to DELETE wage records
CREATE POLICY "Employers can delete employee wages"
  ON employee_wages FOR DELETE
  TO authenticated
  USING (employer_id = auth.uid());

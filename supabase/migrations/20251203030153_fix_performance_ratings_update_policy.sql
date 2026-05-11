/*
  # Fix Performance Ratings RLS UPDATE Policy

  1. Changes
    - Drop existing UPDATE policy for performance_ratings
    - Recreate with both USING and WITH CHECK clauses
    - This allows upsert operations with comments to work properly

  2. Security
    - Employers can only update ratings for their actual employees
    - Both USING and WITH CHECK ensure security on upserts
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Employers can update ratings for their employees" ON performance_ratings;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Employers can update ratings for their employees"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = employer_id AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = performance_ratings.employee_id
    )
  )
  WITH CHECK (
    auth.uid() = employer_id AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = performance_ratings.employee_id
    )
  );

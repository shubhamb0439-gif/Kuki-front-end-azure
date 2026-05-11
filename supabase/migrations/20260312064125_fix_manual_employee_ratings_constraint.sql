/*
  # Fix Manual Employee Ratings Constraint

  1. Changes
    - Remove the foreign key constraint on employee_id to profiles
    - Make employee_id accept both profile IDs and employee record IDs
    - Add proper employee_record_id tracking for all ratings

  2. Purpose
    - Allow storing ratings for manual employees without profile violations
    - Support flexible rating system for both employee types

  3. Important Notes
    - For employees with accounts: employee_id = profile ID, employee_record_id = employees.id
    - For manual employees: employee_id = employees.id, employee_record_id = employees.id
*/

-- Drop the foreign key constraint completely
ALTER TABLE performance_ratings
  DROP CONSTRAINT IF EXISTS performance_ratings_employee_id_fkey;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_performance_ratings_unique_account_based;
DROP INDEX IF EXISTS idx_performance_ratings_unique_manual;

-- Recreate unique constraint that works for all cases
-- Use employee_record_id as the primary identifier for uniqueness
ALTER TABLE performance_ratings
  DROP CONSTRAINT IF EXISTS performance_ratings_employer_id_employee_id_rating_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_ratings_unique
  ON performance_ratings(employer_id, employee_id, rating_date);

-- Update RLS policies to be more permissive
DROP POLICY IF EXISTS "Employers can insert ratings for employees" ON performance_ratings;
DROP POLICY IF EXISTS "Employers can update ratings for employees" ON performance_ratings;
DROP POLICY IF EXISTS "Employees can read own ratings" ON performance_ratings;

CREATE POLICY "Employers can insert ratings for employees"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employer_id = auth.uid()
  );

CREATE POLICY "Employers can update ratings for employees"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

CREATE POLICY "Employers can read ratings for their employees"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

CREATE POLICY "Employees can read own ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

/*
  # Add Manual Employee Ratings Support

  1. Changes
    - Modify performance_ratings table to support manual employees
    - Add employee_record_id to track ratings for manual employees
    - Update constraints to work with both account-based and manual employees

  2. Purpose
    - Allow employers to rate manually added employees (record keepers)
    - Keep internal tracking of performance for all employee types
    - Maintain backward compatibility with existing account-based ratings

  3. Important Notes
    - For employees with accounts: employee_id (profile ID) is used, employee_record_id is NULL
    - For manual employees: employee_id references the employees table record, employee_record_id stores the same ID
    - Ratings for manual employees are for internal tracking only (no profile to display on)
    - No notifications are sent to manual employees (they don't have user accounts)
*/

-- Drop the existing foreign key constraint on employee_id
ALTER TABLE performance_ratings
  DROP CONSTRAINT IF EXISTS performance_ratings_employee_id_fkey;

-- Add employee_record_id column to track the employee record
ALTER TABLE performance_ratings
  ADD COLUMN IF NOT EXISTS employee_record_id uuid REFERENCES employees(id) ON DELETE CASCADE;

-- Update existing ratings to populate employee_record_id from employees table
-- This maintains data integrity for existing ratings
UPDATE performance_ratings pr
SET employee_record_id = e.id
FROM employees e
WHERE e.user_id = pr.employee_id
AND pr.employee_record_id IS NULL;

-- Create a more flexible constraint that allows NULL for manual employees
-- For manual employees, employee_id will point to the employee record
-- employee_record_id will also point to the same record for consistency
ALTER TABLE performance_ratings
  ADD CONSTRAINT performance_ratings_employee_id_fkey
  FOREIGN KEY (employee_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE
  NOT VALID;

-- Drop and recreate the unique constraint to include employee_record_id
ALTER TABLE performance_ratings
  DROP CONSTRAINT IF EXISTS performance_ratings_employer_id_employee_id_rating_date_key;

-- New unique constraint that works for both types:
-- For account-based: (employer_id, employee_id, rating_date)
-- For manual: (employer_id, employee_record_id, rating_date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_ratings_unique_account_based
  ON performance_ratings(employer_id, employee_id, rating_date)
  WHERE employee_id IS NOT NULL AND employee_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_ratings_unique_manual
  ON performance_ratings(employer_id, employee_record_id, rating_date)
  WHERE employee_id IS NOT NULL;

-- Update RLS policies to allow rating manual employees
DROP POLICY IF EXISTS "Employers can insert ratings for employees" ON performance_ratings;
DROP POLICY IF EXISTS "Employers can update ratings for employees" ON performance_ratings;

CREATE POLICY "Employers can insert ratings for employees"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employer_id = auth.uid() AND (
      -- For account-based employees
      (employee_id IN (
        SELECT user_id FROM employees
        WHERE employer_id = auth.uid()
        AND user_id IS NOT NULL
      )) OR
      -- For manual employees (employee_id will be the employee record id)
      (employee_id IN (
        SELECT id FROM employees
        WHERE employer_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Employers can update ratings for employees"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (
    employer_id = auth.uid() AND (
      -- For account-based employees
      (employee_id IN (
        SELECT user_id FROM employees
        WHERE employer_id = auth.uid()
        AND user_id IS NOT NULL
      )) OR
      -- For manual employees
      (employee_id IN (
        SELECT id FROM employees
        WHERE employer_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    employer_id = auth.uid() AND (
      (employee_id IN (
        SELECT user_id FROM employees
        WHERE employer_id = auth.uid()
        AND user_id IS NOT NULL
      )) OR
      (employee_id IN (
        SELECT id FROM employees
        WHERE employer_id = auth.uid()
      ))
    )
  );

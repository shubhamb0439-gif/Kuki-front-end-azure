/*
  # Allow Employers to Insert Statements for Their Employees

  1. Changes
    - Drop existing restrictive INSERT policy on statements
    - Create new policy allowing:
      - Users can insert statements for themselves
      - Employers can insert statements for their employees

  2. Security
    - Users can only create statements where they are the user_id
    - Employers can only create statements for employees they employ
    - Cannot create statements for random users
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert own statements" ON statements;

-- Create new policy allowing employers to insert for their employees
CREATE POLICY "Users and employers can insert statements"
  ON statements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = statements.user_id
    )
  );

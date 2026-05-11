/*
  # Allow Employees to Insert Statements for Their Employers
  
  1. Changes
    - Drop existing INSERT policy on statements
    - Create new policy that allows:
      - Users can insert statements for themselves
      - Employers can insert statements for their employees
      - Employees can insert statements for their employers (for ratings/feedback)
      
  2. Security
    - Users can only create statements where they are the user_id
    - Employers can only create statements for employees they employ
    - Employees can only create statements for their employers
    - Cannot create statements for random users
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users and employers can insert statements" ON statements;

-- Create new policy allowing employers AND employees to insert statements
CREATE POLICY "Users, employers, and employees can insert statements"
  ON statements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can insert statements for themselves
    auth.uid() = user_id 
    OR
    -- Employers can insert statements for their employees
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = statements.user_id
    )
    OR
    -- Employees can insert statements for their employers (for feedback/ratings)
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.employer_id = statements.user_id
    )
  );

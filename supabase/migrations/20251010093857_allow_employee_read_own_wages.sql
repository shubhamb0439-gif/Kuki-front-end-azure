/*
  # Allow Employees to Read Their Own Wage Data

  1. Changes
    - Add SELECT policy allowing employees to read their own wage records
    - Employees can only read wages for records they're linked to

  2. Security
    - Validates employee-employer relationship via employees table
    - Employees can only see their own wage data
*/

-- Allow employees to read their own wage data
CREATE POLICY "Employees can view own wages"
  ON employee_wages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_wages.employee_id
      AND employees.user_id = auth.uid()
      AND employees.employer_id = employee_wages.employer_id
    )
  );

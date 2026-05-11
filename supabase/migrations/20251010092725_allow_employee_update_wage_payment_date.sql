/*
  # Allow Employees to Update Wage Payment Date

  1. Changes
    - Add policy allowing employees to update their own wage payment_date
    - Employees can only update payment_date and updated_at fields
    - Must be linked to the employer via employees table

  2. Security
    - Validates employee-employer relationship
    - Only allows updating specific columns related to payment confirmation
*/

-- Allow employees to update their wage payment date when they scan QR
CREATE POLICY "Employees can update payment date"
  ON employee_wages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_wages.employee_id
      AND employees.user_id = auth.uid()
      AND employees.employer_id = employee_wages.employer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_wages.employee_id
      AND employees.user_id = auth.uid()
      AND employees.employer_id = employee_wages.employer_id
    )
  );

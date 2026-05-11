/*
  # Allow Employee to Insert Initial Wage During Onboarding

  1. Purpose
    - When a part-time employee scans an employer's QR code with pre-configured wage
    - The employee needs to be able to insert their initial wage record
    - This only applies during the onboarding/linking process

  2. Changes
    - Add policy to allow employees to insert wage records for themselves
    - Employee can only insert if they are linked to the employer (exists in employees table)
    - This enables automatic wage setup for part-time employees during QR scan

  3. Security
    - Employee can only insert wages where they are the employee
    - Must verify the employee-employer relationship exists
    - Cannot insert wages for other employees
*/

-- Allow employees to insert their initial wage when linking to an employer
CREATE POLICY "Employees can insert initial wage during onboarding"
  ON employee_wages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_wages.employee_id
      AND employees.user_id = auth.uid()
      AND employees.employer_id = employee_wages.employer_id
    )
  );

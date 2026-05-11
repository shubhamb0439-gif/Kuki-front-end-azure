/*
  # Add Employer SELECT Policy for Wages

  1. Problem
    - When we replaced the ALL policy with separate policies, we forgot SELECT
    - Employers can now INSERT/UPDATE/DELETE but cannot VIEW wage data
    - Result: Wage data invisible in UI even though it exists in database

  2. Solution
    - Add SELECT policy for employers to view their employees' wages

  3. Security
    - Employers can only view wages where employer_id = auth.uid()
    - Same security level as before
*/

-- Allow employers to SELECT/view employee wages
CREATE POLICY "Employers can view employee wages"
  ON employee_wages FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

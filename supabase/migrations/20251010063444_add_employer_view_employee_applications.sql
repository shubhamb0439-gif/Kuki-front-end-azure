/*
  # Allow employers to view their employees' job applications

  This migration adds a new RLS policy to allow employers to see when their employees 
  apply to other jobs (for the red status ring feature).

  ## Changes
  - Add policy to allow employers to SELECT job applications made by their employees
  
  ## Security
  - Employers can only view applications from users who are their employees (via employees table)
  - Does not allow viewing application details, just existence for status checking
*/

-- Add policy for employers to view their employees' job applications
CREATE POLICY "Employers can view their employees applications"
  ON job_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = job_applications.applicant_id
      AND employees.employer_id = auth.uid()
    )
  );

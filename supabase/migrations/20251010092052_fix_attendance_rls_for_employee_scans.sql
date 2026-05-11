/*
  # Fix Attendance RLS Policy for Employee Scans

  1. Changes
    - Drop existing INSERT policy that's too restrictive
    - Create new INSERT policy that allows both employer and employee inserts
    - Employers can create for their employees
    - Employees can create for themselves when they're linked to an employer

  2. Security
    - Still validates employer-employee relationship
    - Prevents unauthorized attendance marking
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Employers can create attendance for their employees" ON attendance_records;

-- Create new policy that allows both employer and employee to insert
CREATE POLICY "Users can create attendance records"
  ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employer creating for their employee
    (auth.uid() = employer_id AND EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = employee_id
    ))
    OR
    -- Employee creating for themselves (when linked to this employer)
    (auth.uid() = employee_id AND EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.employer_id = attendance_records.employer_id
    ))
  );

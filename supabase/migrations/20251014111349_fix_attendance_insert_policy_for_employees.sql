/*
  # Fix Attendance Records INSERT Policy for Employee Scans
  
  1. Problem
    - The current INSERT policy checks `auth.uid() = employee_id`
    - But `employee_id` in attendance_records is the user_id (profiles.id)
    - When employee scans QR, the policy needs to check employees table relationship
    
  2. Changes
    - Drop existing INSERT policy
    - Create new policy that properly validates employee relationship
    - Allows employees to insert their own attendance when linked to employer
    
  3. Security
    - Validates employee is linked to the employer via employees table
    - Prevents unauthorized attendance marking
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create attendance records" ON attendance_records;

-- Create new INSERT policy with proper employee validation
CREATE POLICY "Employees and employers can create attendance records"
  ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employer creating for their employee (employee_id is user_id)
    (auth.uid() = employer_id AND EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = attendance_records.employee_id
    ))
    OR
    -- Employee creating for themselves via employees table lookup
    (EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.employer_id = attendance_records.employer_id
      AND employees.user_id = attendance_records.employee_id
    ))
  );

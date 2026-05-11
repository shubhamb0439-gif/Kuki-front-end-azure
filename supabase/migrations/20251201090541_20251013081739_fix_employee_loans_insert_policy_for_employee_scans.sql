/*
  # Fix employee_loans INSERT policy to allow employee QR scans
  
  ## Problem
    - When an employer generates a loan grant QR code, the EMPLOYEE scans it
    - The employee's session inserts the loan record
    - Current policy only allows employer_id = auth.uid(), which fails for employees
    
  ## Solution
    - Drop the restrictive INSERT policy
    - Create a new policy that allows:
      1. Employers to create loans (employer_id = auth.uid())
      2. Employees to create loans for themselves (employee_id matches their employee record)
    
  ## Security
    - Employees can only insert loans where they are the employee
    - Employers can only insert loans where they are the employer
    - Both checks ensure proper authorization
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Employers can create loans for their employees" ON employee_loans;

-- Create a new policy that allows both employers and employees to insert loans
CREATE POLICY "Employers and employees can create loans"
  ON employee_loans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employer_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = employee_loans.employee_id 
      AND employees.user_id = auth.uid()
    )
  );
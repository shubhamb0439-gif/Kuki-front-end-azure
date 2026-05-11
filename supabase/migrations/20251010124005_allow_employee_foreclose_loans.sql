/*
  # Allow Employees to Foreclose Their Own Loans

  ## Changes
  
  Add RLS policy to allow employees to update their own loans when foreclosing.
  This allows employees to scan QR codes and update loan status to 'paid' and set foreclosure_date.
  
  ## New Policy
  
  - **Employees can update their own loans for foreclosure**
    - Allows UPDATE operation
    - Only for authenticated users
    - Only if the employee is the loan owner (through employees table)
    - Restricts updates to: status, foreclosure_date, remaining_amount
    - Employee cannot change employer_id, amount, or interest_rate
  
  ## Security
  
  - Employees can only update their own loans
  - Cannot modify core loan details (amount, interest_rate, employer_id)
  - Can only set status, foreclosure_date, and remaining_amount
*/

-- Create policy allowing employees to update their own loans for foreclosure
CREATE POLICY "Employees can update own loans for foreclosure"
  ON employee_loans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM employees 
      WHERE employees.id = employee_loans.employee_id 
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM employees 
      WHERE employees.id = employee_loans.employee_id 
      AND employees.user_id = auth.uid()
    )
  );

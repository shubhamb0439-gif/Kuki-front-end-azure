/*
  # Fix QR Transaction RLS Policy
  
  1. Changes
    - Drop the existing restrictive update policy for employees
    - Create new policy that allows employees to claim pending QR transactions
    - Employees can update transactions where:
      a) They are already the assigned employee, OR
      b) The transaction is pending (employee_id is NULL) and they are linked to the employer
  
  2. Security
    - Ensures employees can only claim QR codes from employers they're linked to
    - Prevents employees from modifying completed transactions
    - Maintains data integrity
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Employees can update QR transactions" ON qr_transactions;

-- Create new flexible policy that allows claiming pending transactions
CREATE POLICY "Employees can update QR transactions"
  ON qr_transactions FOR UPDATE
  TO authenticated
  USING (
    -- Either already assigned to this employee
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Or pending transaction and employee is linked to employer
    (
      qr_transactions.status = 'pending'
      AND qr_transactions.employee_id IS NULL
      AND EXISTS (
        SELECT 1 FROM employees
        WHERE employees.employer_id = qr_transactions.employer_id
        AND employees.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Can update to assign themselves
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
  );
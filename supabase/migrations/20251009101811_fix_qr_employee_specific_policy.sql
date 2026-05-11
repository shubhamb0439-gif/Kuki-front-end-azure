/*
  # Fix QR Transaction Policy for Employee-Specific QR Codes
  
  1. Changes
    - Drop existing update policy
    - Create new policy that only allows employees to update their own specific QR transactions
    - QR codes are now created with employee_id already set by employer
  
  2. Security
    - Employees can only update QR transactions that were created specifically for them
    - Prevents any employee from scanning another employee's QR code
    - Maintains strict data integrity
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Employees can update QR transactions" ON qr_transactions;

-- Create new employee-specific policy
CREATE POLICY "Employees can update own QR transactions"
  ON qr_transactions FOR UPDATE
  TO authenticated
  USING (
    -- Can only update QR transactions specifically assigned to them
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
    AND qr_transactions.status = 'pending'
  )
  WITH CHECK (
    -- Ensure they're updating their own transaction
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
  );
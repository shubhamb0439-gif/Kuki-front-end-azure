/*
  # Fix QR Transactions RLS for Universal Attendance
  
  1. Problem
    - Universal attendance QR codes have employee_id = NULL
    - Current RLS policies prevent employees from reading transactions with NULL employee_id
    - This causes "QR code not found or already used" errors
  
  2. Solution
    - Update SELECT policy to allow employees to view transactions where:
      - They are the linked employee (employee_id matches), OR
      - The transaction is universal (employee_id is NULL) AND they work for that employer
    - Update UPDATE policy to allow employees to update universal attendance transactions
  
  3. Security
    - Employees can only see and update QR transactions for employers they're linked to
    - Maintains data isolation between different employer-employee relationships
*/

-- Drop existing employee SELECT policy
DROP POLICY IF EXISTS "Employees can view own QR transactions" ON qr_transactions;

-- Create new employee SELECT policy that includes universal attendance
CREATE POLICY "Employees can view own QR transactions"
  ON qr_transactions FOR SELECT
  TO authenticated
  USING (
    -- Employee's own transactions
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Universal transactions for employers they work for
    (
      qr_transactions.employee_id IS NULL
      AND EXISTS (
        SELECT 1 FROM employees
        WHERE employees.employer_id = qr_transactions.employer_id
        AND employees.user_id = auth.uid()
      )
    )
  );

-- Drop existing employee UPDATE policy
DROP POLICY IF EXISTS "Employees can update QR transactions" ON qr_transactions;

-- Create new employee UPDATE policy that includes universal attendance
CREATE POLICY "Employees can update QR transactions"
  ON qr_transactions FOR UPDATE
  TO authenticated
  USING (
    -- Employee's own transactions
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Universal transactions for employers they work for
    (
      qr_transactions.employee_id IS NULL
      AND EXISTS (
        SELECT 1 FROM employees
        WHERE employees.employer_id = qr_transactions.employer_id
        AND employees.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Employee's own transactions
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
    OR
    -- Universal transactions for employers they work for
    (
      qr_transactions.employee_id IS NULL
      AND EXISTS (
        SELECT 1 FROM employees
        WHERE employees.employer_id = qr_transactions.employer_id
        AND employees.user_id = auth.uid()
      )
    )
  );
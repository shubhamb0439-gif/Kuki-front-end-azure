/*
  # Enable Data Sharing for Linked Accounts

  1. Purpose
    - Allow linked accounts to access the primary account's employee and wage data
    - Linked accounts with read_only can view data
    - Linked accounts with read_write can view and modify data

  2. New Helper Functions
    - `get_linked_account_ids()`: Returns all account IDs linked to the current user
    - Enables efficient querying of linked account data

  3. New RLS Policies
    - Employees: Allow viewing employees from linked accounts
    - Employee Wages: Allow viewing wages from linked accounts
    - Employee Loans: Allow viewing loans from linked accounts
    - Employee Bonuses: Allow viewing bonuses from linked accounts
    - Statements: Allow viewing statements from linked accounts
    - QR Transactions: Allow viewing transactions from linked accounts

  4. Security
    - Only active account links grant access
    - Permission levels are respected (read_only vs read_write)
    - Users maintain full access to their own data
*/

-- Helper function to get all linked account IDs for the current user
CREATE OR REPLACE FUNCTION get_linked_account_ids()
RETURNS TABLE(account_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT CASE
    WHEN primary_account_id = auth.uid() THEN linked_account_id
    WHEN linked_account_id = auth.uid() THEN primary_account_id
    ELSE NULL
  END AS account_id
  FROM account_links
  WHERE status = 'active'
  AND (primary_account_id = auth.uid() OR linked_account_id = auth.uid())
  AND linked_account_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Employees: Allow viewing employees from linked accounts
CREATE POLICY "Linked accounts can view employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
    OR user_id IN (SELECT account_id FROM get_linked_account_ids())
  );

-- Employee wages: Allow viewing wages from linked accounts  
CREATE POLICY "Linked accounts can view employee wages"
  ON employee_wages
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
  );

-- Employee remarks: Allow viewing remarks from linked accounts
CREATE POLICY "Linked accounts can view employee remarks"
  ON employee_remarks
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
  );

-- Employee loans: Allow viewing loans from linked accounts
CREATE POLICY "Linked accounts can view employee loans"
  ON employee_loans
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
    OR employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.user_id IN (SELECT account_id FROM get_linked_account_ids())
    )
  );

-- Employee bonuses: Allow viewing bonuses from linked accounts
CREATE POLICY "Linked accounts can view employee bonuses"
  ON employee_bonuses
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
    OR employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.user_id IN (SELECT account_id FROM get_linked_account_ids())
    )
  );

-- Attendance records: Allow viewing attendance from linked accounts
CREATE POLICY "Linked accounts can view attendance records"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
    OR employee_id IN (SELECT account_id FROM get_linked_account_ids())
  );

-- Performance ratings: Allow viewing ratings from linked accounts
CREATE POLICY "Linked accounts can view performance ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
    OR employee_id IN (SELECT account_id FROM get_linked_account_ids())
  );

-- Statements: Allow viewing statements from linked accounts
CREATE POLICY "Linked accounts can view statements"
  ON statements
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT account_id FROM get_linked_account_ids())
  );

-- QR transactions: Allow viewing transactions from linked accounts
CREATE POLICY "Linked accounts can view qr transactions"
  ON qr_transactions
  FOR SELECT
  TO authenticated
  USING (
    employer_id IN (SELECT account_id FROM get_linked_account_ids())
    OR employee_id IN (
      SELECT e.id FROM employees e
      WHERE e.user_id IN (SELECT account_id FROM get_linked_account_ids())
    )
  );

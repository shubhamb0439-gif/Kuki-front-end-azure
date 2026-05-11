/*
  # Allow Employees to Insert Contract Payments
  
  1. Changes
    - Add policy to allow employees to insert their own contract payment records when scanning QR codes
    
  2. Security
    - Employees can only insert records for themselves (verified via employees.user_id)
    - This is needed when employees scan contract wage payment QR codes
*/

-- Allow employees to insert their own contract payment records
CREATE POLICY "Employees can insert their own contract payments"
  ON contract_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = contract_payments.employee_id
        AND employees.user_id = auth.uid()
    )
  );
/*
  # Add Contract Wage Payment Support

  1. Changes
    - Adds support for 'pay_contract_wages' transaction type in qr_transactions
    - Creates contract_payments table to track all contract wage payments
    
  2. New Tables
    - `contract_payments`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references employees)
      - `employer_id` (uuid, references profiles)
      - `amount` (numeric)
      - `currency` (text)
      - `payment_date` (timestamptz)
      - `created_at` (timestamptz)
      
  3. Security
    - Enable RLS on contract_payments table
    - Policies for employers and employees to view their own payments
*/

-- Create contract_payments table
CREATE TABLE IF NOT EXISTS contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_payments
CREATE POLICY "Employers can view their contract payments"
  ON contract_payments FOR SELECT
  TO authenticated
  USING (
    employer_id = auth.uid()
  );

CREATE POLICY "Employees can view their contract payments"
  ON contract_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = contract_payments.employee_id
        AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can insert contract payments"
  ON contract_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    employer_id = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contract_payments_employee ON contract_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_employer ON contract_payments(employer_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_date ON contract_payments(payment_date);

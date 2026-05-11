/*
  # Add QR Transaction System and Statement Read Flag

  1. Changes
    - Add `read` column to `statements` table to track if user has read the statement
    - Create `qr_transactions` table to track all QR code based transactions
  
  2. New Tables
    - `qr_transactions`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references profiles) - employer who generated the QR
      - `employee_id` (uuid, references employees) - employee who scanned the QR
      - `transaction_type` (text) - 'pay_wages', 'settle_loan', 'mark_attendance'
      - `amount` (numeric, nullable) - transaction amount if applicable
      - `currency` (text) - currency of transaction
      - `status` (text) - 'completed', 'pending', 'failed'
      - `qr_code` (text) - the QR code value
      - `scanned_at` (timestamptz) - when employee scanned the QR
      - `metadata` (jsonb) - additional data (loan_id, attendance_date, etc.)
      - `created_at` (timestamptz)
  
  3. Security
    - Enable RLS on `qr_transactions` table
    - Add policies for employers to view their transactions
    - Add policies for employees to view their transactions
    - Add policy for employees to create transactions (scan QR)
  
  4. Updates
    - Add `read` boolean to `statements` table (default false)
*/

-- Add read column to statements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'statements' AND column_name = 'read'
  ) THEN
    ALTER TABLE statements ADD COLUMN read boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create qr_transactions table
CREATE TABLE IF NOT EXISTS qr_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('pay_wages', 'settle_loan', 'mark_attendance')),
  amount numeric DEFAULT 0,
  currency text DEFAULT 'USD' NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
  qr_code text NOT NULL,
  scanned_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE qr_transactions ENABLE ROW LEVEL SECURITY;

-- Employers can view their own QR transactions
CREATE POLICY "Employers can view own QR transactions"
  ON qr_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

-- Employees can view their own QR transactions
CREATE POLICY "Employees can view own QR transactions"
  ON qr_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Employers can create QR transactions (generate QR codes)
CREATE POLICY "Employers can create QR transactions"
  ON qr_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employer_id);

-- Employees can update QR transactions (scan and complete)
CREATE POLICY "Employees can update QR transactions"
  ON qr_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = qr_transactions.employee_id
      AND employees.user_id = auth.uid()
    )
  );
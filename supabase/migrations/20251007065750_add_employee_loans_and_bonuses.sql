/*
  # Employee Loans and Bonuses System

  1. New Tables
    - `employee_loans`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `employer_id` (uuid, foreign key to profiles)
      - `amount` (numeric) - loan amount given
      - `interest_rate` (numeric) - interest percentage
      - `total_amount` (numeric) - amount + interest
      - `paid_amount` (numeric) - amount paid back so far
      - `status` (text) - active, paid, cancelled
      - `loan_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `employee_bonuses`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `employer_id` (uuid, foreign key to profiles)
      - `amount` (numeric)
      - `reason` (text)
      - `bonus_date` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Employers can manage their own employees' loans and bonuses
    - Employees can view their own loans and bonuses
*/

-- Create employee_loans table
CREATE TABLE IF NOT EXISTS employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  loan_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_bonuses table
CREATE TABLE IF NOT EXISTS employee_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  bonus_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_loans

-- Employers can view loans for their employees
CREATE POLICY "Employers can view their employees' loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

-- Employers can create loans for their employees
CREATE POLICY "Employers can create loans for their employees"
  ON employee_loans FOR INSERT
  TO authenticated
  WITH CHECK (employer_id = auth.uid());

-- Employers can update loans for their employees
CREATE POLICY "Employers can update their employees' loans"
  ON employee_loans FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Employers can delete loans for their employees
CREATE POLICY "Employers can delete their employees' loans"
  ON employee_loans FOR DELETE
  TO authenticated
  USING (employer_id = auth.uid());

-- Employees can view their own loans
CREATE POLICY "Employees can view their own loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_loans.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- RLS Policies for employee_bonuses

-- Employers can view bonuses for their employees
CREATE POLICY "Employers can view their employees' bonuses"
  ON employee_bonuses FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

-- Employers can create bonuses for their employees
CREATE POLICY "Employers can create bonuses for their employees"
  ON employee_bonuses FOR INSERT
  TO authenticated
  WITH CHECK (employer_id = auth.uid());

-- Employers can update bonuses for their employees
CREATE POLICY "Employers can update their employees' bonuses"
  ON employee_bonuses FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Employers can delete bonuses for their employees
CREATE POLICY "Employers can delete their employees' bonuses"
  ON employee_bonuses FOR DELETE
  TO authenticated
  USING (employer_id = auth.uid());

-- Employees can view their own bonuses
CREATE POLICY "Employees can view their own bonuses"
  ON employee_bonuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_bonuses.employee_id
      AND employees.user_id = auth.uid()
    )
  );

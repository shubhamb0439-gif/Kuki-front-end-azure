/*
  # Add Employment Types and Salary Adjustments
  
  1. Changes to employees table
    - Add `hourly_rate` column for part-time employees
    - Add `working_hours_per_day` for part-time calculation
    - Add `working_days_per_month` for part-time calculation
  
  2. New Tables
    - `salary_adjustments`
      - Tracks merits, demerits, advances for employees
      - Links to employee and employer
      - Includes amount, type, reason, date
  
  3. Security
    - Enable RLS on salary_adjustments table
    - Add policies for employer access to salary adjustments
*/

-- Add new columns to employees table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE employees ADD COLUMN hourly_rate numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'working_hours_per_day'
  ) THEN
    ALTER TABLE employees ADD COLUMN working_hours_per_day numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'working_days_per_month'
  ) THEN
    ALTER TABLE employees ADD COLUMN working_days_per_month integer DEFAULT 0;
  END IF;
END $$;

-- Create salary_adjustments table
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('merit', 'demerit', 'advance', 'loan_deduction')),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on salary_adjustments
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy: Employers can view salary adjustments for their employees
CREATE POLICY "Employers can view their employees' salary adjustments"
  ON salary_adjustments
  FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

-- Policy: Employers can insert salary adjustments for their employees
CREATE POLICY "Employers can insert salary adjustments for their employees"
  ON salary_adjustments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = salary_adjustments.employee_id
      AND employees.employer_id = auth.uid()
    )
  );

-- Policy: Employers can update salary adjustments for their employees
CREATE POLICY "Employers can update their employees' salary adjustments"
  ON salary_adjustments
  FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Policy: Employers can delete salary adjustments for their employees
CREATE POLICY "Employers can delete their employees' salary adjustments"
  ON salary_adjustments
  FOR DELETE
  TO authenticated
  USING (employer_id = auth.uid());

-- Policy: Employees can view their own salary adjustments
CREATE POLICY "Employees can view their own salary adjustments"
  ON salary_adjustments
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Enable realtime for salary_adjustments
ALTER PUBLICATION supabase_realtime ADD TABLE salary_adjustments;

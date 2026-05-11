/*
  # Add Employee Wages and Remarks Tables

  1. New Tables
    - `employee_wages`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `employer_id` (uuid, foreign key to profiles)
      - `monthly_wage` (decimal)
      - `updated_at` (timestamp)
    - `employee_remarks`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `employer_id` (uuid, foreign key to profiles)
      - `date` (date)
      - `remark` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for employers to manage their employee data
*/

-- Employee Wages Table
CREATE TABLE IF NOT EXISTS employee_wages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_wage decimal(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_wages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage employee wages"
  ON employee_wages
  FOR ALL
  TO authenticated
  USING (employer_id = auth.uid());

-- Employee Remarks Table
CREATE TABLE IF NOT EXISTS employee_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  remark text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage employee remarks"
  ON employee_remarks
  FOR ALL
  TO authenticated
  USING (employer_id = auth.uid());

CREATE POLICY "Employees can read their own remarks"
  ON employee_remarks
  FOR SELECT
  TO authenticated
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_wages_employee_id ON employee_wages(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_wages_employer_id ON employee_wages(employer_id);
CREATE INDEX IF NOT EXISTS idx_employee_remarks_employee_id ON employee_remarks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_remarks_employer_id ON employee_remarks(employer_id);
CREATE INDEX IF NOT EXISTS idx_employee_remarks_date ON employee_remarks(date);
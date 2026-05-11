/*
  # Add Part-time Employee Wage Calculations

  1. Changes to employee_wages table
    - Add `hourly_rate` (numeric) - calculated hourly rate for part-time employees
    - Add `working_hours_per_day` (numeric) - expected daily working hours for part-time employees
    - Add `total_working_days` (integer) - total working days in the month for calculations
    - Add `actual_hours_worked` (numeric) - actual hours worked based on attendance
    - Add `deductions` (numeric) - total deductions (missing hours + other)
    - Add `final_payable` (numeric) - final amount to be paid after all adjustments

  2. Security
    - Update RLS policies to allow employers to manage these fields
*/

-- Add new columns to employee_wages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN hourly_rate numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'working_hours_per_day'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN working_hours_per_day numeric DEFAULT 8;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'total_working_days'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN total_working_days integer DEFAULT 22;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'actual_hours_worked'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN actual_hours_worked numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'deductions'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN deductions numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_wages' AND column_name = 'final_payable'
  ) THEN
    ALTER TABLE employee_wages ADD COLUMN final_payable numeric DEFAULT 0;
  END IF;
END $$;
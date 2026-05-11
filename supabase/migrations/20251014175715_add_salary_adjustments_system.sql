/*
  # Add Salary Adjustments System for Employees

  1. Purpose
    - Track merit bonuses, demerits, advances, and loan deductions
    - Calculate final payable amounts automatically for all employment types
    - Support part-time hourly calculations with attendance tracking

  2. Changes to employee_bonuses table
    - Update category enum to include 'merit', 'demerit', 'advance', 'loan_deduction'
    - These adjustments are added/subtracted from base salary
    - Merit and Advance = positive adjustments
    - Demerit and Loan Deduction = negative adjustments

  3. Part-time Employee Workflow
    - Employer sets: working_hours_per_day, working_days_per_month, monthly_wage
    - System calculates: hourly_rate = monthly_wage / (working_hours_per_day × working_days_per_month)
    - At month end: actual_hours_worked is calculated from attendance
    - Missing hours are deducted: deductions = (expected_hours - actual_hours) × hourly_rate
    - Final payable = base_amount - deductions + merits + advances - demerits - loan_deductions

  4. Security
    - Maintain existing RLS policies
    - Only employers can add adjustments to their employees
*/

-- Update employee_bonuses category to support all adjustment types
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE employee_bonuses DROP CONSTRAINT IF EXISTS employee_bonuses_category_check;
  
  -- Add new constraint with all adjustment types
  ALTER TABLE employee_bonuses ADD CONSTRAINT employee_bonuses_category_check 
    CHECK (category IN ('bonus', 'merit', 'demerit', 'advance', 'loan_deduction'));
END $$;

-- Create a function to calculate final payable amount for an employee
CREATE OR REPLACE FUNCTION calculate_employee_final_payable(
  p_employee_id uuid,
  p_base_wage numeric,
  p_hourly_rate numeric,
  p_working_hours_per_day numeric,
  p_total_working_days integer,
  p_actual_hours_worked numeric
)
RETURNS TABLE(
  final_payable numeric,
  total_merits numeric,
  total_demerits numeric,
  total_advances numeric,
  total_loan_deductions numeric,
  hour_deductions numeric
) AS $$
DECLARE
  v_merits numeric := 0;
  v_demerits numeric := 0;
  v_advances numeric := 0;
  v_loan_deductions numeric := 0;
  v_hour_deductions numeric := 0;
  v_expected_hours numeric := 0;
  v_final numeric := 0;
BEGIN
  -- Get sum of all adjustments
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'merit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'demerit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'advance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'loan_deduction' THEN amount ELSE 0 END), 0)
  INTO v_merits, v_demerits, v_advances, v_loan_deductions
  FROM employee_bonuses
  WHERE employee_id = p_employee_id
    AND EXTRACT(MONTH FROM bonus_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM bonus_date) = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Calculate hour deductions for part-time employees
  IF p_hourly_rate > 0 AND p_working_hours_per_day > 0 THEN
    v_expected_hours := p_working_hours_per_day * p_total_working_days;
    IF p_actual_hours_worked < v_expected_hours THEN
      v_hour_deductions := (v_expected_hours - p_actual_hours_worked) * p_hourly_rate;
    END IF;
  END IF;

  -- Calculate final payable
  v_final := p_base_wage + v_merits + v_advances - v_demerits - v_loan_deductions - v_hour_deductions;

  -- Return all values
  RETURN QUERY SELECT v_final, v_merits, v_demerits, v_advances, v_loan_deductions, v_hour_deductions;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_category ON employee_bonuses(category);
CREATE INDEX IF NOT EXISTS idx_employee_bonuses_date ON employee_bonuses(bonus_date);

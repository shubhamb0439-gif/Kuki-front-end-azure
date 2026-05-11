/*
  # Fix Wages Calculation - Advances and Loans

  ## Problem
  The calculate_and_update_monthly_hours function was incorrectly adding advances
  to final_payable instead of deducting them. Advances are salary pre-payments
  and must reduce the amount owed to the employee, not increase it.

  Additionally, loan_deduction_adjustments (manual one-time deductions) were not
  being treated consistently.

  ## Changes
  1. Fix calculate_and_update_monthly_hours: advances are now DEDUCTED from final_payable
  2. Total deductions = demerits + monthly_loan_deductions + loan_deduction_adjustments + advances
  3. Final payable = base_wage + merits - total_deductions
  4. This ensures wages, advances, and loans are all independent and calculated correctly

  ## Impact
  - Advances: now correctly reduce take-home pay (deducted)
  - Loans: monthly_deduction already deducted correctly, no change
  - Merits: still added to pay correctly
  - Demerits: still deducted correctly
  - Foreclosing/granting loans no longer causes wages to spike or drop unexpectedly
*/

CREATE OR REPLACE FUNCTION public.calculate_and_update_monthly_hours(
  p_employee_id uuid,
  p_employer_id uuid,
  p_year integer,
  p_month integer
)
RETURNS TABLE(
  actual_hours numeric,
  hourly_rate numeric,
  calculated_wage numeric,
  deductions numeric,
  final_payable numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_hours numeric;
  v_hourly_rate numeric;
  v_monthly_wage numeric;
  v_base_wage numeric;
  v_monthly_loan_deductions numeric;
  v_merits numeric;
  v_demerits numeric;
  v_advances numeric;
  v_loan_deduction_adjustments numeric;
  v_total_deductions numeric;
  v_final_payable numeric;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Calculate date range for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month' - interval '1 day')::date;

  -- Calculate total hours worked in the month
  SELECT COALESCE(SUM(total_hours), 0)
  INTO v_total_hours
  FROM attendance_records
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id
    AND EXTRACT(YEAR FROM attendance_date) = p_year
    AND EXTRACT(MONTH FROM attendance_date) = p_month
    AND total_hours IS NOT NULL;

  -- Get wage record (base monthly wage and hourly rate)
  SELECT
    COALESCE(ew.hourly_rate, 0),
    COALESCE(ew.monthly_wage, 0)
  INTO v_hourly_rate, v_monthly_wage
  FROM employee_wages ew
  WHERE ew.employee_id = p_employee_id
    AND ew.employer_id = p_employer_id;

  -- Calculate base wage based on employment type
  -- Part-time: hourly_rate × hours_worked; Full-time: monthly_wage
  IF v_hourly_rate > 0 THEN
    v_base_wage := v_hourly_rate * v_total_hours;
  ELSE
    v_base_wage := v_monthly_wage;
  END IF;

  -- Calculate monthly loan deductions from all active loans
  SELECT COALESCE(SUM(monthly_deduction), 0)
  INTO v_monthly_loan_deductions
  FROM employee_loans
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id
    AND status = 'active';

  -- Calculate adjustments from employee_bonuses for this month
  -- merits  → added to pay
  -- demerits → deducted from pay
  -- advances → deducted from pay (advance was given early; reduce take-home)
  -- loan_deduction → one-time extra loan deduction from pay
  SELECT
    COALESCE(SUM(CASE WHEN category = 'merit'          THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'demerit'        THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'advance'        THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'loan_deduction' THEN ABS(amount) ELSE 0 END), 0)
  INTO v_merits, v_demerits, v_advances, v_loan_deduction_adjustments
  FROM employee_bonuses
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id
    AND bonus_date >= v_start_date
    AND bonus_date <= v_end_date;

  -- Total deductions = demerits + recurring loan deductions + one-time loan adjustments + advances
  v_total_deductions := v_demerits + v_monthly_loan_deductions + v_loan_deduction_adjustments + v_advances;

  -- Final payable = base wage + merits - all deductions
  -- Clamp to 0 so it never goes negative
  v_final_payable := GREATEST(v_base_wage + v_merits - v_total_deductions, 0);

  -- Update employee_wages table (only update calculated fields, never overwrite monthly_wage)
  UPDATE employee_wages
  SET
    actual_hours_worked = v_total_hours,
    deductions          = v_total_deductions,
    final_payable       = v_final_payable,
    updated_at          = now()
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id;

  -- Return calculated values
  RETURN QUERY
  SELECT
    v_total_hours,
    v_hourly_rate,
    v_base_wage::numeric,
    v_total_deductions,
    v_final_payable;
END;
$$;

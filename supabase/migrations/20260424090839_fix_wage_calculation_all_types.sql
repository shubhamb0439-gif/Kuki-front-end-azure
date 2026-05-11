/*
  # Fix Wage Calculation for All Employment Types

  ## Problem
  The calculate_and_update_monthly_hours function was only called for part-time employees.
  Full-time employees never had their final_payable recalculated in the DB after
  loans, merits, demerits, or advances were added/changed.

  ## Changes
  1. Update calculate_and_update_monthly_hours to handle full-time correctly (base wage = monthly_wage)
  2. Add recalculate_employee_wages function that works for ALL employment types
     - Full-time: base = monthly_wage
     - Part-time: base = hourly_rate × actual_hours_worked
     - Contract: no calculation (contract payments are per-payment)
  3. This function can be called any time a loan/bonus/advance changes
*/

CREATE OR REPLACE FUNCTION public.recalculate_employee_wages(
  p_employee_id uuid,
  p_employer_id uuid
)
RETURNS TABLE(
  base_wage numeric,
  merits numeric,
  demerits numeric,
  advances numeric,
  loan_deductions numeric,
  total_deductions numeric,
  final_payable numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly_wage numeric;
  v_hourly_rate numeric;
  v_actual_hours numeric;
  v_base_wage numeric;
  v_monthly_loan_deductions numeric;
  v_merits numeric;
  v_demerits numeric;
  v_advances numeric;
  v_loan_deduction_adjustments numeric;
  v_total_deductions numeric;
  v_final_payable numeric;
BEGIN
  -- Get wage record
  SELECT
    COALESCE(ew.monthly_wage, 0),
    COALESCE(ew.hourly_rate, 0),
    COALESCE(ew.actual_hours_worked, 0)
  INTO v_monthly_wage, v_hourly_rate, v_actual_hours
  FROM employee_wages ew
  WHERE ew.employee_id = p_employee_id
    AND ew.employer_id = p_employer_id;

  -- If no wage record, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Base wage: part-time uses hourly × hours, full-time uses monthly wage
  IF v_hourly_rate > 0 AND v_actual_hours > 0 THEN
    v_base_wage := v_hourly_rate * v_actual_hours;
  ELSE
    v_base_wage := v_monthly_wage;
  END IF;

  -- Monthly loan deductions from all active loans
  SELECT COALESCE(SUM(monthly_deduction), 0)
  INTO v_monthly_loan_deductions
  FROM employee_loans
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id
    AND status = 'active';

  -- All-time bonuses/adjustments (merits, demerits, advances accumulate until reset)
  SELECT
    COALESCE(SUM(CASE WHEN category = 'merit'          THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'demerit'        THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'advance'        THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'loan_deduction' THEN ABS(amount) ELSE 0 END), 0)
  INTO v_merits, v_demerits, v_advances, v_loan_deduction_adjustments
  FROM employee_bonuses
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id;

  -- Total deductions
  v_total_deductions := v_demerits + v_monthly_loan_deductions + v_loan_deduction_adjustments + v_advances;

  -- Final payable (never negative)
  v_final_payable := GREATEST(v_base_wage + v_merits - v_total_deductions, 0);

  -- Update employee_wages
  UPDATE employee_wages
  SET
    deductions    = v_total_deductions,
    final_payable = v_final_payable,
    updated_at    = now()
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id;

  RETURN QUERY
  SELECT
    v_base_wage,
    v_merits,
    v_demerits,
    v_advances,
    v_monthly_loan_deductions + v_loan_deduction_adjustments,
    v_total_deductions,
    v_final_payable;
END;
$$;

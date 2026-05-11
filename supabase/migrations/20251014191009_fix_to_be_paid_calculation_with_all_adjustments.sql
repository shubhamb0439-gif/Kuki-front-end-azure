/*
  # Fix To Be Paid Calculation to Include All Adjustments

  1. Changes to calculate_and_update_monthly_hours function
    - Now calculates deductions including:
      - Monthly loan deductions from active loans
      - Merit bonuses (positive adjustments)
      - Demerit penalties (negative adjustments)
      - Advance payments (positive adjustments)
      - Loan deduction bonuses (negative adjustments)
    
  2. Updated Logic
    - Base Wage: monthly_wage (full-time) OR hourly_rate × actual_hours_worked (part-time)
    - Add: Merits + Advances
    - Subtract: Demerits + Monthly Loan Deductions + Loan Deduction Adjustments
    - Final Payable = Base + Merits + Advances - Demerits - Monthly Loan Deductions - Loan Deductions
    
  3. Purpose
    - Ensure "To Be Paid" reflects all financial adjustments
    - Include loan deductions, merits, demerits, and advances
    - Provide accurate payment calculations for both full-time and part-time employees
*/

-- Drop existing function and recreate with updated logic
DROP FUNCTION IF EXISTS calculate_and_update_monthly_hours(uuid, uuid, integer, integer);

CREATE OR REPLACE FUNCTION calculate_and_update_monthly_hours(
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
) AS $$
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

  -- Get wage record
  SELECT 
    COALESCE(ew.hourly_rate, 0),
    COALESCE(ew.monthly_wage, 0)
  INTO v_hourly_rate, v_monthly_wage
  FROM employee_wages ew
  WHERE ew.employee_id = p_employee_id
    AND ew.employer_id = p_employer_id;

  -- Calculate base wage based on employment type
  IF v_hourly_rate > 0 THEN
    -- Part-time: hourly_rate × hours_worked
    v_base_wage := v_hourly_rate * v_total_hours;
  ELSE
    -- Full-time: monthly_wage
    v_base_wage := v_monthly_wage;
  END IF;

  -- Calculate monthly loan deductions from active loans
  SELECT COALESCE(SUM(monthly_deduction), 0)
  INTO v_monthly_loan_deductions
  FROM employee_loans
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id
    AND status = 'active';

  -- Calculate adjustments from employee_bonuses for this month
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'merit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'demerit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'advance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'loan_deduction' THEN amount ELSE 0 END), 0)
  INTO v_merits, v_demerits, v_advances, v_loan_deduction_adjustments
  FROM employee_bonuses
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id
    AND bonus_date >= v_start_date
    AND bonus_date <= v_end_date;

  -- Calculate total deductions
  v_total_deductions := v_demerits + v_monthly_loan_deductions + v_loan_deduction_adjustments;

  -- Calculate final payable
  v_final_payable := v_base_wage + v_merits + v_advances - v_total_deductions;

  -- Update employee_wages table
  UPDATE employee_wages
  SET 
    actual_hours_worked = v_total_hours,
    deductions = v_total_deductions,
    final_payable = v_final_payable,
    updated_at = now()
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id;

  -- Return the calculated values
  RETURN QUERY
  SELECT 
    v_total_hours,
    v_hourly_rate,
    v_base_wage::numeric,
    v_total_deductions,
    v_final_payable;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to recalculate wages when loans or bonuses change
CREATE OR REPLACE FUNCTION trigger_recalculate_current_month_wages()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id uuid;
  v_employer_id uuid;
BEGIN
  -- Get employee and employer IDs from the trigger
  IF TG_OP = 'DELETE' THEN
    v_employee_id := OLD.employee_id;
    v_employer_id := OLD.employer_id;
  ELSE
    v_employee_id := NEW.employee_id;
    v_employer_id := NEW.employer_id;
  END IF;

  -- Recalculate wages for current month
  PERFORM calculate_and_update_monthly_hours(
    v_employee_id,
    v_employer_id,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    EXTRACT(MONTH FROM CURRENT_DATE)::integer
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger function for attendance
CREATE OR REPLACE FUNCTION trigger_update_monthly_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Update wages for the affected employee/employer/month
  PERFORM calculate_and_update_monthly_hours(
    NEW.employee_id,
    NEW.employer_id,
    EXTRACT(YEAR FROM NEW.attendance_date)::integer,
    EXTRACT(MONTH FROM NEW.attendance_date)::integer
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on attendance_records
DROP TRIGGER IF EXISTS trigger_attendance_update_wages ON attendance_records;
CREATE TRIGGER trigger_attendance_update_wages
  AFTER INSERT OR UPDATE OF total_hours
  ON attendance_records
  FOR EACH ROW
  WHEN (NEW.total_hours IS NOT NULL)
  EXECUTE FUNCTION trigger_update_monthly_hours();

-- Create trigger on employee_loans to recalculate wages when loans change
DROP TRIGGER IF EXISTS trigger_loan_update_wages ON employee_loans;
CREATE TRIGGER trigger_loan_update_wages
  AFTER INSERT OR UPDATE OR DELETE
  ON employee_loans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_current_month_wages();

-- Create trigger on employee_bonuses to recalculate wages when bonuses change
DROP TRIGGER IF EXISTS trigger_bonus_update_wages ON employee_bonuses;
CREATE TRIGGER trigger_bonus_update_wages
  AFTER INSERT OR UPDATE OR DELETE
  ON employee_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_current_month_wages();

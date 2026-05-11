/*
  # Add Function to Calculate Monthly Hours and Update Wages

  1. New Function
    - `calculate_and_update_monthly_hours(employee_id, employer_id, year, month)`
    - Calculates total hours worked from attendance_records
    - Updates employee_wages table with actual_hours_worked
    - Calculates final_payable = hourly_rate × actual_hours_worked
    
  2. Purpose
    - Automatically calculate wages based on actual attendance
    - Support part-time employee hourly wage calculations
    - Ensure wages reflect actual work performed
    
  3. Logic
    - Sum all total_hours from attendance_records for given month
    - Update employee_wages.actual_hours_worked
    - Calculate final_payable considering deductions
    - Final payable = (hourly_rate × actual_hours_worked) - deductions
*/

-- Create function to calculate monthly hours worked and update wages
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
  v_deductions numeric;
  v_final_payable numeric;
BEGIN
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
    COALESCE(ew.monthly_wage, 0),
    COALESCE(ew.deductions, 0)
  INTO v_hourly_rate, v_monthly_wage, v_deductions
  FROM employee_wages ew
  WHERE ew.employee_id = p_employee_id
    AND ew.employer_id = p_employer_id;

  -- Calculate final payable
  -- If hourly_rate is set (part-time), use hourly calculation
  -- Otherwise use monthly_wage (full-time)
  IF v_hourly_rate > 0 THEN
    v_final_payable := (v_hourly_rate * v_total_hours) - v_deductions;
  ELSE
    v_final_payable := v_monthly_wage - v_deductions;
  END IF;

  -- Ensure non-negative
  v_final_payable := GREATEST(v_final_payable, 0);

  -- Update employee_wages table
  UPDATE employee_wages
  SET 
    actual_hours_worked = v_total_hours,
    final_payable = v_final_payable,
    updated_at = now()
  WHERE employee_id = p_employee_id
    AND employer_id = p_employer_id;

  -- Return the calculated values
  RETURN QUERY
  SELECT 
    v_total_hours,
    v_hourly_rate,
    (v_hourly_rate * v_total_hours)::numeric,
    v_deductions,
    v_final_payable;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to auto-update wages when attendance changes
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

-- Create trigger on attendance_records
DROP TRIGGER IF EXISTS trigger_attendance_update_wages ON attendance_records;
CREATE TRIGGER trigger_attendance_update_wages
  AFTER INSERT OR UPDATE OF total_hours
  ON attendance_records
  FOR EACH ROW
  WHEN (NEW.total_hours IS NOT NULL)
  EXECUTE FUNCTION trigger_update_monthly_hours();

/*
  # Add Manual Wage Recalculation Function

  1. New Function
    - `recalculate_all_employee_wages_for_month(employer_id, year, month)`
    - Recalculates wages for all active employees of an employer
    - Useful for batch updates or fixing existing data
    
  2. Purpose
    - Allow manual trigger of wage recalculation
    - Ensure all employees have correct "To Be Paid" amounts
    - Fix existing records that may not have triggers applied
*/

-- Create function to recalculate wages for all employees of an employer
CREATE OR REPLACE FUNCTION recalculate_all_employee_wages_for_month(
  p_employer_id uuid,
  p_year integer DEFAULT NULL,
  p_month integer DEFAULT NULL
)
RETURNS TABLE(
  employee_id uuid,
  employee_name text,
  final_payable numeric
) AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_employee record;
BEGIN
  -- Use current month if not specified
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::integer);

  -- Loop through all active employees of this employer
  FOR v_employee IN 
    SELECT e.id, e.user_id
    FROM employees e
    WHERE e.employer_id = p_employer_id
      AND e.status = 'active'
  LOOP
    -- Recalculate wages for this employee
    PERFORM calculate_and_update_monthly_hours(
      v_employee.id,
      p_employer_id,
      v_year,
      v_month
    );
  END LOOP;

  -- Return updated wage information
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    p.name as employee_name,
    COALESCE(ew.final_payable, 0) as final_payable
  FROM employees e
  LEFT JOIN profiles p ON p.id = e.user_id
  LEFT JOIN employee_wages ew ON ew.employee_id = e.id AND ew.employer_id = p_employer_id
  WHERE e.employer_id = p_employer_id
    AND e.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

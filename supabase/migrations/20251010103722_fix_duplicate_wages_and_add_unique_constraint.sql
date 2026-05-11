/*
  # Fix Duplicate Wage Records and Add Unique Constraint

  1. Changes
    - Delete duplicate wage records (keep only the latest one per employee)
    - Add unique constraint on (employee_id, employer_id) to prevent future duplicates
    - This ensures each employee can only have ONE wage record per employer

  2. Security
    - Maintains existing RLS policies
    - Data integrity improved with unique constraint
*/

-- Step 1: Delete duplicate wage records, keep only the latest one per employee
DELETE FROM employee_wages
WHERE id NOT IN (
  SELECT DISTINCT ON (employee_id, employer_id) id
  FROM employee_wages
  ORDER BY employee_id, employer_id, updated_at DESC NULLS LAST
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE employee_wages
ADD CONSTRAINT employee_wages_employee_employer_unique 
UNIQUE (employee_id, employer_id);

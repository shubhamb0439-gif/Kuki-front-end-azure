/*
  # Fix Employer Ratings Insert Policy
  
  1. Changes
    - Drop the existing restrictive insert policy
    - Create a new policy that allows employees to rate employers they have worked with
    - Removes the strict employment status check to allow ratings from past employees too
    
  2. Security
    - Employees must be authenticated
    - Employees can only rate employers they have an employment record with
    - Employees can only submit ratings as themselves (employee_id must match auth.uid())
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Employees can rate their employers" ON employer_ratings;

-- Create a more permissive policy that allows employees to rate any employer they've worked with
CREATE POLICY "Employees can rate their employers"
  ON employer_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = employee_id
      AND employees.employer_id = employer_ratings.employer_id
    )
  );

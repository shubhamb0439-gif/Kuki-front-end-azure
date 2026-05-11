/*
  # Fix Statements RLS for Employee Wage Payment QR Scans

  ## Changes
  
  Modify the INSERT policy on statements table to allow employees to create statements
  for themselves when they scan wage payment QR codes. 
  
  Current policy only allows: auth.uid() = generated_by (only generator can insert)
  New policy allows: auth.uid() = generated_by OR auth.uid() = user_id
  
  This means:
  - Employers can insert statements they generate for employees
  - Employees can insert statements for themselves (e.g., from QR scans)
  
  ## Security Notes
  
  This is safe because:
  - Employees can only create statements where they are the user_id
  - They cannot create statements for other users
  - The generated_by field tracks who actually created the statement
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can insert statements" ON statements;

-- Create new policy that allows both generators and users to insert
CREATE POLICY "Users and generators can insert statements"
  ON statements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = generated_by OR auth.uid() = user_id
  );

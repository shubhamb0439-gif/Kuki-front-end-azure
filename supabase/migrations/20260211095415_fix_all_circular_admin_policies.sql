/*
  # Fix All Circular Admin Policy References

  1. Problem
    - Admin policies across multiple tables query the profiles table
    - This creates circular dependencies causing infinite recursion at login

  2. Solution
    - Replace ALL admin policies to use JWT metadata instead of querying profiles
    - This breaks all circular dependencies

  3. Tables Fixed
    - employees
    - job_postings  
    - job_applications
    - employee_wages
    - employee_loans
    - employee_bonuses
    - statements
    - qr_transactions
    - employee_attendance
    - performance_ratings
    - employer_ratings
    - salary_adjustments
    - attendance_records
    - contract_payments
*/

-- Fix employees table
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix job_postings table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all job postings" ON job_postings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all job postings"
  ON job_postings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix job_applications table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all applications" ON job_applications;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all applications"
  ON job_applications FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix employee_wages table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all wages" ON employee_wages;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all wages"
  ON employee_wages FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix employee_loans table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all loans" ON employee_loans;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all loans"
  ON employee_loans FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix employee_bonuses table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all bonuses" ON employee_bonuses;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all bonuses"
  ON employee_bonuses FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix statements table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all statements" ON statements;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all statements"
  ON statements FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix qr_transactions table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all qr transactions" ON qr_transactions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all qr transactions"
  ON qr_transactions FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix employee_attendance table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all attendance" ON employee_attendance;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all attendance"
  ON employee_attendance FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix performance_ratings table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all performance ratings" ON performance_ratings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all performance ratings"
  ON performance_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix employer_ratings table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all employer ratings" ON employer_ratings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all employer ratings"
  ON employer_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix salary_adjustments table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all salary adjustments" ON salary_adjustments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all salary adjustments"
  ON salary_adjustments FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix attendance_records table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix contract_payments table (if policy exists)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all contract payments" ON contract_payments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view all contract payments"
  ON contract_payments FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

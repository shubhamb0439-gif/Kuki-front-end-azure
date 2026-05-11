/*
  # Fix Infinite Recursion in Profiles Policies

  1. Problem
    - Admin policies query the profiles table to check admin role
    - This creates circular dependency: to read profile → check if admin → read profile → infinite loop
    - Admin role is stored in profiles but not in JWT metadata

  2. Solution
    - Update auth.users to store admin role in raw_app_meta_data
    - Replace ALL admin policies to use JWT app_metadata instead of querying profiles
    - This breaks the circular dependency completely

  3. Security
    - app_metadata cannot be modified by users
    - Only database functions can update it
    - Safe to use for authorization checks
*/

-- First: Update auth.users to include admin role in app_metadata for the admin user
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

-- Drop all existing admin policies on profiles that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;

-- Recreate admin policies using JWT app_metadata (no table queries)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert all profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete all profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Now fix all other tables to use app_metadata instead of user_metadata

-- Fix employees table
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix job_postings table
DROP POLICY IF EXISTS "Admins can view all job postings" ON job_postings;
CREATE POLICY "Admins can view all job postings"
  ON job_postings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix job_applications table
DROP POLICY IF EXISTS "Admins can view all applications" ON job_applications;
DROP POLICY IF EXISTS "Admins can view all job applications" ON job_applications;
CREATE POLICY "Admins can view all applications"
  ON job_applications FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix employee_wages table
DROP POLICY IF EXISTS "Admins can view all wages" ON employee_wages;
CREATE POLICY "Admins can view all wages"
  ON employee_wages FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix employee_loans table
DROP POLICY IF EXISTS "Admins can view all loans" ON employee_loans;
DROP POLICY IF EXISTS "Admins can view all employee loans" ON employee_loans;
CREATE POLICY "Admins can view all loans"
  ON employee_loans FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix employee_bonuses table
DROP POLICY IF EXISTS "Admins can view all bonuses" ON employee_bonuses;
DROP POLICY IF EXISTS "Admins can view all employee bonuses" ON employee_bonuses;
CREATE POLICY "Admins can view all bonuses"
  ON employee_bonuses FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix statements table
DROP POLICY IF EXISTS "Admins can view all statements" ON statements;
CREATE POLICY "Admins can view all statements"
  ON statements FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix qr_transactions table
DROP POLICY IF EXISTS "Admins can view all qr transactions" ON qr_transactions;
CREATE POLICY "Admins can view all qr transactions"
  ON qr_transactions FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix employee_attendance table
DROP POLICY IF EXISTS "Admins can view all attendance" ON employee_attendance;
CREATE POLICY "Admins can view all attendance"
  ON employee_attendance FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix performance_ratings table
DROP POLICY IF EXISTS "Admins can view all performance ratings" ON performance_ratings;
CREATE POLICY "Admins can view all performance ratings"
  ON performance_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix employer_ratings table
DROP POLICY IF EXISTS "Admins can view all employer ratings" ON employer_ratings;
CREATE POLICY "Admins can view all employer ratings"
  ON employer_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix salary_adjustments table
DROP POLICY IF EXISTS "Admins can view all salary adjustments" ON salary_adjustments;
CREATE POLICY "Admins can view all salary adjustments"
  ON salary_adjustments FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix attendance_records table
DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;
CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix contract_payments table
DROP POLICY IF EXISTS "Admins can view all contract payments" ON contract_payments;
CREATE POLICY "Admins can view all contract payments"
  ON contract_payments FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

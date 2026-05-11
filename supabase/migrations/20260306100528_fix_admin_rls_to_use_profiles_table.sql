/*
  # Fix Admin RLS Policies to Use Profiles Table Instead of JWT

  ## Problem
  - Current admin policies check: `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`
  - JWT is cached and doesn't update until user logs out/in
  - This causes admin dashboard to show zeros until logout/login
  
  ## Solution
  - Change ALL admin policies to check: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
  - This checks the current database state, not the cached JWT
  - More reliable and no logout required
  
  ## Changes
  - Drop all JWT-based admin policies
  - Recreate with profiles table check
  - Affects: profiles, employees, job_postings, job_applications, advertisements, and 20+ other tables
*/

-- Helper function to check if user is admin (avoids infinite recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PROFILES TABLE
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert all profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- EMPLOYEES TABLE
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;

CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (is_admin());

-- JOB POSTINGS
DROP POLICY IF EXISTS "Admins can view all job postings" ON job_postings;

CREATE POLICY "Admins can view all job postings"
  ON job_postings FOR SELECT
  TO authenticated
  USING (is_admin());

-- JOB APPLICATIONS
DROP POLICY IF EXISTS "Admins can view all applications" ON job_applications;

CREATE POLICY "Admins can view all applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (is_admin());

-- JOB ROLES
DROP POLICY IF EXISTS "Admins can insert job roles" ON job_roles;
DROP POLICY IF EXISTS "Admins can update job roles" ON job_roles;
DROP POLICY IF EXISTS "Admins can delete job roles" ON job_roles;

CREATE POLICY "Admins can insert job roles"
  ON job_roles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update job roles"
  ON job_roles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete job roles"
  ON job_roles FOR DELETE
  TO authenticated
  USING (is_admin());

-- ADVERTISEMENTS
DROP POLICY IF EXISTS "Admins can view all ads" ON advertisements;
DROP POLICY IF EXISTS "Admins can insert ads" ON advertisements;
DROP POLICY IF EXISTS "Admins can update ads" ON advertisements;
DROP POLICY IF EXISTS "Admins can delete ads" ON advertisements;

CREATE POLICY "Admins can view all ads"
  ON advertisements FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert ads"
  ON advertisements FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update ads"
  ON advertisements FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete ads"
  ON advertisements FOR DELETE
  TO authenticated
  USING (is_admin());

-- AD IMPRESSIONS
DROP POLICY IF EXISTS "Admins can view all impressions" ON ad_impressions;

CREATE POLICY "Admins can view all impressions"
  ON ad_impressions FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE WAGES
DROP POLICY IF EXISTS "Admins can view all wages" ON employee_wages;

CREATE POLICY "Admins can view all wages"
  ON employee_wages FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE LOANS
DROP POLICY IF EXISTS "Admins can view all loans" ON employee_loans;

CREATE POLICY "Admins can view all loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE BONUSES
DROP POLICY IF EXISTS "Admins can view all bonuses" ON employee_bonuses;

CREATE POLICY "Admins can view all bonuses"
  ON employee_bonuses FOR SELECT
  TO authenticated
  USING (is_admin());

-- ATTENDANCE RECORDS
DROP POLICY IF EXISTS "Admins can view all attendance records" ON attendance_records;

CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE ATTENDANCE
DROP POLICY IF EXISTS "Admins can view all attendance" ON employee_attendance;

CREATE POLICY "Admins can view all attendance"
  ON employee_attendance FOR SELECT
  TO authenticated
  USING (is_admin());

-- PERFORMANCE RATINGS
DROP POLICY IF EXISTS "Admins can view all performance ratings" ON performance_ratings;

CREATE POLICY "Admins can view all performance ratings"
  ON performance_ratings FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYER RATINGS
DROP POLICY IF EXISTS "Admins can view all employer ratings" ON employer_ratings;

CREATE POLICY "Admins can view all employer ratings"
  ON employer_ratings FOR SELECT
  TO authenticated
  USING (is_admin());

-- STATEMENTS
DROP POLICY IF EXISTS "Admins can view all statements" ON statements;

CREATE POLICY "Admins can view all statements"
  ON statements FOR SELECT
  TO authenticated
  USING (is_admin());

-- QR TRANSACTIONS
DROP POLICY IF EXISTS "Admins can view all qr transactions" ON qr_transactions;

CREATE POLICY "Admins can view all qr transactions"
  ON qr_transactions FOR SELECT
  TO authenticated
  USING (is_admin());

-- CONTRACT PAYMENTS
DROP POLICY IF EXISTS "Admins can view all contract payments" ON contract_payments;

CREATE POLICY "Admins can view all contract payments"
  ON contract_payments FOR SELECT
  TO authenticated
  USING (is_admin());

-- SALARY ADJUSTMENTS
DROP POLICY IF EXISTS "Admins can view all salary adjustments" ON salary_adjustments;

CREATE POLICY "Admins can view all salary adjustments"
  ON salary_adjustments FOR SELECT
  TO authenticated
  USING (is_admin());

-- LOGIN LOGS
DROP POLICY IF EXISTS "Admins can view all login logs" ON login_logs;

CREATE POLICY "Admins can view all login logs"
  ON login_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- SUBSCRIPTION TRANSACTIONS
DROP POLICY IF EXISTS "Admins can view all subscription transactions" ON subscription_transactions;
DROP POLICY IF EXISTS "Admins can insert subscription transactions" ON subscription_transactions;

CREATE POLICY "Admins can view all subscription transactions"
  ON subscription_transactions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert subscription transactions"
  ON subscription_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ACCOUNT LINKS
DROP POLICY IF EXISTS "Admin can view all account links" ON account_links;
DROP POLICY IF EXISTS "Admin can manage all account links" ON account_links;

CREATE POLICY "Admin can view all account links"
  ON account_links FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can manage all account links"
  ON account_links FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- REFERRAL REWARDS
DROP POLICY IF EXISTS "Admin can view all referral rewards" ON referral_rewards;
DROP POLICY IF EXISTS "Admin can manage all referral rewards" ON referral_rewards;

CREATE POLICY "Admin can view all referral rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can manage all referral rewards"
  ON referral_rewards FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- STORAGE: AD VIDEOS
DROP POLICY IF EXISTS "Admins can upload ad videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update ad videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ad videos" ON storage.objects;

CREATE POLICY "Admins can upload ad videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ad-videos' AND is_admin());

CREATE POLICY "Admins can update ad videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ad-videos' AND is_admin());

CREATE POLICY "Admins can delete ad videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ad-videos' AND is_admin());

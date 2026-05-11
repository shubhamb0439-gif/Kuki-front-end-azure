/*
  # Fix Admin Function - Change from STABLE to VOLATILE

  ## Problem
  - `is_admin()` function marked as STABLE causes result caching
  - STABLE functions return cached results within a transaction
  - Session not fully established on first call = false result gets cached
  - All RLS policies fail, dashboard shows zeros
  
  ## Solution
  - Drop function CASCADE (removes all dependent policies)
  - Recreate as VOLATILE (forces fresh evaluation)
  - Recreate all RLS policies
  
  ## Changes
  - is_admin() function: STABLE → VOLATILE
  - All 36 admin RLS policies recreated
*/

-- Drop function and all dependent policies
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Recreate function as VOLATILE
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER VOLATILE;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- PROFILES TABLE
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
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (is_admin());

-- JOB POSTINGS
CREATE POLICY "Admins can view all job postings"
  ON job_postings FOR SELECT
  TO authenticated
  USING (is_admin());

-- JOB APPLICATIONS
CREATE POLICY "Admins can view all applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (is_admin());

-- JOB ROLES
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
CREATE POLICY "Admins can view all impressions"
  ON ad_impressions FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE WAGES
CREATE POLICY "Admins can view all wages"
  ON employee_wages FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE LOANS
CREATE POLICY "Admins can view all loans"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE BONUSES
CREATE POLICY "Admins can view all bonuses"
  ON employee_bonuses FOR SELECT
  TO authenticated
  USING (is_admin());

-- ATTENDANCE RECORDS
CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYEE ATTENDANCE
CREATE POLICY "Admins can view all attendance"
  ON employee_attendance FOR SELECT
  TO authenticated
  USING (is_admin());

-- PERFORMANCE RATINGS
CREATE POLICY "Admins can view all performance ratings"
  ON performance_ratings FOR SELECT
  TO authenticated
  USING (is_admin());

-- EMPLOYER RATINGS
CREATE POLICY "Admins can view all employer ratings"
  ON employer_ratings FOR SELECT
  TO authenticated
  USING (is_admin());

-- STATEMENTS
CREATE POLICY "Admins can view all statements"
  ON statements FOR SELECT
  TO authenticated
  USING (is_admin());

-- QR TRANSACTIONS
CREATE POLICY "Admins can view all qr transactions"
  ON qr_transactions FOR SELECT
  TO authenticated
  USING (is_admin());

-- CONTRACT PAYMENTS
CREATE POLICY "Admins can view all contract payments"
  ON contract_payments FOR SELECT
  TO authenticated
  USING (is_admin());

-- SALARY ADJUSTMENTS
CREATE POLICY "Admins can view all salary adjustments"
  ON salary_adjustments FOR SELECT
  TO authenticated
  USING (is_admin());

-- LOGIN LOGS
CREATE POLICY "Admins can view all login logs"
  ON login_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- SUBSCRIPTION TRANSACTIONS
CREATE POLICY "Admins can view all subscription transactions"
  ON subscription_transactions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert subscription transactions"
  ON subscription_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ACCOUNT LINKS
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

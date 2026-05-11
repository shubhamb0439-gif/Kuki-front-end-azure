/*
  # Fix All Remaining Infinite Recursion Issues

  1. Problem
    - Multiple tables have admin policies that query the profiles table to check admin role
    - This creates circular dependencies when any policy chain references these tables
    - Tables affected: job_roles, login_logs, objects (storage), referral_rewards, subscription_transactions

  2. Solution
    - Replace ALL admin policies to use JWT app_metadata instead of querying profiles
    - This completely eliminates any possibility of circular dependencies

  3. Security
    - app_metadata cannot be modified by users
    - Only database functions can update it
    - Safe to use for authorization checks
*/

-- Fix job_roles table
DROP POLICY IF EXISTS "Admins can insert job roles" ON job_roles;
DROP POLICY IF EXISTS "Admins can update job roles" ON job_roles;
DROP POLICY IF EXISTS "Admins can delete job roles" ON job_roles;

CREATE POLICY "Admins can insert job roles"
  ON job_roles FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can update job roles"
  ON job_roles FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can delete job roles"
  ON job_roles FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix login_logs table
DROP POLICY IF EXISTS "Admins can view all login logs" ON login_logs;

CREATE POLICY "Admins can view all login logs"
  ON login_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix storage.objects (ad-videos bucket)
DROP POLICY IF EXISTS "Admins can upload ad videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update ad videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete ad videos" ON storage.objects;

CREATE POLICY "Admins can upload ad videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ad-videos' AND 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update ad videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ad-videos' AND 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete ad videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ad-videos' AND 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Fix referral_rewards table
DROP POLICY IF EXISTS "Admin can view all referral rewards" ON referral_rewards;
DROP POLICY IF EXISTS "Admin can manage all referral rewards" ON referral_rewards;

CREATE POLICY "Admin can view all referral rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can manage all referral rewards"
  ON referral_rewards FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Fix subscription_transactions table
DROP POLICY IF EXISTS "Admins can view all subscription transactions" ON subscription_transactions;
DROP POLICY IF EXISTS "Admins can insert subscription transactions" ON subscription_transactions;

CREATE POLICY "Admins can view all subscription transactions"
  ON subscription_transactions FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can insert subscription transactions"
  ON subscription_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

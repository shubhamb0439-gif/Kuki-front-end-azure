/*
  # Update Subscription Pricing Structure

  1. Changes Overview
    - Update subscription plans to Core, Pro, and Pro Plus
    - Core (Free): 1 employee limit, single-user, basic reporting, multiple adverts
    - Core (Paid $4.95/month): 3 employees, full/part-time support, single-user, basic reporting, multiple adverts
    - Pro ($19.95/month): 6 employees, full/part-time support, multi-user, standard reporting, single advert
    - Pro Plus ($29.95/month): 12 employees + contractors, multi-user shareable, advanced reporting, no adverts

  2. New Columns
    - `is_paid_core` (boolean) - differentiates free Core from paid Core ($4.95)
    - `supports_contractors` (boolean) - only Pro Plus supports contractors
    - `is_multi_user` (boolean) - Pro and Pro Plus support multi-user
    - `reporting_level` (text) - 'basic', 'standard', 'advanced'
    - `ad_level` (text) - 'multiple', 'single', 'none'

  3. Plan Matrix
    CORE FREE: 1 employee, single-user, basic reporting, multiple ads, FREE FOREVER
    CORE PAID: 3 employees, full/part-time, single-user, basic reporting, multiple ads, $4.95/month
    PRO: 6 employees, full/part-time, multi-user, standard reporting, single ad, $19.95/month
    PRO PLUS: 12 employees + contractors, shareable multi-user, advanced reporting, no ads, $29.95/month

  4. Security
    - Maintains all existing RLS policies
*/

-- Step 1: Drop old constraint first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

-- Step 2: Migrate existing data from old plans to new plans
UPDATE profiles
SET subscription_plan = CASE
  WHEN subscription_plan = 'bronze' THEN 'core'
  WHEN subscription_plan = 'silver' THEN 'pro'
  WHEN subscription_plan = 'gold' THEN 'pro_plus'
  WHEN subscription_plan NOT IN ('core', 'pro', 'pro_plus') THEN 'core'
  ELSE subscription_plan
END;

-- Step 3: Add new constraint with updated plans
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_plan_check 
  CHECK (subscription_plan IN ('core', 'pro', 'pro_plus'));

-- Step 4: Add new subscription columns
DO $$
BEGIN
  -- Add is_paid_core column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_paid_core'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_paid_core boolean DEFAULT false;
  END IF;

  -- Add supports_contractors column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'supports_contractors'
  ) THEN
    ALTER TABLE profiles ADD COLUMN supports_contractors boolean DEFAULT false;
  END IF;

  -- Add is_multi_user column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_multi_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_multi_user boolean DEFAULT false;
  END IF;

  -- Add reporting_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'reporting_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN reporting_level text DEFAULT 'basic' CHECK (reporting_level IN ('basic', 'standard', 'advanced'));
  END IF;

  -- Add ad_level column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ad_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ad_level text DEFAULT 'multiple' CHECK (ad_level IN ('multiple', 'single', 'none'));
  END IF;
END $$;

-- Step 5: Drop old trigger and function
DROP TRIGGER IF EXISTS update_subscription_features_trigger ON profiles;
DROP FUNCTION IF EXISTS update_subscription_features();

-- Step 6: Create new function to update subscription features
CREATE OR REPLACE FUNCTION update_subscription_features()
RETURNS TRIGGER AS $$
BEGIN
  -- CORE FREE (default)
  IF NEW.subscription_plan = 'core' AND (NEW.is_paid_core IS NULL OR NEW.is_paid_core = false) THEN
    NEW.max_employees := 1;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := false;
    NEW.is_multi_user := false;
    NEW.supports_contractors := false;
    NEW.reporting_level := 'basic';
    NEW.ad_level := 'multiple';
    NEW.is_paid_core := false;
  
  -- CORE PAID ($4.95/month)
  ELSIF NEW.subscription_plan = 'core' AND NEW.is_paid_core = true THEN
    NEW.max_employees := 3;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := false;
    NEW.is_multi_user := false;
    NEW.supports_contractors := false;
    NEW.reporting_level := 'basic';
    NEW.ad_level := 'multiple';
  
  -- PRO ($19.95/month)
  ELSIF NEW.subscription_plan = 'pro' THEN
    NEW.max_employees := 6;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := true;
    NEW.is_multi_user := true;
    NEW.supports_contractors := false;
    NEW.reporting_level := 'standard';
    NEW.ad_level := 'single';
    NEW.is_paid_core := false;
  
  -- PRO PLUS ($29.95/month)
  ELSIF NEW.subscription_plan = 'pro_plus' THEN
    NEW.max_employees := 12;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := true;
    NEW.is_multi_user := true;
    NEW.supports_contractors := true;
    NEW.reporting_level := 'advanced';
    NEW.ad_level := 'none';
    NEW.is_paid_core := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create new trigger
CREATE TRIGGER update_subscription_features_trigger
  BEFORE INSERT OR UPDATE OF subscription_plan, is_paid_core ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_features();

-- Step 8: Update all existing profiles to apply new subscription features
UPDATE profiles
SET subscription_plan = subscription_plan;

-- Step 9: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_is_paid_core ON profiles(is_paid_core);
CREATE INDEX IF NOT EXISTS idx_profiles_reporting_level ON profiles(reporting_level);
CREATE INDEX IF NOT EXISTS idx_profiles_ad_level ON profiles(ad_level);
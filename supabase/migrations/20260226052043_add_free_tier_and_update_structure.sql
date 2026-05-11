/*
  # Add FREE Tier and Update Subscription Structure

  ## Changes Overview
  This migration introduces a 4-tier subscription system and removes the account_tier concept:
  - FREE: 1 employee, limited statements, no attendance, multiple ads - FREE
  - CORE: 3 employees, full statements, attendance, multiple ads - $4.95/month
  - PRO: 6 employees, multi-user, single ad - $19.95/month
  - PRO PLUS: 12 employees, multi-user shareable, no ads - $29.95/month

  ## New Subscription Plans
  1. **FREE** (Default for all new signups)
     - Max Employees: 1
     - Attendance Tracking: NO
     - Full Statements: NO (limited)
     - Multi-User: NO
     - Ad Level: Multiple ads
     - Price: FREE

  2. **CORE** ($4.95/month)
     - Max Employees: 3
     - Attendance Tracking: YES
     - Full Statements: YES
     - Multi-User: NO
     - Ad Level: Multiple ads
     - Price: $4.95/month

  3. **PRO** ($19.95/month)
     - Max Employees: 6
     - Attendance Tracking: YES
     - Full Statements: YES
     - Multi-User: YES
     - Ad Level: Single ad
     - Price: $19.95/month

  4. **PRO PLUS** ($29.95/month)
     - Max Employees: 12
     - Attendance Tracking: YES
     - Full Statements: YES
     - Multi-User: YES (shareable)
     - Ad Level: No ads
     - Price: $29.95/month

  ## Important Changes
  - Remove account_type selection during signup
  - All new users start with FREE tier by default
  - Account linking/sharing only available for PRO and PRO PLUS (multi-user plans)
  - Manual employee addition works for all tiers
  - QR employee addition only works for multi-user plans (PRO and PRO PLUS)

  ## Security
  - Maintains all existing RLS policies
*/

-- Step 1: Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

-- Step 2: Add FREE tier to subscription plans
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IN ('free', 'core', 'pro', 'pro_plus'));

-- Step 3: Migrate any remaining non-free plans
UPDATE profiles
SET subscription_plan = CASE
  WHEN subscription_plan = 'bronze' THEN 'free'
  WHEN subscription_plan = 'silver' THEN 'core'
  WHEN subscription_plan = 'gold' THEN 'pro_plus'
  WHEN subscription_plan NOT IN ('free', 'core', 'pro', 'pro_plus') THEN 'free'
  ELSE subscription_plan
END;

-- Step 4: Set default subscription plan to 'free' for new profiles
ALTER TABLE profiles ALTER COLUMN subscription_plan SET DEFAULT 'free';

-- Step 5: Drop old trigger and function
DROP TRIGGER IF EXISTS update_subscription_features_trigger ON profiles;
DROP FUNCTION IF EXISTS update_subscription_features();

-- Step 6: Create updated function to handle all 4 tiers
CREATE OR REPLACE FUNCTION update_subscription_features()
RETURNS TRIGGER AS $$
BEGIN
  -- FREE (default for all new signups)
  IF NEW.subscription_plan = 'free' THEN
    NEW.max_employees := 1;
    NEW.can_track_attendance := false;
    NEW.can_access_full_statements := false;
    NEW.is_multi_user := false;
    NEW.supports_contractors := false;
    NEW.reporting_level := 'basic';
    NEW.ad_level := 'multiple';

  -- CORE ($4.95/month)
  ELSIF NEW.subscription_plan = 'core' THEN
    NEW.max_employees := 3;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := true;
    NEW.is_multi_user := false;
    NEW.supports_contractors := false;
    NEW.reporting_level := 'standard';
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

  -- PRO PLUS ($29.95/month)
  ELSIF NEW.subscription_plan = 'pro_plus' THEN
    NEW.max_employees := 12;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := true;
    NEW.is_multi_user := true;
    NEW.supports_contractors := true;
    NEW.reporting_level := 'advanced';
    NEW.ad_level := 'none';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create new trigger
CREATE TRIGGER update_subscription_features_trigger
  BEFORE INSERT OR UPDATE OF subscription_plan ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_features();

-- Step 8: Update all existing profiles to apply new subscription features
UPDATE profiles
SET subscription_plan = subscription_plan;

-- Step 9: Remove is_paid_core column as it's no longer needed with FREE tier
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_paid_core'
  ) THEN
    ALTER TABLE profiles DROP COLUMN is_paid_core;
  END IF;
END $$;
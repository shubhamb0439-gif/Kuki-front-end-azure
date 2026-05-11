/*
  # Add Subscription Trial System

  1. Changes
    - Add trial_ends_at column to profiles table
    - Add payment_method_added boolean to track if user added payment
    - Create function to check and expire trials automatically
    - Add index for efficient trial expiration checks

  2. Security
    - Maintain existing RLS policies
*/

-- Add trial tracking columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_ends_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'payment_method_added'
  ) THEN
    ALTER TABLE profiles ADD COLUMN payment_method_added boolean DEFAULT false;
  END IF;
END $$;

-- Create index for efficient trial expiration queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at 
ON profiles(trial_ends_at) 
WHERE trial_ends_at IS NOT NULL AND subscription_status = 'active';

-- Function to check and expire trials
CREATE OR REPLACE FUNCTION expire_subscription_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Downgrade expired trials back to free plan
  UPDATE profiles
  SET 
    subscription_plan = 'free',
    subscription_status = 'active',
    trial_ends_at = NULL,
    ad_level = 'multiple',
    ads_enabled = true,
    max_employees = 2,
    can_track_attendance = false,
    can_access_full_statements = false,
    supports_contractors = false,
    is_multi_user = false,
    reporting_level = 'basic',
    updated_at = now()
  WHERE 
    trial_ends_at IS NOT NULL
    AND trial_ends_at <= now()
    AND subscription_status = 'active';
END;
$$;

-- Function to start a trial subscription
CREATE OR REPLACE FUNCTION start_subscription_trial(
  p_user_id uuid,
  p_plan text,
  p_payment_added boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_end timestamptz;
  v_profile record;
  v_max_employees int;
  v_ad_level text;
  v_reporting_level text;
  v_premium_features boolean;
BEGIN
  -- Calculate trial end date (14 days from now)
  v_trial_end := now() + interval '14 days';

  -- Set features based on plan
  CASE p_plan
    WHEN 'core' THEN
      v_max_employees := 5;
      v_ad_level := 'none';
      v_reporting_level := 'standard';
      v_premium_features := true;
    WHEN 'pro' THEN
      v_max_employees := 15;
      v_ad_level := 'none';
      v_reporting_level := 'advanced';
      v_premium_features := true;
    WHEN 'pro_plus' THEN
      v_max_employees := 9999;
      v_ad_level := 'none';
      v_reporting_level := 'advanced';
      v_premium_features := true;
    ELSE
      v_max_employees := 2;
      v_ad_level := 'multiple';
      v_reporting_level := 'basic';
      v_premium_features := true;
  END CASE;

  -- Update user profile with trial
  UPDATE profiles
  SET 
    subscription_plan = p_plan,
    subscription_status = 'active',
    trial_ends_at = v_trial_end,
    payment_method_added = p_payment_added,
    ad_level = v_ad_level,
    ads_enabled = false,
    max_employees = v_max_employees,
    can_track_attendance = true,
    can_access_full_statements = true,
    supports_contractors = (p_plan IN ('pro', 'pro_plus')),
    is_multi_user = (p_plan IN ('pro', 'pro_plus')),
    reporting_level = v_reporting_level,
    premium_features_enabled = v_premium_features,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  RETURN json_build_object(
    'success', true,
    'profile', row_to_json(v_profile),
    'trial_days_remaining', 14,
    'trial_ends_at', v_trial_end
  );
END;
$$;
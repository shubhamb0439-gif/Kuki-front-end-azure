/*
  # Add Subscription Tiers System

  1. Changes to profiles table
    - Add `subscription_tier` enum column ('free', 'bronze', 'silver', 'gold')
    - Add `premium_features_enabled` boolean for testing override
    - Add `subscription_expires_at` timestamptz for subscription expiry
    - Default tier is 'free'

  2. Purpose
    - Enable premium features (like account sharing)
    - Support future payment integration
    - Allow testing with premium_features_enabled flag
*/

-- Create enum for subscription tiers
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'bronze', 'silver', 'gold');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add subscription columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier subscription_tier DEFAULT 'free' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'premium_features_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_features_enabled boolean DEFAULT true NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
END $$;

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

/*
  # Comprehensive Subscription System

  1. Changes to Profiles Table
    - Add `account_tier` (text) - 'core' or 'plus'
    - Add `subscription_plan` (text) - 'bronze', 'silver', 'gold'
    - Add `max_employees` (integer) - employee limit based on plan
    - Add `can_track_attendance` (boolean) - attendance tracking feature
    - Add `can_access_full_statements` (boolean) - full statement access
    - Add `subscription_expires_at` (timestamptz) - subscription expiry date
    - Add `subscription_status` (text) - 'active', 'expired', 'cancelled'

  2. Default Values
    - Core accounts start with Bronze (2 employees, limited features)
    - Plus accounts start with Bronze (2 employees, limited features)
    - Account tier determined by account_type initially

  3. Subscription Plans Matrix
    
    CORE (Record Holder) ACCOUNT:
    - Bronze (FREE): 2 employees, limited features, no attendance, no full statements
    - Silver (PAID): 3 employees, attendance tracking, yearly statements only
    - Gold (PREMIUM): Unlimited employees, all features including full statements
    
    PLUS (Normal) ACCOUNT:
    - Bronze (FREE): 2 employees, limited features, no attendance, no full statements
    - Silver (PAID): 3 employees, attendance tracking, yearly statements only
    - Gold (PREMIUM): Unlimited employees, all features including full statements
    
    Users can upgrade from Core to Plus account by paying.

  4. Security
    - Maintains existing RLS policies
*/

-- Add subscription columns to profiles table
DO $$
BEGIN
  -- Add account_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_tier text DEFAULT 'core' CHECK (account_tier IN ('core', 'plus'));
  END IF;

  -- Add subscription_plan column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan text DEFAULT 'bronze' CHECK (subscription_plan IN ('bronze', 'silver', 'gold'));
  END IF;

  -- Add max_employees column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'max_employees'
  ) THEN
    ALTER TABLE profiles ADD COLUMN max_employees integer DEFAULT 2;
  END IF;

  -- Add can_track_attendance column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'can_track_attendance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN can_track_attendance boolean DEFAULT false;
  END IF;

  -- Add can_access_full_statements column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'can_access_full_statements'
  ) THEN
    ALTER TABLE profiles ADD COLUMN can_access_full_statements boolean DEFAULT false;
  END IF;

  -- Add subscription_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;

  -- Add subscription_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'cancelled'));
  END IF;
END $$;

-- Set account_tier based on account_type (record holder = core, normal = plus)
UPDATE profiles
SET account_tier = CASE
  WHEN account_type = 'record_holder' THEN 'core'
  WHEN account_type IS NOT NULL THEN 'plus'
  ELSE 'core'
END
WHERE account_tier IS NULL OR account_tier = 'core';

-- Create function to update subscription features based on plan
CREATE OR REPLACE FUNCTION update_subscription_features()
RETURNS TRIGGER AS $$
BEGIN
  -- Bronze plan (FREE) - both Core and Plus
  IF NEW.subscription_plan = 'bronze' THEN
    NEW.max_employees := 2;
    NEW.can_track_attendance := false;
    NEW.can_access_full_statements := false;
  
  -- Silver plan (PAID) - both Core and Plus
  ELSIF NEW.subscription_plan = 'silver' THEN
    NEW.max_employees := 3;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := false;
  
  -- Gold plan (PREMIUM) - both Core and Plus
  ELSIF NEW.subscription_plan = 'gold' THEN
    NEW.max_employees := 999999;
    NEW.can_track_attendance := true;
    NEW.can_access_full_statements := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update features when subscription plan changes
DROP TRIGGER IF EXISTS update_subscription_features_trigger ON profiles;
CREATE TRIGGER update_subscription_features_trigger
  BEFORE INSERT OR UPDATE OF subscription_plan ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_features();

-- Update existing profiles to have correct features based on their plan
UPDATE profiles
SET subscription_plan = subscription_plan;

-- Create subscription_transactions table for tracking upgrades and payments
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('upgrade_to_plus', 'plan_upgrade', 'plan_downgrade', 'renewal')),
  from_tier text,
  to_tier text,
  from_plan text,
  to_plan text,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  transaction_date timestamptz DEFAULT now() NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on subscription_transactions
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can view all transactions
CREATE POLICY "Admins can view all subscription transactions"
  ON subscription_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own transactions
CREATE POLICY "Users can view own subscription transactions"
  ON subscription_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can insert transactions (for manual upgrades via admin panel)
CREATE POLICY "Admins can insert subscription transactions"
  ON subscription_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_user_id ON subscription_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_date ON subscription_transactions(transaction_date DESC);

-- Enable realtime for subscription_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE subscription_transactions;

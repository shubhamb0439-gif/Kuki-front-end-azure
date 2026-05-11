/*
  # Account Linking and Referral System

  1. New Tables
    - `account_links`
      - `id` (uuid, primary key)
      - `primary_account_id` (uuid, foreign key to profiles) - The account that owns the subscription
      - `linked_account_id` (uuid, foreign key to profiles) - The account that is linked/sharing
      - `link_type` (text) - Type: 'family', 'team', 'referral'
      - `status` (text) - Status: 'pending', 'active', 'rejected', 'cancelled'
      - `referral_code` (text, unique) - Unique code used for linking
      - `shares_subscription` (boolean) - Whether the linked account shares premium benefits
      - `created_at` (timestamptz)
      - `accepted_at` (timestamptz)

    - `referral_rewards`
      - `id` (uuid, primary key)
      - `referrer_id` (uuid, foreign key to profiles) - Who referred
      - `referred_id` (uuid, foreign key to profiles) - Who was referred
      - `referral_code` (text)
      - `reward_type` (text) - Type: 'discount', 'free_month', 'bonus'
      - `reward_value` (numeric)
      - `status` (text) - Status: 'pending', 'claimed', 'expired'
      - `created_at` (timestamptz)
      - `claimed_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to view their own links
    - Add policies for managing account links
    - Add policies for viewing referral rewards

  3. Functions
    - Function to generate unique referral codes
    - Function to check if user has premium access (direct or through linked account)
*/

-- Create account_links table
CREATE TABLE IF NOT EXISTS account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_account_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  linked_account_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  link_type text NOT NULL CHECK (link_type IN ('family', 'team', 'referral')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'cancelled')),
  referral_code text UNIQUE NOT NULL,
  shares_subscription boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(primary_account_id, linked_account_id)
);

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code text NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('discount', 'free_month', 'bonus', 'points')),
  reward_value numeric DEFAULT 0,
  reward_description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at timestamptz DEFAULT now(),
  claimed_at timestamptz
);

-- Enable RLS
ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for account_links

-- Users can view links where they are primary or linked account
CREATE POLICY "Users can view their account links"
  ON account_links
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = primary_account_id OR
    auth.uid() = linked_account_id
  );

-- Users can create links for their own account
CREATE POLICY "Users can create account links"
  ON account_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = primary_account_id);

-- Users can update their own links (accept/reject/cancel)
CREATE POLICY "Users can update their account links"
  ON account_links
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = primary_account_id OR
    auth.uid() = linked_account_id
  )
  WITH CHECK (
    auth.uid() = primary_account_id OR
    auth.uid() = linked_account_id
  );

-- Users can delete their own links
CREATE POLICY "Users can delete their account links"
  ON account_links
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = primary_account_id OR
    auth.uid() = linked_account_id
  );

-- Admin policies for account_links
CREATE POLICY "Admin can view all account links"
  ON account_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all account links"
  ON account_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for referral_rewards

-- Users can view their own referral rewards
CREATE POLICY "Users can view their referral rewards"
  ON referral_rewards
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = referrer_id OR
    auth.uid() = referred_id
  );

-- System can insert referral rewards (we'll use service role for this)
CREATE POLICY "Service can create referral rewards"
  ON referral_rewards
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own rewards (to claim them)
CREATE POLICY "Users can claim their referral rewards"
  ON referral_rewards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);

-- Admin policies for referral_rewards
CREATE POLICY "Admin can view all referral rewards"
  ON referral_rewards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all referral rewards"
  ON referral_rewards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text || user_id::text || now()::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM account_links WHERE referral_code = code) INTO exists;

    -- If code doesn't exist, return it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Function to check if user has premium access (direct or through linked account)
CREATE OR REPLACE FUNCTION check_premium_access_with_links(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_premium boolean;
BEGIN
  -- Check if user has direct premium access
  SELECT (subscription_plan IN ('silver', 'gold') AND subscription_status = 'active')
  INTO has_premium
  FROM profiles
  WHERE id = user_id;

  IF has_premium THEN
    RETURN true;
  END IF;

  -- Check if user is linked to an account with premium access
  SELECT EXISTS (
    SELECT 1
    FROM account_links al
    JOIN profiles p ON p.id = al.primary_account_id
    WHERE al.linked_account_id = user_id
      AND al.status = 'active'
      AND al.shares_subscription = true
      AND p.subscription_plan IN ('silver', 'gold')
      AND p.subscription_status = 'active'
  ) INTO has_premium;

  RETURN has_premium;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_links_primary ON account_links(primary_account_id);
CREATE INDEX IF NOT EXISTS idx_account_links_linked ON account_links(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_account_links_code ON account_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_account_links_status ON account_links(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred ON referral_rewards(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);

-- Enable realtime for account_links
ALTER PUBLICATION supabase_realtime ADD TABLE account_links;
/*
  # Payment Requests and Manual Subscription Upgrades

  1. New Tables
    - `payment_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `plan` (text) - requested subscription plan
      - `amount` (numeric) - payment amount
      - `payment_method` (text) - 'paisa_waise', 'razorpay', 'manual'
      - `payment_proof` (text) - optional URL to payment proof
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `notes` (text) - admin notes
      - `requested_at` (timestamptz)
      - `processed_at` (timestamptz)
      - `processed_by` (uuid, references profiles)

  2. Updates to profiles table
    - Add `is_manual_upgrade` boolean - flags accounts upgraded manually
    - Add `manual_upgrade_note` text - admin note for manual upgrades
    - Add `upgrade_highlighted` boolean - red highlight for manually upgraded accounts

  3. Security
    - Enable RLS on all new tables
    - Users can create and view their own payment requests
    - Only admins can approve/reject payment requests
    - Only admins can see all payment requests
*/

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('free', 'plus', 'business', 'premium')),
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('paisa_waise', 'razorpay', 'manual')),
  payment_proof text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  notes text,
  requested_at timestamptz DEFAULT now() NOT NULL,
  processed_at timestamptz,
  processed_by uuid REFERENCES profiles(id)
);

-- Add manual upgrade fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_manual_upgrade'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_manual_upgrade boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'manual_upgrade_note'
  ) THEN
    ALTER TABLE profiles ADD COLUMN manual_upgrade_note text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'upgrade_highlighted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN upgrade_highlighted boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'payment_gateway_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN payment_gateway_settings jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Payment Requests Policies

-- Users can insert their own payment requests
CREATE POLICY "Users can create own payment requests"
  ON payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own payment requests
CREATE POLICY "Users can view own payment requests"
  ON payment_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all payment requests
CREATE POLICY "Admins can view all payment requests"
  ON payment_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update payment requests (approve/reject)
CREATE POLICY "Admins can update payment requests"
  ON payment_requests FOR UPDATE
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

-- Enable realtime for payment requests
ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requested_at ON payment_requests(requested_at DESC);
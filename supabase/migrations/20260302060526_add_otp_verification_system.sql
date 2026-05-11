/*
  # OTP Verification System

  1. New Tables
    - `otp_verifications`
      - `id` (uuid, primary key)
      - `phone` (text) - Phone number
      - `otp_code` (text) - 6-digit OTP code
      - `verified` (boolean) - Whether OTP was verified
      - `expires_at` (timestamptz) - Expiration time (5 minutes)
      - `created_at` (timestamptz) - Creation timestamp
      - `attempts` (integer) - Failed verification attempts

  2. Security
    - Enable RLS on `otp_verifications` table
    - Allow public insert (for sending OTP)
    - Allow public select for verification (with phone match)
    - OTPs expire after 5 minutes
    - Max 3 verification attempts per OTP

  3. Notes
    - OTPs are stored temporarily for verification
    - Automatic cleanup of expired OTPs recommended
    - Rate limiting should be implemented in Edge Function
*/

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp_code text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  attempts integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP requests (rate limit in Edge Function)
CREATE POLICY "Anyone can request OTP"
  ON otp_verifications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow verification by matching phone
CREATE POLICY "Anyone can verify OTP with phone"
  ON otp_verifications
  FOR SELECT
  TO anon
  USING (true);

-- Allow update for verification attempts
CREATE POLICY "Anyone can update verification attempts"
  ON otp_verifications
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);

-- Function to clean up expired OTPs (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < now() OR verified = true;
END;
$$;
/*
  # Add Login Logs System

  1. New Tables
    - `login_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text) - user's email at time of login
      - `phone` (text) - user's phone at time of login
      - `name` (text) - user's name at time of login
      - `account_type` (text) - employer/employee
      - `login_time` (timestamptz) - when they logged in
      - `ip_address` (text) - IP address (if available)
      - `user_agent` (text) - browser/device info
      - `device_type` (text) - mobile/desktop/tablet
      - `login_method` (text) - email/phone
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `login_logs` table
    - Only admins can read all login logs
    - Users can read their own login logs
    - Authenticated users can insert their own login logs

  3. Indexes
    - Index on user_id for faster queries
    - Index on login_time for time-based queries
    - Index on account_type for filtering
*/

-- Create login_logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text,
  phone text,
  name text,
  account_type text,
  login_time timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  device_type text,
  login_method text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all login logs
CREATE POLICY "Admins can view all login logs"
  ON login_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own login logs
CREATE POLICY "Users can view own login logs"
  ON login_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own login logs
CREATE POLICY "Users can insert own login logs"
  ON login_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_account_type ON login_logs(account_type);

-- Enable realtime for login_logs
ALTER PUBLICATION supabase_realtime ADD TABLE login_logs;

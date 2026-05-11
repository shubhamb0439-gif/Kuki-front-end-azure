/*
  # Add Plan Change Requests System

  1. New Tables
    - `plan_change_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `current_plan` (text)
      - `requested_plan` (text)
      - `reason` (text, optional)
      - `status` (text: pending, approved, rejected)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `reviewed_by` (uuid, references profiles - admin who reviewed)
      - `reviewed_at` (timestamptz)

  2. Security
    - Enable RLS on `plan_change_requests` table
    - Users can insert their own requests
    - Users can view their own requests
    - Admins can view all requests
    - Admins can update request status
*/

CREATE TABLE IF NOT EXISTS plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_plan text NOT NULL,
  requested_plan text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz
);

ALTER TABLE plan_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own plan change requests
CREATE POLICY "Users can create own plan change requests"
  ON plan_change_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own plan change requests"
  ON plan_change_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all plan change requests"
  ON plan_change_requests
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can update request status
CREATE POLICY "Admins can update plan change requests"
  ON plan_change_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Enable realtime for plan change requests
ALTER PUBLICATION supabase_realtime ADD TABLE plan_change_requests;
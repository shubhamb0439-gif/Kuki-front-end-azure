/*
  # Create Advertisements System

  1. New Tables
    - `advertisements`
      - `id` (uuid, primary key)
      - `title` (text) - Ad title/name
      - `description` (text, optional) - Ad description
      - `video_url` (text) - Video URL (YouTube, Vimeo, or direct video link)
      - `is_active` (boolean) - Whether the ad is currently active
      - `created_by` (uuid) - Admin who created the ad
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `advertisements` table
    - Admins can manage all ads (insert, update, delete)
    - All authenticated users can view active ads
    - Public users cannot access ads

  3. Features
    - Admins can add video ads with title and description
    - Admins can toggle ads active/inactive
    - Only active ads will be shown to users
    - Track who created each ad for accountability
*/

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Admins can view all ads
CREATE POLICY "Admins can view all ads"
  ON advertisements FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can insert ads
CREATE POLICY "Admins can insert ads"
  ON advertisements FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can update ads
CREATE POLICY "Admins can update ads"
  ON advertisements FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admins can delete ads
CREATE POLICY "Admins can delete ads"
  ON advertisements FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- All authenticated users can view active ads
CREATE POLICY "Users can view active ads"
  ON advertisements FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_advertisements_created_at ON advertisements(created_at DESC);

-- Enable realtime for advertisements
ALTER PUBLICATION supabase_realtime ADD TABLE advertisements;

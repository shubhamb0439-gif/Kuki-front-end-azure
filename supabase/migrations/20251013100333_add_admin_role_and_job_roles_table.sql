/*
  # Add Admin Role and Job Roles Management

  1. Schema Changes
    - Update profiles table to support 'admin' role
    - Create job_roles table for managing available professions
    
  2. New Tables
    - `job_roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - The job role/profession name (e.g., Driver, Cook)
      - `description` (text) - Optional description of the role
      - `is_active` (boolean) - Whether the role is currently available
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  3. Security
    - Enable RLS on job_roles table
    - Allow all authenticated users to read job_roles
    - Only admins can insert, update, or delete job_roles
    - Add RLS policy for admin-only access to certain features
    
  4. Initial Data
    - Populate job_roles with common professions
*/

-- Create job_roles table
CREATE TABLE IF NOT EXISTS job_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on job_roles
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active job roles
CREATE POLICY "Anyone can view active job roles"
  ON job_roles
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can insert job roles
CREATE POLICY "Admins can insert job roles"
  ON job_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update job roles
CREATE POLICY "Admins can update job roles"
  ON job_roles
  FOR UPDATE
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

-- Only admins can delete job roles (soft delete by setting is_active = false is recommended)
CREATE POLICY "Admins can delete job roles"
  ON job_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert common job roles
INSERT INTO job_roles (name, description, is_active) VALUES
  ('Driver', 'Professional driver for personal or commercial transport', true),
  ('Cook', 'Culinary professional for meal preparation', true),
  ('Gardener', 'Landscape and garden maintenance specialist', true),
  ('Housekeeper', 'Residential cleaning and maintenance professional', true),
  ('Nanny', 'Childcare professional', true),
  ('Security Guard', 'Property and personal security professional', true),
  ('Electrician', 'Electrical systems installation and repair', true),
  ('Plumber', 'Plumbing systems installation and repair', true),
  ('Carpenter', 'Woodwork and furniture construction', true),
  ('Painter', 'Interior and exterior painting specialist', true)
ON CONFLICT (name) DO NOTHING;

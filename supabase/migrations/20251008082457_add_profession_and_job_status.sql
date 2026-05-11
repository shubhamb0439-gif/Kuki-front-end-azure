/*
  # Add Profession and Job Status Features

  1. Changes to Tables
    - Add `profession` column to profiles table (employee's profession)
    - Add `job_status` column to profiles table (looking_for_job, working, looking_for_helper, personal)
    - Add `show_status_ring` column to profiles table (boolean to show/hide status ring)
    - Create `job_postings` table for employer job listings
    
  2. New Tables
    - `job_postings`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, foreign key to profiles)
      - `profession` (text, type of work needed)
      - `title` (text, job title)
      - `description` (text, job description)
      - `status` (text, active/filled/cancelled)
      - `created_at` (timestamp)
      
  3. Security
    - Enable RLS on `job_postings` table
    - Add policies for authenticated users to manage their job postings
*/

-- Add profession and job status fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profession'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profession text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'job_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_status text DEFAULT 'working';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'show_status_ring'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_status_ring boolean DEFAULT true;
  END IF;
END $$;

-- Create job_postings table
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  profession text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on job_postings
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- Policies for job_postings
CREATE POLICY "Authenticated users can view active job postings"
  ON job_postings FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Employers can insert their own job postings"
  ON job_postings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own job postings"
  ON job_postings FOR UPDATE
  TO authenticated
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own job postings"
  ON job_postings FOR DELETE
  TO authenticated
  USING (auth.uid() = employer_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_postings_employer ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_profession ON job_postings(profession);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_profiles_profession ON profiles(profession);

/*
  # Add Jobs and Applications System

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `location` (text)
      - `hourly_rate` (decimal)
      - `job_type` (text: full-time, part-time, contract)
      - `status` (text: active, closed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `job_applications`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `applicant_id` (uuid, references profiles)
      - `employer_id` (uuid, references profiles)
      - `status` (text: pending, accepted, rejected)
      - `message` (text, optional message from applicant)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Employers can create, view, and manage their own jobs
    - Job seekers can view active jobs and apply
    - Users can view their own applications
    - Employers can view applications for their jobs

  3. Indexes
    - Add indexes for better query performance
*/

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  hourly_rate decimal(10, 2) NOT NULL,
  job_type text DEFAULT 'full-time' NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract')),
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'closed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(job_id, applicant_id)
);

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Jobs Policies
CREATE POLICY "Anyone can view active jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Employers can view their own jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = employer_id);

-- Job Applications Policies
CREATE POLICY "Applicants can view their own applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = applicant_id);

CREATE POLICY "Employers can view applications for their jobs"
  ON job_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

CREATE POLICY "Job seekers can create applications"
  ON job_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Employers can update applications for their jobs"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = employer_id)
  WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Applicants can delete their own applications"
  ON job_applications FOR DELETE
  TO authenticated
  USING (auth.uid() = applicant_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_employer ON job_applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
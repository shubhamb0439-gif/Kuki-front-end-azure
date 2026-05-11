/*
  # Allow Employers to View Job Applicants' Profiles

  1. Changes
    - Add RLS policy to allow employers to read profiles of users who have applied to their job postings
    
  2. Security
    - Employers can only see profiles of users who have submitted applications to their jobs
    - This is necessary for employers to review applicants in the Messages section
*/

CREATE POLICY "Employers can read job applicants profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM job_applications
      WHERE job_applications.applicant_id = profiles.id
      AND job_applications.employer_id = auth.uid()
    )
  );

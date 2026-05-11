/*
  # Fix job postings access for employers
  
  Allow employers to view and manage all their own job postings regardless of status.
  This fixes the issue where employers cannot delete (update status) their job postings.
  
  ## Changes
  - Add policy for employers to SELECT their own job postings (all statuses)
  
  ## Security
  - Employers can only see their own job postings
  - Other users can still only see active job postings
*/

-- Add policy for employers to view all their own job postings
CREATE POLICY "Employers can view their own job postings"
  ON job_postings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

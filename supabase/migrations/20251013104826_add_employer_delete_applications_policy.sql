/*
  # Allow Employers to Delete Job Applications

  1. Changes
    - Add RLS policy to allow employers to delete job applications for their job postings
    
  2. Security
    - Employers can only delete applications where they are the employer
    - This enables the "Clear Messages" functionality for employers
*/

CREATE POLICY "Employers can delete applications for their jobs"
  ON job_applications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = employer_id);

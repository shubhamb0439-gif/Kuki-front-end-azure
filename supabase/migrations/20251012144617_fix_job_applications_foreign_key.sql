/*
  # Fix Job Applications Foreign Key

  1. Changes
    - Drop the existing foreign key constraint from job_applications.job_id to jobs table
    - Add new foreign key constraint from job_applications.job_id to job_postings table
    - This fixes the issue where employees apply to job_postings but the messages page was looking for jobs

  2. Notes
    - The job_applications table should reference job_postings, not jobs
    - This allows employers to see applications in their messages when employees apply
*/

-- Drop the old foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_applications_job_id_fkey'
    AND table_name = 'job_applications'
  ) THEN
    ALTER TABLE job_applications DROP CONSTRAINT job_applications_job_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint pointing to job_postings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_applications_job_posting_id_fkey'
    AND table_name = 'job_applications'
  ) THEN
    ALTER TABLE job_applications 
    ADD CONSTRAINT job_applications_job_posting_id_fkey 
    FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE;
  END IF;
END $$;
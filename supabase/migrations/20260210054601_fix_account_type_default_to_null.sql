/*
  # Fix Account Type Default Value

  1. Changes
    - Remove default value from account_type column
    - Set it to NULL so new employers must select their account type
    - Only applies to employers
    
  2. Purpose
    - Ensure employers see the account type selection page after signup
    - Allow proper onboarding flow
*/

-- Remove default value and set existing 'normal' accounts to NULL for employers who haven't made a choice
ALTER TABLE profiles ALTER COLUMN account_type DROP DEFAULT;

-- For testing: Set existing employer accounts without explicit selection back to NULL
-- This allows them to select their account type on next login
UPDATE profiles 
SET account_type = NULL 
WHERE role = 'employer' 
AND account_type = 'normal' 
AND id NOT IN (
  SELECT DISTINCT employer_id 
  FROM employees 
  WHERE employer_id IS NOT NULL
);
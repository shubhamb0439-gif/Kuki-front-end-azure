/*
  # Add Admin Role Support

  1. Changes
    - Drop existing role check constraint
    - Add new role check constraint that includes 'admin'

  2. Security
    - Maintains RLS policies for profiles table
    - Admin profile will be created when admin signs up
*/

-- Drop the existing role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new role constraint that includes 'admin'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['employer'::text, 'employee'::text, 'admin'::text]));
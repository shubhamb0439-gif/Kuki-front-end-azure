/*
  # Add Admin Role Support

  1. Changes
    - Drop existing role check constraint
    - Add new role check constraint that includes 'admin'
    - Insert admin profile for existing admin auth user

  2. Security
    - Maintains RLS policies for profiles table
*/

-- Drop the existing role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new role constraint that includes 'admin'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['employer'::text, 'employee'::text, 'admin'::text]));

-- Insert admin profile if it doesn't exist
INSERT INTO profiles (id, email, name, role)
VALUES ('f698e091-40fc-4d83-a8a7-01a4a923b8ff', 'admin@gmail.com', 'Admin', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', name = 'Admin';

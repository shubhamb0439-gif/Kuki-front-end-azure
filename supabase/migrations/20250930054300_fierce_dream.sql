/*
  # Create user profiles and employee management schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `name` (text)
      - `role` (text, employer/employee)
      - `profile_photo` (text, optional)
      - `created_at` (timestamp)
    - `employees`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `employer_id` (uuid, references profiles)
      - `email` (text)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Employers can view/manage their employees
    - Employees can view their employer relationship
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employer', 'employee')),
  profile_photo text,
  created_at timestamptz DEFAULT now()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, employer_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for employees
CREATE POLICY "Employers can read their employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

CREATE POLICY "Employees can read their employer relationship"
  ON employees
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Employees can create their employer relationship"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Employers can manage their employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (employer_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_employees_employer_id ON employees(employer_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
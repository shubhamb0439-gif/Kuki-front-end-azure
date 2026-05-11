/*
  # Add Employee Ratings System
  
  1. New Tables
    - `employee_ratings`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees)
      - `employer_id` (uuid, foreign key to profiles)
      - `rating` (integer, 1-5 stars)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `employee_ratings` table
    - Employers can create ratings for their employees
    - Employees can view ratings they received
    - Anyone can read ratings (for search/ranking)
*/

-- Create employee_ratings table
CREATE TABLE IF NOT EXISTS employee_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, employer_id)
);

-- Enable RLS
ALTER TABLE employee_ratings ENABLE ROW LEVEL SECURITY;

-- Employers can create ratings for their employees
CREATE POLICY "Employers can rate their employees"
  ON employee_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_ratings.employee_id
      AND employees.employer_id = auth.uid()
    )
  );

-- Employers can update their own ratings
CREATE POLICY "Employers can update own ratings"
  ON employee_ratings FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- Anyone authenticated can read ratings (for search/ranking)
CREATE POLICY "Anyone can read ratings"
  ON employee_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Create attendance table
CREATE TABLE IF NOT EXISTS employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  attendance_date date DEFAULT CURRENT_DATE NOT NULL,
  marked_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Enable RLS
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

-- Employees can create their own attendance
CREATE POLICY "Employees can mark own attendance"
  ON employee_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_attendance.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Employers can view attendance of their employees
CREATE POLICY "Employers can view employee attendance"
  ON employee_attendance FOR SELECT
  TO authenticated
  USING (
    employer_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_attendance.employee_id
      AND employees.user_id = auth.uid()
    )
  );
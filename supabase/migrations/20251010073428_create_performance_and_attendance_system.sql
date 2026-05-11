/*
  # Performance and Attendance System

  1. New Tables
    - `performance_ratings`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references profiles)
      - `employee_id` (uuid, references profiles)
      - `rating_date` (date)
      - `rating` (integer, 0-5)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `attendance_records`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references profiles)
      - `employee_id` (uuid, references profiles)
      - `attendance_date` (date)
      - `status` (text: 'present', 'absent', 'leave', 'sick_leave')
      - `scanned_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Employers can create/view ratings for their employees
    - Employees can view their own ratings
    - Employers can create/view attendance for their employees
    - Employees can view and update their own attendance

  3. Indexes
    - Add indexes for performance queries
    - Add indexes for attendance queries
*/

-- Create performance_ratings table
CREATE TABLE IF NOT EXISTS performance_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating_date date NOT NULL,
  rating integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employer_id, employee_id, rating_date)
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'leave', 'sick_leave')),
  scanned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employer_id, employee_id, attendance_date)
);

-- Enable RLS
ALTER TABLE performance_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Performance Ratings Policies
CREATE POLICY "Employers can create ratings for their employees"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = employer_id AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = performance_ratings.employee_id
    )
  );

CREATE POLICY "Employers can view ratings for their employees"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = employer_id OR
    auth.uid() = employee_id
  );

CREATE POLICY "Employers can update ratings for their employees"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = employer_id AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = performance_ratings.employee_id
    )
  );

-- Attendance Records Policies
CREATE POLICY "Employers can create attendance for their employees"
  ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = employer_id AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = attendance_records.employee_id
    )
  );

CREATE POLICY "Users can view their attendance records"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = employer_id OR
    auth.uid() = employee_id
  );

CREATE POLICY "Employees can update their own attendance"
  ON attendance_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employers can update their employees attendance"
  ON attendance_records
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = employer_id AND
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.employer_id = auth.uid()
      AND employees.user_id = attendance_records.employee_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_employer_date 
  ON performance_ratings(employer_id, rating_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_employee_date 
  ON performance_ratings(employee_id, rating_date DESC);

-- Create indexes for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employer_date 
  ON attendance_records(employer_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
  ON attendance_records(employee_id, attendance_date DESC);

/*
  # Add Employer Ratings System

  1. New Tables
    - `employer_ratings`
      - `id` (uuid, primary key)
      - `employer_id` (uuid, references profiles.id) - The employer being rated
      - `employee_id` (uuid, references profiles.id) - The employee giving the rating
      - `rating` (integer, 1-5 stars)
      - `comment` (text, optional) - Employee's comment about employer
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `employer_ratings` table
    - Employees can insert ratings for their linked employers
    - Employees can view their own given ratings
    - Employees can update their own ratings
    - Employers can view ratings given to them
    - Everyone (authenticated) can view ratings to calculate averages

  3. Indexes
    - Index on employer_id for fast average calculation
    - Index on employee_id for finding employee's ratings
    - Unique constraint on (employer_id, employee_id) - one rating per employee-employer pair
*/

-- Create employer_ratings table
CREATE TABLE IF NOT EXISTS employer_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employer_id, employee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employer_ratings_employer_id ON employer_ratings(employer_id);
CREATE INDEX IF NOT EXISTS idx_employer_ratings_employee_id ON employer_ratings(employee_id);

-- Enable RLS
ALTER TABLE employer_ratings ENABLE ROW LEVEL SECURITY;

-- Employees can insert ratings for their linked employers
CREATE POLICY "Employees can rate their employers"
  ON employer_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = employee_id
      AND employees.employer_id = employer_id
    )
  );

-- Employees can view their own given ratings
CREATE POLICY "Employees can view own ratings"
  ON employer_ratings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id);

-- Employers can view ratings given to them
CREATE POLICY "Employers can view their ratings"
  ON employer_ratings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = employer_id);

-- Employees can update their own ratings
CREATE POLICY "Employees can update own ratings"
  ON employer_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id)
  WITH CHECK (auth.uid() = employee_id);

-- Everyone can view all ratings for average calculation
CREATE POLICY "Anyone can view ratings for averages"
  ON employer_ratings
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE employer_ratings;
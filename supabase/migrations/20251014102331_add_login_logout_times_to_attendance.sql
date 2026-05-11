/*
  # Add Login and Logout Times to Attendance Records
  
  1. Changes to attendance_records table
    - Add `login_time` (timestamptz) - when employee checks in
    - Add `logout_time` (timestamptz) - when employee checks out
    - Add `total_hours` (numeric) - auto-calculated hours worked
    
  2. Purpose
    - Track exact login and logout times for attendance
    - QR scan toggles between login (first scan) and logout (second scan)
    - Calculate total hours worked per day
    
  3. Security
    - Maintain existing RLS policies
    - Fields are optional with NULL defaults
    
  4. Behavior
    - First scan of the day → Sets login_time
    - Second scan of the day → Sets logout_time and calculates total_hours
    - Status remains 'present' for both scans
*/

-- Add login_time, logout_time, and total_hours to attendance_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'login_time'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN login_time timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'logout_time'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN logout_time timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'total_hours'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN total_hours numeric;
  END IF;
END $$;

-- Create index for faster queries on attendance_date
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee ON attendance_records(employee_id, attendance_date);
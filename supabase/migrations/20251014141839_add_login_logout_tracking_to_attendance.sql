/*
  # Add Login/Logout Time Tracking to Attendance Records
  
  1. Changes
    - Add `login_time` column to attendance_records for first scan of the day
    - Add `logout_time` column to attendance_records for second scan
    - Add `total_hours` computed column for work duration (logout - login)
    
  2. Purpose
    - Enable automatic login/logout detection based on scan sequence
    - Calculate total work hours for each day
    - Store timestamps in UTC, display in local timezone
    
  3. Notes
    - First scan: records login_time
    - Second scan: records logout_time and calculates total_hours
    - If employee logs in but doesn't log out, logout_time remains NULL
    - Total hours calculated as: (logout_time - login_time) in decimal format
*/

-- Add time tracking columns to attendance_records
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
    ALTER TABLE attendance_records ADD COLUMN total_hours numeric(5,2);
  END IF;
END $$;

-- Create index for faster queries on attendance_date
CREATE INDEX IF NOT EXISTS idx_attendance_records_date 
ON attendance_records(attendance_date);

-- Create index for faster queries on employee_id and date
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date 
ON attendance_records(employee_id, attendance_date);

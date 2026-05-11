/*
  # Add Attendance Tracking to QR Transactions

  1. Changes
    - Add `login_time` column to track when employee logs in
    - Add `logout_time` column to track when employee logs out
    - Add `total_hours` column to calculate work duration
    - These fields will be used for attendance tracking via QR scans
    
  2. Purpose
    - Simplify attendance tracking by using existing qr_transactions table
    - Avoid RLS policy complications with attendance_records
    - Each scan creates/updates a qr_transaction with time tracking
    
  3. Notes
    - First scan of the day: creates record with login_time
    - Second scan: updates same record with logout_time and calculates total_hours
    - Employees already have INSERT and UPDATE permissions on qr_transactions
*/

-- Add attendance time tracking columns to qr_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_transactions' AND column_name = 'login_time'
  ) THEN
    ALTER TABLE qr_transactions ADD COLUMN login_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_transactions' AND column_name = 'logout_time'
  ) THEN
    ALTER TABLE qr_transactions ADD COLUMN logout_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_transactions' AND column_name = 'total_hours'
  ) THEN
    ALTER TABLE qr_transactions ADD COLUMN total_hours numeric(5,2);
  END IF;
END $$;
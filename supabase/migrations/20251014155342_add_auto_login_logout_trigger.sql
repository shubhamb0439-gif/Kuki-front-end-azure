/*
  # Automatic Login/Logout Time Trigger
  
  1. Purpose
    - Automatically set login_time from scanned_at on first scan (when login_time is NULL)
    - Automatically set logout_time from scanned_at on second scan (when login_time exists but logout_time is NULL)
    - Calculate total_hours automatically when logout_time is set
    
  2. How it works
    - When a record is inserted with scanned_at, copy it to login_time
    - When a record is updated with scanned_at and login_time exists but logout_time is NULL, set logout_time and calculate total_hours
    
  3. Notes
    - This trigger ensures login/logout times are always recorded when scanned_at is set
    - Works automatically without requiring frontend changes
*/

-- Create function to handle login/logout times
CREATE OR REPLACE FUNCTION handle_attendance_scan()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: Set login_time from scanned_at
  IF TG_OP = 'INSERT' THEN
    IF NEW.scanned_at IS NOT NULL AND NEW.login_time IS NULL THEN
      NEW.login_time := NEW.scanned_at;
    END IF;
    RETURN NEW;
  END IF;
  
  -- On UPDATE: Handle login or logout
  IF TG_OP = 'UPDATE' THEN
    -- If login_time is NULL and scanned_at is being set, this is a login
    IF NEW.scanned_at IS NOT NULL AND NEW.login_time IS NULL THEN
      NEW.login_time := NEW.scanned_at;
    
    -- If login_time exists, logout_time is NULL, and scanned_at is being updated, this is a logout
    ELSIF NEW.login_time IS NOT NULL AND NEW.logout_time IS NULL AND NEW.scanned_at IS NOT NULL AND NEW.scanned_at != OLD.scanned_at THEN
      NEW.logout_time := NEW.scanned_at;
      
      -- Calculate total hours
      NEW.total_hours := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 3600.0;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS attendance_scan_trigger ON attendance_records;

-- Create trigger
CREATE TRIGGER attendance_scan_trigger
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_attendance_scan();

-- Update existing records to set login_time from scanned_at where login_time is NULL
UPDATE attendance_records
SET login_time = scanned_at
WHERE login_time IS NULL AND scanned_at IS NOT NULL;

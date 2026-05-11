/*
  # Fix attendance trigger to respect explicitly set login/logout times

  The existing trigger was overriding login_time on INSERT even when both
  login_time and logout_time were explicitly provided (used for past-date
  reimbursement QR scans). This migration updates the trigger so it only
  auto-fills times when they are not already set.

  Changes:
  - On INSERT: only set login_time from scanned_at if BOTH login_time AND logout_time are NULL
  - On UPDATE: only set logout_time from scanned_at if logout_time is still NULL after the update
    (i.e., don't override an explicitly provided logout_time)
*/

CREATE OR REPLACE FUNCTION handle_attendance_scan()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only auto-set login_time if neither login_time nor logout_time are explicitly provided
    IF NEW.scanned_at IS NOT NULL AND NEW.login_time IS NULL AND NEW.logout_time IS NULL THEN
      NEW.login_time := NEW.scanned_at;
    END IF;

    -- If both times are explicitly set, calculate total_hours if missing
    IF NEW.login_time IS NOT NULL AND NEW.logout_time IS NOT NULL AND NEW.total_hours IS NULL THEN
      NEW.total_hours := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 3600.0;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- If login_time is still NULL, auto-set from scanned_at
    IF NEW.scanned_at IS NOT NULL AND NEW.login_time IS NULL AND NEW.logout_time IS NULL THEN
      NEW.login_time := NEW.scanned_at;

    -- Auto-set logout only if: login exists, logout is still NULL after this update,
    -- and scanned_at actually changed (second scan)
    ELSIF NEW.login_time IS NOT NULL AND NEW.logout_time IS NULL AND NEW.scanned_at IS NOT NULL AND NEW.scanned_at != OLD.scanned_at THEN
      NEW.logout_time := NEW.scanned_at;
      NEW.total_hours := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 3600.0;
    END IF;

    -- If both times are explicitly set, recalculate total_hours if missing
    IF NEW.login_time IS NOT NULL AND NEW.logout_time IS NOT NULL AND NEW.total_hours IS NULL THEN
      NEW.total_hours := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 3600.0;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS attendance_scan_trigger ON attendance_records;

CREATE TRIGGER attendance_scan_trigger
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_attendance_scan();

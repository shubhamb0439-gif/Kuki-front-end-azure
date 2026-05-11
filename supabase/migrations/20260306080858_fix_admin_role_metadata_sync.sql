/*
  # Fix Admin Role Metadata Sync

  1. Changes
    - Create function to sync admin role to JWT app_metadata
    - Create trigger to automatically update app_metadata when profile role is set to admin
    - Update existing admin users to have correct app_metadata
  
  2. Security
    - Function runs with security definer to access auth.users
    - Only updates app_metadata when role is admin
*/

-- Function to sync admin role to JWT metadata
CREATE OR REPLACE FUNCTION sync_admin_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is admin, update the auth.users app_metadata
  IF NEW.role = 'admin' THEN
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync admin role on insert or update
DROP TRIGGER IF EXISTS sync_admin_role_trigger ON profiles;
CREATE TRIGGER sync_admin_role_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION sync_admin_role_to_jwt();

-- Update all existing admin profiles to have correct app_metadata
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
    WHERE id = admin_record.id;
  END LOOP;
END $$;

/*
  # Add Ads Control to Profiles

  1. Changes
    - Add `ads_enabled` column to profiles table
    - Default value is true (ads are shown by default)
    - Admin can toggle this to control ad visibility per user
  
  2. Security
    - No RLS changes needed - existing policies handle access
    - Only admins can modify this field through the admin panel
*/

-- Add ads_enabled column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ads_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ads_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.ads_enabled IS 'Controls whether ads are displayed for this user. Managed by admin.';

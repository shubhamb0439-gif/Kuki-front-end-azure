/*
  # Create Admin Account Setup

  1. Purpose
    - Prepare the database for admin account creation
    - Add a function to automatically set role to 'admin' for admin@gmail.com
    
  2. Changes
    - Create a trigger function that sets role to 'admin' for admin@gmail.com
    - This ensures when the admin signs up, they automatically get admin role
    
  3. Security
    - Only applies to the specific admin email
    - Automatically grants admin privileges on signup
*/

-- Create a function to auto-assign admin role
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If the email is admin@gmail.com, set role to admin
  IF NEW.email = 'admin@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert on profiles
DROP TRIGGER IF EXISTS assign_admin_role_trigger ON profiles;
CREATE TRIGGER assign_admin_role_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_role();

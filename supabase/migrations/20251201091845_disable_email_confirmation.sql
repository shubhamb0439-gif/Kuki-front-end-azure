/*
  # Disable Email Confirmation Requirement

  1. Changes
    - Creates a trigger to automatically confirm email addresses when users sign up
    - Updates existing unconfirmed users to be confirmed
    
  2. Security
    - This is safe because the application handles authentication without requiring email confirmation
    - Phone number users are already using generated email addresses
*/

-- Function to auto-confirm email on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email immediately upon user creation
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm emails
DROP TRIGGER IF EXISTS on_auth_user_created_confirm_email ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- Update all existing unconfirmed users
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;
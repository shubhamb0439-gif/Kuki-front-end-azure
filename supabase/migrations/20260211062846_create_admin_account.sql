/*
  # Create Admin Account

  1. Changes
    - Creates admin user in auth.users with proper password encryption
    - Creates corresponding profile entry with admin role
    - Uses proper UUID and secure password hashing

  2. Security
    - Password: Admin123
    - Email: admin@gmail.com
    - Role: admin
*/

-- Create a function to create the admin user with proper password hashing
DO $$
DECLARE
  admin_user_id uuid := 'f698e091-40fc-4d83-a8a7-01a4a923b8ff';
  admin_email text := 'admin@gmail.com';
  admin_password text := 'Admin123';
  encrypted_pw text;
BEGIN
  -- Generate encrypted password using Supabase's auth schema extension
  encrypted_pw := crypt(admin_password, gen_salt('bf'));
  
  -- Insert into auth.users if not exists
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    encrypted_pw,
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    encrypted_password = encrypted_pw,
    email = admin_email,
    email_confirmed_at = NOW(),
    updated_at = NOW();

  -- Insert into profiles if not exists
  INSERT INTO profiles (
    id,
    email,
    name,
    role,
    currency,
    preferred_language,
    created_at,
    updated_at
  )
  VALUES (
    admin_user_id,
    admin_email,
    'Admin',
    'admin',
    'USD',
    'en',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    email = admin_email,
    name = 'Admin',
    updated_at = NOW();
    
END $$;

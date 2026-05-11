/*
  # Add Account Linking Enhancements
  
  1. Schema Changes
    - Add `access_type` column to account_links table (read_only, read_write)
    - Add `link_token` column for secure account linking via tokens
    - Add `expires_at` column for link token expiration
    - Add index on link_token for faster lookups
  
  2. Security
    - Update RLS policies to respect access_type permissions
    - Add policy for token-based account linking
*/

-- Add new columns to account_links table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_links' AND column_name = 'access_type'
  ) THEN
    ALTER TABLE account_links 
    ADD COLUMN access_type text DEFAULT 'read_write' CHECK (access_type IN ('read_only', 'read_write'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_links' AND column_name = 'link_token'
  ) THEN
    ALTER TABLE account_links 
    ADD COLUMN link_token text UNIQUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_links' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE account_links 
    ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- Create index on link_token
CREATE INDEX IF NOT EXISTS idx_account_links_link_token ON account_links(link_token);

-- Function to generate secure link tokens
CREATE OR REPLACE FUNCTION generate_account_link_token(
  owner_id uuid,
  access_level text DEFAULT 'read_write'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token text;
  link_id uuid;
  expires timestamp with time zone;
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  
  -- Set expiration to 7 days from now
  expires := now() + interval '7 days';
  
  -- Insert the account link with pending status
  INSERT INTO account_links (
    primary_account_id,
    linked_account_id,
    link_type,
    status,
    referral_code,
    access_type,
    link_token,
    expires_at
  ) VALUES (
    owner_id,
    owner_id, -- Will be updated when accepted
    'shared_account',
    'pending',
    substring(token from 1 for 8), -- Use part of token as referral code
    access_level,
    token,
    expires
  )
  RETURNING id INTO link_id;
  
  RETURN jsonb_build_object(
    'token', token,
    'link_id', link_id,
    'expires_at', expires,
    'access_type', access_level
  );
END;
$$;

-- Function to accept account link via token
CREATE OR REPLACE FUNCTION accept_account_link(
  token text,
  accepter_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_record record;
BEGIN
  -- Find the link by token
  SELECT * INTO link_record
  FROM account_links
  WHERE link_token = token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired token');
  END IF;
  
  -- Check if accepter is not the same as owner
  IF link_record.primary_account_id = accepter_id THEN
    RETURN jsonb_build_object('error', 'Cannot link to your own account');
  END IF;
  
  -- Update the link
  UPDATE account_links
  SET linked_account_id = accepter_id,
      status = 'active',
      accepted_at = now()
  WHERE id = link_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'primary_account_id', link_record.primary_account_id,
    'access_type', link_record.access_type
  );
END;
$$;

-- Add RLS policy for viewing linked account data based on access type
CREATE POLICY "Linked accounts can view primary account employees based on access"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_links
      WHERE account_links.linked_account_id = auth.uid()
        AND account_links.primary_account_id = employees.employer_id
        AND account_links.status = 'active'
    )
  );

-- Add RLS policy for modifying linked account data (only if read_write access)
CREATE POLICY "Linked accounts with write access can modify primary account employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_links
      WHERE account_links.linked_account_id = auth.uid()
        AND account_links.primary_account_id = employees.employer_id
        AND account_links.status = 'active'
        AND account_links.access_type = 'read_write'
    )
  );

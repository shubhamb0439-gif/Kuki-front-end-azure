/*
  # Allow Null Linked Account for Pending Invites

  1. Problem
    - linked_account_id is currently NOT NULL
    - When creating an invite link, we don't yet know who will join
    - This causes unique constraint violations when trying to create invite links

  2. Solution
    - Make linked_account_id nullable
    - Update unique constraint to only apply when linked_account_id is not null
    - This allows multiple pending invites from the same user

  3. Security
    - Maintain data integrity with conditional unique constraint
    - Only enforce uniqueness when accounts are actually linked
*/

-- Drop the existing unique constraint
ALTER TABLE account_links 
  DROP CONSTRAINT IF EXISTS account_links_primary_account_id_linked_account_id_key;

-- Make linked_account_id nullable
ALTER TABLE account_links 
  ALTER COLUMN linked_account_id DROP NOT NULL;

-- Add a new unique constraint that only applies when linked_account_id is not null
-- This allows multiple pending invites but prevents duplicate active links
CREATE UNIQUE INDEX account_links_active_unique 
  ON account_links (primary_account_id, linked_account_id) 
  WHERE linked_account_id IS NOT NULL;

-- Add a unique constraint on link_token to prevent duplicate tokens
CREATE UNIQUE INDEX IF NOT EXISTS account_links_link_token_unique 
  ON account_links (link_token) 
  WHERE link_token IS NOT NULL;

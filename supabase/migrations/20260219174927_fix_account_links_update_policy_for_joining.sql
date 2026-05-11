/*
  # Fix Account Links Update Policy for Joining

  1. Problem
    - When a user tries to join with a code, they need to update the account_link record
    - Current UPDATE policy only allows primary_account_id or linked_account_id
    - But when joining, linked_account_id is still NULL, so the update fails

  2. Solution
    - Allow users to SELECT pending links by link_token (to find the link to join)
    - Allow users to UPDATE records where status is 'pending' (to accept the link)
    - This enables the join flow while maintaining security

  3. Security
    - Users can only update pending links (not active ones without being part of it)
    - Once a link becomes active, only the actual participants can update it
*/

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their account links" ON account_links;

-- Create new update policy that allows:
-- 1. Primary or linked account holders to update their active links
-- 2. Any authenticated user to update pending links (to join with code)
CREATE POLICY "Users can update account links"
  ON account_links
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = primary_account_id) OR 
    (auth.uid() = linked_account_id) OR
    (status = 'pending')
  )
  WITH CHECK (
    (auth.uid() = primary_account_id) OR 
    (auth.uid() = linked_account_id)
  );

-- Also need to allow users to SELECT pending links by link_token
-- Drop the existing select policy
DROP POLICY IF EXISTS "Users can view their account links" ON account_links;

-- Create new select policy that allows:
-- 1. Users to view links they're part of
-- 2. Any authenticated user to view pending links (to verify code before joining)
CREATE POLICY "Users can view account links"
  ON account_links
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = primary_account_id) OR 
    (auth.uid() = linked_account_id) OR
    (status = 'pending')
  );

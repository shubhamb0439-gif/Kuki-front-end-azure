/*
  # Allow Linked Account Members to Read Each Other's Profiles

  ## Problem
  When two accounts are linked via account_links, the joining user sees "Unknown User"
  because there is no RLS policy on the profiles table that permits cross-account reads
  between linked users. The Supabase join (account_links -> profiles) silently returns
  null for name/profile_photo when RLS blocks the nested read.

  ## Changes
  1. Add SELECT policy on profiles: allow a user to read any profile that shares an
     active account_link with them (as either primary or linked party).

  ## Security
  - Only applies when status = 'active' in account_links
  - Read-only (SELECT) — no write access granted
  - Uses auth.uid() — only authenticated users benefit
*/

CREATE POLICY "Linked account members can read each other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_links
      WHERE status = 'active'
        AND (
          (primary_account_id = auth.uid() AND linked_account_id = profiles.id)
          OR
          (linked_account_id = auth.uid() AND primary_account_id = profiles.id)
        )
    )
  );

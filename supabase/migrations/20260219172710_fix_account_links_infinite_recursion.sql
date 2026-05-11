/*
  # Fix Infinite Recursion in Account Links Policies

  1. Problem
    - Admin policies on account_links query the profiles table to check admin role
    - This creates circular dependency when profiles policies reference account_links (via employees table)
    - Chain: profiles → employees → account_links → profiles → infinite loop

  2. Solution
    - Replace admin policies on account_links to use JWT app_metadata instead of querying profiles
    - This breaks the circular dependency completely

  3. Security
    - app_metadata cannot be modified by users
    - Only database functions can update it
    - Safe to use for authorization checks
*/

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admin can view all account links" ON account_links;
DROP POLICY IF EXISTS "Admin can manage all account links" ON account_links;

-- Recreate admin policies using JWT app_metadata (no table queries)
CREATE POLICY "Admin can view all account links"
  ON account_links FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin can manage all account links"
  ON account_links FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

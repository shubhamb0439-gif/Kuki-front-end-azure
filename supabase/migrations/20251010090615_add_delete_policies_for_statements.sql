/*
  # Add Delete Policies for Statements

  1. Changes
    - Add DELETE policy for statements table
    - Users can delete their own statements

  2. Security
    - Users can only delete statements where they are the user_id
*/

-- Add delete policy for statements
CREATE POLICY "Users can delete own statements"
  ON statements
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

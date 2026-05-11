/*
  # Enable Realtime for Profiles Table

  1. Changes
    - Enable realtime updates for the profiles table so changes to employee profiles reflect instantly
  
  2. Security
    - No changes to RLS policies, only enabling realtime broadcasts
*/

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

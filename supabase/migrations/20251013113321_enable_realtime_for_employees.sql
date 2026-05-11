/*
  # Enable Realtime for Employees Table

  1. Changes
    - Enable realtime updates for the employees table so employer dashboards update instantly when employees are added
  
  2. Security
    - No changes to RLS policies, only enabling realtime broadcasts
*/

ALTER PUBLICATION supabase_realtime ADD TABLE employees;

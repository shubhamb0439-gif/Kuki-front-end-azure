/*
  # Enable Realtime for Employee Wages

  1. Changes
    - Enable realtime replication for employee_wages table
    - Allows real-time wage updates to be reflected immediately in the UI
  
  2. Purpose
    - When an employer updates an employee's wage, the change is instantly visible
    - Supports live wage management without page refresh
*/

ALTER PUBLICATION supabase_realtime ADD TABLE employee_wages;

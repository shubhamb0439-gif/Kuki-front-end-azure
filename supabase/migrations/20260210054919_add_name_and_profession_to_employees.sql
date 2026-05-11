/*
  # Add Name and Profession to Employees Table

  1. Changes
    - Add `name` column to employees table (for record keeper accounts)
    - Add `profession` column to employees table (for record keeper accounts)
    - These fields allow employers to track employee info without requiring user accounts
    
  2. Purpose
    - Support record keeper account type where employers manually manage employee data
    - Allow storing basic employee information directly in employees table
    - Backwards compatible with existing QR-based employee system
    
  3. Notes
    - For employees with user accounts (user_id is set), name/profession come from profiles
    - For record keeper employees (user_id is NULL), name/profession stored here
*/

-- Add name and profession columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profession text;
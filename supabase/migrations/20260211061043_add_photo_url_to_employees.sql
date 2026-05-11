/*
  # Add Photo URL to Employees Table

  1. Changes
    - Add `photo_url` column to employees table to store employee profile photos
    - This enables employers to upload photos when manually adding employees in record keeper mode
    
  2. Purpose
    - Allow employers to store employee profile photos for visual identification
    - Support photo uploads during manual employee creation
    - Enhance employee records with visual profiles
    
  3. Notes
    - Photo URLs will point to files in the profile_photos storage bucket
    - Optional field - employees can be added without photos
    - Works with existing profile_photos storage bucket and RLS policies
*/

-- Add photo_url column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url text;

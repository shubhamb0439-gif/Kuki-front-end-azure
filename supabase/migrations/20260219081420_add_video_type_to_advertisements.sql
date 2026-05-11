/*
  # Add video type to advertisements table

  1. Changes
    - Add `video_type` column to specify if video is 'url' or 'upload'
    - Add `video_file_path` column for uploaded video files
    - Update existing records to use 'url' type by default
  
  2. Notes
    - `video_url` will be used for YouTube/Vimeo links
    - `video_file_path` will be used for uploaded video files
*/

-- Add video type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertisements' AND column_name = 'video_type'
  ) THEN
    ALTER TABLE advertisements 
    ADD COLUMN video_type text DEFAULT 'url' CHECK (video_type IN ('url', 'upload'));
  END IF;
END $$;

-- Add video file path column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertisements' AND column_name = 'video_file_path'
  ) THEN
    ALTER TABLE advertisements 
    ADD COLUMN video_file_path text;
  END IF;
END $$;

-- Update existing records to use 'url' type
UPDATE advertisements 
SET video_type = 'url' 
WHERE video_type IS NULL;
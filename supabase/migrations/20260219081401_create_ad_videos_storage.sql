/*
  # Create storage bucket for advertisement videos

  1. Storage
    - Create `ad-videos` bucket for storing advertisement video files
    - Enable public access for video playback
    - Set file size limit to 500MB for video files
  
  2. Security
    - Only admins can upload videos
    - Everyone can view videos (public access)
*/

-- Create storage bucket for ad videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-videos',
  'ad-videos',
  true,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload videos
CREATE POLICY "Admins can upload ad videos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ad-videos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update videos
CREATE POLICY "Admins can update ad videos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ad-videos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete videos
CREATE POLICY "Admins can delete ad videos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ad-videos' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow public access to view videos
CREATE POLICY "Anyone can view ad videos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'ad-videos');
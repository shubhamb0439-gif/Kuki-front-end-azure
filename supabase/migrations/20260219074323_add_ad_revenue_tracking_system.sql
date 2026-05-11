/*
  # Add Ad Revenue Tracking System

  1. Schema Changes to `advertisements` Table
    - Add `brand_name` (text) - Company/brand name for the advertisement
    - Add `rate_per_display` (numeric) - Cost per ad display
    - Add `currency` (text) - Currency code (USD, EUR, GBP, etc.)

  2. New Table: `ad_impressions`
    - `id` (uuid, primary key)
    - `ad_id` (uuid) - Reference to advertisement
    - `user_id` (uuid) - User who viewed the ad
    - `viewed_at` (timestamptz) - When the ad was displayed
    
  3. Security
    - Enable RLS on `ad_impressions` table
    - Authenticated users can insert their own impressions
    - Admins can view all impressions
    - Users can view their own impressions
    
  4. Indexes
    - Index on ad_id for fast aggregation queries
    - Index on viewed_at for time-based queries
    
  5. Realtime
    - Enable realtime for ad_impressions table for live revenue updates
*/

-- Add new columns to advertisements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertisements' AND column_name = 'brand_name'
  ) THEN
    ALTER TABLE advertisements ADD COLUMN brand_name text NOT NULL DEFAULT 'Unknown Brand';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertisements' AND column_name = 'rate_per_display'
  ) THEN
    ALTER TABLE advertisements ADD COLUMN rate_per_display numeric(10, 2) NOT NULL DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertisements' AND column_name = 'currency'
  ) THEN
    ALTER TABLE advertisements ADD COLUMN currency text NOT NULL DEFAULT 'USD';
  END IF;
END $$;

-- Create ad_impressions table
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- Enable RLS on ad_impressions
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own impressions
CREATE POLICY "Users can record their ad views"
  ON ad_impressions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all impressions
CREATE POLICY "Admins can view all impressions"
  ON ad_impressions FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Users can view their own impressions
CREATE POLICY "Users can view own impressions"
  ON ad_impressions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_viewed_at ON ad_impressions(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);

-- Create composite index for brand revenue calculations
CREATE INDEX IF NOT EXISTS idx_advertisements_brand_active ON advertisements(brand_name, is_active);

-- Enable realtime for ad_impressions
ALTER PUBLICATION supabase_realtime ADD TABLE ad_impressions;
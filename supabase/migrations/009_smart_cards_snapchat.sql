-- Smart Cards data storage and social media fields

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS snapchat_url text,
  ADD COLUMN IF NOT EXISTS smart_cards_data jsonb DEFAULT '{}';

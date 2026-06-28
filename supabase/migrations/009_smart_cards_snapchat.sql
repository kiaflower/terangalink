-- Smart Cards data storage and Snapchat social field

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS snapchat_url text,
  ADD COLUMN IF NOT EXISTS smart_cards_data jsonb DEFAULT '{}';

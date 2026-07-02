-- Add 'paid' status to the order_status enum (between pending and delivered)
-- and a paid_at timestamp to track when payment was confirmed

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid' BEFORE 'delivered';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- generateOrderNumber() (src/app/api/orders/route.ts) computes the next
-- order_number from COUNT(*) per restaurant and only retries on a unique-
-- constraint violation (23505) — but no such constraint existed, so two
-- customers checking out around the same time could silently get the same
-- order_number. /c/[slug]/[order_number] then resolves to whichever row
-- Postgres returns first, showing one customer the other's order/tracking
-- page. This migration renumbers the existing duplicates (oldest order in
-- each group keeps its number, newer ones get fresh numbers appended after
-- the restaurant's current max) and adds the constraint so it can't recur.

WITH ranked AS (
  SELECT
    id,
    restaurant_id,
    ROW_NUMBER() OVER (PARTITION BY restaurant_id, order_number ORDER BY created_at ASC) AS rn
  FROM app.orders
),
dupes AS (
  SELECT id, restaurant_id, ROW_NUMBER() OVER (PARTITION BY restaurant_id ORDER BY id) AS seq
  FROM ranked
  WHERE rn > 1
),
restaurant_max AS (
  SELECT restaurant_id, MAX(substring(order_number FROM 4)::int) AS max_num
  FROM app.orders
  GROUP BY restaurant_id
)
UPDATE app.orders o
SET order_number = 'TL-' || lpad((rm.max_num + d.seq)::text, 6, '0')
FROM dupes d
JOIN restaurant_max rm ON rm.restaurant_id = d.restaurant_id
WHERE o.id = d.id;

ALTER TABLE app.orders
  ADD CONSTRAINT orders_restaurant_id_order_number_key UNIQUE (restaurant_id, order_number);

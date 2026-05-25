-- ============================================================
-- TerangaLink — Restaurant order system metadata
-- Run in Supabase SQL Editor
-- ============================================================

alter table public.orders
  add column if not exists payment_method text default 'cash'
    check (payment_method in ('cash', 'wave', 'orange_money'));

create index if not exists idx_orders_restaurant_status_created
  on public.orders(restaurant_id, status, created_at desc);

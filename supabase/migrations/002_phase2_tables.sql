-- ============================================================
-- MenuLink Phase 2 — Menu, Items, Orders
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- ─── Table: menu_categories ──────────────────────────────────────────────────
create table if not exists public.menu_categories (
  id            uuid default uuid_generate_v4() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  position      integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Table: menu_items ────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id            uuid default uuid_generate_v4() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid references public.menu_categories(id) on delete set null,
  name          text not null,
  description   text,
  price         integer not null default 0, -- in FCFA, stored as integer
  image_url     text,
  is_available  boolean not null default true,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Table: orders ────────────────────────────────────────────────────────────
do $$ begin
  create type order_status as enum ('pending', 'preparing', 'ready', 'delivered', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.orders (
  id              uuid default uuid_generate_v4() primary key,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  customer_name   text,
  customer_phone  text,
  items           jsonb not null default '[]',
  total           integer not null default 0, -- in FCFA
  status          order_status not null default 'pending',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Updated_at triggers ─────────────────────────────────────────────────────
create or replace trigger menu_categories_updated_at
  before update on public.menu_categories
  for each row execute function handle_updated_at();

create or replace trigger menu_items_updated_at
  before update on public.menu_items
  for each row execute function handle_updated_at();

create or replace trigger orders_updated_at
  before update on public.orders
  for each row execute function handle_updated_at();

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_menu_categories_restaurant_id on public.menu_categories(restaurant_id);
create index if not exists idx_menu_items_restaurant_id on public.menu_items(restaurant_id);
create index if not exists idx_menu_items_category_id on public.menu_items(category_id);
create index if not exists idx_orders_restaurant_id on public.orders(restaurant_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

-- menu_categories: public read for active items (for restaurant pages)
create policy "menu_categories: public can read active"
  on public.menu_categories for select
  using (is_active = true);

create policy "menu_categories: admin can manage own"
  on public.menu_categories for all
  using (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "menu_categories: super_admin full access"
  on public.menu_categories for all
  using (public.get_my_role() = 'super_admin');

-- menu_items: public read for available items
create policy "menu_items: public can read available"
  on public.menu_items for select
  using (is_available = true);

create policy "menu_items: admin can manage own"
  on public.menu_items for all
  using (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "menu_items: super_admin full access"
  on public.menu_items for all
  using (public.get_my_role() = 'super_admin');

-- orders: restaurant admin can manage their own orders
create policy "orders: admin can manage own"
  on public.orders for all
  using (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

-- orders: anyone can insert (customers placing orders)
create policy "orders: anyone can insert"
  on public.orders for insert
  with check (true);

create policy "orders: super_admin full access"
  on public.orders for all
  using (public.get_my_role() = 'super_admin');

-- ─── Supabase Storage: menu-images bucket ────────────────────────────────────
-- Run this separately if needed:
-- insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true);
-- create policy "menu-images: public read" on storage.objects for select using (bucket_id = 'menu-images');
-- create policy "menu-images: auth upload" on storage.objects for insert with check (bucket_id = 'menu-images' and auth.role() = 'authenticated');
-- create policy "menu-images: auth delete" on storage.objects for delete using (bucket_id = 'menu-images' and auth.role() = 'authenticated');

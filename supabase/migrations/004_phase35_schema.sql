-- ============================================================
-- TerangaLink Phase 3.5 — Thèmes, livraison, horaires
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── Thème restaurant ────────────────────────────────────────────────────────
alter table public.restaurants
  add column if not exists theme_mode text default 'dark' check (theme_mode in ('dark', 'light')),
  add column if not exists accent_color text default '#F97316',
  add column if not exists button_color text default '#F97316',
  add column if not exists whatsapp_number text,
  add column if not exists latitude decimal,
  add column if not exists longitude decimal,
  add column if not exists delivery_zones jsonb default '[]',
  add column if not exists opening_hours jsonb default '{}',
  add column if not exists primary_color text default '#F97316',
  add column if not exists background_color text default '#0F0F0F',
  add column if not exists banner_url text,
  add column if not exists delivery_fee integer default 0,
  add column if not exists show_delivery_fee boolean default false,
  add column if not exists is_demo boolean default false;

-- ─── Profiles ────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists phone_number text;

-- ─── Analytics ───────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id            uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  event_type    text not null,
  item_id       uuid references public.menu_items(id) on delete set null,
  item_name     text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_analytics_restaurant_id on public.analytics_events(restaurant_id);
create index if not exists idx_analytics_event_type on public.analytics_events(event_type);
create index if not exists idx_analytics_created_at on public.analytics_events(created_at desc);

alter table public.analytics_events enable row level security;

create policy "analytics: anyone can insert"
  on public.analytics_events for insert with check (true);

create policy "analytics: admin can read own"
  on public.analytics_events for select
  using (public.get_my_role() = 'restaurant_admin' and restaurant_id = public.get_my_restaurant_id());

create policy "analytics: super_admin full access"
  on public.analytics_events for all
  using (public.get_my_role() = 'super_admin');

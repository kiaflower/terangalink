-- ============================================================
-- TerangaLink Phase 4 — New plan names + theme columns
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── Update subscription_plan enum to include new names ───────────────────────
-- Add new values if they don't exist
do $$ begin
  alter type subscription_plan add value if not exists 'mensuel';
exception when others then null;
end $$;

do $$ begin
  alter type subscription_plan add value if not exists 'trimestriel';
exception when others then null;
end $$;

do $$ begin
  alter type subscription_plan add value if not exists 'annuel';
exception when others then null;
end $$;

-- ─── Add theme columns to restaurants ────────────────────────────────────────
alter table public.restaurants
  add column if not exists theme_mode text default 'dark' check (theme_mode in ('dark', 'light')),
  add column if not exists primary_color text default '#F97316',
  add column if not exists background_color text default '#0F0F0F',
  add column if not exists accent_color text default '#F97316',
  add column if not exists button_color text default '#F97316',
  add column if not exists banner_url text,
  add column if not exists whatsapp_number text,
  add column if not exists delivery_fee integer default 0,
  add column if not exists show_delivery_fee boolean default false,
  add column if not exists opening_hours jsonb default '{}',
  add column if not exists delivery_zones jsonb default '[]',
  add column if not exists latitude decimal,
  add column if not exists longitude decimal,
  add column if not exists is_demo boolean default false;

-- ─── Add phone_number to profiles ────────────────────────────────────────────
alter table public.profiles
  add column if not exists phone_number text;

-- ─── Analytics events table ───────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id            uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  event_type    text not null,
  item_id       uuid references public.menu_items(id) on delete set null,
  item_name     text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_analytics_restaurant on public.analytics_events(restaurant_id);
create index if not exists idx_analytics_type on public.analytics_events(event_type);
create index if not exists idx_analytics_date on public.analytics_events(created_at desc);

alter table public.analytics_events enable row level security;

create policy "analytics: public insert" on public.analytics_events
  for insert with check (true);

create policy "analytics: admin read own" on public.analytics_events
  for select using (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "analytics: super_admin all" on public.analytics_events
  for all using (public.get_my_role() = 'super_admin');

-- ─── Update existing subscriptions to new plan names ─────────────────────────
-- Maps: starter→mensuel, pro→trimestriel, enterprise→annuel, trial→mensuel
-- Note: This requires the enum values to exist first (done above)
-- Run manually if needed:
-- UPDATE subscriptions SET plan = 'mensuel' WHERE plan IN ('starter', 'trial');
-- UPDATE subscriptions SET plan = 'trimestriel' WHERE plan = 'pro';
-- UPDATE subscriptions SET plan = 'annuel' WHERE plan = 'enterprise';

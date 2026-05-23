-- ============================================================
-- MenuLink SaaS - Phase 1 Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('super_admin', 'restaurant_admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type subscription_plan as enum ('starter', 'pro', 'enterprise');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type subscription_status as enum ('active', 'trial', 'suspended', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- ─── Table: restaurants ────────────────────────────────────────────────────────
create table if not exists public.restaurants (
  id            uuid default uuid_generate_v4() primary key,
  name          text not null,
  slug          text not null unique,
  description   text,
  logo_url      text,
  cover_url     text,
  phone         text,
  address       text,
  city          text,
  cuisine_type  text,
  is_active     boolean not null default true,
  is_verified   boolean not null default false,
  owner_id      uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Table: profiles ──────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  role          user_role not null default 'restaurant_admin',
  restaurant_id uuid references public.restaurants(id) on delete set null,
  avatar_url    text,
  phone         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Table: subscriptions ─────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id            uuid default uuid_generate_v4() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  plan          subscription_plan not null default 'starter',
  status        subscription_status not null default 'trial',
  started_at    timestamptz not null default now(),
  ends_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id)
);

-- ─── Updated_at trigger function ──────────────────────────────────────────────
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger restaurants_updated_at
  before update on public.restaurants
  for each row execute function handle_updated_at();

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute function handle_updated_at();

create or replace trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function handle_updated_at();

-- ─── Auto-create profile on new auth user ─────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'restaurant_admin')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Helper: get current user role ───────────────────────────────────────────
create or replace function public.get_my_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ─── Helper: get current user restaurant_id ──────────────────────────────────
create or replace function public.get_my_restaurant_id()
returns uuid as $$
  select restaurant_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- Row Level Security Policies
-- ============================================================

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.subscriptions enable row level security;

-- ─── Profiles RLS ────────────────────────────────────────────────────────────

-- Users can read their own profile
create policy "profiles: users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Super admins can read all profiles
create policy "profiles: super_admin can read all"
  on public.profiles for select
  using (public.get_my_role() = 'super_admin');

-- Users can update their own profile
create policy "profiles: users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Super admin can update any profile
create policy "profiles: super_admin can update all"
  on public.profiles for update
  using (public.get_my_role() = 'super_admin');

-- Super admin can insert profiles (for creating admins)
create policy "profiles: super_admin can insert"
  on public.profiles for insert
  with check (public.get_my_role() = 'super_admin');

-- ─── Restaurants RLS ─────────────────────────────────────────────────────────

-- Anyone (even anon) can read active restaurants (for public ordering pages)
create policy "restaurants: public can read active"
  on public.restaurants for select
  using (is_active = true);

-- Super admin can read all restaurants
create policy "restaurants: super_admin can read all"
  on public.restaurants for select
  using (public.get_my_role() = 'super_admin');

-- Restaurant admin can read their own restaurant
create policy "restaurants: admin can read own"
  on public.restaurants for select
  using (
    public.get_my_role() = 'restaurant_admin'
    and id = public.get_my_restaurant_id()
  );

-- Super admin can insert restaurants
create policy "restaurants: super_admin can insert"
  on public.restaurants for insert
  with check (public.get_my_role() = 'super_admin');

-- Super admin can update any restaurant
create policy "restaurants: super_admin can update"
  on public.restaurants for update
  using (public.get_my_role() = 'super_admin');

-- Restaurant admin can update their own restaurant
create policy "restaurants: admin can update own"
  on public.restaurants for update
  using (
    public.get_my_role() = 'restaurant_admin'
    and id = public.get_my_restaurant_id()
  );

-- ─── Subscriptions RLS ───────────────────────────────────────────────────────

-- Super admin can manage all subscriptions
create policy "subscriptions: super_admin full access"
  on public.subscriptions for all
  using (public.get_my_role() = 'super_admin');

-- Restaurant admin can read their own subscription
create policy "subscriptions: admin can read own"
  on public.subscriptions for select
  using (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

-- ============================================================
-- Indexes for performance
-- ============================================================

create index if not exists idx_profiles_restaurant_id on public.profiles(restaurant_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_restaurants_slug on public.restaurants(slug);
create index if not exists idx_restaurants_owner_id on public.restaurants(owner_id);
create index if not exists idx_subscriptions_restaurant_id on public.subscriptions(restaurant_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- ============================================================
-- Super Admin Seed
-- Run AFTER creating the super admin user via Supabase Auth Dashboard
-- Replace the UUID below with your actual super admin user UUID
-- ============================================================

-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create:
--    Email: rokhayagueye0330@gmail.com
--    Password: (your password)
-- 3. Copy the generated UUID
-- 4. Run this update with the correct UUID:
--
-- update public.profiles
-- set role = 'super_admin', full_name = 'Super Admin'
-- where email = 'rokhayagueye0330@gmail.com';
--
-- OR if the trigger hasn't run yet, insert manually:
--
-- insert into public.profiles (id, email, full_name, role)
-- values ('<USER_UUID_HERE>', 'rokhayagueye0330@gmail.com', 'Rokh Admin', 'super_admin');

-- ============================================================
-- TerangaLink Phase 6 — Ensure cascade deletes are in place
-- Run in Supabase SQL Editor
-- ============================================================

-- Make sure all tables cascade-delete when restaurant is deleted.
-- These are safe to run even if constraints already exist.

-- subscriptions already has ON DELETE CASCADE from Phase 1
-- menu_categories already has ON DELETE CASCADE from Phase 2
-- menu_items already has ON DELETE CASCADE from Phase 2
-- orders already has ON DELETE CASCADE from Phase 2
-- analytics_events already has ON DELETE CASCADE from Phase 3

-- This migration just verifies + adds missing indexes for performance

create index if not exists idx_profiles_role_restaurant
  on public.profiles(role, restaurant_id);

create index if not exists idx_restaurants_is_active
  on public.restaurants(is_active);

create index if not exists idx_restaurants_is_demo
  on public.restaurants(is_demo);

-- Allow super_admin to delete restaurants via RLS
create policy "restaurants: super_admin can delete"
  on public.restaurants for delete
  using (public.get_my_role() = 'super_admin');

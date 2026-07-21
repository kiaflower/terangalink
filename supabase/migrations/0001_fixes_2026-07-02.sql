-- TerangaSpot — migration du 2026-07-02
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- ============================================================
-- 1. Accès complet super_admin (corrige impersonation + sync
--    dashboard boutique <-> super-admin)
-- ============================================================

create or replace function is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

do $$
declare
  t text;
  tables text[] := array[
    'boutiques', 'products', 'product_variants', 'product_categories',
    'orders', 'order_items', 'reviews', 'boost_requests', 'promo_codes',
    'subscriptions', 'payments', 'analytics_events'
  ];
begin
  foreach t in array tables loop
    -- Skip tables that don't exist in this project (some are referenced
    -- defensively elsewhere in the app but were never actually created).
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format(
      'drop policy if exists super_admin_full_access on %I;', t
    );
    execute format(
      'create policy super_admin_full_access on %I for all using (is_super_admin()) with check (is_super_admin());', t
    );
  end loop;
end $$;

-- ============================================================
-- 2. Colonne manquante pour le suivi de confirmation des boosts
-- ============================================================

alter table boost_requests
  add column if not exists confirmation_sent_at timestamptz;

-- ============================================================
-- 3. Nouveau modèle de créneaux récurrents (super-admin RDV)
-- ============================================================

create table if not exists recurring_slots (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6), -- 0 = Lundi ... 6 = Dimanche
  start_time time not null,
  duration_minutes int not null default 15,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table recurring_slots enable row level security;

drop policy if exists super_admin_full_access on recurring_slots;
create policy super_admin_full_access on recurring_slots
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists public_read_active_slots on recurring_slots;
create policy public_read_active_slots on recurring_slots
  for select using (is_active = true);

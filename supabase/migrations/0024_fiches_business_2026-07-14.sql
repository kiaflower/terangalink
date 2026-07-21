-- TerangaSpot — migration du 2026-07-14 (fiches business — bibliothèque éducative pour commerçants)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- ============================================================
-- 1. Catégories de fiches
-- ============================================================

create table if not exists fiche_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null,
  icon text not null,
  sort_order integer not null default 0
);

alter table fiche_categories enable row level security;
drop policy if exists super_admin_full_access on fiche_categories;
create policy super_admin_full_access on fiche_categories
  for all using (is_super_admin()) with check (is_super_admin());

insert into fiche_categories (code, name, color, icon, sort_order) values
  ('MKT', 'Marketing', '#7C3AED', 'megaphone', 1),
  ('VTE', 'Vente', '#059669', 'shopping-bag', 2),
  ('WA', 'WhatsApp Business', '#0891B2', 'message-circle', 3),
  ('FIN', 'Finance', '#D97706', 'wallet', 4),
  ('CLI', 'Service client', '#2563EB', 'headphones', 5),
  ('ORG', 'Organisation', '#DC2626', 'clipboard-list', 6)
on conflict (code) do nothing;

-- ============================================================
-- 2. Numérotation globale séquentielle (jamais réutilisée, même après suppression)
-- ============================================================

create sequence if not exists fiches_numero_seq start with 1;

create or replace function next_fiche_numero() returns integer
language sql security definer set search_path = public as $$
  select nextval('fiches_numero_seq')::integer;
$$;

-- ============================================================
-- 3. Fiches
-- ============================================================

create table if not exists fiches (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default next_fiche_numero(),
  category_id uuid not null references fiche_categories(id) on delete restrict,
  title text not null,
  pitch text not null default '',
  status text not null default 'brouillon' check (status in ('brouillon', 'prete', 'publiee')),
  subtitle text,
  why_it_matters text,
  key_points jsonb not null default '[]'::jsonb,
  example text,
  common_mistake text,
  action_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fiches_category_id_idx on fiches(category_id);
create index if not exists fiches_status_idx on fiches(status);

alter table fiches enable row level security;
drop policy if exists super_admin_full_access on fiches;
create policy super_admin_full_access on fiches
  for all using (is_super_admin()) with check (is_super_admin());

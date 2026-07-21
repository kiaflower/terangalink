-- TerangaSpot — migration du 2026-07-02 (bannières, précommandes, inscriptions)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Note : les créneaux de rendez-vous utilisent déjà la table recurring_slots,
-- créée par 0001_fixes_2026-07-02.sql — rien à ajouter ici pour ça.

-- ============================================================
-- 1. Bannières promotionnelles (plan Pro)
-- ============================================================

create table if not exists boutique_banners (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid references boutiques(id) not null,
  text text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table boutique_banners enable row level security;

drop policy if exists "Public read active banners" on boutique_banners;
create policy "Public read active banners"
on boutique_banners for select using (is_active = true);

drop policy if exists "Boutique admin manage own banners" on boutique_banners;
create policy "Boutique admin manage own banners"
on boutique_banners for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.boutique_id = boutique_banners.boutique_id or profiles.role = 'super_admin')
  )
) with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.boutique_id = boutique_banners.boutique_id or profiles.role = 'super_admin')
  )
);

-- ============================================================
-- 2. Précommandes produit (plan Pro)
-- ============================================================

alter table products add column if not exists preorder_enabled boolean default false;
alter table products add column if not exists preorder_start timestamptz;
alter table products add column if not exists preorder_end timestamptz;
alter table products add column if not exists preorder_delivery_date text;
alter table products add column if not exists preorder_max_qty integer;
alter table products add column if not exists preorder_current_qty integer default 0;

-- ============================================================
-- 3. Inscriptions visibles par le super-admin (formulaire public + lecture admin)
-- ============================================================

alter table inscriptions enable row level security;

drop policy if exists "Super admin read inscriptions" on inscriptions;
create policy "Super admin read inscriptions"
on inscriptions for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'super_admin'
  )
);

drop policy if exists "Public insert inscriptions" on inscriptions;
create policy "Public insert inscriptions"
on inscriptions for insert with check (true);

-- TerangaSpot — migration du 2026-07-02 (Early Access)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

-- ============================================================
-- 1. Candidatures Early Access
-- ============================================================

create table if not exists early_access_applications (
  id uuid primary key default gen_random_uuid(),
  -- Informations boutique
  boutique_name text not null,
  shop_category text not null,
  city text not null,
  description text,
  -- Informations contact
  owner_name text not null,
  email text not null,
  phone text not null,
  whatsapp_number text not null,
  -- Réseaux sociaux
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  snapchat_url text,
  -- Visuels (stockés en Supabase Storage)
  logo_url text,
  cover_url text,
  -- Paiement
  wave_number text,
  orange_money_number text,
  -- Métadonnées
  status text default 'pending' check (status in ('pending', 'contacted', 'confirmed', 'rejected')),
  place_number integer, -- numéro de place (1 à 15)
  notes_admin text,
  created_at timestamptz default now()
);

alter table early_access_applications enable row level security;

drop policy if exists "Public insert early access" on early_access_applications;
create policy "Public insert early access"
on early_access_applications for insert with check (true);

drop policy if exists "Super admin all early access" on early_access_applications;
create policy "Super admin all early access"
on early_access_applications for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

-- ============================================================
-- 2. Configuration Early Access (nombre de places, ouverture)
-- ============================================================

create table if not exists early_access_config (
  id uuid primary key default gen_random_uuid(),
  max_places integer default 15,
  is_open boolean default true,
  launch_date date,
  updated_at timestamptz default now()
);

alter table early_access_config enable row level security;

drop policy if exists "Public read early access config" on early_access_config;
create policy "Public read early access config"
on early_access_config for select using (true);

drop policy if exists "Super admin update early access config" on early_access_config;
create policy "Super admin update early access config"
on early_access_config for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

insert into early_access_config (max_places, is_open)
select 15, true
where not exists (select 1 from early_access_config);

-- ============================================================
-- 3. Liste d'attente pour le lancement officiel
-- ============================================================

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  source text default 'early_access',
  created_at timestamptz default now()
);

alter table waitlist enable row level security;

drop policy if exists "Public insert waitlist" on waitlist;
create policy "Public insert waitlist"
on waitlist for insert with check (true);

drop policy if exists "Super admin read waitlist" on waitlist;
create policy "Super admin read waitlist"
on waitlist for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

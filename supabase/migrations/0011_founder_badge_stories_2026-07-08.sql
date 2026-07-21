-- TerangaSpot — migration du 2026-07-08 (badge fondateur, stories)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- ============================================================
-- 1. Badge fondateur
-- ============================================================

alter table boutiques add column if not exists is_founder boolean not null default false;

-- ============================================================
-- 2. Stories boutique (max 3/jour, expirent après 24h)
-- ============================================================

create table if not exists boutique_stories (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid references boutiques(id) on delete cascade not null,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  product_id uuid references products(id) on delete set null,
  views_count integer not null default 0,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists boutique_stories_boutique_created_idx
  on boutique_stories (boutique_id, created_at);

alter table boutique_stories enable row level security;

drop policy if exists "Public read active stories" on boutique_stories;
create policy "Public read active stories"
on boutique_stories for select using (expires_at > now());

drop policy if exists "Boutique admin manage own stories" on boutique_stories;
create policy "Boutique admin manage own stories"
on boutique_stories for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.boutique_id = boutique_stories.boutique_id or profiles.role = 'super_admin')
  )
) with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.boutique_id = boutique_stories.boutique_id or profiles.role = 'super_admin')
  )
);

-- Vues/likes incrémentés par des visiteurs anonymes (pas de compte client).
-- Une policy UPDATE publique ouvrirait toutes les colonnes (media_url, caption...)
-- à la modification par n'importe quel visiteur : on passe donc par une fonction
-- dédiée (security definer), strictement limitée aux deux colonnes de compteurs.
create or replace function increment_story_counter(story_id uuid, counter_name text, delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if counter_name = 'views_count' then
    update boutique_stories set views_count = greatest(0, views_count + delta)
    where id = story_id and expires_at > now();
  elsif counter_name = 'likes_count' then
    update boutique_stories set likes_count = greatest(0, likes_count + delta)
    where id = story_id and expires_at > now();
  else
    raise exception 'invalid counter_name';
  end if;
end;
$$;

grant execute on function increment_story_counter(uuid, text, int) to anon, authenticated;

-- ============================================================
-- Note manuelle : créer le bucket Storage "boutique-stories" (public,
-- lecture anonyme) dans le Dashboard Supabase, comme "boutique-images"
-- et "product-images" — aucun bucket n'est créé via migration SQL ici.
-- ============================================================

-- TerangaSpot — migration du 2026-07-09 (mot de passe partagé par boutique + rôles admin)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif et idempotent : il ne supprime ni ne modifie de policies existantes.

-- ============================================================
-- 1. Nouvelles colonnes
-- ============================================================

-- Rôle d'un admin de boutique : 'principal' (1er compte créé, seul habilité à
-- changer le mot de passe partagé et gérer les admins secondaires) ou
-- 'secondaire' (jusqu'à 4, plan Pro). NULL pour les profils super_admin.
alter table profiles
  add column if not exists admin_role text check (admin_role in ('principal', 'secondaire'));

-- Bascule à false quand un admin secondaire est supprimé — coupe l'accès de
-- ce compte précisément, vérifié à chaque requête authentifiée.
alter table profiles
  add column if not exists is_active boolean not null default true;

-- Estampillée à boutiques.password_version lors d'un login explicite réussi
-- (voir /api/auth/session-sync). Un mismatch avec boutiques.password_version
-- force une déconnexion immédiate, peu importe la durée de vie du JWT.
alter table profiles
  add column if not exists session_password_version integer not null default 0;

-- Incrémentée à chaque rotation du mot de passe partagé de la boutique.
alter table boutiques
  add column if not exists password_version integer not null default 1;

-- Mot de passe partagé actuel, chiffré au repos (AES-256-GCM, voir
-- src/lib/crypto/secret.ts). Format stocké : "iv:authTag:ciphertext" en
-- base64. NULL tant que le principal n'a jamais changé le mot de passe
-- depuis le déploiement de cette fonctionnalité.
alter table boutiques
  add column if not exists admin_password_enc text;

-- ============================================================
-- 2. Backfill des admin_role pour les boutiques existantes
--    (le 1er admin créé par boutique devient "principal", même
--    convention que /api/auth/forgot-password aujourd'hui)
-- ============================================================

with ranked as (
  select
    id,
    row_number() over (partition by boutique_id order by created_at asc) as rn
  from profiles
  where role = 'boutique_admin' and boutique_id is not null
)
update profiles p
set admin_role = case when ranked.rn = 1 then 'principal' else 'secondaire' end
from ranked
where p.id = ranked.id and p.admin_role is null;

-- ============================================================
-- 3. Fonction security definer pour lister les admins d'une même
--    boutique sans provoquer de récursion RLS sur profiles
-- ============================================================

create or replace function same_boutique(target_boutique_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'boutique_admin'
      and boutique_id = target_boutique_id
  );
$$;

drop policy if exists profiles_boutique_peers_read on profiles;
create policy profiles_boutique_peers_read on profiles
  for select using (same_boutique(boutique_id));

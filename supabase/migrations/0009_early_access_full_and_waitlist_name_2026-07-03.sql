-- TerangaSpot — migration du 2026-07-03
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

-- ============================================================
-- 1. Nom sur la liste d'attente (en plus du téléphone)
-- ============================================================

alter table waitlist add column if not exists name text;

-- ============================================================
-- 2. Parcours Early Access aussi complet que l'inscription normale
--    (offre, personnalisation, parrainage, consentements)
-- ============================================================

alter table early_access_applications add column if not exists plan text default 'starter' check (plan in ('starter', 'pro'));
alter table early_access_applications add column if not exists primary_color text default '#7C3AED';
alter table early_access_applications add column if not exists theme text default 'light';
alter table early_access_applications add column if not exists referral_code text;
alter table early_access_applications add column if not exists partner_offer_type text;
alter table early_access_applications add column if not exists partner_offer_custom text;
alter table early_access_applications add column if not exists consent_images boolean default false;
alter table early_access_applications add column if not exists consent_annuaire boolean default false;
alter table early_access_applications add column if not exists consent_marketing boolean default false;

-- Traçabilité de la création automatique de boutique à la confirmation
alter table early_access_applications add column if not exists created_boutique_id uuid references boutiques(id);
alter table early_access_applications add column if not exists created_admin_password text;

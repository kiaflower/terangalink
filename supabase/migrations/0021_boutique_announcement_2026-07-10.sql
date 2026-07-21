-- TerangaSpot — migration du 2026-07-10 (bannière d'annonce boutique générique)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- Bloc "Annonce" affiché sous le Hero de la vitrine (validation panier Shein,
-- promo, événement, service annexe...). Générique, pas spécifique à un cas
-- d'usage : chaque boutique peut activer/désactiver et changer son image et
-- son titre indépendamment. Une seule annonce active à la fois (pas de
-- carrousel) : announcement_image_url est simplement remplacée quand la
-- boutique change son visuel.
alter table boutiques add column if not exists announcement_enabled boolean not null default false;
alter table boutiques add column if not exists announcement_image_url text;
alter table boutiques add column if not exists announcement_title text;

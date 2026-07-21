-- TerangaSpot — migration du 2026-07-08 (produit mis en avant + badge personnalisé)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

alter table products add column if not exists is_featured boolean not null default false;
alter table products add column if not exists badge_text text;

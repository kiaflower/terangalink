-- ============================================================
-- TerangaLink — Ajout du quartier (neighborhood) au parcours d'inscription
-- ============================================================

alter table public.restaurant_applications add column if not exists neighborhood text;

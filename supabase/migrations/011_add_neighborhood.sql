-- ============================================================
-- TerangaLink — Ajout du quartier (neighborhood) pour le SEO local
-- ============================================================

alter table public.restaurants add column if not exists neighborhood text;

create index if not exists idx_restaurants_neighborhood on public.restaurants(neighborhood);

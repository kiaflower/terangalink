-- ============================================================
-- TerangaLink — Early Access : traçabilité inscription → restaurant créé
-- ============================================================

alter table public.early_access_registrations
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete set null;

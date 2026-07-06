-- ============================================================
-- TerangaLink — Badge Fondateur (Early Access) et Badge Vérifié (mérite)
-- is_founder : offert manuellement aux restaurants Early Access (cercle doré)
-- is_verified : déjà existant, devient le badge "Vérifié" (cercle bleu),
--   activable manuellement ou automatiquement via refresh_verified_badges()
-- ============================================================

alter table public.restaurants
  add column if not exists is_founder boolean not null default false;

-- Un restaurant devient "Vérifié" après 3 mois sur la plateforme, 100 commandes
-- livrées, une note moyenne > 4.5 et au moins 50 avis. Pas de cron disponible
-- sur ce projet : cette fonction est appelée ponctuellement (ex. au chargement
-- de la liste des restaurants côté super-admin), pas en tâche de fond réelle.
create or replace function public.refresh_verified_badges()
returns void as $$
  update public.restaurants r
  set is_verified = true
  where r.is_verified = false
    and r.is_active = true
    and r.created_at <= now() - interval '3 months'
    and (
      select count(*) from public.orders o
      where o.restaurant_id = r.id and o.status = 'delivered'
    ) >= 100
    and (
      select count(*) from public.reviews rv
      where rv.restaurant_id = r.id and rv.is_visible = true
    ) >= 50
    and (
      select avg(rv.rating) from public.reviews rv
      where rv.restaurant_id = r.id and rv.is_visible = true
    ) > 4.5;
$$ language sql security definer;

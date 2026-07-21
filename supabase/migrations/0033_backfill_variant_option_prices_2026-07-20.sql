-- Le formulaire marchand va rendre le prix obligatoire pour chaque option de
-- variante (fin du fallback implicite "option sans prix = prix du produit").
-- Backfill : toute option actuellement sans prix explicite reçoit le prix
-- courant du produit, pour qu'aucune variante ne se retrouve sans prix du
-- jour au lendemain sur les boutiques déjà actives.
update product_variants pv
set option_prices = (
  select coalesce(pv.option_prices, '{}'::jsonb)
    || jsonb_object_agg(opt, to_jsonb(p.price))
  from products p, unnest(pv.options) as opt
  where p.id = pv.product_id
    and not (coalesce(pv.option_prices, '{}'::jsonb) ? opt)
)
where exists (
  select 1 from unnest(pv.options) as opt
  where not (coalesce(pv.option_prices, '{}'::jsonb) ? opt)
);

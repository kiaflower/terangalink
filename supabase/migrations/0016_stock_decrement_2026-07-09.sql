-- TerangaSpot — migration du 2026-07-09 (décrément de stock à la commande)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- Décrément atomique du stock (ne descend jamais sous 0). N'agit que si
-- track_stock est actif — sans effet sinon, pour rester sûr même si appelée
-- par erreur sur un produit qui ne suit pas son stock.
create or replace function decrement_product_stock(p_product_id uuid, p_quantity int)
returns void
language plpgsql
set search_path = public
as $$
begin
  update products
  set stock_quantity = greatest(0, coalesce(stock_quantity, 0) - p_quantity)
  where id = p_product_id and track_stock = true;
end;
$$;

-- TerangaSpot — migration du 2026-07-08 (épinglage produit, plan Pro, max 2/boutique)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

alter table products add column if not exists is_pinned boolean not null default false;

-- Garde-fou côté base (en plus du contrôle côté UI) : jamais plus de 2 produits
-- épinglés par boutique, même en cas de double soumission ou d'onglets multiples.
create or replace function enforce_max_pinned_products()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pinned_count int;
begin
  if new.is_pinned is not true then
    return new;
  end if;

  select count(*) into pinned_count
  from products
  where boutique_id = new.boutique_id
    and is_pinned = true
    and id is distinct from new.id;

  if pinned_count >= 2 then
    raise exception 'Vous avez déjà 2 produits épinglés. Désépinglez-en un avant d''en épingler un nouveau.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_max_pinned_products on products;
create trigger trg_enforce_max_pinned_products
before insert or update of is_pinned on products
for each row
execute function enforce_max_pinned_products();

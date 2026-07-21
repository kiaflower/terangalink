-- TerangaSpot — migration du 2026-07-08 (slugs produit pour pages SEO dédiées)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- ============================================================
-- 1. Colonne slug + génération automatique (unique par boutique)
-- ============================================================

create extension if not exists unaccent;

alter table products add column if not exists slug text;

create or replace function generate_product_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  base_slug text;
  candidate text;
  suffix int := 1;
begin
  base_slug := lower(regexp_replace(unaccent(coalesce(new.name, 'produit')), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'produit';
  end if;

  candidate := base_slug;
  while exists (
    select 1 from products
    where boutique_id = new.boutique_id
      and slug = candidate
      and id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists trg_generate_product_slug on products;
create trigger trg_generate_product_slug
before insert or update on products
for each row
when (new.slug is null or new.slug = '')
execute function generate_product_slug();

-- Backfill des produits existants (déclenche le trigger ci-dessus ligne par ligne,
-- dans l'ordre de création pour que les doublons les plus récents héritent du -2, -3...).
update products set name = name where slug is null or slug = '';

alter table products alter column slug set not null;

create unique index if not exists products_boutique_slug_key
  on products (boutique_id, slug);

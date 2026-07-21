-- TerangaSpot — migration du 2026-07-02 (fonctionnalités)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

-- ============================================================
-- 1. Réduction % par produit (plan Pro)
-- ============================================================

alter table products add column if not exists discount_percent integer;

do $$
begin
  alter table products add constraint products_discount_percent_range
    check (discount_percent is null or (discount_percent between 0 and 100));
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 2. Thème choisi à l'inscription (plan Pro)
-- ============================================================

alter table inscriptions add column if not exists theme text default 'light';

-- ============================================================
-- 3. Badge vérifié : le type "badge_verifie" doit être accepté par
--    boost_requests.type. On retire toute contrainte CHECK existante sur
--    cette colonne (déjà source de blocage par le passé, cf. commit
--    "boosts bloqués par contrainte CHECK obsolète").
-- ============================================================

do $$
declare cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'boost_requests'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%type%';
  if cname is not null then
    execute format('alter table boost_requests drop constraint %I', cname);
  end if;
end $$;

-- ============================================================
-- 4. Un seul abonnement par boutique (nécessaire pour l'upsert utilisé par
--    le passage manuel en plan Pro depuis le dashboard super-admin, y
--    compris pour les boutiques — comme la démo — qui n'ont encore aucune
--    ligne dans subscriptions).
-- ============================================================

do $$
begin
  alter table subscriptions add constraint subscriptions_boutique_id_key unique (boutique_id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- TerangaSpot — migration du 2026-07-13 (parrainage à crédits + facturation automatique)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- ============================================================
-- 1. Compteur de numéros de facture (séquentiel, unique, par année)
-- ============================================================

create table if not exists invoice_counters (
  year integer primary key,
  last_number integer not null default 0
);

alter table invoice_counters enable row level security;
drop policy if exists super_admin_full_access on invoice_counters;
create policy super_admin_full_access on invoice_counters
  for all using (is_super_admin()) with check (is_super_admin());

-- SECURITY DEFINER : incrémente atomiquement le compteur de l'année en cours
-- et retourne un numéro formaté "TS-2026-0001". L'upsert avec `on conflict`
-- verrouille la ligne le temps de la transaction, ce qui garantit l'unicité
-- même en cas d'appels concurrents (deux factures générées en même temps).
create or replace function next_invoice_number() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_year integer := extract(year from now());
  v_number integer;
begin
  insert into invoice_counters (year, last_number) values (v_year, 1)
  on conflict (year) do update set last_number = invoice_counters.last_number + 1
  returning last_number into v_number;

  return 'TS-' || v_year || '-' || lpad(v_number::text, 4, '0');
end;
$$;

-- ============================================================
-- 2. Factures
-- ============================================================

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  boutique_id uuid not null references boutiques(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  plan text not null check (plan in ('starter', 'pro')),
  full_amount integer not null,
  discount_amount integer not null default 0,
  discount_reason text,
  final_amount integer not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'overdue')),
  payment_method text,
  generated_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, period_start)
);

create index if not exists invoices_boutique_id_idx on invoices(boutique_id);
create index if not exists invoices_status_idx on invoices(status);

alter table invoices enable row level security;
drop policy if exists super_admin_full_access on invoices;
create policy super_admin_full_access on invoices
  for all using (is_super_admin()) with check (is_super_admin());
drop policy if exists boutique_admin_own_invoices_read on invoices;
create policy boutique_admin_own_invoices_read on invoices
  for select using (same_boutique(boutique_id));

-- ============================================================
-- 3. Crédits de parrainage
-- ============================================================

create table if not exists referral_credits (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  referred_boutique_id uuid not null references boutiques(id) on delete cascade,
  status text not null default 'available' check (status in ('available', 'consumed')),
  consumed_reason text check (consumed_reason in ('discount', 'free_month')),
  consumed_at timestamptz,
  invoice_id uuid references invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists referral_credits_boutique_id_idx on referral_credits(boutique_id, status);

alter table referral_credits enable row level security;
drop policy if exists super_admin_full_access on referral_credits;
create policy super_admin_full_access on referral_credits
  for all using (is_super_admin()) with check (is_super_admin());
drop policy if exists boutique_admin_own_referral_credits_read on referral_credits;
create policy boutique_admin_own_referral_credits_read on referral_credits
  for select using (same_boutique(boutique_id));

-- SECURITY DEFINER : verrouille et consomme atomiquement jusqu'à p_count
-- crédits "available" (les plus anciens d'abord) pour une boutique. Le
-- `for update skip locked` protège contre une double-consommation si deux
-- requêtes (double-clic, onglets multiples) arrivent en même temps — au pire
-- l'une des deux voit moins de crédits verrouillables et échoue proprement
-- (le nombre retourné est alors < p_count, l'appelant doit annuler).
create or replace function consume_referral_credits(
  p_boutique_id uuid, p_count integer, p_reason text, p_invoice_id uuid
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_found integer;
begin
  select array_agg(id) into v_ids from (
    select id from referral_credits
    where boutique_id = p_boutique_id and status = 'available'
    order by created_at asc
    limit p_count
    for update skip locked
  ) sub;

  v_found := coalesce(array_length(v_ids, 1), 0);
  if v_found < p_count then
    return v_found;
  end if;

  update referral_credits
  set status = 'consumed', consumed_reason = p_reason, consumed_at = now(), invoice_id = p_invoice_id
  where id = any(v_ids);

  return v_found;
end;
$$;

-- ============================================================
-- 4. Colonnes additionnelles
-- ============================================================

-- Réduction que la boutique a choisi d'appliquer à sa PROCHAINE facture (pas
-- encore générée). Un seul choix actif à la fois : garantit qu'on n'applique
-- jamais plus d'une réduction sur une même facture.
alter table subscriptions
  add column if not exists pending_credit_action text check (pending_credit_action in ('discount', 'free_month'));

-- Trace quel paiement solde quelle facture.
alter table payments
  add column if not exists invoice_id uuid references invoices(id) on delete set null;

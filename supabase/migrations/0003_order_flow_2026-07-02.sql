-- TerangaSpot — migration du 2026-07-02 (parcours commande / avis / ranking)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

-- ============================================================
-- 1. Colonnes manquantes sur orders (adresse dédiée, code promo)
-- ============================================================

alter table orders add column if not exists customer_address text;
alter table orders add column if not exists discount_amount numeric default 0;
alter table orders add column if not exists promo_code_id uuid references promo_codes(id);

-- ============================================================
-- 2. Renommage du statut 'ready' -> 'in_delivery'
-- ============================================================

update orders set status = 'in_delivery' where status = 'ready';

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'in_delivery', 'delivered', 'cancelled'));

-- ============================================================
-- 3. Index pour le suivi de commande et le ranking annuaire
-- ============================================================

create index if not exists idx_orders_order_number on orders(order_number);
create index if not exists idx_orders_boutique_status on orders(boutique_id, status);
create index if not exists idx_reviews_boutique_visible on reviews(boutique_id, is_visible);
create index if not exists idx_orders_boutique_delivered on orders(boutique_id, status) where status = 'delivered';

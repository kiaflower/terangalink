-- TerangaSpot — migration du 2026-07-03 (unicité de order_number par boutique)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
--
-- Bug identifié en testant le parcours de commande de bout en bout : order_number
-- (TS-000001, TS-000002...) est généré par boutique (src/app/api/orders/route.ts),
-- mais la contrainte unique existante ("orders_order_number_key") porte sur toute
-- la table. Résultat : dès qu'une boutique A a une commande TS-000001, toute AUTRE
-- boutique qui tente sa PREMIÈRE commande génère aussi TS-000001 et l'insert échoue
-- avec "duplicate key value violates unique constraint" — la commande est bloquée
-- silencieusement (uniquement visible dans les logs serveur).

alter table orders drop constraint if exists orders_order_number_key;
create unique index if not exists orders_boutique_order_number_key on orders(boutique_id, order_number);

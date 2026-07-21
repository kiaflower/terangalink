-- TerangaSpot — migration du 2026-07-03 (policies RLS sur orders)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Toutes les routes serveur (api/orders) utilisent déjà le client admin (bypass RLS),
-- ces policies couvrent les lectures faites depuis le navigateur (dashboard boutique).

alter table orders enable row level security;

-- Le formulaire de commande public passe par l'API (client admin), pas par ce chemin,
-- mais on garde une policy d'insert permissive au cas où un appel direct côté client existerait.
drop policy if exists "Public insert orders" on orders;
create policy "Public insert orders" on orders for insert with check (true);

drop policy if exists "Boutique admin read orders" on orders;
create policy "Boutique admin read orders" on orders for select using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.boutique_id = orders.boutique_id
  )
  or exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

drop policy if exists "Boutique admin update orders" on orders;
create policy "Boutique admin update orders" on orders for update using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.boutique_id = orders.boutique_id or profiles.role = 'super_admin')
  )
);

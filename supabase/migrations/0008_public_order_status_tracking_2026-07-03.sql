-- TerangaSpot — migration du 2026-07-03 (suivi de commande en direct pour le client)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
--
-- Bug identifié en testant le suivi de commande : la page /c/[slug]/[order_number]
-- affiche le bon statut au premier chargement (rendu serveur via le client admin),
-- mais la mise à jour en direct (OrderStatusLive.tsx) tourne côté navigateur avec
-- le client anon, et échoue silencieusement — ni le polling 8s ni Supabase Realtime
-- ne reçoivent quoi que ce soit, car aucune policy RLS n'autorise un visiteur anonyme
-- à lire la table orders. Testé : une requête REST anonyme sur l'id de la commande
-- renvoie [] au lieu de la ligne. Résultat : le badge "Suivi en direct" est trompeur,
-- le client doit rafraîchir la page manuellement pour voir un nouveau statut.
--
-- Fix : autoriser la lecture anonyme, mais uniquement des colonnes nécessaires au
-- suivi (id, status) — pas les coordonnées ou le contenu de la commande, qui restent
-- réservés à la boutique / au rendu serveur initial (qui utilise déjà le client admin).

drop policy if exists "Public read order status" on orders;
create policy "Public read order status" on orders for select to anon using (true);

revoke select on orders from anon;
grant select (id, status) on orders to anon;

-- S'assurer que la table est bien publiée pour Supabase Realtime (sinon les
-- événements postgres_changes ne partent jamais, même avec la RLS correcte).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

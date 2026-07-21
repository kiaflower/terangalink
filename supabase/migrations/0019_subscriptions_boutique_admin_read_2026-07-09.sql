-- TerangaSpot — migration du 2026-07-09 (lecture de son propre abonnement par un boutique_admin)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- Bug pré-existant découvert en testant la section "Gestion des admins" (0018) :
-- aucune policy RLS ne permettait à un boutique_admin de lire la ligne
-- subscriptions de sa propre boutique (seul super_admin_full_access existait).
-- Résultat : la section "Mon abonnement" du dashboard boutique affichait
-- silencieusement "Aucun abonnement trouvé" pour de vrais admins, et le
-- gating Pro de "Gestion des admins" ne pouvait jamais s'activer.
drop policy if exists boutique_admin_own_subscription_read on subscriptions;
create policy boutique_admin_own_subscription_read on subscriptions
  for select using (same_boutique(boutique_id));

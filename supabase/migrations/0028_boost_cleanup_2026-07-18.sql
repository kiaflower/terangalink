-- TerangaSpot — migration du 2026-07-18 (Suppression du système boost)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
--
-- Le système de boost (mise en avant / Meta Ads) est retiré du produit.
-- On ne supprime pas les colonnes/tables associées (is_boosted, boost_requests)
-- pour ne pas casser le schéma existant : on se contente de remettre les
-- boutiques boostées à false, le code n'utilisant plus ce champ.

update boutiques set is_boosted = false where is_boosted = true;

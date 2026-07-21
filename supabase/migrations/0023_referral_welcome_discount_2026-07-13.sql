-- TerangaSpot — migration du 2026-07-13 (réduction de bienvenue pour la boutique parrainée)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- En plus du crédit gagné par le parrain (0022), la boutique parrainée
-- bénéficie elle-même de -25% sur sa première facture générée par le
-- système automatique, dès que son premier paiement est confirmé. On
-- réutilise pending_credit_action (même mécanisme que le crédit du parrain)
-- avec une valeur distincte pour garder un motif d'affichage différent sur
-- la facture ("Réduction de bienvenue — parrainage" vs "Crédit parrainage").
alter table subscriptions drop constraint if exists subscriptions_pending_credit_action_check;
alter table subscriptions
  add constraint subscriptions_pending_credit_action_check
  check (pending_credit_action in ('discount', 'free_month', 'referral_welcome'));

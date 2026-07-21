-- TerangaSpot — migration du 2026-07-09 (mot de passe choisi à l'inscription)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- Le formulaire public d'inscription demande désormais à l'admin principal
-- de choisir son mot de passe directement (au lieu d'en générer un
-- aléatoirement à l'approbation). Stocké chiffré (AES-256-GCM, voir
-- src/lib/crypto.ts) en attendant la validation de l'inscription par le
-- super-admin — déchiffré une seule fois à l'approbation pour créer le
-- compte, puis envoyé par email de bienvenue.
alter table inscriptions
  add column if not exists chosen_password_enc text;

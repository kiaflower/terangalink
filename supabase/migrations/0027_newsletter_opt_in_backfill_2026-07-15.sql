-- TerangaSpot — migration du 2026-07-15 (backfill newsletter_opt_in)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- À exécuter APRÈS la migration 0026.

-- La colonne boutiques.newsletter_opt_in est nouvelle et vaut false par
-- défaut pour toutes les boutiques déjà existantes — y compris celles dont
-- le fondateur avait bien coché "recevoir des emails marketing" au moment de
-- l'inscription ou de la candidature Early Access. Ce consentement avait été
-- capturé (inscriptions.consent_marketing / early_access_applications.consent_marketing)
-- mais jamais propagé vers la boutique créée (bugs désormais corrigés dans
-- api/super-admin/inscriptions et api/super-admin/early-access pour les
-- prochaines inscriptions). Ce script rattrape les boutiques existantes.
-- Idempotent — sans effet si rejoué.

-- 1. Boutiques issues du formulaire d'inscription standard.
update boutiques b
set newsletter_opt_in = true
where exists (
  select 1
  from profiles p
  join inscriptions i on i.email = p.email
  where p.boutique_id = b.id
    and p.role = 'boutique_admin'
    and i.status = 'approved'
    and i.consent_marketing = true
);

-- 2. Boutiques issues du programme Early Access.
update boutiques b
set newsletter_opt_in = true
where exists (
  select 1
  from early_access_applications e
  where e.created_boutique_id = b.id
    and e.consent_marketing = true
);

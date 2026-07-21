-- TerangaSpot — migration du 2026-07-14 (fiches business — statut "envoyée" + verrou de régénération PDF)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- Le statut "publiee" devient "envoyee" (déclenché par l'action explicite
-- "Marquer comme envoyée", pas par une simple publication éditoriale).
update fiches set status = 'envoyee' where status = 'publiee';

alter table fiches drop constraint if exists fiches_status_check;
alter table fiches add constraint fiches_status_check check (status in ('brouillon', 'prete', 'envoyee'));

-- Horodatage du passage au statut "envoyee".
alter table fiches add column if not exists sent_at timestamptz;

-- Verrou de régénération : dernière génération de PDF + compteur de téléchargements,
-- pour empêcher de renvoyer une version différente moins de 3h après la précédente.
alter table fiches add column if not exists last_generated_at timestamptz;
alter table fiches add column if not exists download_count integer not null default 0;

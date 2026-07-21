-- TerangaSpot — migration du 2026-07-09 (horaires ouverts 8h-18h par défaut)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ce script est additif : il ne supprime ni ne modifie de policies existantes.

-- La colonne opening_hours était en `text`, pas en `jsonb`. Les horaires
-- enregistrés via le formulaire boutique y étaient donc stockés comme une
-- chaîne JSON ("{\"lundi\":\"08:00-18:00\"...}"), que tout le code de l'app
-- lisait ensuite comme si c'était déjà un objet (hours['lundi']). Indexer une
-- chaîne par une clé texte renvoie toujours undefined en JS : résultat, toute
-- boutique ayant déjà enregistré ses horaires s'affichait "Fermé" en
-- permanence sur sa vitrine, silencieusement. On convertit donc la colonne en
-- jsonb (avec cast des chaînes existantes) — PostgREST renverra désormais de
-- vrais objets, exactement ce que l'app attendait déjà partout.
alter table boutiques
  alter column opening_hours type jsonb using (
    case
      when opening_hours is null or opening_hours = '' then null
      else opening_hours::jsonb
    end
  );

-- Toute nouvelle boutique est désormais ouverte 08:00-18:00 tous les jours par
-- défaut, pour que le statut "Ouvert/Fermé" s'affiche sur la vitrine sans que
-- le commerçant ait à toucher aux paramètres.
alter table boutiques
  alter column opening_hours set default '{
    "lundi": "08:00-18:00",
    "mardi": "08:00-18:00",
    "mercredi": "08:00-18:00",
    "jeudi": "08:00-18:00",
    "vendredi": "08:00-18:00",
    "samedi": "08:00-18:00",
    "dimanche": "08:00-18:00"
  }'::jsonb;

-- Rattrapage pour les boutiques déjà créées qui n'ont jamais configuré leurs
-- horaires (opening_hours encore vide) : mêmes horaires par défaut. N'écrase
-- aucune boutique ayant déjà défini ses propres horaires.
update boutiques
set opening_hours = '{
    "lundi": "08:00-18:00",
    "mardi": "08:00-18:00",
    "mercredi": "08:00-18:00",
    "jeudi": "08:00-18:00",
    "vendredi": "08:00-18:00",
    "samedi": "08:00-18:00",
    "dimanche": "08:00-18:00"
  }'::jsonb
where opening_hours is null or opening_hours = '{}'::jsonb;

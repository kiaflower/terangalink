-- Donne aux rôles API (anon, authenticated, service_role) les mêmes droits sur le
-- schéma "app" que ceux qu'ils ont déjà par défaut sur "public" dans un projet
-- Supabase standard. Les RLS policies de 0002 restent la vraie barrière de sécurité
-- au niveau ligne ; ces GRANT ne font qu'autoriser l'accès au niveau schéma/table,
-- sans quoi PostgREST refuse la requête avant même d'évaluer les policies
-- (erreur 42501 "permission denied for schema app").
--
-- ALTER DEFAULT PRIVILEGES couvre aussi les tables/séquences/fonctions créées après
-- coup (utile pour les prochaines migrations sur ce schéma).

GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA app TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

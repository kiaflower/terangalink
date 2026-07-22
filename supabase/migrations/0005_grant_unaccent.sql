-- generate_menu_item_slug() (0002) n'est pas SECURITY DEFINER : elle s'exécute
-- avec les droits du rôle appelant (authenticated), qui n'a jamais reçu de droits
-- sur le schéma "public" — 0003 n'a couvert que le schéma "app". Résultat :
-- "function unaccent(text) does not exist" à chaque création de plat (Postgres
-- masque une fonction en "introuvable" quand le rôle manque de USAGE sur son
-- schéma, plutôt que de renvoyer une erreur de permission).
--
-- Portée volontairement étroite : USAGE sur le schéma public + EXECUTE sur les
-- 2 signatures de unaccent() seulement — pas de GRANT large sur les tables de
-- public, qui contient les données de l'ancien TerangaLink en prod.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unaccent(regdictionary, text) TO anon, authenticated, service_role;

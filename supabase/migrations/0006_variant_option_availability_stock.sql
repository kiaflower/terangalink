-- Disponibilité et stock par option de variante (ex: désactiver "Mini" sans
-- supprimer son prix/photo, ou suivre le stock de "Mini" indépendamment du
-- reste). Même convention que option_prices/option_images : clé = libellé
-- d'option, map creuse (clé absente = comportement par défaut).
--
-- option_availability : clé présente + true = option désactivée/indisponible.
-- option_stock        : clé présente = suivi de stock actif, valeur = quantité
--                        restante ; absente = pas de suivi (illimité).
--
-- Rétrocompatible sans rien à migrer : défaut '{}' = comportement actuel
-- inchangé pour toutes les lignes existantes.

ALTER TABLE app.menu_item_variants
  ADD COLUMN option_availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN option_stock jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Miroir de app.decrement_menu_item_stock (0002), mais ciblant une option
-- précise dans la map JSONB plutôt qu'une colonne plate. No-op silencieux si
-- l'option n'est pas suivie (clé absente de option_stock), même comportement
-- que le "track_stock = true" de la fonction sœur.
CREATE OR REPLACE FUNCTION app.decrement_variant_option_stock(p_menu_item_id uuid, p_variant_name text, p_option text, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'app'
AS $function$
begin
  update app.menu_item_variants
  set option_stock = jsonb_set(
    option_stock,
    array[p_option],
    to_jsonb(greatest(0, coalesce((option_stock->>p_option)::int, 0) - p_quantity))
  )
  where menu_item_id = p_menu_item_id
    and name = p_variant_name
    and option_stock ? p_option;
end;
$function$;

-- Sans ON DELETE CASCADE/SET NULL, `DELETE FROM menu_items` échouait avec une
-- violation de contrainte FK dès qu'un plat avait des variantes ou une story
-- associée — et le client (menu/page.tsx) n'ayant pas de gestion d'erreur
-- explicite, la suppression semblait juste ne rien faire.
ALTER TABLE app.menu_item_variants DROP CONSTRAINT menu_item_variants_menu_item_id_fkey;
ALTER TABLE app.menu_item_variants ADD CONSTRAINT menu_item_variants_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES app.menu_items(id) ON DELETE CASCADE;

ALTER TABLE app.restaurant_stories DROP CONSTRAINT restaurant_stories_menu_item_id_fkey;
ALTER TABLE app.restaurant_stories ADD CONSTRAINT restaurant_stories_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES app.menu_items(id) ON DELETE SET NULL;

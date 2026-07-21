-- Photo optionnelle par option de variante (ex: une couleur a sa propre
-- photo) — miroir de option_prices : clé = option, valeur = URL publique.
-- Absent/vide => la fiche produit retombe sur la photo principale du produit.
alter table product_variants add column if not exists option_images jsonb not null default '{}'::jsonb;

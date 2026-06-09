-- ============================================================
-- TerangaLink — Restaurant DÉMO
-- Run this AFTER all migrations to create the demo restaurant
-- ============================================================

-- 1. Create demo restaurant
INSERT INTO public.restaurants (
  name, slug, description, city, address, phone, whatsapp_number,
  is_active, is_demo, primary_color, background_color, theme_mode,
  opening_hours, show_delivery_fee, delivery_fee
) VALUES (
  'Chez Teranga',
  'chez-teranga',
  'Le meilleur de la cuisine sénégalaise — thiéboudiène, yassa, mafé et bien plus.',
  'Dakar',
  'Avenue Cheikh Anta Diop, Dakar',
  '+221 77 123 45 67',
  '221771234567',
  true,
  true,
  '#F97316',
  '#0A0A0A',
  'dark',
  '{"lundi":{"ouverture":"09:00","fermeture":"22:00","ferme":false},"mardi":{"ouverture":"09:00","fermeture":"22:00","ferme":false},"mercredi":{"ouverture":"09:00","fermeture":"22:00","ferme":false},"jeudi":{"ouverture":"09:00","fermeture":"22:00","ferme":false},"vendredi":{"ouverture":"09:00","fermeture":"23:00","ferme":false},"samedi":{"ouverture":"10:00","fermeture":"23:00","ferme":false},"dimanche":{"ouverture":"11:00","fermeture":"21:00","ferme":false}}',
  true,
  1500
) ON CONFLICT (slug) DO UPDATE SET
  is_demo = true,
  is_active = true;

-- 2. Get the restaurant id
DO $$
DECLARE
  rid uuid;
  cat1 uuid; cat2 uuid; cat3 uuid;
BEGIN
  SELECT id INTO rid FROM public.restaurants WHERE slug = 'chez-teranga';

  -- 3. Create subscription
  INSERT INTO public.subscriptions (restaurant_id, plan, status)
  VALUES (rid, 'pro', 'active')
  ON CONFLICT (restaurant_id) DO UPDATE SET plan = 'pro', status = 'active';

  -- 4. Create categories
  INSERT INTO public.menu_categories (restaurant_id, name, position, is_active)
  VALUES
    (rid, 'Plats principaux', 0, true),
    (rid, 'Grillades', 1, true),
    (rid, 'Boissons', 2, true)
  RETURNING id INTO cat1;

  SELECT id INTO cat1 FROM public.menu_categories WHERE restaurant_id = rid AND name = 'Plats principaux';
  SELECT id INTO cat2 FROM public.menu_categories WHERE restaurant_id = rid AND name = 'Grillades';
  SELECT id INTO cat3 FROM public.menu_categories WHERE restaurant_id = rid AND name = 'Boissons';

  -- 5. Create menu items
  INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_available, position)
  VALUES
    (rid, cat1, 'Thiéboudiène', 'Le plat national sénégalais — riz au poisson, légumes et sauce tomate maison', 3500, true, 0),
    (rid, cat1, 'Yassa Poulet', 'Poulet mariné au citron et oignons caramélisés, servi avec du riz blanc', 3000, true, 1),
    (rid, cat1, 'Mafé', 'Ragoût de viande à la sauce d''arachide, accompagné de riz', 2800, true, 2),
    (rid, cat1, 'Thiébou Yapp', 'Riz à la viande avec légumes de saison', 3200, true, 3),
    (rid, cat2, 'Poulet Braisé', 'Demi-poulet braisé, épices maison, sauce tomate et frites', 2500, true, 0),
    (rid, cat2, 'Poisson Braisé', 'Poisson braisé entier, citron, piment doux, alloco', 3000, true, 1),
    (rid, cat2, 'Brochettes Bœuf', 'Brochettes de bœuf marinées, sauce oignon, pain', 2000, true, 2),
    (rid, cat3, 'Bissap', 'Jus d''hibiscus frais, sucré naturellement — grande bouteille', 500, true, 0),
    (rid, cat3, 'Bouye', 'Jus de baobab crémeux — spécialité maison', 600, true, 1),
    (rid, cat3, 'Eau minérale', 'Eau fraîche 1.5L', 300, true, 2);

END $$;

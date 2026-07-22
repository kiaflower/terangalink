-- Fonctions, triggers et RLS policies de TerangaSpot, transposées dans le schéma
-- "app" avec le même mapping de vocabulaire que 0001_initial_schema_app.sql.
-- Source : dump réel du projet TerangaSpot (pg_proc / pg_policies / pg_trigger),
-- fourni par l'utilisateur — rien deviné.
--
-- Toutes les policies utilisent des références pleinement qualifiées (app.xxx)
-- pour ne pas dépendre du search_path de la session appelante.
--
-- Non repris car absent côté TerangaSpot (boost_requests a 0 lignes, feature déjà
-- retirée là-bas) : les 3 policies de boost_requests.
--
-- next_invoice_number() : préfixe 'TS-' -> 'TL-' (cohérent avec le format déjà
-- utilisé par l'ancien TerangaLink pour ses factures).

-- ─── Extension unaccent (utilisée par generate_menu_item_slug) ────────────
-- Schéma explicite requis : generate_menu_item_slug() a `search_path TO 'app,
-- public, extensions'` — sans WITH SCHEMA, CREATE EXTENSION peut installer la
-- fonction ailleurs (selon le search_path de la session au moment du CREATE),
-- et l'appel bare `unaccent(...)` échoue alors avec "function does not exist".
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ─── Séquence fiches_numero_seq + numero par défaut sur app.fiches ────────
CREATE SEQUENCE app.fiches_numero_seq;

CREATE OR REPLACE FUNCTION app.next_fiche_numero()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'app'
AS $function$
  select nextval('app.fiches_numero_seq')::integer;
$function$;

ALTER TABLE app.fiches ALTER COLUMN numero SET DEFAULT app.next_fiche_numero();

-- ─── Fonctions ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION app.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (
    select 1 from app.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$function$;

CREATE OR REPLACE FUNCTION app.same_restaurant(target_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (
    select 1 from app.profiles
    where id = auth.uid()
      and role = 'restaurant_admin'
      and restaurant_id = target_restaurant_id
  );
$function$;

CREATE OR REPLACE FUNCTION app.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app'
AS $function$
begin
  insert into app.profiles (id, email, role)
  values (new.id, new.email, 'restaurant_admin')
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app.consume_referral_credits(p_restaurant_id uuid, p_count integer, p_reason text, p_invoice_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app'
AS $function$
declare
  v_ids uuid[];
  v_found integer;
begin
  select array_agg(id) into v_ids from (
    select id from app.referral_credits
    where restaurant_id = p_restaurant_id and status = 'available'
    order by created_at asc
    limit p_count
    for update skip locked
  ) sub;

  v_found := coalesce(array_length(v_ids, 1), 0);
  if v_found < p_count then
    return v_found;
  end if;

  update app.referral_credits
  set status = 'consumed', consumed_reason = p_reason, consumed_at = now(), invoice_id = p_invoice_id
  where id = any(v_ids);

  return v_found;
end;
$function$;

CREATE OR REPLACE FUNCTION app.decrement_menu_item_stock(p_menu_item_id uuid, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'app'
AS $function$
begin
  update app.menu_items
  set stock_quantity = greatest(0, coalesce(stock_quantity, 0) - p_quantity)
  where id = p_menu_item_id and track_stock = true;
end;
$function$;

CREATE OR REPLACE FUNCTION app.enforce_max_pinned_menu_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'app'
AS $function$
declare
  pinned_count int;
begin
  if new.is_pinned is not true then
    return new;
  end if;

  select count(*) into pinned_count
  from app.menu_items
  where restaurant_id = new.restaurant_id
    and is_pinned = true
    and id is distinct from new.id;

  if pinned_count >= 2 then
    raise exception 'Vous avez déjà 2 plats épinglés. Désépinglez-en un avant d''en épingler un nouveau.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app.generate_menu_item_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'app, public, extensions'
AS $function$
declare
  base_slug text;
  candidate text;
  suffix int := 1;
begin
  base_slug := lower(regexp_replace(unaccent(coalesce(new.name, 'plat')), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'plat';
  end if;

  candidate := base_slug;
  while exists (
    select 1 from app.menu_items
    where restaurant_id = new.restaurant_id
      and slug = candidate
      and id is distinct from new.id
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION app.next_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app'
AS $function$
declare
  v_year integer := extract(year from now());
  v_number integer;
begin
  insert into app.invoice_counters (year, last_number) values (v_year, 1)
  on conflict (year) do update set last_number = app.invoice_counters.last_number + 1
  returning last_number into v_number;

  return 'TL-' || v_year || '-' || lpad(v_number::text, 4, '0');
end;
$function$;

-- ─── Triggers ───────────────────────────────────────────────────────────────

CREATE TRIGGER on_app_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app.handle_new_user();
-- NB: ce trigger est global au projet (auth.users est partagé). S'il existe déjà un
-- trigger équivalent posé par l'ancien TerangaLink sur auth.users (probable, même
-- fonctionnalité), vérifier qu'il n'y a pas de doublon avant d'appliquer cette ligne —
-- deux triggers AFTER INSERT sur auth.users s'exécuteraient tous les deux sans erreur,
-- mais chacun insère dans son propre schéma (public.profiles vs app.profiles) donc pas
-- de conflit réel ; à confirmer quand même côté dashboard avant d'exécuter.

CREATE TRIGGER trg_enforce_max_pinned_menu_items
  BEFORE INSERT OR UPDATE OF is_pinned ON app.menu_items
  FOR EACH ROW EXECUTE FUNCTION app.enforce_max_pinned_menu_items();

CREATE TRIGGER trg_generate_menu_item_slug
  BEFORE INSERT OR UPDATE ON app.menu_items
  FOR EACH ROW
  WHEN (new.slug IS NULL OR new.slug = '')
  EXECUTE FUNCTION app.generate_menu_item_slug();

-- ─── RLS : activation sur les 38 tables (toutes RLS-enabled côté TerangaSpot) ──

ALTER TABLE app.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rdv_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.availability_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.recurring_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.restaurant_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.early_access_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.early_access_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.restaurant_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.fiche_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.fiches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.newsletter_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.featured_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.featured_block_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.restaurant_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.push_notifications_log ENABLE ROW LEVEL SECURITY;

-- ─── RLS policies ───────────────────────────────────────────────────────────

-- restaurants (ex boutiques)
CREATE POLICY "Restaurant admin updates own restaurant" ON app.restaurants FOR UPDATE TO public
  USING (id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Owner manage restaurant" ON app.restaurants FOR ALL TO public
  USING (auth.uid() = owner_id);
CREATE POLICY "Public can read active restaurants" ON app.restaurants FOR SELECT TO public
  USING (is_active = true);
CREATE POLICY "Public read restaurants" ON app.restaurants FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin all restaurants" ON app.restaurants FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Super admins manage restaurants" ON app.restaurants FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());
CREATE POLICY "super_admin_full_access" ON app.restaurants FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- profiles
CREATE POLICY "Super admins read all profiles" ON app.profiles FOR SELECT TO public
  USING (auth.uid() = id OR app.is_super_admin());
CREATE POLICY "profiles_restaurant_peers_read" ON app.profiles FOR SELECT TO public
  USING (app.same_restaurant(restaurant_id));
CREATE POLICY "profiles_insert" ON app.profiles FOR INSERT TO public
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_select" ON app.profiles FOR SELECT TO public
  USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON app.profiles FOR UPDATE TO public
  USING (auth.uid() = id);

-- subscriptions
CREATE POLICY "Super admins manage subscriptions" ON app.subscriptions FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());
CREATE POLICY "restaurant_admin_own_subscription_read" ON app.subscriptions FOR SELECT TO public
  USING (app.same_restaurant(restaurant_id));
CREATE POLICY "super_admin_full_access" ON app.subscriptions FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- menu_categories (ex product_categories)
CREATE POLICY "Restaurant admin manage categories" ON app.menu_categories FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = menu_categories.restaurant_id)
     OR EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Restaurant admin manages own categories" ON app.menu_categories FOR ALL TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin() OR is_active = true)
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin());
CREATE POLICY "Public read categories" ON app.menu_categories FOR SELECT TO public
  USING (true);
CREATE POLICY "super_admin_full_access" ON app.menu_categories FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- menu_items (ex products)
CREATE POLICY "Restaurant admin manage menu items" ON app.menu_items FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = menu_items.restaurant_id)
     OR EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Restaurant admin manages own menu items" ON app.menu_items FOR ALL TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin() OR is_available = true)
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin());
CREATE POLICY "Public read menu items" ON app.menu_items FOR SELECT TO public
  USING (true);
CREATE POLICY "super_admin_full_access" ON app.menu_items FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- menu_item_variants (ex product_variants)
CREATE POLICY "Restaurant admin manage variants" ON app.menu_item_variants FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.menu_items p JOIN app.profiles pr ON pr.restaurant_id = p.restaurant_id
                  WHERE p.id = menu_item_variants.menu_item_id AND pr.id = auth.uid())
     OR EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
-- NB: la clause USING se termine par "OR true" côté TerangaSpot (rend le SELECT/ALL
-- effectivement public en lecture) — reproduit tel quel, pas une erreur de transcription.
CREATE POLICY "Restaurant admin manages own menu item variants" ON app.menu_item_variants FOR ALL TO public
  USING ((menu_item_id IN (SELECT id FROM app.menu_items WHERE restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid())))
     OR app.is_super_admin() OR true)
  WITH CHECK ((menu_item_id IN (SELECT id FROM app.menu_items WHERE restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid())))
     OR app.is_super_admin());
CREATE POLICY "Public read variants" ON app.menu_item_variants FOR SELECT TO public
  USING (true);
CREATE POLICY "super_admin_full_access" ON app.menu_item_variants FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- promo_codes
CREATE POLICY "Restaurant admin manage promo codes" ON app.promo_codes FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = promo_codes.restaurant_id)
     OR EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Restaurant admin manages own promo codes" ON app.promo_codes FOR ALL TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin() OR is_active = true)
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin());
CREATE POLICY "super_admin_full_access" ON app.promo_codes FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- orders
CREATE POLICY "Restaurant admin manages own orders" ON app.orders FOR ALL TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin())
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin());
CREATE POLICY "Restaurant admin read orders" ON app.orders FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = orders.restaurant_id)
     OR EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Restaurant admin update orders" ON app.orders FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND (profiles.restaurant_id = orders.restaurant_id OR profiles.role = 'super_admin')));
CREATE POLICY "Public insert orders" ON app.orders FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Public read order status" ON app.orders FOR SELECT TO anon
  USING (true);
CREATE POLICY "super_admin_full_access" ON app.orders FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- analytics_events
CREATE POLICY "Restaurant admin read analytics" ON app.analytics_events FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.restaurant_id = analytics_events.restaurant_id)
     OR EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Restaurant admin reads own analytics" ON app.analytics_events FOR SELECT TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()) OR app.is_super_admin());
CREATE POLICY "Public insert analytics" ON app.analytics_events FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "super_admin_full_access" ON app.analytics_events FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- inscriptions
CREATE POLICY "Public can submit inscriptions" ON app.inscriptions FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Public insert inscriptions" ON app.inscriptions FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Super admin manage inscriptions" ON app.inscriptions FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin read inscriptions" ON app.inscriptions FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- reviews
CREATE POLICY "Anyone can insert a review" ON app.reviews FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Anyone can read visible reviews" ON app.reviews FOR SELECT TO public
  USING (is_visible = true);
CREATE POLICY "Restaurant admin manages own reviews" ON app.reviews FOR ALL TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "super_admin_full_access" ON app.reviews FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- availability_slots
CREATE POLICY "Anyone can read open slots" ON app.availability_slots FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin manages slots" ON app.availability_slots FOR ALL TO public
  USING ((SELECT profiles.role FROM app.profiles WHERE profiles.id = auth.uid()) = 'super_admin');

-- appointments
CREATE POLICY "Anyone can book a slot" ON app.appointments FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Super admin reads all appointments" ON app.appointments FOR SELECT TO public
  USING ((SELECT profiles.role FROM app.profiles WHERE profiles.id = auth.uid()) = 'super_admin');

-- platform_settings
CREATE POLICY "Anyone can read settings" ON app.platform_settings FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin manages settings" ON app.platform_settings FOR ALL TO public
  USING ((SELECT profiles.role FROM app.profiles WHERE profiles.id = auth.uid()) = 'super_admin');
CREATE POLICY "Super admins manage platform settings" ON app.platform_settings FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- rdv_slots
CREATE POLICY "Public read rdv slots" ON app.rdv_slots FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin manage rdv slots" ON app.rdv_slots FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- availability_settings
CREATE POLICY "Public read availability" ON app.availability_settings FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin write availability" ON app.availability_settings FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- invoice_counters
CREATE POLICY "super_admin_full_access" ON app.invoice_counters FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- invoices
CREATE POLICY "restaurant_admin_own_invoices_read" ON app.invoices FOR SELECT TO public
  USING (app.same_restaurant(restaurant_id));
CREATE POLICY "super_admin_full_access" ON app.invoices FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- referral_rewards
CREATE POLICY "Restaurant reads own referral rewards" ON app.referral_rewards FOR SELECT TO public
  USING (referrer_restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()));

-- referral_credits
CREATE POLICY "restaurant_admin_own_referral_credits_read" ON app.referral_credits FOR SELECT TO public
  USING (app.same_restaurant(restaurant_id));
CREATE POLICY "super_admin_full_access" ON app.referral_credits FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- payments
CREATE POLICY "Super admin manages payments" ON app.payments FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "super_admin_full_access" ON app.payments FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- appointment_requests
CREATE POLICY "Public can submit appointment requests" ON app.appointment_requests FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Public insert appointment" ON app.appointment_requests FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Super admin read appointments" ON app.appointment_requests FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin update appointments" ON app.appointment_requests FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Super admins manage appointment requests" ON app.appointment_requests FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- recurring_slots
CREATE POLICY "Public read recurring slots" ON app.recurring_slots FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin manage recurring slots" ON app.recurring_slots FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "public_read_active_slots" ON app.recurring_slots FOR SELECT TO public
  USING (is_active = true);
CREATE POLICY "super_admin_full_access" ON app.recurring_slots FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- restaurant_banners (ex boutique_banners)
CREATE POLICY "Restaurant admin manage own banners" ON app.restaurant_banners FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND (profiles.restaurant_id = restaurant_banners.restaurant_id OR profiles.role = 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND (profiles.restaurant_id = restaurant_banners.restaurant_id OR profiles.role = 'super_admin')));
CREATE POLICY "Public read active banners" ON app.restaurant_banners FOR SELECT TO public
  USING (is_active = true);

-- early_access_config
CREATE POLICY "Public read early access config" ON app.early_access_config FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin update early access config" ON app.early_access_config FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- early_access_applications
CREATE POLICY "Public insert early access" ON app.early_access_applications FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Super admin all early access" ON app.early_access_applications FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- waitlist
CREATE POLICY "Public insert waitlist" ON app.waitlist FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Super admin read waitlist" ON app.waitlist FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- restaurant_stories (ex boutique_stories)
CREATE POLICY "Restaurant admin manage own stories" ON app.restaurant_stories FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND (profiles.restaurant_id = restaurant_stories.restaurant_id OR profiles.role = 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND (profiles.restaurant_id = restaurant_stories.restaurant_id OR profiles.role = 'super_admin')));
CREATE POLICY "Public increment story counters" ON app.restaurant_stories FOR UPDATE TO public
  USING (expires_at > now()) WITH CHECK (expires_at > now());
CREATE POLICY "Public read active stories" ON app.restaurant_stories FOR SELECT TO public
  USING (expires_at > now());

-- fiche_categories / fiches
CREATE POLICY "super_admin_full_access" ON app.fiche_categories FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());
CREATE POLICY "super_admin_full_access" ON app.fiches FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- newsletter_campaigns / newsletter_recipients
CREATE POLICY "Super admin all newsletter campaigns" ON app.newsletter_campaigns FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin all newsletter recipients" ON app.newsletter_recipients FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- featured_blocks / featured_block_items
CREATE POLICY "Public read active blocks" ON app.featured_blocks FOR SELECT TO public
  USING (is_active = true);
CREATE POLICY "Super admin all blocks" ON app.featured_blocks FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Public read block items" ON app.featured_block_items FOR SELECT TO public
  USING (true);
CREATE POLICY "Super admin all block items" ON app.featured_block_items FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM app.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'));

-- weekly_reports
CREATE POLICY "super_admin_full_access" ON app.weekly_reports FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- push_subscriptions
CREATE POLICY "own_subscriptions" ON app.push_subscriptions FOR ALL TO public
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "super_admin_full_access" ON app.push_subscriptions FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- restaurant_notification_settings (ex boutique_notification_settings)
CREATE POLICY "own_notification_settings" ON app.restaurant_notification_settings FOR ALL TO public
  USING (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM app.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "super_admin_full_access" ON app.restaurant_notification_settings FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

-- push_notifications_log
CREATE POLICY "super_admin_full_access" ON app.push_notifications_log FOR ALL TO public
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

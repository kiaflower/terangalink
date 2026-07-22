-- TerangaLink (rebuild) — schéma initial, forké de TerangaSpot (projet ajwwlcoagcetnyapdgcr)
-- avec le vocabulaire adapté (boutique -> restaurant, produit -> plat, catalogue -> menu,
-- shop_category -> cuisine_type). Voir le mapping table par table dans le message qui
-- accompagne ce commit.
--
-- Vit dans un schéma Postgres séparé ("app") plutôt que "public", pour ne jamais entrer
-- en collision avec les tables réelles du projet menulink (public.restaurants,
-- public.orders, etc. — données live de Dema Sweets et Krunch). Le schéma "public" de ce
-- projet n'est JAMAIS touché par cette migration.
--
-- ATTENTION : ce fichier ne couvre que la structure des tables (colonnes, PK, FK, CHECK).
-- Les RLS policies, triggers, fonctions (handle_new_user, next_fiche_numero,
-- order_number_seq, refresh_verified_badges...), index secondaires et buckets de storage
-- de TerangaSpot ne sont pas encore repris ici — à ajouter dans une migration suivante une
-- fois récupérés depuis le projet TerangaSpot. Tant que ces policies ne sont pas en place,
-- ne pas exposer ce schéma publiquement ni y mettre de vraies données.

CREATE SCHEMA IF NOT EXISTS app;

-- ─── restaurants (ex boutiques) ────────────────────────────────────────────
CREATE TABLE app.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  cover_url text,
  banner_url text,
  phone text,
  whatsapp_number text NOT NULL,
  address text,
  city text DEFAULT 'Dakar'::text,
  cuisine_type text,
  is_active boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  is_demo boolean DEFAULT false,
  owner_id uuid,
  latitude numeric,
  longitude numeric,
  primary_color text DEFAULT '#F97316'::text,
  background_color text DEFAULT '#FFFFFF'::text,
  button_color text DEFAULT '#F97316'::text,
  theme_mode text DEFAULT 'light'::text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  snapchat_url text,
  wave_number text,
  orange_money_number text,
  show_delivery_info boolean DEFAULT true,
  delivery_info text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  referral_code text UNIQUE,
  referred_by text,
  theme text DEFAULT 'light'::text,
  referred_by_code text,
  opening_hours jsonb DEFAULT '{"jeudi": "08:00-18:00", "lundi": "08:00-18:00", "mardi": "08:00-18:00", "samedi": "08:00-18:00", "dimanche": "08:00-18:00", "mercredi": "08:00-18:00", "vendredi": "08:00-18:00"}'::jsonb,
  is_boosted boolean DEFAULT false,
  is_founder boolean NOT NULL DEFAULT false,
  password_version integer NOT NULL DEFAULT 1,
  admin_password_enc text,
  announcement_enabled boolean NOT NULL DEFAULT false,
  announcement_image_url text,
  announcement_title text,
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  last_login_at timestamp with time zone,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- ─── profiles ───────────────────────────────────────────────────────────────
CREATE TABLE app.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'restaurant_admin'::text CHECK (role = ANY (ARRAY['super_admin'::text, 'restaurant_admin'::text])),
  restaurant_id uuid,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  admin_role text CHECK (admin_role = ANY (ARRAY['principal'::text, 'secondaire'::text])),
  is_active boolean NOT NULL DEFAULT true,
  session_password_version integer NOT NULL DEFAULT 0,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE app.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE,
  plan text DEFAULT 'starter'::text CHECK (plan = ANY (ARRAY['free'::text, 'starter'::text, 'pro'::text])),
  status text DEFAULT 'trial'::text CHECK (status = ANY (ARRAY['active'::text, 'trial'::text, 'suspended'::text, 'cancelled'::text])),
  started_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  discount_percent numeric DEFAULT 0,
  discount_expires_at timestamp with time zone,
  notes_admin text,
  pending_discount_percent integer,
  pending_discount_expires_at timestamp with time zone,
  pending_credit_action text CHECK (pending_credit_action = ANY (ARRAY['discount'::text, 'free_month'::text, 'referral_welcome'::text])),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── menu_categories (ex product_categories) ───────────────────────────────
CREATE TABLE app.menu_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT menu_categories_pkey PRIMARY KEY (id),
  CONSTRAINT menu_categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── menu_items (ex products) ───────────────────────────────────────────────
CREATE TABLE app.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  images_urls text[] DEFAULT '{}'::text[],
  is_available boolean DEFAULT true,
  track_stock boolean DEFAULT false,
  stock_quantity integer,
  position integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  discount_percent integer CHECK (discount_percent IS NULL OR discount_percent >= 0 AND discount_percent <= 100),
  preorder_enabled boolean DEFAULT false,
  preorder_start timestamp with time zone,
  preorder_end timestamp with time zone,
  preorder_delivery_date text,
  preorder_max_qty integer,
  preorder_current_qty integer DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  badge_text text,
  slug text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  video_url text,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES app.menu_categories(id)
);

-- ─── menu_item_variants (ex product_variants) ──────────────────────────────
-- Une ligne par groupe de variantes (ex: "Taille"), options + prix + photo par option
-- en JSONB — c'est ce qui porte la fonctionnalité "photo par variante".
CREATE TABLE app.menu_item_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL,
  name text NOT NULL,
  options text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  option_prices jsonb DEFAULT '{}'::jsonb,
  option_images jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT menu_item_variants_pkey PRIMARY KEY (id),
  CONSTRAINT menu_item_variants_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES app.menu_items(id)
);

-- ─── promo_codes ────────────────────────────────────────────────────────────
CREATE TABLE app.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text CHECK (discount_type = ANY (ARRAY['percent'::text, 'fixed'::text])),
  discount_value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  is_featured boolean DEFAULT false,
  CONSTRAINT promo_codes_pkey PRIMARY KEY (id),
  CONSTRAINT promo_codes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── orders ─────────────────────────────────────────────────────────────────
CREATE TABLE app.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  order_number text NOT NULL,
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_delivery'::text, 'delivered'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  customer_address text,
  discount_amount numeric DEFAULT 0,
  promo_code_id uuid,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT orders_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES app.promo_codes(id)
);

-- ─── analytics_events ───────────────────────────────────────────────────────
CREATE TABLE app.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  event_type text NOT NULL,
  item_id uuid,
  item_name text,
  created_at timestamp with time zone DEFAULT now(),
  session_id text,
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── inscriptions ───────────────────────────────────────────────────────────
-- NB: boost_requests (table TerangaSpot, 0 lignes, fonctionnalité déjà retirée côté
-- TerangaSpot) volontairement non recréée — pas de système de boost dans TerangaLink.
CREATE TABLE app.inscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  owner_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  whatsapp_number text NOT NULL,
  cuisine_type text,
  city text,
  message text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  referral_code text,
  plan text DEFAULT 'starter'::text,
  primary_color text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  snapchat_url text,
  logo_base64 text,
  cover_base64 text,
  description text,
  want_verified_badge boolean DEFAULT false,
  partner_offer_type text,
  partner_offer_custom text,
  consent_images boolean DEFAULT false,
  consent_annuaire boolean DEFAULT false,
  consent_marketing boolean DEFAULT false,
  created_restaurant_id uuid,
  created_admin_password text,
  theme text DEFAULT 'light'::text,
  chosen_password_enc text,
  CONSTRAINT inscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT inscriptions_created_restaurant_id_fkey FOREIGN KEY (created_restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── reviews ────────────────────────────────────────────────────────────────
CREATE TABLE app.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  order_id uuid,
  customer_name text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES app.orders(id)
);

-- ─── availability_slots / appointments (rendez-vous) ───────────────────────
CREATE TABLE app.availability_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT availability_slots_pkey PRIMARY KEY (id)
);

CREATE TABLE app.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  restaurant_id uuid,
  restaurant_name text NOT NULL,
  owner_name text NOT NULL,
  email text,
  whatsapp text,
  status text NOT NULL DEFAULT 'upcoming'::text,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES app.availability_slots(id),
  CONSTRAINT appointments_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── platform_settings / rdv_slots / availability_settings ────────────────
CREATE TABLE app.platform_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE app.rdv_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  label text,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rdv_slots_pkey PRIMARY KEY (id)
);

CREATE TABLE app.availability_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  active_days integer[],
  start_time text,
  end_time text,
  slot_duration integer,
  blocked_dates date[],
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT availability_settings_pkey PRIMARY KEY (id)
);

-- ─── invoice_counters / invoices ────────────────────────────────────────────
CREATE TABLE app.invoice_counters (
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  CONSTRAINT invoice_counters_pkey PRIMARY KEY (year)
);

CREATE TABLE app.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  restaurant_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  plan text NOT NULL CHECK (plan = ANY (ARRAY['starter'::text, 'pro'::text])),
  full_amount integer NOT NULL,
  discount_amount integer NOT NULL DEFAULT 0,
  discount_reason text,
  final_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'unpaid'::text CHECK (status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'overdue'::text])),
  payment_method text,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  due_at timestamp with time zone NOT NULL,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES app.subscriptions(id)
);

-- ─── referral_rewards / referral_credits / payments ────────────────────────
CREATE TABLE app.referral_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_restaurant_id uuid NOT NULL,
  referred_restaurant_id uuid NOT NULL,
  discount_percent numeric DEFAULT 25,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text])),
  triggered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referral_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT referral_rewards_referrer_restaurant_id_fkey FOREIGN KEY (referrer_restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT referral_rewards_referred_restaurant_id_fkey FOREIGN KEY (referred_restaurant_id) REFERENCES app.restaurants(id)
);

CREATE TABLE app.referral_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  referred_restaurant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'consumed'::text])),
  consumed_reason text CHECK (consumed_reason = ANY (ARRAY['discount'::text, 'free_month'::text])),
  consumed_at timestamp with time zone,
  invoice_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT referral_credits_pkey PRIMARY KEY (id),
  CONSTRAINT referral_credits_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT referral_credits_referred_restaurant_id_fkey FOREIGN KEY (referred_restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT referral_credits_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id)
);

CREATE TABLE app.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text DEFAULT 'Autre'::text,
  paid_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  invoice_id uuid,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES app.subscriptions(id),
  CONSTRAINT payments_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES app.invoices(id)
);

-- ─── appointment_requests / recurring_slots ─────────────────────────────────
CREATE TABLE app.appointment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  subject text,
  requested_date date NOT NULL,
  requested_time time without time zone NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'done'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointment_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE app.recurring_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  weekday integer NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time time without time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recurring_slots_pkey PRIMARY KEY (id)
);

-- ─── restaurant_banners (ex boutique_banners) ──────────────────────────────
CREATE TABLE app.restaurant_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  text text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_banners_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_banners_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── early_access_config / early_access_applications / waitlist ───────────
CREATE TABLE app.early_access_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  max_places integer DEFAULT 15,
  is_open boolean DEFAULT true,
  launch_date date,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT early_access_config_pkey PRIMARY KEY (id)
);

CREATE TABLE app.early_access_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  cuisine_type text NOT NULL,
  city text NOT NULL,
  description text,
  owner_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  whatsapp_number text NOT NULL,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  snapchat_url text,
  logo_url text,
  cover_url text,
  wave_number text,
  orange_money_number text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'contacted'::text, 'confirmed'::text, 'rejected'::text])),
  place_number integer,
  notes_admin text,
  created_at timestamp with time zone DEFAULT now(),
  plan text DEFAULT 'starter'::text CHECK (plan = ANY (ARRAY['starter'::text, 'pro'::text])),
  primary_color text DEFAULT '#F97316'::text,
  theme text DEFAULT 'light'::text,
  referral_code text,
  partner_offer_type text,
  partner_offer_custom text,
  consent_images boolean DEFAULT false,
  consent_annuaire boolean DEFAULT false,
  consent_marketing boolean DEFAULT false,
  created_restaurant_id uuid,
  created_admin_password text,
  CONSTRAINT early_access_applications_pkey PRIMARY KEY (id),
  CONSTRAINT early_access_applications_created_restaurant_id_fkey FOREIGN KEY (created_restaurant_id) REFERENCES app.restaurants(id)
);

CREATE TABLE app.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  source text DEFAULT 'early_access'::text,
  created_at timestamp with time zone DEFAULT now(),
  name text,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);

-- ─── restaurant_stories (ex boutique_stories) ──────────────────────────────
CREATE TABLE app.restaurant_stories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text])),
  caption text,
  menu_item_id uuid,
  views_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT restaurant_stories_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_stories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT restaurant_stories_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES app.menu_items(id)
);

-- ─── fiche_categories / fiches (Fiches Restaurateur — concept indépendant) ─
-- Thèmes de contenu pour les Fiches Restaurateur : aucun rapport avec cuisine_type
-- ou menu_categories, laissé inchangé.
CREATE TABLE app.fiche_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT fiche_categories_pkey PRIMARY KEY (id)
);

CREATE SEQUENCE app.fiche_numero_seq;
CREATE FUNCTION app.next_fiche_numero() RETURNS integer
  LANGUAGE sql AS $$ SELECT nextval('app.fiche_numero_seq')::integer $$;

CREATE TABLE app.fiches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero integer NOT NULL DEFAULT app.next_fiche_numero() UNIQUE,
  category_id uuid NOT NULL,
  title text NOT NULL,
  pitch text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'brouillon'::text CHECK (status = ANY (ARRAY['brouillon'::text, 'prete'::text, 'envoyee'::text])),
  subtitle text,
  why_it_matters text,
  key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  example text,
  common_mistake text,
  action_step text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  last_generated_at timestamp with time zone,
  download_count integer NOT NULL DEFAULT 0,
  CONSTRAINT fiches_pkey PRIMARY KEY (id),
  CONSTRAINT fiches_category_id_fkey FOREIGN KEY (category_id) REFERENCES app.fiche_categories(id)
);

-- ─── newsletter_campaigns / newsletter_recipients ──────────────────────────
CREATE TABLE app.newsletter_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT ''::text,
  preview_text text,
  from_name text NOT NULL DEFAULT 'TerangaLink'::text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  segment jsonb NOT NULL DEFAULT '{"type": "all"}'::jsonb,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text])),
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT newsletter_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES app.profiles(id)
);

CREATE TABLE app.newsletter_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'sent'::text, 'opened'::text, 'clicked'::text, 'failed'::text, 'unsubscribed'::text])),
  error_message text,
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  click_count integer NOT NULL DEFAULT 0,
  first_clicked_at timestamp with time zone,
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT newsletter_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES app.newsletter_campaigns(id),
  CONSTRAINT newsletter_recipients_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── featured_blocks / featured_block_items ────────────────────────────────
CREATE TABLE app.featured_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Coup de cœur de la semaine'::text,
  restaurant_id uuid,
  position text DEFAULT 'top'::text CHECK ("position" = ANY (ARRAY['top'::text, 'mid'::text, 'bottom'::text])),
  is_active boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  page_number integer DEFAULT 1 CHECK (page_number >= 1 AND page_number <= 5),
  CONSTRAINT featured_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT featured_blocks_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

CREATE TABLE app.featured_block_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT featured_block_items_pkey PRIMARY KEY (id),
  CONSTRAINT featured_block_items_block_id_fkey FOREIGN KEY (block_id) REFERENCES app.featured_blocks(id),
  CONSTRAINT featured_block_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

-- ─── weekly_reports / push_subscriptions / restaurant_notification_settings /
--     push_notifications_log ────────────────────────────────────────────────
CREATE TABLE app.weekly_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text])),
  stats_snapshot jsonb,
  sent_by uuid,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_via text NOT NULL DEFAULT 'manual'::text CHECK (sent_via = ANY (ARRAY['manual'::text, 'auto_push'::text])),
  CONSTRAINT weekly_reports_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_reports_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT weekly_reports_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES app.profiles(id)
);

CREATE TABLE app.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  restaurant_id uuid,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES app.profiles(id),
  CONSTRAINT push_subscriptions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

CREATE TABLE app.restaurant_notification_settings (
  restaurant_id uuid NOT NULL,
  new_order_enabled boolean NOT NULL DEFAULT true,
  cart_abandonment_enabled boolean NOT NULL DEFAULT true,
  cart_abandonment_delay_hours integer NOT NULL DEFAULT 48,
  cart_abandonment_last_checked_at timestamp with time zone,
  weekly_report_auto_enabled boolean NOT NULL DEFAULT true,
  recommendations_enabled boolean NOT NULL DEFAULT true,
  recommendations_last_sent_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  pending_orders_enabled boolean NOT NULL DEFAULT true,
  pending_orders_delay_hours integer NOT NULL DEFAULT 48,
  pending_orders_last_sent_at timestamp with time zone,
  review_received_enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT restaurant_notification_settings_pkey PRIMARY KEY (restaurant_id),
  CONSTRAINT restaurant_notification_settings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id)
);

CREATE TABLE app.push_notifications_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  restaurant_id uuid,
  profile_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text, 'skipped'::text])),
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_notifications_log_pkey PRIMARY KEY (id),
  CONSTRAINT push_notifications_log_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES app.restaurants(id),
  CONSTRAINT push_notifications_log_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES app.profiles(id)
);

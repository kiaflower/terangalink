-- Infrastructure notifications push (PWA) — Phase 2 : abonnements, réglages
-- par boutique, journal des envois. Les envois eux-mêmes passent par
-- adminClient (service role) depuis les routes API/cron, donc les policies
-- RLS ci-dessous ne couvrent que l'auto-gestion par l'utilisateur connecté
-- (souscrire/désinscrire son propre appareil, lire/modifier ses réglages).

-- 1. Abonnements push : un par (utilisateur, navigateur/appareil). Un admin
--    de boutique avec plusieurs appareils a plusieurs lignes ; boutique_id
--    est dénormalisé pour permettre `where boutique_id = X` sans jointure
--    au moment de l'envoi (chemin chaud, potentiellement plusieurs admins).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  boutique_id uuid references boutiques(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_boutique on push_subscriptions(boutique_id);
create index if not exists idx_push_subscriptions_profile on push_subscriptions(profile_id);

alter table push_subscriptions enable row level security;

drop policy if exists own_subscriptions on push_subscriptions;
create policy own_subscriptions on push_subscriptions
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists super_admin_full_access on push_subscriptions;
create policy super_admin_full_access on push_subscriptions
  for all using (is_super_admin()) with check (is_super_admin());

-- 2. Réglages de notification par boutique — une ligne par boutique, créée à
--    la demande (upsert) plutôt que backfillée : une boutique sans ligne
--    utilise les valeurs par défaut ci-dessous côté application.
create table if not exists boutique_notification_settings (
  boutique_id uuid primary key references boutiques(id) on delete cascade,
  new_order_enabled boolean not null default true,
  cart_abandonment_enabled boolean not null default true,
  cart_abandonment_delay_hours integer not null default 48,
  cart_abandonment_last_checked_at timestamptz,
  weekly_report_auto_enabled boolean not null default true,
  recommendations_enabled boolean not null default true,
  recommendations_last_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table boutique_notification_settings enable row level security;

drop policy if exists own_notification_settings on boutique_notification_settings;
create policy own_notification_settings on boutique_notification_settings
  for all using (
    boutique_id in (select boutique_id from profiles where id = auth.uid())
  ) with check (
    boutique_id in (select boutique_id from profiles where id = auth.uid())
  );

drop policy if exists super_admin_full_access on boutique_notification_settings;
create policy super_admin_full_access on boutique_notification_settings
  for all using (is_super_admin()) with check (is_super_admin());

-- 3. Journal des notifications envoyées — un enregistrement par déclenchement
--    logique (pas par appareil), pour pouvoir déboguer "pourquoi je n'ai rien
--    reçu" sans fouiller les logs serveur. boutique_id/profile_id nullables
--    car les alertes super-admin (Phase 3) ne concernent aucune boutique.
create table if not exists push_notifications_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  boutique_id uuid references boutiques(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  title text not null,
  body text not null,
  recipient_count integer not null default 0,
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_log_boutique_created on push_notifications_log(boutique_id, created_at desc);
create index if not exists idx_push_log_type_created on push_notifications_log(type, created_at desc);

alter table push_notifications_log enable row level security;

drop policy if exists super_admin_full_access on push_notifications_log;
create policy super_admin_full_access on push_notifications_log
  for all using (is_super_admin()) with check (is_super_admin());

-- 4. Distinguer un rapport hebdomadaire envoyé automatiquement (cron) d'un
--    envoi manuel (bouton super-admin existant) — utile pour déboguer sans
--    devoir croiser avec push_notifications_log.
alter table weekly_reports add column if not exists sent_via text not null default 'manual' check (sent_via in ('manual', 'auto_push'));

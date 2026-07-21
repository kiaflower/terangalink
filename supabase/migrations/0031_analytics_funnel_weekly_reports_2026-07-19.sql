-- Base technique commune pour le parcours d'achat (analytics), l'abandon de
-- panier, les recommandations par règles et le rapport hebdomadaire (super admin).

-- 1. Rattacher les événements analytics à une session anonyme (localStorage
--    côté client) pour distinguer les visiteurs plutôt que compter des
--    événements bruts (paniers créés, abandon de panier).
alter table analytics_events add column if not exists session_id text;
create index if not exists idx_analytics_events_boutique_session on analytics_events(boutique_id, session_id);
create index if not exists idx_analytics_events_boutique_type_created on analytics_events(boutique_id, event_type, created_at);

-- Nouveaux event_type utilisés par le parcours d'achat (colonne texte libre,
-- pas de contrainte check à faire évoluer) : 'product_view', 'whatsapp_click',
-- 'cart_cleared'. Existants : 'boutique_view', 'add_to_cart'.

-- 2. Historique des rapports hebdomadaires envoyés manuellement par le super
--    admin — évite les doublons et permet de voir en un coup d'œil qui a
--    déjà reçu son rapport cette semaine (sans bloquer un renvoi volontaire).
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  boutique_id uuid not null references boutiques(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  stats_snapshot jsonb,
  sent_by uuid references profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_weekly_reports_boutique_sent_at on weekly_reports(boutique_id, sent_at desc);

alter table weekly_reports enable row level security;
drop policy if exists super_admin_full_access on weekly_reports;
create policy super_admin_full_access on weekly_reports
  for all using (is_super_admin()) with check (is_super_admin());

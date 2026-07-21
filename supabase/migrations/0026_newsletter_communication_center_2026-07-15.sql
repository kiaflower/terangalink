-- TerangaSpot — migration du 2026-07-15 (Centre de Communication / Newsletter)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

-- ============================================================
-- 1. Consentement newsletter + dernière connexion boutique
-- ============================================================

alter table boutiques add column if not exists newsletter_opt_in boolean not null default false;
alter table boutiques add column if not exists last_login_at timestamptz;

create index if not exists idx_boutiques_newsletter_opt_in on boutiques (newsletter_opt_in);

-- ============================================================
-- 2. Campagnes newsletter
-- ============================================================

create table if not exists newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  preview_text text,
  from_name text not null default 'TerangaSpot',
  blocks jsonb not null default '[]'::jsonb,
  segment jsonb not null default '{"type":"all"}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table newsletter_campaigns enable row level security;

drop policy if exists "Super admin all newsletter campaigns" on newsletter_campaigns;
create policy "Super admin all newsletter campaigns"
on newsletter_campaigns for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

-- ============================================================
-- 3. Destinataires par campagne (état d'envoi + stats)
-- ============================================================

create table if not exists newsletter_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references newsletter_campaigns(id) on delete cascade,
  boutique_id uuid not null references boutiques(id) on delete cascade,
  email text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'opened', 'clicked', 'failed', 'unsubscribed')),
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  click_count integer not null default 0,
  first_clicked_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, boutique_id)
);

alter table newsletter_recipients enable row level security;

drop policy if exists "Super admin all newsletter recipients" on newsletter_recipients;
create policy "Super admin all newsletter recipients"
on newsletter_recipients for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

create index if not exists idx_newsletter_recipients_campaign_status on newsletter_recipients (campaign_id, status);

-- ============================================================
-- 4. Bucket Storage pour les images de la newsletter
-- ============================================================

insert into storage.buckets (id, name, public)
values ('newsletter-images', 'newsletter-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read newsletter-images" on storage.objects;
create policy "Public read newsletter-images"
on storage.objects for select using (bucket_id = 'newsletter-images');

drop policy if exists "Authenticated upload newsletter-images" on storage.objects;
create policy "Authenticated upload newsletter-images"
on storage.objects for insert with check (bucket_id = 'newsletter-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete newsletter-images" on storage.objects;
create policy "Authenticated delete newsletter-images"
on storage.objects for delete using (bucket_id = 'newsletter-images' and auth.role() = 'authenticated');

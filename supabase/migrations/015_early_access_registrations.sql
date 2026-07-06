-- ============================================================
-- TerangaLink — Early Access : inscription complète (page /early-access)
-- Une ligne = une candidature au programme Early Access (15 places).
-- "Prise" dès la soumission (status != 'rejected') ; slot_number est assigné
-- manuellement par le super-admin au moment de l'acceptation (voir dashboard).
-- ============================================================

create table if not exists public.early_access_registrations (
  id                    uuid default uuid_generate_v4() primary key,

  restaurant_name       text not null,
  admin_name            text not null,
  phone                 text not null,
  whatsapp              text not null,
  address               text,
  neighborhood          text,
  city                  text,

  wave_number           text,
  orange_money_number   text,

  logo_url              text,
  banner_url            text,
  color_choice          text not null default 'terangalink' check (color_choice in ('terangalink', 'custom')),
  primary_color         text,
  secondary_color       text,

  facebook_url          text,
  instagram_url         text,
  tiktok_url            text,
  snapchat_url          text,

  status                text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  slot_number           integer,
  admin_notes           text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_early_access_registrations_status on public.early_access_registrations(status);
create unique index if not exists idx_early_access_registrations_slot_number on public.early_access_registrations(slot_number) where slot_number is not null;

alter table public.early_access_registrations enable row level security;

do $$ begin
  create policy "early_access_registrations: anyone can insert"
    on public.early_access_registrations for insert
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "early_access_registrations: super_admin full access"
    on public.early_access_registrations for all
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role = 'super_admin'
      )
    );
exception when duplicate_object then null; end $$;

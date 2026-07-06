-- ============================================================
-- TerangaLink — Early Access : capture prénom + WhatsApp
-- Utilisé par le bouton "Offre Early Access" sur /pour-les-restaurants.
-- Tant que moins de 15 places sont prises (type='reservation'), les nouvelles
-- entrées comptent dans le quota. Au-delà, elles basculent en 'waitlist'.
-- ============================================================

create table if not exists public.early_access_leads (
  id          uuid default uuid_generate_v4() primary key,
  prenom      text not null,
  whatsapp    text not null,
  type        text not null default 'reservation' check (type in ('reservation', 'waitlist')),
  contacted   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_early_access_leads_type on public.early_access_leads(type);

alter table public.early_access_leads enable row level security;

do $$ begin
  create policy "early_access_leads: super_admin full access"
    on public.early_access_leads for all
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role = 'super_admin'
      )
    );
exception when duplicate_object then null; end $$;

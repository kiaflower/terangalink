-- ============================================================
-- TerangaLink Phase 8 — Platform settings table
-- Stores editable contact info + platform config
-- ============================================================

create table if not exists public.platform_settings (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insert default values
insert into public.platform_settings (key, value) values
  ('whatsapp', '221700000000'),
  ('email', 'support@terangalink.sn'),
  ('city', 'Dakar, Sénégal'),
  ('platform_name', 'TerangaLink'),
  ('platform_url', 'https://terangalink.sn')
on conflict (key) do nothing;

-- RLS: public read, super_admin write
alter table public.platform_settings enable row level security;

create policy "settings: public read"
  on public.platform_settings for select
  using (true);

create policy "settings: super_admin write"
  on public.platform_settings for all
  using (public.get_my_role() = 'super_admin');

-- Extra settings keys
insert into public.platform_settings (key, value) values
  ('city', 'Dakar, Sénégal')
on conflict (key) do nothing;

-- ============================================================
-- TerangaLink — Simplification abonnements Starter / Pro
-- ============================================================

-- Keep legacy enum values for backward compatibility, but ensure the two
-- canonical commercial plans exist everywhere.
do $$ begin
  alter type subscription_plan add value if not exists 'starter';
exception when others then null;
end $$;

do $$ begin
  alter type subscription_plan add value if not exists 'pro';
exception when others then null;
end $$;

alter table public.restaurants
  add column if not exists button_color text default '#F97316',
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text;

-- Canonicalize existing restaurants without deleting any data outside the old
-- duration plan labels. Monthly/quarterly become Starter; annual/enterprise
-- become Pro to preserve advanced customization for previously highest-tier
-- customers.
update public.subscriptions set plan = 'starter' where plan in ('mensuel', 'trimestriel');
update public.subscriptions set plan = 'pro' where plan in ('annuel', 'enterprise');

-- Starter must always use TerangaLink visual identity and visible branding.
update public.restaurants r
set
  primary_color = '#F97316',
  background_color = '#0A0A0A',
  button_color = '#F97316',
  theme_mode = 'dark',
  facebook_url = null,
  instagram_url = null,
  tiktok_url = null
from public.subscriptions s
where s.restaurant_id = r.id
  and s.plan = 'starter';

-- DB-level guard: restaurant admins may keep managing operational settings,
-- but visual identity, Pro social links and subscription-gated appearance are
-- only editable by TerangaLink super admins.
create or replace function public.prevent_restaurant_admin_visual_updates()
returns trigger as $$
declare
  current_role user_role;
begin
  select role into current_role from public.profiles where id = auth.uid();

  if current_role = 'restaurant_admin' and (
    new.primary_color is distinct from old.primary_color or
    new.background_color is distinct from old.background_color or
    new.button_color is distinct from old.button_color or
    new.accent_color is distinct from old.accent_color or
    new.theme_mode is distinct from old.theme_mode or
    new.facebook_url is distinct from old.facebook_url or
    new.instagram_url is distinct from old.instagram_url or
    new.tiktok_url is distinct from old.tiktok_url
  ) then
    raise exception 'La personnalisation visuelle est réservée aux administrateurs TerangaLink autorisés.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists restaurants_visual_admin_guard on public.restaurants;
create trigger restaurants_visual_admin_guard
  before update on public.restaurants
  for each row execute function public.prevent_restaurant_admin_visual_updates();

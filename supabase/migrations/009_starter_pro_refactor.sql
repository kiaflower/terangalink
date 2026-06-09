-- ============================================================
-- TerangaLink — Starter / Pro subscription refactor
-- Keeps the existing PostgreSQL enum compatible, but normalizes
-- every active application value to starter/pro.
-- ============================================================

-- Ensure target values exist on databases that started from an
-- intermediate mensuel/trimestriel/annuel-only state.
do $$ begin
  alter type subscription_plan add value if not exists 'starter';
exception when others then null;
end $$;

do $$ begin
  alter type subscription_plan add value if not exists 'pro';
exception when others then null;
end $$;

-- Normalize legacy plans.
update public.subscriptions
set plan = 'starter'
where plan::text in ('mensuel', 'starter', 'trial', 'free', 'demo');

update public.subscriptions
set plan = 'pro'
where plan::text in ('trimestriel', 'annuel', 'pro', 'enterprise', 'premium');

alter table public.subscriptions
  alter column plan set default 'starter';

-- Public restaurant customization controlled by Super Admin.
alter table public.restaurants
  add column if not exists button_color text default '#F97316',
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists website_url text,
  add column if not exists wave_number text,
  add column if not exists orange_money_number text,
  add column if not exists prep_time_minutes integer default 25;

-- Public pages must know which feature set applies. The app also
-- fetches via service role server-side, but this policy keeps direct
-- public reads safe because only plan/status are non-sensitive.
do $$ begin
  create policy "subscriptions: public can read public plan"
    on public.subscriptions for select
    using (status in ('active', 'trial'));
exception when duplicate_object then null;
end $$;

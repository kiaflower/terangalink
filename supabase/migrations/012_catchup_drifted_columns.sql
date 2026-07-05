-- ============================================================
-- TerangaLink — Migration de rattrapage
-- Ces colonnes/tables sont déjà utilisées par le code applicatif
-- et existent en production, mais n'avaient jamais été committées
-- dans une migration versionnée. Tout est idempotent (IF NOT EXISTS)
-- donc sans effet si déjà présent.
--
-- NB : la génération du order_number (format TL-XXXXXX) existe déjà
-- en prod via un mécanisme non documenté — cette migration ne touche
-- pas à cette logique, elle garantit seulement la présence de la colonne.
-- ============================================================

-- ─── orders : colonnes manquantes ─────────────────────────────────────────────
alter table public.orders
  add column if not exists order_number text,
  add column if not exists customer_address text,
  add column if not exists discount_amount integer not null default 0,
  add column if not exists is_paid boolean not null default false;

-- order_number est incrémental PAR RESTAURANT (pas global : deux restaurants
-- peuvent avoir chacun une commande TL-000054). L'unicité ne peut donc être
-- garantie qu'au sein d'un même restaurant.
create unique index if not exists idx_orders_restaurant_order_number_unique
  on public.orders(restaurant_id, order_number)
  where order_number is not null;

-- ─── promo_codes ───────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id                uuid default uuid_generate_v4() primary key,
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  code              text not null,
  discount_type     text not null check (discount_type in ('fixed', 'percent')),
  value             integer not null,
  min_order_amount  integer,
  starts_at         timestamptz,
  expires_at        timestamptz,
  max_uses          integer,
  uses_count        integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (restaurant_id, code)
);

create index if not exists idx_promo_codes_restaurant_id on public.promo_codes(restaurant_id);

alter table public.orders
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null;

alter table public.promo_codes enable row level security;

do $$ begin
  create policy "promo_codes: public can read active"
    on public.promo_codes for select
    using (is_active = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "promo_codes: admin can manage own"
    on public.promo_codes for all
    using (
      public.get_my_role() = 'restaurant_admin'
      and restaurant_id = public.get_my_restaurant_id()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "promo_codes: super_admin full access"
    on public.promo_codes for all
    using (public.get_my_role() = 'super_admin');
exception when duplicate_object then null; end $$;

create or replace trigger promo_codes_updated_at
  before update on public.promo_codes
  for each row execute function handle_updated_at();

-- ─── reviews ────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id              uuid default uuid_generate_v4() primary key,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  customer_name   text,
  rating          integer not null check (rating between 1 and 5),
  comment         text,
  is_visible      boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_reviews_restaurant_id on public.reviews(restaurant_id);
create unique index if not exists idx_reviews_order_id_unique on public.reviews(order_id) where order_id is not null;

alter table public.reviews enable row level security;

do $$ begin
  create policy "reviews: public can read visible"
    on public.reviews for select
    using (is_visible = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reviews: anyone can insert"
    on public.reviews for insert
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reviews: admin can manage own"
    on public.reviews for all
    using (
      public.get_my_role() = 'restaurant_admin'
      and restaurant_id = public.get_my_restaurant_id()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reviews: super_admin full access"
    on public.reviews for all
    using (public.get_my_role() = 'super_admin');
exception when duplicate_object then null; end $$;

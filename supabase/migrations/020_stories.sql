-- ============================================================
-- TerangaLink — Stories éphémères (24h) par restaurant.
-- Pas de cron sur ce projet : l'expiration repose sur le filtre
-- expires_at > now() en lecture. Nettoyage opportuniste (DELETE)
-- déclenché côté application au chargement du dashboard
-- restaurateur, jamais sur la page annuaire publique.
-- ============================================================

create table if not exists public.stories (
  id            uuid default uuid_generate_v4() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  media_type    text not null check (media_type in ('image', 'video')),
  media_url     text not null,
  caption       text check (char_length(caption) <= 150),
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  view_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_stories_restaurant_expires on public.stories(restaurant_id, expires_at);
create index if not exists idx_stories_expires_at on public.stories(expires_at);

-- ─── Défense en profondeur ────────────────────────────────────
-- Limite de 3 stories actives + cohérence menu_item_id (doit
-- appartenir au même restaurant), vérifiées en base même si
-- l'UI ne propose déjà que les produits du restaurant courant.
create or replace function public.check_story_insert()
returns trigger as $$
declare
  active_count integer;
  item_owner uuid;
begin
  select count(*) into active_count
  from public.stories
  where restaurant_id = new.restaurant_id and expires_at > now();

  if active_count >= 3 then
    raise exception 'STORY_LIMIT_REACHED';
  end if;

  if new.menu_item_id is not null then
    select restaurant_id into item_owner from public.menu_items where id = new.menu_item_id;
    if item_owner is null or item_owner <> new.restaurant_id then
      raise exception 'STORY_INVALID_MENU_ITEM';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_story_insert on public.stories;
create trigger trg_check_story_insert
  before insert on public.stories
  for each row execute function public.check_story_insert();

-- ─── Incrémentation atomique des vues ─────────────────────────
-- Appelée en RPC directement par les visiteurs anonymes depuis la
-- page publique (pas de policy UPDATE exposée sur la table).
create or replace function public.increment_story_view(p_story_id uuid)
returns void as $$
begin
  update public.stories set view_count = view_count + 1
  where id = p_story_id and expires_at > now();
end;
$$ language plpgsql security definer;

grant execute on function public.increment_story_view(uuid) to anon, authenticated;

-- ─── RLS ───────────────────────────────────────────────────────
alter table public.stories enable row level security;

drop policy if exists "stories: public can read active" on public.stories;
create policy "stories: public can read active"
  on public.stories for select
  using (expires_at > now());

drop policy if exists "stories: admin can create own" on public.stories;
create policy "stories: admin can create own"
  on public.stories for insert
  with check (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

drop policy if exists "stories: admin can delete own" on public.stories;
create policy "stories: admin can delete own"
  on public.stories for delete
  using (
    public.get_my_role() = 'restaurant_admin'
    and restaurant_id = public.get_my_restaurant_id()
  );

drop policy if exists "stories: super_admin full access" on public.stories;
create policy "stories: super_admin full access"
  on public.stories for all
  using (public.get_my_role() = 'super_admin');

-- ─── Bucket Storage dédié : story-media ────────────────────────
-- Séparé de menu-images, qui autorise l'upload public anonyme
-- (migration 019, pour l'inscription) — inadapté ici : l'upload
-- de stories doit être réservé aux restaurateurs connectés.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-media', 'story-media', true,
  31457280, -- 30MB (marge au-dessus de la limite applicative vidéo 25MB)
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "story-media: public read"
    on storage.objects for select
    using (bucket_id = 'story-media');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "story-media: authenticated upload"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'story-media');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "story-media: authenticated delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'story-media');
exception when duplicate_object then null; end $$;

-- TerangaSpot — migration du 2026-07-18 (Blocs "Coups de cœur" multi-boutiques + pagination)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

alter table featured_blocks add column if not exists page_number integer default 1 check (page_number between 1 and 5);
alter table featured_blocks alter column boutique_id drop not null;

create table if not exists featured_block_items (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references featured_blocks(id) on delete cascade not null,
  boutique_id uuid references boutiques(id) not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table featured_block_items enable row level security;

drop policy if exists "Public read block items" on featured_block_items;
create policy "Public read block items" on featured_block_items for select using (true);

drop policy if exists "Super admin all block items" on featured_block_items;
create policy "Super admin all block items" on featured_block_items for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

-- Reprend les blocs existants (une boutique par bloc) dans la nouvelle table de liaison.
insert into featured_block_items (block_id, boutique_id, sort_order)
select id, boutique_id, 0 from featured_blocks where boutique_id is not null
on conflict do nothing;

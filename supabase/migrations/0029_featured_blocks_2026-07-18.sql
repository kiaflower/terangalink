-- TerangaSpot — migration du 2026-07-18 (Blocs "Coups de cœur" configurables)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

create table if not exists featured_blocks (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Coup de cœur de la semaine',
  boutique_id uuid references boutiques(id) not null,
  position text default 'top' check (position in ('top', 'mid', 'bottom')),
  is_active boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table featured_blocks enable row level security;

drop policy if exists "Public read active blocks" on featured_blocks;
create policy "Public read active blocks" on featured_blocks for select using (is_active = true);

drop policy if exists "Super admin all blocks" on featured_blocks;
create policy "Super admin all blocks" on featured_blocks for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

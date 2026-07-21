-- TerangaSpot — migration du 2026-07-08 (bucket Storage pour les stories)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).

insert into storage.buckets (id, name, public)
values ('boutique-stories', 'boutique-stories', true)
on conflict (id) do nothing;

drop policy if exists "Public read boutique-stories" on storage.objects;
create policy "Public read boutique-stories"
on storage.objects for select using (bucket_id = 'boutique-stories');

drop policy if exists "Authenticated upload boutique-stories" on storage.objects;
create policy "Authenticated upload boutique-stories"
on storage.objects for insert with check (bucket_id = 'boutique-stories' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete boutique-stories" on storage.objects;
create policy "Authenticated delete boutique-stories"
on storage.objects for delete using (bucket_id = 'boutique-stories' and auth.role() = 'authenticated');

-- Vidéo optionnelle en fiche produit, en plus des photos. Bucket dédié
-- (plutôt que réutiliser boutique-stories) car les stories expirent après
-- 24h alors qu'une vidéo produit doit persister indéfiniment.
alter table products add column if not exists video_url text;

insert into storage.buckets (id, name, public)
values ('product-videos', 'product-videos', true)
on conflict (id) do nothing;

drop policy if exists "Public read product-videos" on storage.objects;
create policy "Public read product-videos"
on storage.objects for select using (bucket_id = 'product-videos');

drop policy if exists "Authenticated upload product-videos" on storage.objects;
create policy "Authenticated upload product-videos"
on storage.objects for insert with check (bucket_id = 'product-videos' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete product-videos" on storage.objects;
create policy "Authenticated delete product-videos"
on storage.objects for delete using (bucket_id = 'product-videos' and auth.role() = 'authenticated');

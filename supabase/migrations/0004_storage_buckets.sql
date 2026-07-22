-- Buckets de storage utilisés par le code (logos/couvertures, photos de plats et de
-- variantes, vidéos de plat, stories, images de newsletter). Tous publics en lecture
-- (le code appelle systématiquement getPublicUrl() après upload, jamais d'URL signée),
-- écriture restreinte au restaurateur propriétaire du dossier ${restaurant_id}/... ou
-- au super-admin. S'appuie sur app.same_restaurant()/app.is_super_admin(), déjà créées
-- et testées en 0002 — pas de nouvelle logique RLS, juste la même appliquée à
-- storage.objects.
--
-- Les routes qui uploadent via le client admin (service role — early-access,
-- inscriptions) bypassent RLS de toute façon, aucune policy requise pour ces cas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurant-images', 'restaurant-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('product-videos', 'product-videos', true, 20971520, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('restaurant-stories', 'restaurant-stories', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('newsletter-images', 'newsletter-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── Lecture publique sur les 5 buckets ────────────────────────────────────
create policy "Public read restaurant-images" on storage.objects for select
  using (bucket_id = 'restaurant-images');
create policy "Public read product-images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "Public read product-videos" on storage.objects for select
  using (bucket_id = 'product-videos');
create policy "Public read restaurant-stories" on storage.objects for select
  using (bucket_id = 'restaurant-stories');
create policy "Public read newsletter-images" on storage.objects for select
  using (bucket_id = 'newsletter-images');

-- ─── Écriture restreinte au restaurateur propriétaire du dossier, ou super-admin ──
create policy "Restaurant admin manage own restaurant-images" on storage.objects for all
  using (bucket_id = 'restaurant-images' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()))
  with check (bucket_id = 'restaurant-images' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()));

create policy "Restaurant admin manage own product-images" on storage.objects for all
  using (bucket_id = 'product-images' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()))
  with check (bucket_id = 'product-images' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()));

create policy "Restaurant admin manage own product-videos" on storage.objects for all
  using (bucket_id = 'product-videos' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()))
  with check (bucket_id = 'product-videos' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()));

create policy "Restaurant admin manage own restaurant-stories" on storage.objects for all
  using (bucket_id = 'restaurant-stories' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()))
  with check (bucket_id = 'restaurant-stories' and (app.same_restaurant(((storage.foldername(name))[1])::uuid) or app.is_super_admin()));

-- newsletter-images : super-admin uniquement (composé depuis le centre de
-- communication, jamais depuis le dashboard restaurateur).
create policy "Super admin manage newsletter-images" on storage.objects for all
  using (bucket_id = 'newsletter-images' and app.is_super_admin())
  with check (bucket_id = 'newsletter-images' and app.is_super_admin());

-- ============================================================
-- TerangaLink — Autorise l'upload public (visiteur anonyme) dans le bucket
-- menu-images. Corrige l'upload logo/bannière cassé sur /inscription ET
-- /early-access/inscription (aucune policy INSERT publique n'existait).
-- ============================================================

do $$ begin
  create policy "menu-images: public upload"
    on storage.objects for insert
    to public
    with check (bucket_id = 'menu-images');
exception when duplicate_object then null; end $$;

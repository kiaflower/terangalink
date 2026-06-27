-- ============================================================
-- TerangaLink — Nouveaux statuts de commande
-- Ajoute : confirmed, delivery_cancelled
-- Active : realtime sur la table orders
-- ============================================================

-- Ajouter les valeurs à l'enum order_status (idempotent)
do $$ begin
  alter type public.order_status add value if not exists 'confirmed';
exception when others then null;
end $$;

do $$ begin
  alter type public.order_status add value if not exists 'delivery_cancelled';
exception when others then null;
end $$;

-- Activer realtime sur la table orders (idempotent)
do $$ begin
  perform pg_catalog.set_config('search_path', 'public', false);
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
exception when others then null;
end $$;

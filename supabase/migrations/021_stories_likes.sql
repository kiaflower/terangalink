-- ============================================================
-- TerangaLink — Ajoute les likes aux stories (visibles uniquement
-- par le restaurateur dans son dashboard, comme les vues).
-- ============================================================

alter table public.stories add column if not exists like_count integer not null default 0;

-- Toggle like/unlike, appelé anonymement depuis le lecteur public.
create or replace function public.set_story_like(p_story_id uuid, p_liked boolean)
returns void as $$
begin
  update public.stories
  set like_count = greatest(0, like_count + (case when p_liked then 1 else -1 end))
  where id = p_story_id and expires_at > now();
end;
$$ language plpgsql security definer;

grant execute on function public.set_story_like(uuid, boolean) to anon, authenticated;

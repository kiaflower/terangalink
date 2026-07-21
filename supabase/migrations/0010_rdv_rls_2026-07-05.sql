-- TerangaSpot — migration du 2026-07-05 (RLS sur le module rendez-vous)
-- À coller et exécuter dans l'éditeur SQL de Supabase (Dashboard > SQL Editor).
-- Ces tables sont utilisées par /api/availability-settings, /api/rdv-slots et
-- /api/appointment-requests via le client admin (bypass RLS), mais n'avaient
-- jusqu'ici aucune policy : sans RLS activée, elles restent interrogeables/
-- modifiables directement avec la clé anon en contournant l'API.

alter table if exists availability_settings enable row level security;
drop policy if exists "Public read availability" on availability_settings;
create policy "Public read availability" on availability_settings for select using (true);
drop policy if exists "Super admin write availability" on availability_settings;
create policy "Super admin write availability" on availability_settings for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

alter table if exists recurring_slots enable row level security;
drop policy if exists "Public read recurring slots" on recurring_slots;
create policy "Public read recurring slots" on recurring_slots for select using (true);
drop policy if exists "Super admin manage recurring slots" on recurring_slots;
create policy "Super admin manage recurring slots" on recurring_slots for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

alter table if exists rdv_slots enable row level security;
drop policy if exists "Public read rdv slots" on rdv_slots;
create policy "Public read rdv slots" on rdv_slots for select using (true);
drop policy if exists "Super admin manage rdv slots" on rdv_slots;
create policy "Super admin manage rdv slots" on rdv_slots for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

alter table if exists appointment_requests enable row level security;
drop policy if exists "Public insert appointment" on appointment_requests;
create policy "Public insert appointment" on appointment_requests for insert with check (true);
drop policy if exists "Super admin read appointments" on appointment_requests;
create policy "Super admin read appointments" on appointment_requests for select using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);
drop policy if exists "Super admin update appointments" on appointment_requests;
create policy "Super admin update appointments" on appointment_requests for update using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'super_admin')
);

-- ============================================================
-- TerangaLink — Fusion des paliers Pro / Premium en un seul plan "Pro"
-- Nouveaux tarifs : Starter 9 900 FCFA/mois, Pro 19 900 FCFA/mois.
-- Les abonnés déjà sur l'ancien Pro (15 000) ou Premium (25 000) gardent
-- leur prix actuel via legacy_price — ils ne sont pas basculés au nouveau
-- tarif automatiquement.
-- ============================================================

alter table public.subscriptions
  add column if not exists legacy_price integer;

-- Verrouille le prix actuel des abonnés déjà facturés à l'ancien tarif,
-- avant de fusionner leur palier dans "pro". Starter inclus : les abonnés
-- déjà là restent à 9 000, seuls les nouveaux inscrits paient 9 900.
update public.subscriptions
set legacy_price = 9000
where plan = 'starter' and legacy_price is null;

update public.subscriptions
set legacy_price = 15000
where plan = 'pro' and legacy_price is null;

update public.subscriptions
set legacy_price = 25000
where plan = 'premium' and legacy_price is null;

update public.subscriptions
set plan = 'pro'
where plan = 'premium';

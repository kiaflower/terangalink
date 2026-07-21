-- Le plan Free existe désormais côté application (voir src/lib/plans.ts) mais
-- la contrainte check sur subscriptions.plan n'autorisait encore que
-- ('starter', 'pro') — aucune boutique ne pouvait donc réellement être
-- enregistrée en Free, quelle que soit l'UI utilisée pour essayer.
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check
  check (plan in ('free', 'starter', 'pro'));

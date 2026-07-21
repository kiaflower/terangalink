-- Deux déclencheurs boutique supplémentaires : rappel de commandes pas
-- encore marquées "livrée" (le dashboard ne compte le revenu que sur les
-- commandes livrées, donc une commande oubliée fausse "Revenus ce mois") et
-- notification à la réception d'un avis client.
alter table boutique_notification_settings add column if not exists pending_orders_enabled boolean not null default true;
alter table boutique_notification_settings add column if not exists pending_orders_delay_hours integer not null default 48;
alter table boutique_notification_settings add column if not exists pending_orders_last_sent_at timestamptz;
alter table boutique_notification_settings add column if not exists review_received_enabled boolean not null default true;

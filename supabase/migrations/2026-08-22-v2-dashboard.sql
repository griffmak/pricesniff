-- supabase/migrations/2026-08-22-v2-dashboard.sql
-- v2 dashboard: store the cheapest alternative alongside each daily snapshot so the
-- dashboard never has to call the Kroger API on a page view (protects the
-- still-unconfirmed public-tier rate limit).
alter table price_snapshots add column if not exists alt_product_id text;
alter table price_snapshots add column if not exists alt_product_description text;
alter table price_snapshots add column if not exists alt_price numeric;

-- Onboarding no longer collects a browser push subscription (push delivery is broken
-- and tabled). The column stays for the later push fix-up, but must accept null now.
alter table watchers alter column push_subscription drop not null;

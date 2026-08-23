-- supabase/migrations/2026-08-23-multi-alternatives.sql
-- Single-screen UI: the expanded card shows up to 3 alternatives side by side with
-- brand/size/category, so one alt_* triple is no longer enough. Captured once daily
-- by the cron, exactly like the existing alt_* columns — the dashboard still never
-- calls Kroger on a page view.
--
-- The legacy alt_product_id / alt_product_description / alt_price columns are KEPT
-- and still written: they back the collapsed card's "Cheaper option" pill, and every
-- historical row already has them. Historical rows are deliberately NOT backfilled —
-- `alternatives` is null for them and the UI renders that as "no comparison yet".

alter table price_snapshots add column if not exists alternatives jsonb;
alter table price_snapshots add column if not exists product_brand text;
alter table price_snapshots add column if not exists product_size text;
alter table price_snapshots add column if not exists product_category text;

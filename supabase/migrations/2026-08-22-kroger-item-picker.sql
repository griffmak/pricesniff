-- supabase/migrations/2026-08-22-kroger-item-picker.sql
-- Item-picker feature: a staple can now lock onto a specific Kroger productId
-- instead of being re-resolved to "top search result" every cron run.
-- Nullable and no backfill — existing staples keep today's term-search
-- behavior (see check-prices route) until re-picked through the new search UI.
alter table staples add column if not exists product_id text;
alter table staples add column if not exists tracked_description text;

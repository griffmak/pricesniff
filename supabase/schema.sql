-- supabase/schema.sql
-- No RLS policies needed for v1: this app has no end-user auth, every write
-- goes through server-only API routes using the service-role key. If v1
-- graduates to multi-tenant, RLS must be added before any client-side reads.

create table watchers (
  id uuid primary key default gen_random_uuid(),
  zip_code text not null,
  location_id text not null,       -- Kroger locationId nearest to zip_code
  push_subscription jsonb,         -- nullable: push is tabled, onboarding no longer collects it
  created_at timestamptz not null default now()
);

create table staples (
  id uuid primary key default gen_random_uuid(),
  watcher_id uuid not null references watchers(id) on delete cascade,
  search_term text not null,        -- e.g. "eggs", "whole milk"
  created_at timestamptz not null default now()
);

create table price_snapshots (
  id uuid primary key default gen_random_uuid(),
  staple_id uuid not null references staples(id) on delete cascade,
  product_id text not null,         -- Kroger productId of the matched item
  product_description text not null,
  price numeric not null,
  alt_product_id text,              -- cheapest same-search-term alternative, stored daily
  alt_product_description text,
  alt_price numeric,
  captured_at timestamptz not null default now()
);

create index price_snapshots_staple_captured_idx
  on price_snapshots (staple_id, captured_at desc);

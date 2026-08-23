# Kroger item-picker design

**Date:** 2026-08-22
**Status:** approved, pending implementation plan

## Goal

Replace the hardcoded 10-item staple checklist with live Kroger product search, let the user pick and lock a specific product (not just a search term), and add a minimal per-staple detail page reachable by clicking a staple's name on the dashboard.

Sequenced after the visual restyle project — no dependency on it, just ordered second so the two efforts don't collide in the Lovable-generated files.

## Current state (context)

- `lib/kroger.ts` already implements `getKrogerToken`, `findNearestLocationId`, and `searchProducts(term, locationId)` — tested, but never called from a client-facing route.
- `staples` table currently stores only `search_term`. The daily cron (`app/api/cron/check-prices/route.ts`) re-runs `searchProducts(search_term, locationId)` every day and tracks whichever product ranks #1 — this can silently drift to a different product over time.
- `app/onboarding/StapleForm.tsx` is a hardcoded checklist of 10 common staples; `/api/push/subscribe` diffs submitted staples against existing ones by `search_term` string equality.
- No staple detail page exists. `StapleCard`'s title is plain text, not a link.
- Single-tenant: `/api/push/subscribe` explicitly assumes there is only ever one watcher row.

## Decisions

1. **Product locking.** When a user picks a product from live search, PriceSniff locks onto that exact `productId` going forward. The cron reprices that specific product by ID every day instead of re-searching and taking the top result.
2. **Legacy staples.** Existing staples (picked via the old checklist) have no `product_id`. No backfill — the cron keeps today's term-search-top-result behavior for any staple with `product_id = null`, until the user re-picks it through the new search UI.
3. **Search UI.** The checklist in `StapleForm` is replaced entirely by live search — no hybrid checklist-plus-search.
4. **Detail page scope.** Minimal: the staple's full `price_snapshots` history as a plain table (date, price, product description, alt product/price if present). No charts, no editing from this page.

## Data model change

`staples` table gains two nullable columns:
- `product_id text null` — the locked Kroger product ID. Null means "legacy, not yet re-picked."
- `tracked_description text null` — cached product description, so the UI can show what's tracked without a live Kroger call.

`search_term` is kept on every staple (locked or legacy) — it's still used to find cheaper alternatives via `searchProducts`, regardless of whether the tracked item itself is locked by ID.

Migration: add the two columns via Supabase (dashboard or MCP tool — no `psql` available in this environment, per existing project gotchas). No data backfill.

## New/changed code

### `lib/kroger.ts`
Add `getProductById(productId: string, locationId: string): Promise<KrogerProduct>` — `GET /v1/products/{productId}?filter.locationId=`, same response shape as `searchProducts`, single-product parse.

### New API routes
- `POST /api/kroger/location` — body `{ zipCode }`, wraps `findNearestLocationId`, returns `{ locationId }`. Thin wrapper, no new logic.
- `GET /api/kroger/search?term=&locationId=` — wraps `searchProducts`, returns `KrogerProduct[]`. Thin wrapper.

Both routes exist only so the client (`StapleForm`, a `"use client"` component) can reach Kroger without exposing `KROGER_CLIENT_ID`/`KROGER_CLIENT_SECRET` to the browser.

### `app/onboarding/StapleForm.tsx`
- Zip input resolves to a `locationId` on blur via `/api/kroger/location`. Search is disabled until resolved.
- Once resolved: a search input replaces the checklist. Debounced (~300ms) calls to `/api/kroger/search` as the user types. Results render as a list (description + price); clicking one adds it to a "selected" chip list, deduped by `productId`. Chips are removable.
- `selected` state changes shape from `string[]` to `{ searchTerm: string; productId: string; description: string }[]`.
- Submit body becomes `{ zipCode, staples: [{ searchTerm, productId, description }] }`.
- `initialStaples` prop changes shape to match (carrying `product_id`/`tracked_description` from the DB) so editing an existing watcher pre-fills chips with the already-locked product, not just a bare term.

### `app/onboarding/page.tsx`
Select `product_id, tracked_description` alongside `search_term` when loading the existing watcher's staples, and pass the richer shape into `StapleForm`'s `initialStaples`.

### `/api/push/subscribe/route.ts`
- Accepts the new `staples` shape (array of objects, not strings).
- Diff logic (added/removed/preserved) keys off `productId` instead of `search_term` string equality — two searches for "milk" can resolve to different products, so term equality is no longer a safe identity check.
- Insert now writes `search_term`, `product_id`, `tracked_description` per staple.

### `app/api/cron/check-prices/route.ts`
Per staple:
- If `product_id` is set: call `getProductById(product_id, locationId)` to reprice that exact item. If it 404s or is otherwise unavailable (discontinued), skip that staple for this run — do not throw and abort the whole cron loop for other staples/watchers.
- If `product_id` is null (legacy): unchanged — `searchProducts(search_term, locationId)`, track `products[0]`.
- Either path: alternative-swap computation still uses `searchProducts(search_term, locationId)`, filtered to exclude the tracked `productId` (via existing `cheapestAlternative`).

### New: `app/staple/[id]/page.tsx`
Server component. Loads the staple row (for its `search_term`/`tracked_description` as a page heading) and its full `price_snapshots` history ordered oldest-first, renders as a plain HTML table: date, price, product description, alt product/price (if present) per row. A link back to `/`.

### `app/StapleCard.tsx`
Needs `staple.id` passed in as a prop (currently only `searchTerm` is passed from `page.tsx`). The `<h2>` staple name becomes `<Link href={`/staple/${id}`}>`.

### `app/page.tsx`
Pass `staple.id` down to `StapleCard` alongside the existing props.

## Error handling

- Kroger search/location routes: on upstream failure, return the existing error-shape pattern already used elsewhere in this codebase (`{ error: message }`, appropriate status) — `StapleForm` shows the message inline the same way it already does for subscribe failures.
- Cron: a single staple's `getProductById` failure must not abort other staples in the same run (existing `for` loop already isolates errors per-staple only if the fetch itself doesn't throw uncaught — the change adds a try/catch around the per-staple reprice call specifically for this reason).

## Testing

Follow the existing pattern (`lib/kroger.test.ts`, `lib/priceWatch.test.ts`): add unit tests for `getProductById` (mocked fetch, success + 404 cases). No new tests needed for the thin API route wrappers or the cron try/catch — those are exercised by existing integration-style checks the project already relies on (curl + browser per the Web App Verification Protocol) rather than unit tests.

## Out of scope

- Push notification delivery (already known-broken, tracked separately).
- Any change to `lib/dashboard.ts`'s pure comparison/sparkline functions.
- Editing/removing an individual staple from the detail page (view-only for v1).
- Multi-tenant support (single-watcher assumption is unchanged).

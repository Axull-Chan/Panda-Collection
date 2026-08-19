# Admin Dashboard

A complete back office at `/admin`, built as a separate layout
([`AdminLayout`](../src/admin/AdminLayout.tsx)) inside the same SPA, gated
by [`RequireAdmin`](../src/admin/RequireAdmin.tsx) and — independently — by
Postgres RLS, so a route-guard bug alone could never expose admin data or
mutations to a customer account.

## Sections

| Route | What it does |
|---|---|
| `/admin` | Dashboard overview — stat tiles, recent activity |
| `/admin/products` | Product list (search/filter/status/category/collection/stock-level), and a full editor: create, edit, publish/unpublish, archive/restore, duplicate, bulk actions, image upload |
| `/admin/orders` | Searchable order list; expand an order to see line items and update its shipping status |
| `/admin/coupons` | List + editor: create, edit, activate/deactivate, delete, with live usage stats (`used_count` / `max_uses`) |
| `/admin/inventory` | Per-variant stock levels, filterable by low/out-of-stock, with direct adjustment |
| `/admin/customers` | Searchable customer list |

## Product image upload

Uploads go to the `product-images` Supabase Storage bucket (admin-write
RLS policy). Invalid file types are rejected client-side before any upload
attempt; a failed or missing image falls back to a branded placeholder
rather than a broken-image icon everywhere the image is later displayed
(see [`src/components/Image.tsx`](../src/components/Image.tsx)).

## Order management

Orders can't be deleted (by design — orders are a financial record; RLS has
no delete policy for them at all), only progressed through shipping
statuses. Payment status (`paid`/`unpaid`) is read-only in the admin UI —
it can only ever be set by the Stripe webhook, never by an admin action, so
there's no path for an admin UI bug (or a curious admin) to mark an unpaid
order as paid.

## Coupon management

Standard CRUD, plus the constraint that a coupon `code` is stored
upper-cased and matched with an exact (not wildcard/`ilike`) comparison —
avoiding both case-sensitivity friction for customers and `%`/`_` wildcard
injection through the code field.

## Consistent UI states

Every list/table in the admin dashboard handles four states the same way:
loading, empty (with a distinct "no results for this search" vs. "nothing
here yet"), error (a friendly message, never a raw Supabase/Postgres error
string), and populated. Destructive actions (delete product, delete coupon)
require a confirmation step.

## See also

- [`api-structure.md`](./api-structure.md) — the data-access helpers (`src/lib/admin.ts`, `src/lib/coupons.ts`) these pages call
- [`tests/admin/`](../tests/admin) — Playwright coverage for every section above

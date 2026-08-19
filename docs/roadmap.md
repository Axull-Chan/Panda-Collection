# Roadmap / Future Improvements

Ideas for a v2, roughly ordered by how much value they'd add relative to
effort. None of these are required for the current feature set to work
correctly — the site is fully functional and production-verified as is.

## Near-term

- **Product reviews.** The `reviews` table and its RLS policies already
  exist in the schema; nothing in the UI reads or writes it yet. Surfacing
  a rating average + review list on the product page is the most
  "shipped but not wired up" gap in the project.
- **CI pipeline.** Run the Playwright suite automatically on every pull
  request (GitHub Actions), rather than only ever run manually. The suite
  already supports pointing at either the local dev server or a deployed
  URL (`PLAYWRIGHT_BASE_URL`), which is most of what a CI job needs.
- **Fuzzy search.** `pg_trgm` + a GIN index on `products.name`, once the
  catalog is large enough that substring search starts missing obvious
  matches (misspellings, word order).
- **Email notifications.** Order-confirmation and shipping-status-change
  emails — the webhook already has the exact moment to trigger from.

## Medium-term

- **Guest checkout.** `orders.user_id` is already nullable with an `email`
  column specifically for this, but it needs an RLS-exempt write path (an
  Edge Function using the service role), since RLS currently requires an
  authenticated `auth.uid()` to create an order.
- **Cart merge on login.** If the cart ever needs to sync across devices,
  `cart_items` already exists in the schema — the work is merging a
  guest's `localStorage` cart into it at sign-in, then keeping the
  anonymous path working for guests.
- **Saved payment methods.** Stripe Customer objects + a saved default
  payment method, so returning customers can skip re-entering card details
  (still via Stripe-hosted flows, not custom card handling).
- **Product image responsive variants.** Supabase's image transformation
  API (`?width=`) for proper `srcset`s, instead of serving one fixed size
  to every viewport.

## Longer-term

- **Multi-currency / internationalization.**
- **Analytics dashboard** in the admin panel — conversion funnel, top
  products, coupon redemption trends (the underlying data already exists in
  `orders`/`order_items`/`coupons`).
- **Partitioning `orders` by month** if volume ever grows large enough to
  matter for query performance.

## See also

- [`database.md`](./database.md) — the `reviews`/`cart_items` tables mentioned above
- [PROJECT_SHOWCASE.md](../PROJECT_SHOWCASE.md#what-id-improve-in-version-2) — the reasoning behind a few of these priorities

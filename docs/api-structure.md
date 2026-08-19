# API Structure

There is no traditional REST/GraphQL API layer. Two kinds of server-side
surface exist instead:

1. **Direct Postgres access** via `@supabase/supabase-js`, authorized entirely
   by Row Level Security — most of the app's reads/writes (products, orders,
   wishlist, profile) go straight from the browser to the database this way.
2. **Four Supabase Edge Functions** (Deno runtime) for the handful of
   operations that need server-side trust: pricing, coupon validation,
   payment confirmation, and rate-limited public writes.

All four Edge Functions live in [`supabase/functions/`](../supabase/functions)
and share two modules in [`_shared/`](../supabase/functions/_shared):
`pricing.ts` (re-resolves cart line items against live product/variant data)
and `coupons.ts` (the single shared coupon-validation implementation used by
both `validate-coupon` and `create-checkout-session`).

## `create-checkout-session`

**Called by**: the checkout page, on submit.
**Auth**: requires a signed-in customer (JWT-verified).
**Rate limit**: 5 requests / 5 minutes per customer, plus a dedup guard so a
double-click reuses the same in-flight Stripe session instead of creating a
second one.

| Request | Response |
|---|---|
| `{ lines: [{productId, size, quantity}], shippingAddress, couponCode? }` | `{ url }` — the Stripe Checkout Session URL to redirect to |

Re-fetches price and stock for every line from Postgres, re-validates the
coupon if present, creates a `pending` order, creates the Stripe session
with a server-computed exact total, and returns its URL. See
[`checkout-flow.md`](./checkout-flow.md).

## `validate-coupon`

**Called by**: the checkout page, live, as a customer types a coupon code.
**Auth**: requires a signed-in customer.
**Rate limit**: 15 requests / 5 minutes per customer (a coupon code is a
guessable secret; this bounds brute-force attempts).

| Request | Response |
|---|---|
| `{ code, lines }` | `{ valid, code, discountType, discountValue, discountAmount, subtotal, total }` or `{ valid: false, error }` |

Preview only — nothing is written to the database. Uses the exact same
validation module `create-checkout-session` uses at actual checkout, so the
previewed amount and the charged amount can never disagree. See
[`coupon-flow.md`](./coupon-flow.md).

## `stripe-webhook`

**Called by**: Stripe directly (not the frontend).
**Auth**: no Supabase JWT is possible here (Stripe can't supply one) — trust
comes from verifying Stripe's own request signature against
`STRIPE_WEBHOOK_SECRET` instead. This is the only one of the four functions
with Supabase's "Verify JWT" setting turned off.

| Event | Effect |
|---|---|
| `checkout.session.completed` | Marks the matching order `paid`, decrements stock once, increments coupon usage once — all idempotent against Stripe's at-least-once retry semantics |

See [`stripe-flow.md`](./stripe-flow.md).

## `subscribe-newsletter`

**Called by**: the newsletter signup form (footer/homepage).
**Auth**: none — public, anonymous.
**Rate limit**: IP-based, to prevent signup-form abuse.

| Request | Response |
|---|---|
| `{ email }` | `{ success }` or a rate-limit error |

## Rate limiting mechanism

All three rate-limited functions above call the same Postgres function,
`check_rate_limit(bucket, identifier, max_count, window_seconds)`, backed by
the `rate_limit_counters` table — one shared, atomic, sliding-window
implementation rather than three separate ad-hoc ones. See
[`database.md`](./database.md).

## See also

- [`architecture.md`](./architecture.md) — why these four functions exist and nothing else does
- [`DEPLOYMENT.md`](../DEPLOYMENT.md) — required environment variables/secrets per function

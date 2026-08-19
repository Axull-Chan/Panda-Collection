# Stripe Integration

Currently running in **Test Mode** — real Stripe infrastructure, fake money.
See [DEPLOYMENT.md](../DEPLOYMENT.md#connecting-stripe--going-to-live-mode)
for the switch to Live Mode.

## Design

- **Hosted Checkout, not embedded Elements.** The frontend redirects to a
  Stripe-hosted page and never handles card input directly — this removes
  PCI scope from the application almost entirely and means no Stripe key of
  any kind (publishable or secret) needs to exist in the frontend bundle.
- **Two Edge Functions are the only code that talks to Stripe:**
  [`create-checkout-session`](../supabase/functions/create-checkout-session)
  and [`stripe-webhook`](../supabase/functions/stripe-webhook).

## `create-checkout-session`

Called from the checkout page. Re-validates everything server-side (see
[`checkout-flow.md`](./checkout-flow.md)), then builds the Stripe session:

- Line items are built from the server's own price lookup, never the
  client's.
- If a coupon applies, rather than passing Stripe a `percent_off` (which can
  round differently than this app's own math), the function creates an
  **ephemeral, one-time Stripe Coupon** (`amount_off`, exact pre-computed
  cents, `duration: "once"`) — so the amount Stripe actually charges is
  bit-for-bit the amount already shown to the customer, with zero risk of
  Stripe-side rounding drift.
- A `pending`/`unpaid` order is created *before* the Stripe session, so a
  webhook arriving later has a row to update rather than needing to create
  one from webhook payload data alone.

## `stripe-webhook`

Stripe calls this directly — it has **no Supabase auth token**, so its
"Verify JWT" setting is explicitly turned off in the Edge Function config
(the only one of the four Edge Functions configured this way). Trust
instead comes from verifying Stripe's own signature
(`STRIPE_WEBHOOK_SECRET`) on every request before reading anything from it.

Listens for `checkout.session.completed`:

1. Verify the signature — reject anything that doesn't match.
2. Look up the order by `stripe_session_id`.
3. Mark it `paid`, record `paid_at`.
4. Trigger the idempotent stock-decrement and coupon-usage-count logic (see
   [`inventory-flow.md`](./inventory-flow.md) and [`coupon-flow.md`](./coupon-flow.md)).

Stripe's webhook delivery is **at-least-once** — the same event can arrive
more than once. Every side effect here is written to be safe under retries
(guarded by boolean columns like `stock_decremented` and
`coupon_usage_counted`, checked and set atomically in the same trigger), so
a duplicate delivery updates nothing twice.

## Test Mode verification

Exercised with Stripe's standard test cards, both manually and in the
Playwright suite ([`tests/payments/stripe-payments.spec.ts`](../tests/payments/stripe-payments.spec.ts)):

| Scenario | Card |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Card declined | `4000 0000 0000 0002` |
| Cancelled | back out of Stripe's page instead of paying |

## Going to Live Mode

No frontend or Vercel change is required — the switch is entirely a
Supabase secrets change (new `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`,
new webhook endpoint pointed at Live Mode). Full steps in
[DEPLOYMENT.md](../DEPLOYMENT.md#connecting-stripe--going-to-live-mode).

## See also

- [`checkout-flow.md`](./checkout-flow.md) — where this fits in the customer-facing flow
- [`api-structure.md`](./api-structure.md) — full request/response shape of both functions

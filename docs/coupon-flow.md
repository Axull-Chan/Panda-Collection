# Coupon System

Percentage and fixed-amount discount codes, validated and priced
server-side end to end — the client only ever submits a code string, never
a discount amount.

## Coupon rules supported

- **Type**: percentage off, or a fixed amount off
- **Expiry**: `starts_at` / `expires_at` window
- **Usage limit**: `max_uses`, tracked by `used_count`
- **Minimum order**: `min_order` subtotal threshold
- **Maximum discount cap**: `max_discount`, for percentage coupons (so
  "20% off" can be capped at, say, $100 off regardless of cart size)
- Active/inactive toggle, independent of the expiry window

## Shared validation module

Both places that need to price a coupon — the live preview and the actual
checkout — call the **same** shared function
([`supabase/functions/_shared/coupons.ts`](../supabase/functions/_shared/coupons.ts)),
so there is exactly one implementation of "is this coupon valid, and what
does it discount to" in the entire system. That guarantees the number a
customer sees while typing a code is the number they're actually charged —
there's no second, slightly-different code path that could disagree with
the first.

Validation order: exists → active → within its date window → under its
usage limit → subtotal meets the minimum → compute the discount (percentage
of subtotal, or the flat amount) → cap it at `max_discount` if set → cap it
again at the subtotal itself (a discount can never make a total negative).

## Live preview: `validate-coupon`

Called as the customer types a code into checkout. Re-prices the *current*
cart server-side and returns whether the code is valid and what it would
discount to — a preview only, nothing is written to the database.
Rate-limited (15 attempts / 5 minutes per customer) since a coupon code is
a guessable secret and this endpoint could otherwise be used to brute-force
valid codes.

## Locking it in: `create-checkout-session`

At actual checkout, the coupon is validated **again**, independently, using
the same shared module — because time has passed since the preview, and
someone else may have exhausted the same coupon's last use in the
meantime. If it's still valid, the exact discount is computed in cents and
handed to Stripe as a one-time, ephemeral Stripe Coupon (see
[`stripe-flow.md`](./stripe-flow.md)) rather than a percentage, so Stripe's
own rounding can never drift from what was already shown.

The order stores `coupon_code`, `discount_type`, and `discount_value` as a
**snapshot** at the moment of purchase (alongside the nullable `coupon_id`
foreign key) — so order history and receipts stay accurate even if a coupon
is later edited or deleted.

## Usage counting

`coupons.used_count` increments exactly once per order, on the
`payment_status → paid` transition — via the same idempotent
guard-column-plus-trigger-pair pattern used for stock decrement (see
[`inventory-flow.md`](./inventory-flow.md)), so Stripe's at-least-once
webhook retries can never double-count a redemption.

## Admin management

Full CRUD at `/admin/coupons` — create, edit, activate/deactivate, delete,
with live usage stats. See [`admin-dashboard.md`](./admin-dashboard.md).

## See also

- [`tests/coupons/`](../tests/coupons), [`tests/admin/coupons.spec.ts`](../tests/admin/coupons.spec.ts) — Playwright coverage of every validation rule above, plus the real-payment case

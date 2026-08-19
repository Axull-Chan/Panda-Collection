# Checkout Flow

End-to-end path from "item in cart" to "order confirmed," spanning
[`CartPage`](../src/pages/CartPage.tsx), [`CheckoutPage`](../src/pages/CheckoutPage.tsx),
Stripe's hosted Checkout, and [`CheckoutSuccessPage`](../src/pages/CheckoutSuccessPage.tsx).

## 1 — Cart

The cart is `localStorage`-only (key `anita-cart`), managed by
[`CartContext`](../src/context/CartContext.tsx) — no login required to add
items, no network round-trip to update a quantity. Each line is a
`{ productId, size, quantity }` tuple; prices are looked up live from the
in-memory catalog for display, never stored in the cart itself.

## 2 — Checkout page

`CheckoutPage` requires sign-in (wrapped in `RequireAuth`) and collects a
shipping address, optionally pre-filled from and savable to the customer's
profile. The order summary (subtotal, discount, total) is computed
**client-side for display only** — this number is never sent to the server
as a price; only product/variant ids, quantities, and a coupon code are.

A coupon code can be applied here, which calls the `validate-coupon` Edge
Function for a live preview (see [`coupon-flow.md`](./coupon-flow.md)) — this
call re-prices the cart server-side but doesn't create anything yet.

## 3 — Submitting

"Continue to Payment" calls the `create-checkout-session` Edge Function with
the cart lines, shipping address, and coupon code (if any). This function is
the authoritative pricing step:

1. Re-fetches current price and stock for every line item from Postgres —
   ignoring any amount the client might have sent.
2. Re-validates the coupon against the *current* subtotal (time may have
   passed, or someone else may have used up the last remaining redemption
   since the preview).
3. Creates a `pending`/`unpaid` order + order_items row.
4. Creates a Stripe Checkout Session with the exact, server-computed total,
   and returns its URL.

A dedup guard and rate limit (5 attempts / 5 minutes per customer) protect
this endpoint — a double-click or a rapid retry reuses the same in-flight
Stripe session rather than creating a duplicate pending order.

## 4 — Stripe's hosted page

The browser is redirected to `checkout.stripe.com`. This app's code has no
further involvement until Stripe redirects back — no card data ever
reaches this codebase, and no Stripe key of any kind is present in the
frontend bundle.

## 5 — Outcomes

| Outcome | What happens |
|---|---|
| **Success** | Stripe redirects to `/checkout/success?session_id=...`; the `stripe-webhook` function (arriving independently, not from this redirect) has already or will shortly mark the order `paid`, decrement stock, and increment coupon usage. The success page polls/reads the order and clears the cart. |
| **Card declined** | Stripe's own hosted page shows the decline and lets the customer retry with a different card without ever leaving Stripe or losing the cart — built into Checkout, not a custom page here. |
| **Cancelled** | Redirected to `/checkout/cancelled`; the cart is left untouched. The draft `pending` order is never completed and Stripe expires the session automatically. |

Deliberately, **the success page redirect itself never marks anything as
paid** — that would let anyone who guesses or replays the success URL
"pay" for free. Only the signature-verified webhook can do that. See
[`stripe-flow.md`](./stripe-flow.md).

## See also

- [`stripe-flow.md`](./stripe-flow.md) — the webhook side in detail
- [`coupon-flow.md`](./coupon-flow.md) — how the discount is validated and locked in
- [`inventory-flow.md`](./inventory-flow.md) — how stock is decremented exactly once
- [`tests/checkout/`](../tests/checkout), [`tests/payments/`](../tests/payments) — Playwright coverage

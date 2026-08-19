# Inventory Flow

Stock is tracked per **variant** (size × color), not per product — a
product's displayed availability is the aggregate of its variants.

## Customer-facing behavior

- A variant with zero stock can't be selected or added to cart — enforced
  in the UI, not just visually indicated.
- Low-stock variants are flagged (both storefront and admin) once stock
  drops under a threshold, so it reads as "hurry" rather than only
  appearing at the last unit.
- Stock is re-checked server-side at `create-checkout-session` time — a
  variant that sold out between the product page and checkout is caught
  there, not just at page-load.

## Decrementing stock

Inventory is decremented **exactly once per paid order**, at the moment
the Stripe webhook confirms payment — never optimistically at
add-to-cart or checkout-session-creation time, since either of those can be
abandoned without ever paying.

The exactly-once guarantee matters because Stripe's webhook delivery is
**at-least-once**: the same `checkout.session.completed` event can arrive
more than once, and if decrementing were a plain
`stock = stock - quantity` on every delivery, a retried webhook would
double-charge the inventory for a single sale. Instead, a boolean guard
column (`orders.stock_decremented`) plus a `BEFORE`/`AFTER` trigger pair
does the decrement inside the same transaction that flips `payment_status`
to `paid`, and flips the guard atomically so a second delivery is a no-op.
Decrement is clamped at zero rather than allowed to go negative.

## Admin management

`/admin/inventory` lists every variant with its current stock, filterable
by low-stock/out-of-stock, with direct stock adjustment (for restocking, or
correcting a manual count) that takes effect immediately across the
storefront.

## See also

- [`database.md`](./database.md) — the trigger/guard-column pattern in schema terms
- [`stripe-flow.md`](./stripe-flow.md) — why the webhook, specifically, is the trigger point
- [`tests/inventory/`](../tests/inventory) — Playwright coverage, including the out-of-stock UI and the admin adjustment flow

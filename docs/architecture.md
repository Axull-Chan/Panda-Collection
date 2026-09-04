# Architecture

## Overview

This is a single-page React application backed entirely by Supabase, with
Stripe and Midtrans layered in for payments. There is no custom backend server — every
piece of server-side logic that needs to be trusted (pricing, coupon
validation, stock checks, payment confirmation) runs in a Supabase Edge
Function, and everything else is a direct, RLS-protected query from the
browser to Postgres.

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   React SPA      │───────▶│  Supabase             │        │  Stripe /        │
│   (Vercel)       │        │  Postgres + Auth       │        │  Midtrans        │
│                   │◀───────│  + Storage + RLS       │        │  (hosted, both   │
│                   │        │                        │        │   sandbox mode)  │
└─────────┬─────────┘        └──────────┬─────────────┘        └────────┬─────────┘
          │                             │                              │
          │  supabase.functions.invoke()│                              │
          ▼                             ▼                              │
┌───────────────────────────────────────────────────┐                  │
│  Supabase Edge Functions (Deno)                     │                  │
│  create-checkout-session · create-midtrans-transaction│                  │
│  validate-coupon · subscribe-newsletter               │◀─────────────────┘
│  stripe-webhook · midtrans-notification               │   payment
└───────────────────────────────────────────────────┘   confirmation
```

## Why this shape

**No custom backend.** Postgres + Row Level Security does the authorization
work a hand-written API layer would otherwise need — a customer's Supabase
JWT is enough for the database to enforce "you can only see your own orders"
or "only admins can write products," without a single line of custom
middleware. This removes an entire class of bugs (forgetting an auth check
on one route) by making the database itself the enforcement point.

**Edge Functions only where trust matters.** Four things must never be
computed by, or trusted from, the browser: the price actually charged, the
validity of a coupon, whether stock exists, and whether a payment actually
succeeded. Each of those is a dedicated Edge Function that re-reads the
database at request time — the client only ever sends *identifiers*
(product/variant ids, a coupon code), never amounts.

**Hosted Stripe Checkout, not embedded Elements.** The frontend never
handles card data and never holds a Stripe key — `create-checkout-session`
returns a URL, the browser redirects to it, and Stripe does the rest.
Payment confirmation is a webhook, signature-verified, and is the *only*
code path that can flip an order to `paid` — not the success-page redirect,
which is spoofable by anyone who guesses the URL.

**No bundled fallback catalog.** `ProductsContext` starts empty and swaps
to the live Supabase catalog the moment it arrives — deliberately no
placeholder data baked into the bundle. An earlier version shipped with a
bundled mock catalog for instant first paint, but that meant real visitors
briefly saw fake products and prices on every page load; honest emptiness
during that brief load is preferable to a plausible-looking lie.

## Request flow: a purchase, end to end

1. Browser adds a product variant to cart (`localStorage`, no network call).
2. At checkout, the browser calls the `validate-coupon` Edge Function with a
   coupon code and cart line items (no prices) — used only for the live
   on-page price preview.
3. On submit, the browser calls `create-checkout-session` with the same cart
   lines + coupon code. This function re-fetches current prices and stock
   from Postgres, re-validates the coupon, creates a `pending`/`unpaid` order
   row, creates a Stripe Checkout Session (with a server-computed exact
   discount), and returns the session URL.
4. Browser redirects to Stripe's hosted page. Card data never touches this
   app's code.
5. Stripe calls the `stripe-webhook` Edge Function directly
   (`checkout.session.completed`), which verifies the signature, marks the
   order `paid`, decrements the purchased variant's stock exactly once
   (idempotent — safe against Stripe's at-least-once webhook retries), and
   increments the coupon's usage count if one was used.
6. Browser is redirected to `/checkout/success`, which reads the now-updated
   order from the database and clears the cart.

See [`checkout-flow.md`](./checkout-flow.md) and [`stripe-flow.md`](./stripe-flow.md)
for the full detail on steps 2–6.

## Data flow summary

| Concern | Where it's enforced |
|---|---|
| "Can this user see this row?" | Postgres Row Level Security policies |
| "Is this user an admin?" | `is_admin()` `security definer` function, checked by RLS policies |
| "Is this price/discount real?" | Edge Functions, re-computed server-side every time |
| "Is there stock?" | Edge Function re-check at checkout + a DB trigger that decrements atomically |
| "Did this actually get paid?" | Stripe webhook signature verification — nothing else can mark an order paid |
| "Is this request too frequent?" | A shared Postgres rate-limit counter table, checked from each sensitive Edge Function |

## See also

- [`database.md`](./database.md) — schema, ERD, RLS policies in detail
- [`api-structure.md`](./api-structure.md) — each Edge Function's contract
- [`project-structure.md`](./project-structure.md) — where each piece of this lives in the repo

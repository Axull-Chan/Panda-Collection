# Stripe Payment Integration — Setup Guide (Test Mode)

This covers everything needed to turn on Phase 1 (payments) after the code
has been merged. Nothing here goes live — Stripe's test mode uses fake
cards and never touches real money.

## What was built, and why this shape

- **Hosted Stripe Checkout**, not an embedded card form. The browser never
  handles card data and never sees a Stripe secret key — it only ever
  receives a URL to redirect to.
- **Two Supabase Edge Functions** are the only code that talks to Stripe:
  - `create-checkout-session` — called by the site at checkout. Re-reads
    real prices and stock from the database (ignores whatever the browser
    sends), creates the order as a `pending`/`unpaid` draft, then creates
    the Stripe session.
  - `stripe-webhook` — the *only* place `payment_status` can become `paid`.
    Verifies every request's signature against `STRIPE_WEBHOOK_SECRET`
    before trusting anything in it.
- **No Stripe key ever lives in the frontend `.env`.** The Publishable key
  isn't used at all in this architecture — only the Secret key, and only
  inside the Edge Functions.

## 1 — Apply the database migrations

If you haven't already run `006_security_hardening.sql` (from the QA audit
pass), run it now, then run `007_stripe_payments.sql` — both in the
Supabase SQL Editor, same as previous migrations. You do **not** need to
re-run 001–005; they're already applied.

## 2 — Create a Stripe account (test mode)

Go to [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
New accounts start in **test mode** by default — no activation or business
verification needed to use it. Make sure the toggle in the top-right of the
Stripe Dashboard says **Test mode**.

## 3 — Get your test Secret key

**Developers → API keys** in the Stripe Dashboard. Copy the **Secret key**
(starts with `sk_test_...`). Keep this out of chat/screenshots where
possible — it's more sensitive than the Supabase publishable key, though
being test-mode it can't move real money.

## 4 — Deploy the two Edge Functions

**Easiest path — Supabase Dashboard (no install required):**
1. Open **Edge Functions** in your Supabase project sidebar.
2. **Deploy a new function** → name it exactly `create-checkout-session` →
   paste the contents of `supabase/functions/create-checkout-session/index.ts`
   → Deploy.
3. Repeat for `stripe-webhook`, pasting
   `supabase/functions/stripe-webhook/index.ts`.
4. For the `stripe-webhook` function specifically, find its **Verify JWT**
   setting and turn it **off** — Stripe calls this endpoint directly and
   cannot supply a Supabase user login token. (`create-checkout-session`
   should stay JWT-verified — leave that one on.)

**Alternative — Supabase CLI**, if you'd rather work locally:
```sh
npm install -g supabase
supabase login
supabase link --project-ref waihjvevdxeurnvkgvvj
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```
The `supabase/config.toml` already in the repo sets the same JWT rule, so
the CLI path handles step 4's toggle automatically.

## 5 — Set the Edge Function secrets

In **Edge Functions → Secrets** (or via CLI: `supabase secrets set KEY=value`):

| Secret | Value |
|---|---|
| `STRIPE_SECRET_KEY` | your `sk_test_...` key from step 3 |
| `STRIPE_WEBHOOK_SECRET` | from step 6 below (comes after the webhook exists) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically by Supabase into every Edge Function — you don't
set those yourself.

## 6 — Create the webhook in Stripe

**Developers → Webhooks → Add endpoint** in the Stripe Dashboard.

- **Endpoint URL**: `https://waihjvevdxeurnvkgvvj.supabase.co/functions/v1/stripe-webhook`
- **Events to send**: `checkout.session.completed` and `checkout.session.expired`

After creating it, Stripe shows a **Signing secret** (`whsec_...`) — copy
that into the `STRIPE_WEBHOOK_SECRET` Edge Function secret from step 5.

## 7 — Test it

Go through checkout on the live site. Stripe's test cards (any future
expiry, any 3-digit CVC, any postal code):

| Scenario | Card number |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Card declined | `4000 0000 0000 0002` |
| Cancelled | click the back arrow on Stripe's page instead of paying |

- **Success** → redirected to `/checkout/success`, order appears there and
  in Account → Orders with Payment = Paid, stock decremented once.
- **Declined** → Stripe's own hosted page shows the decline and lets the
  customer retry with a different card, without ever leaving Stripe or
  losing the cart — this is Stripe Checkout's built-in behavior, not
  something this app needs a custom page for.
- **Cancelled** → redirected to `/checkout/cancelled`; the cart is
  untouched. The draft order behind it is released automatically ~a few
  minutes to hours later when Stripe's session expires and fires
  `checkout.session.expired` — no manual cleanup needed.

## What I can't verify without your keys

I don't have Stripe test keys or CLI access to your Supabase project, so
the payment flow above is built and code-reviewed but not yet exercised
end-to-end. Once you've completed steps 1–6, tell me and I'll walk through
a live test payment with you and confirm the order/stock/webhook chain
end-to-end.

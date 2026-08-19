# Deployment Guide

How this project is deployed and how to reproduce, verify, or troubleshoot
that setup. See [README.md](./README.md) for the stack overview and local
dev basics, and [DESIGN-BLUEPRINT.md](./DESIGN-BLUEPRINT.md) for design
tokens.

## Architecture

- **Frontend** — Vite + React, built as a static SPA and hosted on **Vercel**.
- **Backend** — **Supabase** (Postgres, Auth, Storage, Edge Functions). One
  project serves both local dev and the deployed site — there is no separate
  staging database.
- **Payments** — **Stripe Checkout** (hosted payment page), currently in
  **Test Mode**. The frontend never talks to Stripe directly; a Supabase Edge
  Function creates the Checkout Session server-side and a webhook confirms
  payment.

## Environment variables

### Frontend (Vercel → Project → Settings → Environment Variables)

Both are safe to expose client-side (Vite bakes `VITE_*` vars into the build
at *build* time, not runtime — if either is missing or wrong when Vercel
builds, the app fails to boot with a blank page; see Troubleshooting below).

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase dashboard → Project Settings → API (the `anon`/publishable key — never the `service_role` key) |

No Stripe key is needed on the frontend at all — Checkout Sessions are
created server-side and the browser is only ever redirected to Stripe's own
hosted page.

### Backend (Supabase → Project Settings → Edge Functions → Secrets)

These are configured directly in Supabase, entirely separate from Vercel,
and are never committed to the repo:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access for Edge Functions |
| `STRIPE_SECRET_KEY` | Creates Checkout Sessions (Test Mode key while in Test Mode) |
| `STRIPE_WEBHOOK_SECRET` | Verifies the `checkout.session.completed` webhook signature |
| `SITE_URL` | Optional fallback for building Stripe success/cancel redirect URLs |

### Local development / Playwright (`.env.test`, gitignored)

Copy `.env.test.example` to `.env.test` and fill in a **dedicated QA
customer and admin account** — never point this at a real personal account,
since the test suite signs in/out and mutates data repeatedly.

## Deploying to Vercel

The project is connected via Vercel's GitHub integration, not the CLI:

1. Push the branch to GitHub.
2. In Vercel: **Add New → Project → Import** the repository.
3. Framework preset: Vite (auto-detected). Build command / output directory:
   defaults are correct (`npm run build` / `dist`).
4. Add the two frontend environment variables above **before the first
   build** (see Troubleshooting if you add them after).
5. Deploy. Every push to the connected branch triggers a new build
   automatically — no manual redeploy step needed.

`vercel.json` in the repo root rewrites all paths to `index.html`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

This is required for a client-side-routed SPA — without it, a direct
navigation or refresh on a sub-route (e.g. `/product/oxford-shirt`) 404s on
Vercel's static hosting, because there's no matching file on disk for that
path.

## Connecting Supabase

The Supabase project already exists and is shared between local dev and
production — there's nothing to "connect" per deploy. To apply schema
changes: migrations live in `supabase/migrations/`, and the full schema
history is also flattened into `supabase/ALL_MIGRATIONS.sql` for reference.
Edge Functions live in `supabase/functions/` and deploy independently of the
frontend (they're not part of the Vercel build).

## Connecting Stripe / going to Live Mode

Currently in **Test Mode**. Before flipping to Live Mode:

1. Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase's Edge
   Function secrets with the **Live Mode** equivalents.
2. Re-point the Stripe webhook endpoint at the live mode dashboard (test mode
   and live mode webhooks are configured separately in Stripe).
3. Re-run a real (small, refundable) end-to-end purchase against the live
   keys before announcing the switch — Test Mode and Live Mode are
   separate Stripe environments with separate data, so nothing about Test
   Mode success guarantees Live Mode is wired correctly.
4. No frontend or Vercel change is needed — the mode switch is entirely a
   Supabase secrets change.

## Running locally

```sh
npm install
npm run dev      # dev server at localhost:5173
npm run build    # typecheck + production build
npm run lint     # oxlint
```

## Running the Playwright suite

```sh
npx playwright test                    # against the local dev server
                                        # (auto-starts it if not running)

PLAYWRIGHT_BASE_URL=https://panda-collection.vercel.app npx playwright test
                                        # against the deployed site instead —
                                        # skips starting a local dev server
```

The suite runs against **real** Supabase and Stripe Test Mode — it's not
mocked. `global-setup.ts` signs in once as a dedicated QA customer and a QA
admin account, saving the session to `tests/fixtures/.auth/`, which most
spec files then reuse via `test.use({ storageState })` instead of repeating
a UI login in every test.

**Important gotcha**: any test that explicitly signs that shared session
*out* (or corrupts it) as its own test subject must sign in fresh for
itself first, rather than reusing the shared `customerStorageState` —
otherwise it ends the one session every other spec file in the run still
depends on, and everything after it in file order fails with "must be
signed in" errors. See the `signed-in session` describe block in
`tests/authentication/login.spec.ts` for the pattern.

`tests/admin/orders.spec.ts` depends on a **pending** order existing for the
QA customer, which isn't created by anything else in the suite (see the
comment at the top of that file). If those three tests fail with a
`pending` button never appearing, re-seed that fixture via the Supabase
SQL editor (service-role):

```sql
with new_order as (
  insert into orders (user_id, email, subtotal, total, shipping_address)
  values ('<qa-customer-user-id>', '<qa-customer-email>', 240.00, 240.00,
          '{"line1":"1 Test Street","city":"Lisbon","postal_code":"1200-385","country":"Portugal"}'::jsonb)
  returning id
)
insert into order_items (order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price)
select id, '<oxford-shirt-product-id>', '<size-s-variant-id>', 'Oxford Shirt', 'One Colour / S', 1, 240.00
from new_order;
```

## Troubleshooting

**Deployed site shows a blank page, no visible error.** Almost always a
missing or wrong `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in
Vercel. `src/lib/supabase.ts` calls `createClient(url, key)` at module load
time — if `url` is `undefined`, this throws synchronously and the React app
never mounts. Fix: add/correct the env vars in Vercel, then trigger a new
build (see next item — clicking "Redeploy" alone may not be enough).

**Clicking "Redeploy" in the Vercel dashboard doesn't pick up an env var
change.** In practice this didn't reliably create a new deployment. The
dependable fix is pushing a new commit — even an empty one:

```sh
git commit --allow-empty -m "Trigger Vercel rebuild"
git push
```

**Direct navigation to a sub-route 404s on the deployed site but works
locally.** Missing `vercel.json` SPA rewrite (see above) — Vercel's static
hosting has no route for `/product/whatever` unless everything is
rewritten to `index.html` and handled by React Router client-side.

**GitHub push fails with "Password authentication is not supported."**
GitHub removed password auth for git operations in 2021. Either run
`gh auth login` (browser-based, also configures git's credential helper), or
use a Personal Access Token as the password when Git prompts for one.

<div align="center">

# ACD Fashion — Engineering Case Study

*A production-verified, full-stack e-commerce platform, built and shipped solo.*

[Live Site](https://panda-collection.vercel.app) · [README](./README.md) · [Documentation](./docs)

</div>

---

## Project Vision

Most portfolio e-commerce projects stop at "products in a grid with a cart
that adds items to `localStorage`." That's a frontend exercise, not a
demonstration of how software actually gets built and operated. This
project was built to go further: a real backend, real payment processors
(Stripe and Midtrans, both in test/sandbox mode), server-side pricing that
can't be tampered with from the browser,
inventory that behaves correctly under concurrent access and duplicate
webhook delivery, and a test suite that proves all of it against the live
deployment rather than a mocked stand-in.

The storefront itself — a fictional atelier that releases clothing in
numbered editions of twenty — is the surface. The engineering underneath it
is the point.

## Problem Statement

E-commerce is a deceptively good domain for demonstrating engineering
judgment because almost every feature has a *wrong, easy version* and a
*correct, harder version*, and the difference only shows up under the kind
of conditions a demo rarely gets tested against:

- A discount that's computed in the browser can be edited in the browser.
- A webhook that's assumed to fire exactly once will, eventually, fire twice.
- A "sign out" button that revokes every session everywhere is a worse
  product decision than it looks like in a five-minute demo.
- Stock that's decremented at "add to cart" time, instead of at confirmed
  payment, sells items that were never actually paid for.

This project's goal was to build the correct, harder version of each of
these, and then prove it — not just assert it in a comment.

## Target Users

Built as a portfolio artifact for **recruiters, hiring managers, and
engineering-minded reviewers** evaluating full-stack ability: can this
person design a schema, secure it, integrate a real payment processor
correctly, and verify their own work rigorously enough to trust it in
production? Secondarily, it's a reference for anyone building a Supabase +
Stripe + React application who wants to see one specific, complete,
working shape of that stack.

## Major Features

Authentication · server-synced wishlist · persistent cart · Stripe
Checkout (test mode) · a server-validated coupon engine · per-variant
inventory with atomic decrement · a full admin back office (products,
orders, coupons, inventory, customers) · rate limiting on every
abuse-prone endpoint · graceful image-loading UX · a 157-test Playwright
suite. The [README](./README.md#key-features) has the full table; this
document is about how they were built, not what they do.

## Technical Challenges and How They Were Solved

### 1 — Making a discount unforgeable

**The problem:** if the browser computes "10% off $240 = $216" and simply
tells the server to charge $216, nothing stops a modified request from
saying "charge $2.16" instead.

**The solution:** the browser only ever sends a coupon *code* and cart
*line items* — never an amount. A shared server-side module
(`_shared/coupons.ts`) is the single place a discount is ever computed, and
it's called twice: once for the live on-page preview
(`validate-coupon`), and again, independently, at the moment
`create-checkout-session` actually creates the Stripe session. Because
both calls go through the identical function, the previewed amount and the
charged amount can never drift apart — there's no second implementation
that could disagree with the first. The exact discount is then handed to
Stripe as a one-time, ephemeral Stripe Coupon (an exact cents amount, not a
percentage), closing off Stripe-side rounding as a source of drift too.

### 2 — Surviving a webhook that fires more than once

**The problem:** Stripe's webhook delivery is at-least-once, not
exactly-once. A naive `stock = stock - 1` triggered on `payment_status →
paid` would double-decrement inventory (and double-count coupon
redemptions) if the same event is redelivered — which does happen in
practice, not just in theory.

**The solution:** a boolean guard column (`stock_decremented`,
`coupon_usage_counted`) plus a paired `BEFORE`/`AFTER` Postgres trigger, so
the decrement and the guard flip happen atomically in the same
transaction. A second delivery of the same event sees the guard already
set and does nothing. This pattern is used twice in the schema (stock,
coupon usage) — once discovered, it's a reusable idiom rather than a
one-off fix.

### 3 — A sign-out button that was too aggressive

**The problem:** found late, during deployment verification, not during
initial development — a genuinely interesting bug. Supabase's
`signOut()` defaults to `scope: "global"`, which revokes *every* active
session for an account, not just the current device's. A customer signing
out on their phone would silently be signed out of their laptop too, with
no warning either place.

**How it was found:** running the full Playwright suite against the
*deployed* site (not local dev) surfaced a cascade of unrelated-looking
failures — coupon tests, checkout tests, order tests all failing with
"you must be signed in." Root-causing it meant intercepting the actual
network request to confirm a valid, unexpired session token *was* being
sent, then calling Supabase's own auth endpoint directly with that token
and getting back `session_not_found` — proof the token was fine but its
server-side session had been deleted out from under it. Tracing *why*
led to a single sign-out test that, by design, shares a session fixture
with every other test file — and correctly, intentionally ends that
session as its whole point, which cascaded into every test that ran after
it.

**The fix:** two call sites changed to `signOut({ scope: "local" })` —
Supabase's documented, official way to end only the current session. A
one-line fix, but only after a rigorous enough chain of evidence
(bisected test combinations, intercepted network requests, direct API
calls to Supabase's auth server) to be confident it was *the* cause and
not a coincidence.

### 4 — A React 18 Strict Mode race that silently lost user edits

**The problem:** in development and in the deployed build, React 18's
Strict Mode double-invokes effects on mount. An effect with an async fetch
and no cancellation guard can have a *stale* first invocation's request
resolve *after* the user has already made a newer edit — silently
overwriting the fresh state with stale data, with no error and no visible
symptom until the user notices their change didn't save.

**The solution:** a `cancelled` flag set in the effect's cleanup function,
checked before every state update inside the async callback — the
standard fix, but only useful once the bug is actually found. This exact
pattern was caught and fixed in two different places in the codebase
(`WishlistContext`, an admin coupon editor) using the same fix each time,
which is itself the lesson: once you've seen this race once, you know
exactly what to grep for the second time.

## Architecture Decisions

**Why React** — the ecosystem (Framer Motion for the editorial motion
design, React Router, the broad familiarity for anyone reviewing the code)
outweighed any framework-level novelty for a project whose interesting
engineering is server-side, not in the rendering layer.

**Why Supabase** — Postgres with Row Level Security means authorization is
enforced by the database itself, not by a hand-written API layer that can
have a forgotten check on one route. For a solo-built project, that's a
meaningful reduction in the surface area for a whole class of bugs, without
giving up SQL's actual query power the way a pure BaaS document store
would.

**Why PostgreSQL specifically** — real relational integrity (foreign keys,
constraints) for a genuinely relational domain — orders that reference
variants that belong to products that belong to categories — plus RLS,
triggers, and `security definer` functions doing real enforcement work
rather than being simulated in application code.

**Why Stripe** — the industry-standard payment API, and specifically
**hosted Checkout** rather than embedded Elements: it removes card data
from this codebase's trust boundary entirely, which is both the more
secure choice and the more honest one for a portfolio project not seeking
PCI compliance review.

**Why Playwright** — real-browser end-to-end testing was the only way to
actually prove the claims above (server-side pricing, idempotent webhooks,
correct session scoping) rather than just asserting them — and Playwright's
ability to point the exact same suite at either `localhost` or a deployed
URL made "verify the deployment behaves identically to local" a real,
automatable step rather than a manual once-over.

## Security Features

- Row Level Security on every table — no service-role bypass reachable
  from the frontend.
- Admin gating enforced twice, independently: a client-side route guard
  *and* an `is_admin()` RLS check, so a route-guard bug alone can't expose
  admin data.
- Stripe webhook signature verification — the only code path that can mark
  an order paid, and it rejects anything that doesn't verify.
- No Stripe key of any kind ships in the frontend bundle (checked directly
  against the production build output, not assumed).
- Generic, identical error messages on sign-in and password reset
  regardless of whether the email is registered — no account enumeration.
- Server-side rate limiting (checkout, coupon validation, newsletter
  signup) against a shared, atomic Postgres counter table.
- Coupon codes matched by exact comparison, never `ilike`, closing off
  wildcard (`%`/`_`) injection through the code field.

## Performance Optimizations

- A bundled fallback catalog renders the storefront instantly on first
  paint, then swaps to live Supabase data — no loading spinner on first
  load, and the site keeps working (read-only) through a brief database
  outage.
- A universal `Image` component handles lazy loading below the fold, a
  fixed aspect ratio (no cumulative layout shift), a branded fallback on
  broken/missing images, and a fade-in on load — applied consistently
  everywhere an image appears, storefront and admin alike.
- Verified, not assumed: the Playwright performance suite asserts zero
  console errors and zero failed network requests across every critical
  page, and checks for runaway JS heap growth across repeated navigation.

## Testing Strategy

157 Playwright end-to-end tests, organized by feature domain rather than by
source file, covering authentication, browsing, cart, wishlist, checkout,
real Stripe test-mode payments (success, decline, cancellation), coupons,
orders, profile, the entire admin dashboard, inventory, RLS enforcement,
rate limiting, responsiveness (including real device emulation), and
performance. Nothing is mocked — tests exercise a real Supabase project and
real Stripe test-mode payments, and the same suite runs against either the
local dev server or the live deployed URL via a single environment
variable, so "does the deployment actually behave like local" is a
one-command answer instead of a guess.

## Deployment Strategy

Vercel, connected via GitHub for automatic build-on-push — no manual
deploy step. Environment variable footprint is deliberately minimal: the
frontend needs exactly two public, safe-to-expose values; every actual
secret (Stripe keys, webhook secret, Supabase service role key) lives only
in Supabase's own Edge Function secrets, never in Vercel and never in this
repo. Full write-up, including the Test Mode → Live Mode switch, in
[DEPLOYMENT.md](./DEPLOYMENT.md).

## Lessons Learned

- **A deployed environment is a different environment, not a formality.**
  The signOut-scope bug above was invisible in ordinary local development
  and only surfaced once the full test suite ran against the actual
  deployed site — "it works locally" and "it works" are different claims.
- **An error message is a clue, not a conclusion.** "You must be signed in"
  looked like an auth bug; the real cause was a session-sharing conflict
  between two unrelated test files. The fix followed the evidence, not the
  first plausible theory.
- **Idempotency has to be designed in, not bolted on.** Both the stock
  decrement and the coupon usage counter needed it from the start because
  "the webhook fires exactly once" is false in production, not just an
  edge case worth ignoring.

## What I'd Improve in Version 2

The full list is in [`docs/roadmap.md`](./docs/roadmap.md); the highest-value
items are wiring up the already-scaffolded `reviews` table, adding a CI
pipeline that runs the Playwright suite on every pull request, and guest
checkout (the schema already supports it — `orders.user_id` is nullable —
it's missing only the RLS-exempt write path).

## Skills Demonstrated

| Category | Specifics |
|---|---|
| **Frontend** | React 19, TypeScript (strict), Tailwind v4, Framer Motion, responsive design, accessible form patterns |
| **Backend** | Supabase Edge Functions (Deno), server-authoritative pricing, idempotent webhook handling |
| **Database** | PostgreSQL schema design, Row Level Security, triggers, `security definer` functions, migrations |
| **Authentication** | Session management, per-device sign-out scoping, protected routes, anti-enumeration error handling |
| **API Integration** | Stripe Checkout + webhooks, Supabase client + Edge Function contracts |
| **Payment Integration** | Server-side Checkout Session creation, signature-verified webhook confirmation, Test → Live Mode operational readiness |
| **Testing** | 157 end-to-end Playwright tests against real infrastructure, run against both local and deployed environments |
| **Security** | RLS, rate limiting, webhook verification, secret hygiene, anti-enumeration |
| **Responsive Design** | Mobile/tablet/desktop, verified with real device emulation |
| **Production Readiness** | Live deployment, environment variable hygiene, deployment documentation, root-cause debugging under real deployed conditions |

---

<div align="center">
<sub>See <a href="./README.md">README.md</a> for setup and usage, or <a href="./docs">docs/</a> for the technical deep dives referenced above.</sub>
</div>

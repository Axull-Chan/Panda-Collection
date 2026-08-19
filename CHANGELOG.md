# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Removed the "Numbered edition of N — No. N" claim from product pages and
  the "No. N/20" tag from product cards. That framing was a narrative device
  for the original fictional mock catalog; carrying it onto real inventory
  read as a false scarcity claim to real customers.

## [1.7.0] — Real Product Catalog Migration

### Added
- Replaced the placeholder/mock catalog with a real 17-product Indonesian
  fashion catalog — real names, descriptions, and Rupiah pricing, migrated
  from source spreadsheet + photography after a full read-only audit and an
  explicit, itemized approval of the mapping. The 20 mock products are
  archived, not deleted, so existing orders that reference them are
  unaffected.
- **Colour selection.** Real products carry multiple colours per item, which
  the storefront had no way to select — cart and checkout matched only by
  size. Added a colour picker to the product page (with a colour-aware image
  swap) and threaded colour through the cart and the server-side
  pricing/checkout Edge Functions, which now re-validate colour the same way
  they already validated size. See [`docs/coupon-flow.md`](./docs/coupon-flow.md)
  and [`docs/checkout-flow.md`](./docs/checkout-flow.md).
- Stripe checkout switched from hardcoded USD-with-cents to IDR
  (zero-decimal currency, no ×100 conversion), and every hardcoded "$"
  price display across the storefront and admin now renders as Rupiah.

### Fixed
- Homepage crash on load: it assumed at least three products always carried
  a `SIGNATURE` badge (true for the old mock catalog, not guaranteed in
  general, and false for the real one). Now falls back to the first three
  published products when fewer than three are marked signature.

## [1.6.0] — Deployment Verification & Portfolio Preparation

### Fixed
- `signOut()` now uses `scope: "local"` instead of Supabase's default
  `scope: "global"` — signing out on one device no longer silently ends the
  session on other devices/tabs. Found during full-suite verification
  against the deployed site. See [`docs/auth-flow.md`](./docs/auth-flow.md).

### Added
- `DEPLOYMENT.md` — deployment guide, environment variables, Stripe Live
  Mode switch, troubleshooting.
- `docs/` — architecture, database, and per-feature flow documentation.
- `PROJECT_SHOWCASE.md` — engineering case study.
- Playwright suite can now target a deployed URL via `PLAYWRIGHT_BASE_URL`,
  not only the local dev server.
- Open-source project files: `LICENSE` (MIT), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- `package.json` metadata (description, keywords, repository, author).

## [1.5.0] — Coupon & Discount System

### Added
- Percentage and fixed-amount coupons — expiry window, usage limits,
  minimum order threshold, maximum discount cap.
- Server-side coupon validation shared between a live checkout preview and
  the authoritative checkout-session creation, so the previewed discount
  and the charged discount can never disagree.
- Admin coupon management (create/edit/activate/deactivate/delete, usage
  stats).
- Idempotent coupon usage-count tracking, safe against duplicate webhook
  delivery.
- 21 new Playwright tests covering every validation rule plus a real,
  coupon-discounted Stripe payment.

## [1.4.0] — Automated Testing

### Added
- Full Playwright end-to-end suite (136 tests at this point), covering
  authentication, browsing, cart, wishlist, checkout, Stripe payments,
  orders, profile, the admin dashboard, inventory, security/RLS,
  responsiveness, and performance.
- Dedicated QA customer/admin test accounts and shared auth fixtures.

### Fixed
- Assorted bugs surfaced by the new test coverage (documented per-phase at
  the time; see git history for detail).

## [1.3.0] — Image Reliability

### Added
- Universal `Image` component: lazy loading below the fold, fixed aspect
  ratio (no layout shift), graceful fallback on broken/missing images,
  fade-in on load — applied consistently across the storefront and admin.

## [1.2.0] — Rate Limiting & Admin Polish

### Added
- Shared, atomic rate-limiting mechanism (Postgres counter table +
  function), applied to checkout session creation and newsletter signup.
- Newsletter signup, with IP-based rate limiting.

### Changed
- Admin dashboard UI consistency pass (loading/empty/error states),
  confirmation dialogs on destructive actions.

## [1.1.0] — Stripe Checkout Integration

### Added
- Hosted Stripe Checkout for payment — server-side session creation,
  signature-verified webhook confirmation, idempotent stock decrement.
- Order records with full payment lifecycle (`pending` → `paid`,
  shipping status).

### Fixed
- Stripe SDK Deno-runtime compatibility in Edge Functions.
- A "Not a valid URL" error at checkout caused by an environment-specific
  redirect URL construction issue.

## [1.0.0] — Baseline

### Added
- Luxury editorial storefront: homepage, collections (search/filter/sort),
  product detail pages, responsive design.
- Supabase-backed catalog (products, categories, collections, variants),
  Row Level Security from the start.
- Authentication (sign-up/in/out, password reset, protected routes).
- Server-synced wishlist, persistent cart.
- Customer profile and order history.
- Admin dashboard: product/inventory/customer management.

---

For deployment history and production verification, see
[DEPLOYMENT.md](./DEPLOYMENT.md).

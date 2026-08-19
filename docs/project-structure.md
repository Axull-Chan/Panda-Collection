# Project Structure

```
├── src/
│   ├── admin/                    Admin dashboard (separate layout, gated by RequireAdmin)
│   │   ├── AdminLayout.tsx        Shared shell: sidebar nav, header
│   │   ├── DashboardPage.tsx       Stat tiles + recent activity
│   │   ├── AdminProductsPage.tsx    Product list (search/filter/status)
│   │   ├── ProductEditorPage.tsx    Create/edit product + variants + images
│   │   ├── AdminOrdersPage.tsx      Order list + search
│   │   ├── AdminCouponsPage.tsx     Coupon list
│   │   ├── CouponEditorPage.tsx     Create/edit coupon
│   │   ├── AdminInventoryPage.tsx   Per-variant stock view + adjustment
│   │   ├── AdminCustomersPage.tsx   Customer list
│   │   ├── RequireAdmin.tsx         Route guard (role check; RLS enforces it independently)
│   │   └── ui.tsx                   Shared admin UI primitives (StatusBadge, table shells)
│   │
│   ├── components/                Shared, non-admin UI
│   │   ├── Nav.tsx / Footer.tsx      Site chrome
│   │   ├── ProductCard.tsx / ProductGrid.tsx
│   │   ├── Image.tsx                 Universal image component — lazy load, fixed aspect ratio, fallback on error, fade-in
│   │   ├── NewsletterSection.tsx
│   │   ├── RequireAuth.tsx           Route guard for customer-only pages
│   │   ├── Reveal.tsx                 Scroll-triggered motion wrapper
│   │   └── auth/                      Sign-in/up form field primitives
│   │
│   ├── context/                    App-wide state, each as a React Context + hook
│   │   ├── AuthContext.tsx           Session, profile, sign-in/up/out
│   │   ├── CartContext.tsx            localStorage-backed cart
│   │   ├── WishlistContext.tsx         Server-synced wishlist
│   │   └── ProductsContext.tsx         Bundled-catalog-first, live-data-second
│   │
│   ├── data/                       Bundled fallback catalog (instant first paint)
│   ├── lib/                        Supabase client + typed data-access functions
│   │   ├── supabase.ts               Client instance (module-level `createClient`)
│   │   ├── catalog.ts                Product/category/collection queries
│   │   ├── orders.ts                  Customer + admin order queries
│   │   ├── coupons.ts                  Admin coupon CRUD
│   │   ├── admin.ts                    Admin product/customer queries
│   │   └── newsletter.ts               Newsletter signup call
│   │
│   ├── pages/                      Route-level page components (one per route)
│   ├── App.tsx                     Route table
│   └── main.tsx                    Entry point, provider tree
│
├── supabase/
│   ├── functions/                 Edge Functions (Deno) — see docs/api-structure.md
│   │   ├── create-checkout-session/
│   │   ├── validate-coupon/
│   │   ├── stripe-webhook/
│   │   ├── subscribe-newsletter/
│   │   └── _shared/                Pricing + coupon-validation modules shared across functions
│   └── migrations/                 11 ordered SQL migrations — see docs/database.md
│
├── tests/                          Playwright, organized by domain (mirrors the feature list, not the src/ folders)
│   ├── authentication/ · checkout/ · coupons/ · payments/
│   ├── shopping/ · wishlist/ · orders/ · profile/
│   ├── admin/ · inventory/ · security/ · performance/ · responsiveness/ · images/
│   ├── fixtures/                   global-setup (QA account sign-in), shared env
│   └── helpers/                    Reusable test actions (checkout, Stripe test-card fill)
│
├── docs/                          This documentation
├── public/images/                 Product & editorial photography
├── DEPLOYMENT.md                  Deploy/env-var/Stripe-Live-Mode/troubleshooting guide
├── PROJECT_SHOWCASE.md             Recruiter-facing engineering case study
└── DESIGN-BLUEPRINT.md              Design token system (color, type, layout, motion)
```

## Naming conventions

- **Pages** are named `<Thing>Page.tsx` and live in `pages/` (or `pages/auth/`,
  or `admin/` for the admin equivalents).
- **Data-access functions** live in `lib/`, one file per domain, and are
  consumed by pages/contexts — no component talks to `supabase-js` directly
  for anything beyond the simplest one-off query.
- **Tests mirror features, not source folders** — `tests/coupons/` covers
  the coupon feature across whatever pages/functions it touches, rather than
  a 1:1 mirror of `src/`.

## See also

- [`architecture.md`](./architecture.md) — why the code is organized this way
- [README.md](../README.md#folder-structure) — the short version

# ANITA — Numbered Editions

A luxury editorial e-commerce site for a clothing atelier that releases garments
in numbered editions of twenty. The design captures the calm, gallery-like
atmosphere of high-end minimalist studios with an original identity — warm paper
tones, large serif headlines, generous whitespace, and subtle motion.

See [DESIGN-BLUEPRINT.md](./DESIGN-BLUEPRINT.md) for the full design-extraction
blueprint and the token system (colors, typography, layout, motion).

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (design tokens in `src/index.css` `@theme`)
- Framer Motion (reveals, parallax hero, page transitions)
- Lenis (smooth scrolling — disabled for `prefers-reduced-motion` or `?no-smooth`)
- Lucide React (icons)

## Pages

`/` home (hero, featured, story, gallery, journal, newsletter) ·
`/collections` (search / filter / sort) · `/product/:id` · `/journal` ·
`/about` · `/cart` (persisted to localStorage)

## Develop

```sh
npm install
npm run dev      # dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
```

## Photography

All imagery is real product/lookbook photography served from `public/images/`
(web-optimized JPEGs, ~30–120KB each). Product images are referenced per item
in `src/data/products.ts`; editorial imagery lives in `src/data/journal.ts`,
`src/pages/HomePage.tsx`, and `src/pages/AboutPage.tsx`.

# Design Extraction Blueprint — Luxury Editorial Clothing Site

Reference studied: estudioniksen.com (live DOM/computed-style extraction, 2026-07-17).
Goal: capture the *feeling* (editorial, calm, premium, gallery-like) with an original identity — no copied layout, branding, or assets.

---

## 1. What the reference actually does (extracted values)

### Typography
| Role | Font | Size / Line height | Weight | Tracking | Case |
|---|---|---|---|---|---|
| Body | PP Neue Montreal (grotesque sans) | 16px / 24px | 400 | normal | none |
| Display headings (h1/h3) | PP Neue Montreal | 42px / 42px (1.0) | 400 | −1.47px (−3.5%) | none |
| Micro labels, nav, buttons, prices | PP Neue Montreal | 11px / 12.1px | 500 | normal | UPPERCASE |

Key insight: the entire luxury feel comes from **two extremes only** — huge quiet display type at weight 400 with tight leading and negative tracking, against tiny 11px uppercase utility labels. Nothing in between. No bold anywhere.

### Color
- Background: pure white `#FFFFFF`
- Text: pure black `#000000`
- Image placeholder: light gray
- Zero accent colors — all color comes from photography.

### Layout system
- Full-bleed media sections (edge to edge, 0 margin), ~100vh hero
- Product sliders with **2px gutters** between cards
- Product image ratio: **5:7 portrait**, `object-fit: cover`, barely-rounded corners
- Big spacer sections (~128px) between blocks — whitespace is structural, not padding

### Page rhythm (homepage section order)
1. Full-bleed hero media card (headline + small paragraph + CTA button bottom-left)
2. Spacer
3. "New arrivals" product slider (label left, arrows + black CTA right)
4. Featured product grid
5. Category link row ("Shop Bottoms / Outerwear / Shirts")
6. Featured product grid
7. Full-bleed story/collab media card
8. Product grid
9. Full-bleed culture media card (music/lifestyle)
10. Footer: store address · hours table · socials · info links · legal

### Interaction
- Lenis-style smooth/virtual scrolling (scroll is hijacked and eased)
- Images fade/reveal on scroll; hover states are subtle (opacity/scale)
- Black rectangular buttons, 11px uppercase labels
- Announcement bar above nav; sticky minimal header: menu left, logo center, utilities right

---

## 2. Our elevated system (original identity: **ANITA**, later renamed to **ACD Fashion**)

Positioning: garments in numbered editions — half boutique, half gallery. We keep
the reference's *restraint* but move from its cool Shopify-white toward a warmer,
more editorial "paper" world, and add a serif display voice it doesn't have.

### Palette (warm neutrals)
| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F7F5F2` | page background (warm paper) |
| `--color-ink` | `#111111` | primary text |
| `--color-muted` | `#666666` | secondary text |
| `--color-line` | `#E2DED6` | hairline rules |
| `--color-panel` | `#ECE9E3` | image placeholders / soft panels |
| Accent | `#000000` | buttons, hover states |

No gradients, no shadows, no glassmorphism, no rounded bubbles.

### Typography
- **Display serif**: Cormorant Garamond (300/400 + italic) — Canela-esque elegance.
  Headlines `clamp(2.75rem, 6vw, 6.5rem)`, line-height ≤ 1.05, tracking −0.02em.
- **Body sans**: Inter 400/500. Body 15–16px / 1.6.
- **Micro labels** (the Niksen trick): 11px, uppercase, tracking 0.18em, weight 500 —
  used for nav, prices, buttons, section numbers, categories.
- Nothing bolder than 500. Hierarchy comes from size, not weight.

### Layout
- Content container: `max-width 1400px`, margins 24px mobile / 48px desktop
- 12-column grid for editorial sections; deliberate asymmetry (text col 1–5,
  image col 7–12, then reversed)
- Full-bleed hero (100svh) and story imagery
- Section spacing: 128–192px vertical; whitespace is the luxury
- Mobile: single column, same type scale barely reduced

### Motion (all subtle)
- Lenis smooth scroll (duration ~1.1)
- Reveal on scroll: opacity 0→1, y 24→0, 0.7s, `cubic-bezier(.22,1,.36,1)`, once
- Hero: parallax (image translates ~15% of scroll) + slow scale 1.08→1
- Images on hover: scale 1.03 + soft fade overlay
- Cards on hover: scale ≤1.02
- Links/buttons: underline grows from left on hover
- Page transitions: 0.4s fade/translate

### Page rhythm (our homepage)
1. Hero — full-screen image, serif headline, small paragraph, "Explore Collection"
2. Featured Collection — 3 asymmetric large cards (title, note, price, View Details)
3. Brand Story — editorial split spreads, alternating image/text, pull-quote scale serif
4. Gallery — asymmetric masonry, generous gaps
5. Journal — 3 magazine cards (category · date · serif title · excerpt)
6. Newsletter — "Stay Inspired", hairline input, minimal button
7. Footer — Navigation / Social / Contact / Newsletter columns + copyright

### Stack
Vite + React + TypeScript · Tailwind CSS v4 · Framer Motion · Lenis · Lucide React.
Images lazy-loaded; WCAG AA contrast (#111 and #666 on #F7F5F2 both pass);
focus-visible states on all interactive elements; `prefers-reduced-motion` respected by Framer.

### Placeholder imagery
Grayscale placeholder photography (picsum `?grayscale`) keeps the monochrome
gallery mood consistent until real campaign photography is shot. Swap the
`img()` helper in `src/data/products.ts` when assets arrive.

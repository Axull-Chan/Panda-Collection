-- ============================================================
-- ANITA e-commerce schema — 004: seed data (safe to run once)
-- Generated from src/data/products.ts
-- ============================================================

-- categories
insert into public.categories (slug, name, sort_order) values ('coats', 'Coats', 0) on conflict (slug) do nothing;
insert into public.categories (slug, name, sort_order) values ('knitwear', 'Knitwear', 1) on conflict (slug) do nothing;
insert into public.categories (slug, name, sort_order) values ('shirts', 'Shirts', 2) on conflict (slug) do nothing;
insert into public.categories (slug, name, sort_order) values ('trousers', 'Trousers', 3) on conflict (slug) do nothing;
insert into public.categories (slug, name, sort_order) values ('dresses', 'Dresses', 4) on conflict (slug) do nothing;
insert into public.categories (slug, name, sort_order) values ('tailoring', 'Tailoring', 5) on conflict (slug) do nothing;

-- collections
insert into public.collections (slug, name, description) values
  ('edition-no-01', 'Edition No. 01', 'The founding edition — twenty garments, twenty pieces each.'),
  ('signature', 'Signature Pieces', 'The garments that define the house.'),
  ('new-arrivals', 'New Arrivals', 'The latest releases from the atelier.')
on conflict (slug) do nothing;

-- products
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('wool-cocoon-coat', 'Gabardine Trench Coat', 'A full-length trench in washed gabardine, cut to fall in a single unbroken line from the shoulder. Numbered edition of twenty, each piece hand-finished.', 820, 'ANITA-001', (select id from public.categories where slug = 'coats'), 'SIGNATURE', 20, 1, true)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('structured-wrap-coat', 'Suede Chore Jacket', 'A boxy chore jacket in chocolate suede with a zip front and snap pockets, cut to sit square on the shoulder.', 740, 'ANITA-002', (select id from public.categories where slug = 'coats'), null, 20, 2, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('raw-edge-overcoat', 'Souvenir Blouson', 'A satin souvenir blouson with contrast raglan sleeves and striped ribbing, embroidered by hand in the atelier.', 890, 'ANITA-003', (select id from public.categories where slug = 'coats'), null, 20, 3, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('cable-knit-sweater', 'Embroidered Ringer Tee', 'A heavy jersey ringer tee with contrast binding and a hand-embroidered motif, garment-dyed in small batches.', 340, 'ANITA-004', (select id from public.categories where slug = 'knitwear'), null, 20, 4, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('ribbed-turtleneck', 'Ribbed Mockneck', 'A close, fine-gauge rib with a clean mockneck collar, cut short to sit above a wide trouser. The foundation piece of the collection.', 260, 'ANITA-005', (select id from public.categories where slug = 'knitwear'), 'SIGNATURE', 20, 5, true)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('cropped-cardigan', 'Cropped Bomber Jacket', 'A cropped nylon bomber with a double-layer storm collar, harness straps, and gunmetal hardware.', 310, 'ANITA-006', (select id from public.categories where slug = 'coats'), null, 20, 6, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('oversized-alpaca-knit', 'Oversized Mohair Knit', 'Brushed mohair in broad rose and camel stripes, knitted oversized through the body to be worn loose and layered.', 420, 'ANITA-007', (select id from public.categories where slug = 'knitwear'), null, 20, 7, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('poplin-shirt', 'Striped Knit Polo', 'A retro knit polo in fine navy stripe with a soft one-piece collar, cut with a relaxed body and short placket.', 220, 'ANITA-008', (select id from public.categories where slug = 'shirts'), null, 20, 8, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('silk-blouse', 'Garment-Dyed Overshirt', 'An oversized cotton overshirt with double chest pockets, garment-dyed to a deep persimmon that fades beautifully with wear.', 380, 'ANITA-009', (select id from public.categories where slug = 'shirts'), 'SIGNATURE', 20, 9, true)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('oxford-shirt', 'Oxford Shirt', 'A heavyweight oxford cloth shirt in washed blue with a relaxed body and a slightly extended hem, shown styled from the studio.', 240, 'ANITA-010', (select id from public.categories where slug = 'shirts'), null, 20, 10, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('wide-leg-trouser', 'Pleated Check Trouser', 'A fluid wide-leg trouser in a fine brown check, cut with a high rise and deep double pleats.', 360, 'ANITA-011', (select id from public.categories where slug = 'trousers'), null, 20, 11, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('tapered-wool-trouser', 'Houndstooth Suit Trouser', 'A relaxed suit trouser in micro-houndstooth wool with a clean front, built to break softly over a derby shoe.', 340, 'ANITA-012', (select id from public.categories where slug = 'trousers'), null, 20, 12, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('straight-leg-denim', 'Washed Balloon Denim', 'Rigid Japanese denim in a balloon leg, stone-washed to a soft vintage blue and cinched at the ankle.', 290, 'ANITA-013', (select id from public.categories where slug = 'trousers'), null, 20, 13, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('column-slip-dress', 'Corset Midi Dress', 'A strapless corset dress in navy crepe, trimmed in checked poplin with detachable balloon sleeves.', 480, 'ANITA-014', (select id from public.categories where slug = 'dresses'), 'SIGNATURE', 20, 14, true)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('sculpted-midi-dress', 'Leather Corset Dress', 'A sculpted corset dress in matte leather with a draped wrap skirt and interior boning, shown on the atelier form.', 520, 'ANITA-015', (select id from public.categories where slug = 'dresses'), null, 20, 15, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('asymmetric-wrap-dress', 'Bouclé Skirt Suit', 'A braided-trim bouclé jacket and matching skirt in cream, finished with gilt buttons and hand-sewn trim.', 460, 'ANITA-016', (select id from public.categories where slug = 'dresses'), null, 20, 16, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('single-breasted-blazer', 'Single Breasted Blazer', 'A precisely tailored blazer in dark loden wool with a soft shoulder, cut long in the body and worn best a size up.', 680, 'ANITA-017', (select id from public.categories where slug = 'tailoring'), 'SIGNATURE', 20, 17, true)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('double-breasted-vest', 'Double Breasted Jacket', 'A cropped double-breasted jacket in black felted wool with two rows of silver buttons and a standing collar.', 410, 'ANITA-018', (select id from public.categories where slug = 'tailoring'), null, 20, 18, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('tailored-waistcoat', 'Relaxed Wool Suit', 'An unstructured suit in taupe tropical wool, cut generously through the jacket and pleated trouser to drape rather than sit.', 390, 'ANITA-019', (select id from public.categories where slug = 'tailoring'), null, 20, 19, false)
on conflict (slug) do nothing;
insert into public.products (slug, name, description, price, sku, category_id, badge, edition_size, release_index, featured)
values ('wide-shoulder-jacket', 'Boxy Lounge Blazer', 'An extended-shoulder lounge blazer in grey-brown wool, photographed for the cover of our Edition No. 01 lookbook.', 720, 'ANITA-020', (select id from public.categories where slug = 'tailoring'), null, 20, 20, false)
on conflict (slug) do nothing;

-- product images (primary)
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/trench.jpg', 'Gabardine Trench Coat', true, 0 from public.products where slug = 'wool-cocoon-coat'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/suede-jacket.jpg', 'Suede Chore Jacket', true, 0 from public.products where slug = 'structured-wrap-coat'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/souvenir-blouson.jpg', 'Souvenir Blouson', true, 0 from public.products where slug = 'raw-edge-overcoat'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/ringer-tees.jpg', 'Embroidered Ringer Tee', true, 0 from public.products where slug = 'cable-knit-sweater'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/mockneck.jpg', 'Ribbed Mockneck', true, 0 from public.products where slug = 'ribbed-turtleneck'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/bomber.jpg', 'Cropped Bomber Jacket', true, 0 from public.products where slug = 'cropped-cardigan'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/mohair.jpg', 'Oversized Mohair Knit', true, 0 from public.products where slug = 'oversized-alpaca-knit'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/knit-polo.jpg', 'Striped Knit Polo', true, 0 from public.products where slug = 'poplin-shirt'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/overshirt.jpg', 'Garment-Dyed Overshirt', true, 0 from public.products where slug = 'silk-blouse'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/flatlay-oxford.jpg', 'Oxford Shirt', true, 0 from public.products where slug = 'oxford-shirt'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/check-trouser.jpg', 'Pleated Check Trouser', true, 0 from public.products where slug = 'wide-leg-trouser'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/houndstooth.jpg', 'Houndstooth Suit Trouser', true, 0 from public.products where slug = 'tapered-wool-trouser'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/balloon-denim.jpg', 'Washed Balloon Denim', true, 0 from public.products where slug = 'straight-leg-denim'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/corset-midi.jpg', 'Corset Midi Dress', true, 0 from public.products where slug = 'column-slip-dress'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/leather-corset.jpg', 'Leather Corset Dress', true, 0 from public.products where slug = 'sculpted-midi-dress'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/boucle-suit.jpg', 'Bouclé Skirt Suit', true, 0 from public.products where slug = 'asymmetric-wrap-dress'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/sb-blazer.jpg', 'Single Breasted Blazer', true, 0 from public.products where slug = 'single-breasted-blazer'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/military-jacket.jpg', 'Double Breasted Jacket', true, 0 from public.products where slug = 'double-breasted-vest'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/wool-suit.jpg', 'Relaxed Wool Suit', true, 0 from public.products where slug = 'tailored-waistcoat'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);
insert into public.product_images (product_id, url, alt, is_primary, sort_order)
select id, '/images/cover-boxy.jpg', 'Boxy Lounge Blazer', true, 0 from public.products where slug = 'wide-shoulder-jacket'
  and not exists (select 1 from public.product_images i where i.product_id = products.id and i.is_primary);

-- product variants (one per size; edition of 20 split across sizes)
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-001-XS', 5 from public.products where slug = 'wool-cocoon-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-001-S', 5 from public.products where slug = 'wool-cocoon-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-001-M', 5 from public.products where slug = 'wool-cocoon-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-001-L', 5 from public.products where slug = 'wool-cocoon-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-002-XS', 4 from public.products where slug = 'structured-wrap-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-002-S', 4 from public.products where slug = 'structured-wrap-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-002-M', 4 from public.products where slug = 'structured-wrap-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-002-L', 4 from public.products where slug = 'structured-wrap-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XL', 'One Colour', 'ANITA-002-XL', 4 from public.products where slug = 'structured-wrap-coat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-003-S', 6 from public.products where slug = 'raw-edge-overcoat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-003-M', 6 from public.products where slug = 'raw-edge-overcoat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-003-L', 6 from public.products where slug = 'raw-edge-overcoat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-004-XS', 5 from public.products where slug = 'cable-knit-sweater'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-004-S', 5 from public.products where slug = 'cable-knit-sweater'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-004-M', 5 from public.products where slug = 'cable-knit-sweater'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-004-L', 5 from public.products where slug = 'cable-knit-sweater'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-005-XS', 4 from public.products where slug = 'ribbed-turtleneck'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-005-S', 4 from public.products where slug = 'ribbed-turtleneck'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-005-M', 4 from public.products where slug = 'ribbed-turtleneck'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-005-L', 4 from public.products where slug = 'ribbed-turtleneck'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XL', 'One Colour', 'ANITA-005-XL', 4 from public.products where slug = 'ribbed-turtleneck'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-006-XS', 6 from public.products where slug = 'cropped-cardigan'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-006-S', 6 from public.products where slug = 'cropped-cardigan'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-006-M', 6 from public.products where slug = 'cropped-cardigan'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-007-S', 6 from public.products where slug = 'oversized-alpaca-knit'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-007-M', 6 from public.products where slug = 'oversized-alpaca-knit'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-007-L', 6 from public.products where slug = 'oversized-alpaca-knit'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-008-XS', 5 from public.products where slug = 'poplin-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-008-S', 5 from public.products where slug = 'poplin-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-008-M', 5 from public.products where slug = 'poplin-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-008-L', 5 from public.products where slug = 'poplin-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-009-XS', 6 from public.products where slug = 'silk-blouse'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-009-S', 6 from public.products where slug = 'silk-blouse'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-009-M', 6 from public.products where slug = 'silk-blouse'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-010-S', 5 from public.products where slug = 'oxford-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-010-M', 5 from public.products where slug = 'oxford-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-010-L', 5 from public.products where slug = 'oxford-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XL', 'One Colour', 'ANITA-010-XL', 5 from public.products where slug = 'oxford-shirt'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-011-XS', 5 from public.products where slug = 'wide-leg-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-011-S', 5 from public.products where slug = 'wide-leg-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-011-M', 5 from public.products where slug = 'wide-leg-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-011-L', 5 from public.products where slug = 'wide-leg-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-012-XS', 4 from public.products where slug = 'tapered-wool-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-012-S', 4 from public.products where slug = 'tapered-wool-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-012-M', 4 from public.products where slug = 'tapered-wool-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-012-L', 4 from public.products where slug = 'tapered-wool-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XL', 'One Colour', 'ANITA-012-XL', 4 from public.products where slug = 'tapered-wool-trouser'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-013-XS', 5 from public.products where slug = 'straight-leg-denim'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-013-S', 5 from public.products where slug = 'straight-leg-denim'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-013-M', 5 from public.products where slug = 'straight-leg-denim'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-013-L', 5 from public.products where slug = 'straight-leg-denim'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-014-XS', 6 from public.products where slug = 'column-slip-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-014-S', 6 from public.products where slug = 'column-slip-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-014-M', 6 from public.products where slug = 'column-slip-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-015-XS', 5 from public.products where slug = 'sculpted-midi-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-015-S', 5 from public.products where slug = 'sculpted-midi-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-015-M', 5 from public.products where slug = 'sculpted-midi-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-015-L', 5 from public.products where slug = 'sculpted-midi-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-016-S', 6 from public.products where slug = 'asymmetric-wrap-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-016-M', 6 from public.products where slug = 'asymmetric-wrap-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-016-L', 6 from public.products where slug = 'asymmetric-wrap-dress'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-017-XS', 4 from public.products where slug = 'single-breasted-blazer'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-017-S', 4 from public.products where slug = 'single-breasted-blazer'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-017-M', 4 from public.products where slug = 'single-breasted-blazer'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-017-L', 4 from public.products where slug = 'single-breasted-blazer'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XL', 'One Colour', 'ANITA-017-XL', 4 from public.products where slug = 'single-breasted-blazer'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-018-XS', 6 from public.products where slug = 'double-breasted-vest'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-018-S', 6 from public.products where slug = 'double-breasted-vest'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-018-M', 6 from public.products where slug = 'double-breasted-vest'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-019-S', 6 from public.products where slug = 'tailored-waistcoat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-019-M', 6 from public.products where slug = 'tailored-waistcoat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-019-L', 6 from public.products where slug = 'tailored-waistcoat'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'XS', 'One Colour', 'ANITA-020-XS', 5 from public.products where slug = 'wide-shoulder-jacket'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'S', 'One Colour', 'ANITA-020-S', 5 from public.products where slug = 'wide-shoulder-jacket'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'M', 'One Colour', 'ANITA-020-M', 5 from public.products where slug = 'wide-shoulder-jacket'
on conflict (product_id, size, color) do nothing;
insert into public.product_variants (product_id, size, color, sku, stock)
select id, 'L', 'One Colour', 'ANITA-020-L', 5 from public.products where slug = 'wide-shoulder-jacket'
on conflict (product_id, size, color) do nothing;

-- collection membership
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'wool-cocoon-coat' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'wool-cocoon-coat' and c.slug = 'signature'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'wool-cocoon-coat' and c.slug = 'new-arrivals'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'structured-wrap-coat' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'structured-wrap-coat' and c.slug = 'new-arrivals'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'raw-edge-overcoat' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'raw-edge-overcoat' and c.slug = 'new-arrivals'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'cable-knit-sweater' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'cable-knit-sweater' and c.slug = 'new-arrivals'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'ribbed-turtleneck' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'ribbed-turtleneck' and c.slug = 'signature'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'ribbed-turtleneck' and c.slug = 'new-arrivals'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'cropped-cardigan' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'cropped-cardigan' and c.slug = 'new-arrivals'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'oversized-alpaca-knit' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'poplin-shirt' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'silk-blouse' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'silk-blouse' and c.slug = 'signature'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'oxford-shirt' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'wide-leg-trouser' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'tapered-wool-trouser' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'straight-leg-denim' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'column-slip-dress' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'column-slip-dress' and c.slug = 'signature'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'sculpted-midi-dress' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'asymmetric-wrap-dress' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'single-breasted-blazer' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'single-breasted-blazer' and c.slug = 'signature'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'double-breasted-vest' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'tailored-waistcoat' and c.slug = 'edition-no-01'
on conflict do nothing;
insert into public.product_collections (product_id, collection_id)
select p.id, c.id from public.products p, public.collections c where p.slug = 'wide-shoulder-jacket' and c.slug = 'edition-no-01'
on conflict do nothing;

-- sample coupon
insert into public.coupons (code, description, discount_type, discount_value, min_order, active)
values ('WELCOME10', '10% off your first order', 'percent', 10, 0, true)
on conflict (code) do nothing;

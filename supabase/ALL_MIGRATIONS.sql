-- ============================================================
-- ANITA e-commerce schema — 001: tables, constraints, indexes
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------

-- Keeps updated_at fresh on every row update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- catalog ----------

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,          -- used in site URLs (/product/:slug)
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price >= 0),
  sale_price    numeric(10,2) check (sale_price >= 0 and sale_price <= price),
  sku           text unique,
  brand         text not null default 'ANITA',
  category_id   uuid references public.categories(id) on delete set null,
  badge         text,                          -- e.g. 'SIGNATURE'
  edition_size  int  not null default 20 check (edition_size > 0),
  release_index int,                           -- catalog sort order
  featured      boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx   on public.products (active);
create index if not exists products_release_idx  on public.products (release_index);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_collections (
  product_id    uuid not null references public.products(id)    on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  alt        text,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id);
-- at most one primary image per product
create unique index if not exists product_images_one_primary
  on public.product_images (product_id) where is_primary;

create table if not exists public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size       text not null,
  color      text not null default 'One Colour',
  sku        text unique,
  stock      int  not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

create trigger product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------- users ----------

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  phone      text,
  address    jsonb,                            -- { line1, line2, city, postal_code, country }
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile whenever a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the current request comes from an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------- cart & wishlist ----------

create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity   int  not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

create index if not exists cart_items_user_idx on public.cart_items (user_id);

create trigger cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_idx on public.wishlist_items (user_id);

-- ---------- coupons ----------

create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  description    text,
  discount_type  text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order      numeric(10,2) not null default 0,
  starts_at      timestamptz,
  expires_at     timestamptz,
  max_uses       int,
  used_count     int not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------- orders ----------

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,
  email            text,                        -- contact for guest checkout
  status           text not null default 'pending'
                   check (status in ('pending','paid','processing','shipped','completed','cancelled')),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid','paid','refunded')),
  shipping_status  text not null default 'not_shipped'
                   check (shipping_status in ('not_shipped','shipped','delivered')),
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  discount         numeric(10,2) not null default 0 check (discount >= 0),
  total            numeric(10,2) not null check (total >= 0),
  coupon_id        uuid references public.coupons(id) on delete set null,
  shipping_address jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_user_idx   on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id)         on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_name  text not null,                 -- snapshot at purchase time
  variant_label text,                          -- e.g. 'One Colour / M'
  quantity      int  not null check (quantity > 0),
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Inventory: decrement variant stock when an order transitions to 'completed'
create or replace function public.decrement_stock_on_completion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.product_variants v
    set stock = greatest(v.stock - oi.quantity, 0)
    from public.order_items oi
    where oi.order_id = new.id
      and oi.variant_id = v.id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_decrement_stock on public.orders;
create trigger orders_decrement_stock
  after update on public.orders
  for each row execute function public.decrement_stock_on_completion();

-- ---------- reviews ----------

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id    uuid not null references auth.users(id)      on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)                 -- one review per user per product
);

create index if not exists reviews_product_idx on public.reviews (product_id);
-- ============================================================
-- ANITA e-commerce schema — 002: Row Level Security
-- ============================================================

alter table public.categories          enable row level security;
alter table public.collections         enable row level security;
alter table public.products            enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_variants    enable row level security;
alter table public.profiles            enable row level security;
alter table public.cart_items          enable row level security;
alter table public.wishlist_items      enable row level security;
alter table public.coupons             enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.reviews             enable row level security;

-- ---------- catalog: public read, admin write ----------

create policy "Public read categories"  on public.categories  for select using (true);
create policy "Public read collections" on public.collections for select using (true);

create policy "Public read active products" on public.products
  for select using (active or public.is_admin());

create policy "Public read product_collections" on public.product_collections
  for select using (
    exists (select 1 from public.products p
            where p.id = product_id and (p.active or public.is_admin()))
  );

create policy "Public read product_images" on public.product_images
  for select using (
    exists (select 1 from public.products p
            where p.id = product_id and (p.active or public.is_admin()))
  );

create policy "Public read product_variants" on public.product_variants
  for select using (
    exists (select 1 from public.products p
            where p.id = product_id and (p.active or public.is_admin()))
  );

create policy "Admin write categories"          on public.categories          for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin write collections"         on public.collections         for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin write products"            on public.products            for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin write product_collections" on public.product_collections for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin write product_images"      on public.product_images      for all using (public.is_admin()) with check (public.is_admin());
create policy "Admin write product_variants"    on public.product_variants    for all using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles ----------

create policy "Read own profile" on public.profiles
  for select using (id = (select auth.uid()) or public.is_admin());

create policy "Update own profile" on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = 'customer');  -- users cannot self-promote

create policy "Admin manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- cart & wishlist: owner only ----------

create policy "Own cart" on public.cart_items
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own wishlist" on public.wishlist_items
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- coupons ----------

create policy "Public read active coupons" on public.coupons
  for select using (active or public.is_admin());

create policy "Admin write coupons" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- orders ----------

create policy "Read own orders" on public.orders
  for select using (user_id = (select auth.uid()) or public.is_admin());

create policy "Create own order" on public.orders
  for insert with check (user_id = (select auth.uid()));

create policy "Admin manage orders" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Read own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.user_id = (select auth.uid()) or public.is_admin()))
  );

create policy "Add items to own pending order" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o
            where o.id = order_id
              and o.user_id = (select auth.uid())
              and o.status = 'pending')
  );

create policy "Admin manage order items" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- reviews ----------

create policy "Public read reviews" on public.reviews for select using (true);

create policy "Write own review" on public.reviews
  for insert with check (user_id = (select auth.uid()));

create policy "Update own review" on public.reviews
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Delete own review" on public.reviews
  for delete using (user_id = (select auth.uid()) or public.is_admin());
-- ============================================================
-- ANITA e-commerce schema — 003: Storage buckets & policies
-- ============================================================

-- Public buckets: anyone can view files; writing is restricted below.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Product images: only admins may upload/replace/delete
create policy "Admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- Avatars: each user manages files inside their own folder (<uid>/...)
create policy "User upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "User update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "User delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
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
-- ============================================================
-- ANITA e-commerce schema — 005: admin dashboard support
-- Adds a three-state product status and customer emails.
-- ============================================================

-- Product status: draft / published / archived.
-- `active` (used by the public RLS policies) becomes derived from status,
-- so existing storefront queries and policies keep working unchanged.
alter table public.products
  add column if not exists status text not null default 'published'
  check (status in ('draft','published','archived'));

update public.products
  set status = case when active then 'published' else 'archived' end;

create or replace function public.sync_product_active()
returns trigger
language plpgsql
as $$
begin
  new.active := (new.status = 'published');
  return new;
end;
$$;

drop trigger if exists products_sync_active on public.products;
create trigger products_sync_active
  before insert or update on public.products
  for each row execute function public.sync_product_active();

-- Customer email on profiles (auth.users is not reachable from the
-- dashboard client; only admins/owners can read profiles via RLS).
alter table public.profiles add column if not exists email text;

update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
-- ============================================================
-- ANITA e-commerce schema — 006: order total integrity
-- ============================================================
--
-- The checkout flow computes subtotal/total in the browser and inserts
-- them directly on the order row (order_items are inserted right after,
-- in a second request). RLS on `orders` only checks ownership
-- (user_id = auth.uid()), not that the total matches what was actually
-- purchased — so a tampered client (or a direct REST call) could insert
-- an order with a fabricated total while real order_items are attached.
--
-- This trigger makes that tampering pointless: whenever order_items
-- change, it recomputes subtotal/total for the parent order directly
-- from the item rows, overriding whatever the client sent. Honest
-- checkouts already match, so this is invisible in normal use.

create or replace function public.recompute_order_total()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_order uuid := coalesce(new.order_id, old.order_id);
  new_subtotal numeric(10,2);
begin
  select coalesce(sum(unit_price * quantity), 0)
    into new_subtotal
    from public.order_items
    where order_id = target_order;

  update public.orders
    set subtotal = new_subtotal,
        total = greatest(new_subtotal - discount, 0)
    where id = target_order;

  return null; -- statement result unused (AFTER trigger)
end;
$$;

drop trigger if exists order_items_recompute_total on public.order_items;
create trigger order_items_recompute_total
  after insert or update or delete on public.order_items
  for each row execute function public.recompute_order_total();
-- ============================================================
-- ANITA e-commerce schema — 007: Stripe payment integration
-- ============================================================
--
-- Adds the columns needed to reconcile an order with its Stripe Checkout
-- Session/PaymentIntent, and replaces the completion-only stock trigger
-- with an idempotent version driven by payment success. Stock now
-- decrements the moment payment is confirmed (industry standard),
-- not only when an admin later marks an order "completed" (fulfilled).
--
-- The `stock_decremented` guard is essential: Stripe delivers webhooks
-- at-least-once, so the same "payment succeeded" event can arrive twice.
-- Without this flag, a retried webhook would deduct stock twice.

alter table public.orders
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stock_decremented boolean not null default false;

create unique index if not exists orders_stripe_session_unique
  on public.orders (stripe_session_id) where stripe_session_id is not null;

-- Retire the old completion-only trigger from migration 001; replaced below.
drop trigger if exists orders_decrement_stock on public.orders;
drop function if exists public.decrement_stock_on_completion();

-- BEFORE trigger: flips `stock_decremented` false -> true exactly once,
-- the first time EITHER payment succeeds OR an order is marked completed
-- (covers both the Stripe flow and any future manual/COD admin flow).
create or replace function public.mark_stock_decremented()
returns trigger
language plpgsql
as $$
begin
  if not old.stock_decremented
     and (
       (new.payment_status = 'paid' and old.payment_status is distinct from 'paid')
       or (new.status = 'completed' and old.status is distinct from 'completed')
     )
  then
    new.stock_decremented := true;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_mark_stock_decremented on public.orders;
create trigger orders_mark_stock_decremented
  before update on public.orders
  for each row execute function public.mark_stock_decremented();

-- AFTER trigger: reacts to that flag actually flipping this update, and
-- performs the real decrement exactly once per order, regardless of how
-- many times payment_status/status are subsequently touched.
create or replace function public.apply_stock_decrement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.stock_decremented and not old.stock_decremented then
    update public.product_variants v
    set stock = greatest(v.stock - oi.quantity, 0)
    from public.order_items oi
    where oi.order_id = new.id
      and oi.variant_id = v.id;
  end if;
  return null;
end;
$$;

drop trigger if exists orders_apply_stock_decrement on public.orders;
create trigger orders_apply_stock_decrement
  after update on public.orders
  for each row execute function public.apply_stock_decrement();

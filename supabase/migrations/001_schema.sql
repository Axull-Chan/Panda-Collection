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

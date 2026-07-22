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

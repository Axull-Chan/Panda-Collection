-- ============================================================
-- ANITA e-commerce schema — 011: coupon system
-- ============================================================
--
-- The coupons/orders.coupon_id/orders.discount columns already exist
-- (migration 001). This adds what's still missing for the full coupon
-- feature:
--
-- 1. coupons.max_discount — an optional cap, mainly meant for percentage
--    coupons ("20% off, up to $50").
--
-- 2. orders.coupon_code / discount_type / discount_value — a permanent
--    snapshot of the coupon as it was AT PURCHASE TIME. orders.coupon_id
--    alone isn't enough: it's `on delete set null`, and an admin editing
--    or deleting a coupon later must never rewrite what a past order
--    displays — the same reasoning order_items already snapshots
--    product_name/variant_label instead of only pointing at product_id.
--
-- 3. orders.coupon_usage_counted + a trigger pair that increments
--    coupons.used_count exactly once per order, the first time payment
--    succeeds. Mirrors the existing stock_decremented pattern (migration
--    007) for the identical reason: Stripe delivers webhooks
--    at-least-once, so the same "payment succeeded" event can arrive
--    twice — without an idempotency guard a retried webhook would count
--    one purchase as two uses of the coupon.

alter table public.coupons
  add column if not exists max_discount numeric(10,2) check (max_discount is null or max_discount > 0);

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists discount_type text check (discount_type is null or discount_type in ('percent', 'fixed')),
  add column if not exists discount_value numeric(10,2),
  add column if not exists coupon_usage_counted boolean not null default false;

-- BEFORE trigger: flips `coupon_usage_counted` false -> true exactly once,
-- the first time payment succeeds for an order that actually used a coupon.
create or replace function public.mark_coupon_usage_counted()
returns trigger
language plpgsql
as $$
begin
  if new.coupon_id is not null
     and not old.coupon_usage_counted
     and new.payment_status = 'paid'
     and old.payment_status is distinct from 'paid'
  then
    new.coupon_usage_counted := true;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_mark_coupon_usage_counted on public.orders;
create trigger orders_mark_coupon_usage_counted
  before update on public.orders
  for each row execute function public.mark_coupon_usage_counted();

-- AFTER trigger: reacts to that flag actually flipping this update, and
-- increments the coupon's used_count exactly once per order, regardless
-- of how many times payment_status is subsequently touched.
create or replace function public.apply_coupon_usage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.coupon_usage_counted and not old.coupon_usage_counted then
    update public.coupons
      set used_count = used_count + 1
      where id = new.coupon_id;
  end if;
  return null;
end;
$$;

drop trigger if exists orders_apply_coupon_usage on public.orders;
create trigger orders_apply_coupon_usage
  after update on public.orders
  for each row execute function public.apply_coupon_usage();

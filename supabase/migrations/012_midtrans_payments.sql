-- ============================================================
-- ANITA e-commerce schema — 012: Midtrans payment integration
-- ============================================================
--
-- Adds Midtrans as a second payment provider alongside Stripe. Midtrans's
-- own `order_id` is set to this table's `id` directly at transaction-create
-- time (a UUID fits Midtrans's order_id constraints), so no separate
-- midtrans_order_id column is needed — `orders.id` already is that value.
--
-- The idempotency triggers from 007/008/011 (mark_stock_decremented /
-- apply_stock_decrement, orders_set_paid_at, mark_coupon_usage_counted /
-- apply_coupon_usage) key off payment_status/status transitions, not
-- Stripe specifically, so they apply unchanged to Midtrans-driven updates —
-- nothing about them needs to change here.

alter table public.orders
  add column if not exists payment_provider text not null default 'stripe'
    check (payment_provider in ('stripe', 'midtrans')),
  add column if not exists midtrans_transaction_id text,
  add column if not exists midtrans_redirect_url text;

create unique index if not exists orders_midtrans_transaction_unique
  on public.orders (midtrans_transaction_id) where midtrans_transaction_id is not null;

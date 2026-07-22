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

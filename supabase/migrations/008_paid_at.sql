-- ============================================================
-- ANITA e-commerce schema — 008: payment timestamp
-- ============================================================
--
-- Admins need to see *when* an order was actually paid, distinct from
-- created_at (drafted) and updated_at (changes on every later edit,
-- including unrelated shipping-status updates — not a reliable payment
-- timestamp).
--
-- Set via trigger, not application code, so it's set exactly once no
-- matter which code path flips payment_status to 'paid' (the webhook
-- today; any future manual/admin path later) and is immune to Stripe's
-- at-least-once webhook retries re-touching it.

alter table public.orders
  add column if not exists paid_at timestamptz;

create or replace function public.set_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.payment_status = 'paid'
     and old.payment_status is distinct from 'paid'
     and old.paid_at is null
  then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_paid_at on public.orders;
create trigger orders_set_paid_at
  before update on public.orders
  for each row execute function public.set_paid_at();

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

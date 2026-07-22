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

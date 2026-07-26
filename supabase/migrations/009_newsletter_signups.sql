-- ============================================================
-- ANITA e-commerce schema — 009: newsletter signups
-- ============================================================
--
-- `newsletter_signups` predates the versioned migration system (it was
-- created directly in the dashboard during initial Supabase setup) and was
-- never brought under RLS when the rest of the schema was hardened in
-- migration 002. This creates it if it's somehow missing and locks it down
-- to match every other table: public can subscribe, but only admins can
-- read the list back — without this, subscriber emails would be readable
-- by anyone via the anon key.

create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups enable row level security;

drop policy if exists "Public subscribe" on public.newsletter_signups;
create policy "Public subscribe" on public.newsletter_signups
  for insert with check (true);

drop policy if exists "Admin read newsletter signups" on public.newsletter_signups;
create policy "Admin read newsletter signups" on public.newsletter_signups
  for select using (public.is_admin());

drop policy if exists "Admin manage newsletter signups" on public.newsletter_signups;
create policy "Admin manage newsletter signups" on public.newsletter_signups
  for all using (public.is_admin()) with check (public.is_admin());

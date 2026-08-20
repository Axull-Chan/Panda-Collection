-- ============================================================
-- ANITA e-commerce schema — 013: Rebrand to ACD Fashion
-- ============================================================
--
-- This site now serves a real client — ACD Fashion — rather than the
-- fictional "ANITA" brand it was originally built under. Updates the
-- products.brand default and backfills existing rows.

alter table public.products
  alter column brand set default 'ACD Fashion';

update public.products
set brand = 'ACD Fashion'
where brand = 'ANITA';

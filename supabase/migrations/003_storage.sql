-- ============================================================
-- ANITA e-commerce schema — 003: Storage buckets & policies
-- ============================================================

-- Public buckets: anyone can view files; writing is restricted below.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Product images: only admins may upload/replace/delete
create policy "Admin upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- Avatars: each user manages files inside their own folder (<uid>/...)
create policy "User upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "User update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "User delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

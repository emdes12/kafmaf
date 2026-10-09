-- =============================================================================
-- KAFMAF platform — private storage for passport photographs
--   applications/{auth.uid}/{random}.jpg  uploaded by the applicant
--   members/{member_id}/{random}.jpg      uploaded by an administrator (replacement)
-- The bucket is PRIVATE: files are only served through short-lived signed URLs
-- or authenticated downloads that pass the policies below.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public site assets (approved logo, approved photography). Anyone can read; only admins write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "site_assets_admin_write" on storage.objects for all to authenticated
using (bucket_id = 'site-assets' and public.is_admin())
with check (bucket_id = 'site-assets' and public.is_admin());

-- Applicants upload only into their own folder, with a random file name.
create policy "member_photos_applicant_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = 'applications'
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) ~ '^[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp)$'
);

-- Applicants may read their own uploads; members may read the photo on their record.
create policy "member_photos_owner_read" on storage.objects for select to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (split_part(name, '/', 1) = 'applications' and split_part(name, '/', 2) = auth.uid()::text)
    or exists (select 1 from public.members m where m.user_id = auth.uid() and m.photo_path = storage.objects.name)
  )
);

-- Applicants may delete an upload that is not attached to any application (e.g. re-upload before submitting).
create policy "member_photos_applicant_delete_unused" on storage.objects for delete to authenticated
using (
  bucket_id = 'member-photos'
  and split_part(name, '/', 1) = 'applications'
  and split_part(name, '/', 2) = auth.uid()::text
  and not exists (select 1 from public.membership_applications a where a.photo_path = storage.objects.name)
);

-- Administrators: full access within this bucket.
create policy "member_photos_admin_all" on storage.objects for all to authenticated
using (bucket_id = 'member-photos' and public.is_admin())
with check (bucket_id = 'member-photos' and public.is_admin());

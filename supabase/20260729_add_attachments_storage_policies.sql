-- Allow logged-in users to upload and read files in the attachments bucket.
-- This does not delete or overwrite existing data.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do update
set public = true;

drop policy if exists "authenticated users can upload attachments" on storage.objects;
create policy "authenticated users can upload attachments"
on storage.objects for insert to authenticated
with check (bucket_id = 'attachments');

drop policy if exists "authenticated users can read attachments" on storage.objects;
create policy "authenticated users can read attachments"
on storage.objects for select to authenticated
using (bucket_id = 'attachments');

drop policy if exists "public can read attachments" on storage.objects;
create policy "public can read attachments"
on storage.objects for select to anon
using (bucket_id = 'attachments');

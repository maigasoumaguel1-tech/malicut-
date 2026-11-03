begin;

update public.videos v
set video_url = o.name
from storage.objects o
where o.bucket_id = 'videos'
  and v.video_url like '%/storage/v1/object/public/videos/' || o.name;

drop policy if exists videos_read_public on public.videos;
create policy videos_read_public on public.videos
  for select to anon, authenticated
  using (
    (select auth.uid()) = user_id
    or (visibility = 'public' and private.can_view_profile(user_id))
  );

drop policy if exists "Allow authenticated video reads" on storage.objects;
drop policy if exists "Allow video media reads by publication" on storage.objects;
create policy "Allow video media reads by publication" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'videos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.videos v
        where v.video_url = objects.name
          and v.visibility = 'public'
          and private.can_view_profile(v.user_id)
      )
    )
  );

update storage.buckets set public = false where id = 'videos';

commit;

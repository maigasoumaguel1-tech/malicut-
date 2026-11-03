begin;

-- Keep creator roles representable in the schema, but never user-editable.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['user'::text, 'creator'::text, 'moderator'::text, 'admin'::text]));

-- Remove broad write privileges that allowed a signed-in user to change their own role.
revoke insert, update on table public.profiles from authenticated;
revoke insert (id, username, display_name, avatar_url, bio, role, created_at, updated_at)
  on table public.profiles from authenticated;
revoke update (id, username, display_name, avatar_url, bio, role, created_at, updated_at)
  on table public.profiles from authenticated;

-- Preserve the profile editor's required fields only.
grant insert (id, username, display_name, updated_at)
  on table public.profiles to authenticated;
grant update (username, display_name, updated_at)
  on table public.profiles to authenticated;

-- Trigger/event-trigger functions must not be callable through the public Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Remove redundant policies; the remaining policies preserve the same owner/public access.
drop policy if exists "Allow public video rows select" on public.videos;
drop policy if exists "Allow authenticated video rows insert" on public.videos;
drop policy if exists "Allow owners video rows update" on public.videos;

-- Let an authenticated owner remove their own uploaded video object.
create policy "Allow owners to delete video files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Cover foreign-key lookups identified by the Supabase performance advisor.
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists likes_video_id_idx on public.likes (video_id);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists notifications_video_id_idx on public.notifications (video_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_video_id_idx on public.reports (video_id);
create index if not exists video_reposts_video_id_idx on public.video_reposts (video_id);

commit;

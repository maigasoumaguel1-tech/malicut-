begin;

alter policy "follows_delete_own" on public.follows
  using ((select auth.uid()) = follower_id);
alter policy "follows_insert_own" on public.follows
  with check ((select auth.uid()) = follower_id);

alter policy "comments_delete_own" on public.comments
  using ((select auth.uid()) = user_id);
alter policy "comments_insert_own" on public.comments
  with check ((select auth.uid()) = user_id);
alter policy "comments_update_own" on public.comments
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "notifications_read_own" on public.notifications
  using ((select auth.uid()) = user_id);
alter policy "notifications_update_own" on public.notifications
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "reports_insert_own" on public.reports
  with check ((select auth.uid()) = reporter_id);
alter policy "reports_read_own" on public.reports
  using ((select auth.uid()) = reporter_id);

alter policy "videos_delete_own" on public.videos
  using ((select auth.uid()) = user_id);
alter policy "videos_insert_own" on public.videos
  with check ((select auth.uid()) = user_id);
alter policy "videos_read_public" on public.videos
  using ((visibility = 'public'::text) or ((select auth.uid()) = user_id));
alter policy "videos_update_own" on public.videos
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "profiles_insert_own" on public.profiles
  with check ((select auth.uid()) = id);
alter policy "profiles_update_own" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "likes_delete_own" on public.likes
  using ((select auth.uid()) = user_id);
alter policy "likes_insert_own" on public.likes
  with check ((select auth.uid()) = user_id);

commit;

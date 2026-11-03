begin;

create table if not exists public.account_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  private_profile boolean not null default false,
  allow_comments boolean not null default true,
  allow_messages boolean not null default true,
  allow_ai_processing boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.account_preferences enable row level security;
revoke all on table public.account_preferences from anon, public;
grant select, insert, update on table public.account_preferences to authenticated;
drop policy if exists account_preferences_select_own on public.account_preferences;
drop policy if exists account_preferences_insert_own on public.account_preferences;
drop policy if exists account_preferences_update_own on public.account_preferences;
create policy account_preferences_select_own on public.account_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy account_preferences_insert_own on public.account_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy account_preferences_update_own on public.account_preferences
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function private.can_view_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select p_profile_id = (select auth.uid())
    or coalesce((select not ap.private_profile from public.account_preferences ap where ap.user_id = p_profile_id), true)
    or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p_profile_id);
$function$;

create or replace function private.can_receive_comments(p_video_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select coalesce((select ap.allow_comments from public.videos v left join public.account_preferences ap on ap.user_id = v.user_id where v.id = p_video_id), true);
$function$;

create or replace function private.can_receive_messages(p_recipient_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select coalesce((select ap.allow_messages from public.account_preferences ap where ap.user_id = p_recipient_id), true);
$function$;

revoke all on function private.can_view_profile(uuid) from public;
revoke all on function private.can_receive_comments(uuid) from public;
revoke all on function private.can_receive_messages(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.can_view_profile(uuid) to anon, authenticated;
grant execute on function private.can_receive_comments(uuid) to authenticated;
grant execute on function private.can_receive_messages(uuid) to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to anon, authenticated
  using (private.can_view_profile(id));

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert to authenticated
  with check ((select auth.uid()) = user_id and private.can_receive_comments(video_id));

drop policy if exists direct_messages_send_as_self on public.direct_messages;
create policy direct_messages_send_as_self on public.direct_messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id and sender_id <> recipient_id
    and private.can_receive_messages(recipient_id)
    and (
      (message_type = 'text' and nullif(btrim(body), '') is not null and audio_path is null)
      or (message_type = 'audio' and body is null and audio_path like sender_id::text || '/%')
    )
  );

commit;

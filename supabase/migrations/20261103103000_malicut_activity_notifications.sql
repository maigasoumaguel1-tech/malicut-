begin;

create or replace function private.create_malicut_notification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_user uuid;
  actor_user uuid;
  related_video uuid;
  notification_type text;
  notification_message text;
begin
  if tg_table_name = 'likes' then
    actor_user := new.user_id;
    related_video := new.video_id;
    notification_type := 'like';
    notification_message := 'a aimé ta vidéo';
    select v.user_id into target_user from public.videos v where v.id = new.video_id;
  elsif tg_table_name = 'comments' then
    actor_user := new.user_id;
    related_video := new.video_id;
    notification_type := 'comment';
    notification_message := 'a commenté ta vidéo';
    select v.user_id into target_user from public.videos v where v.id = new.video_id;
  elsif tg_table_name = 'follows' then
    actor_user := new.follower_id;
    target_user := new.following_id;
    notification_type := 'follow';
    notification_message := 'a commencé à te suivre';
  elsif tg_table_name = 'video_reposts' then
    actor_user := new.user_id;
    related_video := new.video_id;
    notification_type := 'repost';
    notification_message := 'a partagé ta vidéo';
    select v.user_id into target_user from public.videos v where v.id = new.video_id;
  elsif tg_table_name = 'direct_messages' then
    actor_user := new.sender_id;
    target_user := new.recipient_id;
    notification_type := 'message';
    notification_message := case when new.message_type = 'audio'
      then 't’a envoyé un message vocal'
      else 't’a envoyé un message'
    end;
  else
    return new;
  end if;

  if target_user is not null and actor_user is distinct from target_user then
    insert into public.notifications (user_id, actor_id, type, video_id, message)
    values (target_user, actor_user, notification_type, related_video, notification_message);
  end if;

  return new;
end;
$$;

revoke execute on function private.create_malicut_notification() from public, anon, authenticated;

drop trigger if exists malicut_notify_after_insert on public.likes;
create trigger malicut_notify_after_insert after insert on public.likes
  for each row execute function private.create_malicut_notification();

drop trigger if exists malicut_notify_after_insert on public.comments;
create trigger malicut_notify_after_insert after insert on public.comments
  for each row execute function private.create_malicut_notification();

drop trigger if exists malicut_notify_after_insert on public.follows;
create trigger malicut_notify_after_insert after insert on public.follows
  for each row execute function private.create_malicut_notification();

drop trigger if exists malicut_notify_after_insert on public.video_reposts;
create trigger malicut_notify_after_insert after insert on public.video_reposts
  for each row execute function private.create_malicut_notification();

drop trigger if exists malicut_notify_after_insert on public.direct_messages;
create trigger malicut_notify_after_insert after insert on public.direct_messages
  for each row execute function private.create_malicut_notification();

commit;

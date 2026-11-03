begin;

create table if not exists private.video_views (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (viewer_id, video_id)
);
alter table private.video_views enable row level security;
grant usage on schema private to authenticated;
grant insert (viewer_id, video_id) on table private.video_views to authenticated;
drop policy if exists "viewers can register their own views" on private.video_views;
create policy "viewers can register their own views"
  on private.video_views for insert to authenticated
  with check ((select auth.uid()) = viewer_id);
create index if not exists video_views_video_id_idx on private.video_views (video_id);

create or replace function private.increment_video_views()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.videos
  set views = coalesce(views, 0) + 1
  where id = new.video_id and visibility = 'public';
  return new;
end;
$$;
revoke execute on function private.increment_video_views() from public, anon, authenticated;

drop trigger if exists increment_video_views_after_insert on private.video_views;
create trigger increment_video_views_after_insert
  after insert on private.video_views
  for each row execute function private.increment_video_views();

create or replace function public.register_video_view(p_video_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_count integer;
begin
  if current_user_id is null then
    return false;
  end if;

  insert into private.video_views (viewer_id, video_id)
  select current_user_id, v.id
  from public.videos v
  where v.id = p_video_id and v.visibility = 'public'
  on conflict (viewer_id, video_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;
revoke execute on function public.register_video_view(uuid) from public, anon;
grant execute on function public.register_video_view(uuid) to authenticated;

commit;

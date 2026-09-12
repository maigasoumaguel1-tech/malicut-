-- MaliCut V8 : schéma Supabase complet
create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Créateur MaliCut',
 username text unique,
 avatar_url text,
 bio text,
 created_at timestamptz not null default now()
);
create table if not exists public.videos(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null default 'Vidéo MaliCut',
 description text,
 video_url text not null,
 thumbnail_url text,
 views bigint not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.likes(
 id uuid primary key default gen_random_uuid(),
 video_id uuid not null references public.videos(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(video_id,user_id)
);
create table if not exists public.comments(
 id uuid primary key default gen_random_uuid(),
 video_id uuid not null references public.videos(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table if not exists public.follows(
 id uuid primary key default gen_random_uuid(),
 follower_id uuid not null references public.profiles(id) on delete cascade,
 following_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(follower_id,following_id),
 check(follower_id<>following_id)
);
create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 type text not null,
 title text not null,
 message text,
 video_id uuid references public.videos(id) on delete cascade,
 read boolean not null default false,
 created_at timestamptz not null default now()
);

create index if not exists videos_created_idx on public.videos(created_at desc);
create index if not exists videos_views_idx on public.videos(views desc);
create index if not exists likes_video_idx on public.likes(video_id);
create index if not exists comments_video_idx on public.comments(video_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name,username)
 values(new.id,coalesce(new.raw_user_meta_data->>'display_name','Créateur MaliCut'),
        nullif(lower(new.raw_user_meta_data->>'username'),''))
 on conflict(id) do update set
 display_name=excluded.display_name,
 username=coalesce(excluded.username,public.profiles.username);
 return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using(true);
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert to authenticated with check(id=auth.uid());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists "videos public read" on public.videos;
create policy "videos public read" on public.videos for select using(true);
drop policy if exists "videos own insert" on public.videos;
create policy "videos own insert" on public.videos for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "videos own update" on public.videos;
create policy "videos own update" on public.videos for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "videos own delete" on public.videos;
create policy "videos own delete" on public.videos for delete to authenticated using(user_id=auth.uid());

drop policy if exists "likes public read" on public.likes;
create policy "likes public read" on public.likes for select using(true);
drop policy if exists "likes own insert" on public.likes;
create policy "likes own insert" on public.likes for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "likes own delete" on public.likes;
create policy "likes own delete" on public.likes for delete to authenticated using(user_id=auth.uid());

drop policy if exists "comments public read" on public.comments;
create policy "comments public read" on public.comments for select using(true);
drop policy if exists "comments own insert" on public.comments;
create policy "comments own insert" on public.comments for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "comments own delete" on public.comments;
create policy "comments own delete" on public.comments for delete to authenticated using(user_id=auth.uid());

drop policy if exists "follows public read" on public.follows;
create policy "follows public read" on public.follows for select using(true);
drop policy if exists "follows own insert" on public.follows;
create policy "follows own insert" on public.follows for insert to authenticated with check(follower_id=auth.uid());
drop policy if exists "follows own delete" on public.follows;
create policy "follows own delete" on public.follows for delete to authenticated using(follower_id=auth.uid());

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

insert into storage.buckets(id,name,public) values('videos','videos',true)
on conflict(id) do update set public=true;
insert into storage.buckets(id,name,public) values('thumbnails','thumbnails',true)
on conflict(id) do update set public=true;

drop policy if exists "videos public read" on storage.objects;
create policy "videos public read" on storage.objects for select using(bucket_id='videos');
drop policy if exists "videos own upload" on storage.objects;
create policy "videos own upload" on storage.objects for insert to authenticated
with check(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "videos own update" on storage.objects;
create policy "videos own update" on storage.objects for update to authenticated
using(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "videos own delete" on storage.objects;
create policy "videos own delete" on storage.objects for delete to authenticated
using(bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "thumb public read" on storage.objects;
create policy "thumb public read" on storage.objects for select using(bucket_id='thumbnails');
drop policy if exists "thumb own upload" on storage.objects;
create policy "thumb own upload" on storage.objects for insert to authenticated
with check(bucket_id='thumbnails' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "thumb own update" on storage.objects;
create policy "thumb own update" on storage.objects for update to authenticated
using(bucket_id='thumbnails' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='thumbnails' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "thumb own delete" on storage.objects;
create policy "thumb own delete" on storage.objects for delete to authenticated
using(bucket_id='thumbnails' and (storage.foldername(name))[1]=auth.uid()::text);

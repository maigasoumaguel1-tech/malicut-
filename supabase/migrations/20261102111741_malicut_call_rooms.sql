-- Initial MaliCut audio/video call room schema.
create table if not exists public.call_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  call_type text not null check (call_type in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.call_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined', 'declined', 'left')),
  created_at timestamptz not null default now(),
  joined_at timestamptz,
  left_at timestamptz,
  unique (room_id, user_id)
);

create index if not exists call_participants_user_status_idx
  on public.call_participants(user_id, status);
create index if not exists call_participants_room_idx
  on public.call_participants(room_id);

alter table public.call_rooms enable row level security;
alter table public.call_participants enable row level security;

grant select, insert, update on public.call_rooms to authenticated;
grant select, insert, update on public.call_participants to authenticated;

create policy call_rooms_create_self
on public.call_rooms for insert to authenticated
with check (created_by = (select auth.uid()));

-- This original membership predicate is corrected by the later secure policy migration.
create policy call_rooms_read_members
on public.call_rooms for select to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.call_participants cp
    where cp.room_id = cp.id
      and cp.user_id = (select auth.uid())
      and cp.status in ('invited', 'joined')
  )
);

create policy call_rooms_update_host
on public.call_rooms for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy call_participants_read_self
on public.call_participants for select to authenticated
using (user_id = (select auth.uid()));

create policy call_participants_invite_from_host
on public.call_participants for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and exists (
    select 1 from public.call_rooms cr
    where cr.id = call_participants.room_id
      and cr.created_by = (select auth.uid())
  )
);

create policy call_participants_update_self
on public.call_participants for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy call_rooms_receive_private_signals
on realtime.messages for select to authenticated
using (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.call_participants cp
    where cp.room_id::text = split_part(realtime.topic(), ':', 2)
      and cp.user_id = (select auth.uid())
      and cp.status in ('invited', 'joined')
  )
);

create policy call_rooms_send_private_signals
on realtime.messages for insert to authenticated
with check (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.call_participants cp
    where cp.room_id::text = split_part(realtime.topic(), ':', 2)
      and cp.user_id = (select auth.uid())
      and cp.status in ('invited', 'joined')
  )
);

alter publication supabase_realtime add table public.call_participants;

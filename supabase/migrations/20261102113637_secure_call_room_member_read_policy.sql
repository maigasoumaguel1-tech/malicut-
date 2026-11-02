-- Private-schema membership predicate prevents recursive RLS evaluation.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_call_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.call_participants cp
    where cp.room_id = p_room_id
      and cp.user_id = (select auth.uid())
      and cp.status in ('invited', 'joined')
  );
$$;

revoke all on function private.is_call_member(uuid) from public;
grant execute on function private.is_call_member(uuid) to authenticated;

drop policy if exists call_rooms_read_members on public.call_rooms;
drop policy if exists call_rooms_read_members_v2 on public.call_rooms;
create policy call_rooms_read_members_secure
on public.call_rooms for select to authenticated
using (
  created_by = (select auth.uid())
  or private.is_call_member(id)
);

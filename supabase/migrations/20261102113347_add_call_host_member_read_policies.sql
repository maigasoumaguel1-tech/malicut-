-- Correct and extend the call-room read access model.
-- Applied to Supabase as migration 20261102113347.
create policy call_rooms_read_members_v2
on public.call_rooms for select to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1
    from public.call_participants cp
    where cp.room_id = call_rooms.id
      and cp.user_id = (select auth.uid())
      and cp.status in ('invited', 'joined')
  )
);

create policy call_participants_read_host
on public.call_participants for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.call_rooms cr
    where cr.id = call_participants.room_id
      and cr.created_by = (select auth.uid())
  )
);

-- Restrict each private invitation channel to its matching authenticated user.
create policy malicut_invites_receive_own
on realtime.messages for select to authenticated
using (
  realtime.topic() = 'malicut-invites:' || (select auth.uid())::text
);

create policy malicut_invites_join_own
on realtime.messages for insert to authenticated
with check (
  realtime.topic() = 'malicut-invites:' || (select auth.uid())::text
);

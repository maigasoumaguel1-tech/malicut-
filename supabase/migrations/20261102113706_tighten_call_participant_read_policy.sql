-- The host policy already grants participants access to their own rows.
drop policy if exists call_participants_read_self on public.call_participants;
create index if not exists call_rooms_created_by_idx on public.call_rooms(created_by);
create index if not exists call_participants_invited_by_idx on public.call_participants(invited_by);

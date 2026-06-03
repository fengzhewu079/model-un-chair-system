-- Legacy single-snapshot storage for the pre-collaboration flow.
-- The current multi-chair collaboration MVP backend mainline is supabase/collaboration_mvp.sql.

create table if not exists public.meetings (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.meetings enable row level security;

grant usage on schema public to anon;
grant select, insert, update on table public.meetings to anon;

drop policy if exists "anon_can_select_meetings" on public.meetings;
create policy "anon_can_select_meetings"
on public.meetings
for select
to anon
using (true);

drop policy if exists "anon_can_insert_meetings" on public.meetings;
create policy "anon_can_insert_meetings"
on public.meetings
for insert
to anon
with check (true);

drop policy if exists "anon_can_update_meetings" on public.meetings;
create policy "anon_can_update_meetings"
on public.meetings
for update
to anon
using (true)
with check (true);

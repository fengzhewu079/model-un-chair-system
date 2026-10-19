-- Rollback only the no-op write optimization; does not change or delete data.
begin;
create or replace function public.reconcile_room_presence(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meeting_room_sessions as room_sessions
  set
    status = 'offline',
    disconnected_at = coalesce(disconnected_at, timezone('utc', now())),
    disconnect_reason = coalesce(disconnect_reason, 'heartbeat_timeout')
  where room_sessions.room_id = target_room_id
    and room_sessions.status = 'online'
    and not public.is_room_session_active(room_sessions.last_heartbeat_at);

  update public.meeting_room_members m
  set
    status = case
      when exists (
        select 1
        from public.meeting_room_sessions s
        where s.member_id = m.id
          and s.room_id = m.room_id
          and s.status = 'online'
          and public.is_room_session_active(s.last_heartbeat_at)
      ) then 'online'
      else 'offline'
    end,
    left_at = case
      when exists (
        select 1
        from public.meeting_room_sessions s
        where s.member_id = m.id
          and s.room_id = m.room_id
          and s.status = 'online'
          and public.is_room_session_active(s.last_heartbeat_at)
      ) then null
      else coalesce(m.left_at, timezone('utc', now()))
    end
  where m.room_id = target_room_id;

  update public.meeting_room_state st
  set
    active_motion_id = null,
    active_motion_operator_member_id = null,
    active_motion_started_at = null
  where st.room_id = target_room_id
    and st.active_motion_operator_member_id is not null
    and not exists (
      select 1
      from public.meeting_room_members m
      where m.id = st.active_motion_operator_member_id
        and m.room_id = target_room_id
        and m.status = 'online'
    );
end;
$$;
commit;

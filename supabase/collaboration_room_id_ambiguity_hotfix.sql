create or replace function public.apply_collaboration_state_update(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  base_version bigint,
  next_shared_payload jsonb
)
returns table (
  room_id uuid,
  version bigint,
  updated_at timestamptz,
  members jsonb,
  online_count integer,
  active_motion jsonb
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  validated_session record;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if next_shared_payload is null then
    raise exception 'next_shared_payload is required';
  end if;

  if jsonb_typeof(next_shared_payload) <> 'object' then
    raise exception 'next_shared_payload must be a json object';
  end if;

  select *
  into target_room
  from public.meeting_rooms as meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  if validated_session.room_id <> target_room.id then
    raise exception 'member does not belong to requested room';
  end if;

  select *
  into target_state
  from public.meeting_room_state as room_state
  where room_state.room_id = target_room.id;

  if not found then
    raise exception 'room state not found';
  end if;

  if target_state.active_motion_id is not null
    or target_state.active_motion_operator_member_id is not null then
    raise exception 'shared state updates are blocked while a motion is being processed; use finish_collaboration_motion';
  end if;

  update public.meeting_room_state as room_state
  set
    shared_payload = next_shared_payload,
    version = room_state.version + 1,
    updated_by_member_id = requested_member_id,
    updated_at = timezone('utc', now())
  where room_state.room_id = target_room.id
    and room_state.version = base_version;

  if not found then
    raise exception 'state version conflict';
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_rooms as meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where meeting_rooms.id = target_room.id;

  update public.meeting_room_members as room_members_table
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where room_members_table.id = requested_member_id;

  perform public.reconcile_room_presence(target_room.id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    state_snapshot.room_id,
    state_snapshot.version,
    state_snapshot.updated_at,
    room_members,
    room_online_count,
    room_active_motion
  from public.meeting_room_state as state_snapshot
  where state_snapshot.room_id = target_room.id;
end;
$fix$;

create or replace function public.finish_collaboration_motion(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  requested_motion_id text,
  base_version bigint,
  next_shared_payload jsonb
)
returns table (
  room_id uuid,
  version bigint,
  shared_payload jsonb,
  updated_at timestamptz,
  members jsonb,
  online_count integer,
  active_motion jsonb
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  validated_session record;
  normalized_motion_id text;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  normalized_motion_id := nullif(trim(coalesce(requested_motion_id, '')), '');

  if normalized_motion_id is null then
    raise exception 'motion_id is required';
  end if;

  if next_shared_payload is null then
    raise exception 'next_shared_payload is required';
  end if;

  if jsonb_typeof(next_shared_payload) <> 'object' then
    raise exception 'next_shared_payload must be a json object';
  end if;

  select *
  into target_room
  from public.meeting_rooms as meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  if validated_session.room_id <> target_room.id then
    raise exception 'member does not belong to requested room';
  end if;

  select *
  into target_state
  from public.meeting_room_state as room_state
  where room_state.room_id = target_room.id;

  if target_state.version <> base_version then
    raise exception 'state version conflict';
  end if;

  if target_state.active_motion_id is null
    or target_state.active_motion_operator_member_id is null then
    raise exception 'no motion is currently being processed';
  end if;

  if target_state.active_motion_operator_member_id <> requested_member_id then
    raise exception 'another member is currently processing this motion';
  end if;

  if target_state.active_motion_id <> normalized_motion_id then
    raise exception 'requested motion is not the active motion';
  end if;

  update public.meeting_room_state as room_state
  set
    shared_payload = next_shared_payload,
    version = room_state.version + 1,
    updated_by_member_id = requested_member_id,
    updated_at = timezone('utc', now()),
    active_motion_id = null,
    active_motion_operator_member_id = null,
    active_motion_started_at = null
  where room_state.room_id = target_room.id
    and room_state.version = base_version
    and room_state.active_motion_id = normalized_motion_id
    and room_state.active_motion_operator_member_id = requested_member_id;

  if not found then
    raise exception 'motion finish conflict; refresh room state and retry';
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_rooms as meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where meeting_rooms.id = target_room.id;

  update public.meeting_room_members as room_members_table
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where room_members_table.id = requested_member_id;

  perform public.reconcile_room_presence(target_room.id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    state_snapshot.room_id,
    state_snapshot.version,
    state_snapshot.shared_payload,
    state_snapshot.updated_at,
    room_members,
    room_online_count,
    room_active_motion
  from public.meeting_room_state as state_snapshot
  where state_snapshot.room_id = target_room.id;
end;
$fix$;

grant execute on function public.apply_collaboration_state_update(text, uuid, uuid, text, bigint, jsonb) to anon;
grant execute on function public.finish_collaboration_motion(text, uuid, uuid, text, text, bigint, jsonb) to anon;

notify pgrst, 'reload schema';

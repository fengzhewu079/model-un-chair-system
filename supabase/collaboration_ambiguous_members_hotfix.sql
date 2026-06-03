create or replace function public.create_collaboration_room(
  requested_public_meeting_id text,
  requested_access_code text,
  requested_host_name text,
  initial_shared_payload jsonb default '{}'::jsonb,
  requested_client_instance_id text default null
)
returns table (
  room_id uuid,
  public_meeting_id text,
  member_id uuid,
  role text,
  member_token text,
  session_id uuid,
  shared_payload jsonb,
  version bigint,
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  new_room_id uuid;
  new_member_id uuid;
  new_session_id uuid;
  issued_member_token text;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if trim(coalesce(requested_public_meeting_id, '')) = '' then
    raise exception 'public_meeting_id is required';
  end if;

  if trim(coalesce(requested_access_code, '')) = '' then
    raise exception 'access_code is required';
  end if;

  if trim(coalesce(requested_host_name, '')) = '' then
    raise exception 'host_name is required';
  end if;

  issued_member_token := public.issue_collaboration_member_token();

  insert into public.meeting_rooms (
    public_meeting_id,
    access_code_hash,
    access_code_ciphertext
  ) values (
    trim(requested_public_meeting_id),
    public.hash_collaboration_access_code(requested_access_code),
    public.encrypt_collaboration_access_code(requested_access_code)
  )
  returning id into new_room_id;

  insert into public.meeting_room_members (
    room_id,
    display_name,
    normalized_name,
    role,
    status,
    rejoin_token_hash
  ) values (
    new_room_id,
    trim(requested_host_name),
    public.normalize_member_name(requested_host_name),
    'host',
    'online',
    public.sha256_hex(issued_member_token)
  )
  returning id into new_member_id;

  insert into public.meeting_room_sessions (
    room_id,
    member_id,
    client_instance_id,
    status
  ) values (
    new_room_id,
    new_member_id,
    requested_client_instance_id,
    'online'
  )
  returning id into new_session_id;

  insert into public.meeting_room_state (
    room_id,
    shared_payload,
    version,
    updated_by_member_id
  ) values (
    new_room_id,
    coalesce(initial_shared_payload, '{}'::jsonb),
    1,
    new_member_id
  );

  update public.meeting_room_members
  set last_session_id = new_session_id
  where id = new_member_id;

  update public.meeting_rooms
  set
    host_member_id = new_member_id,
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = new_room_id;

  perform public.reconcile_room_presence(new_room_id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(new_room_id) as room_snapshot;

  select public.get_room_active_motion_snapshot(new_room_id)
  into room_active_motion;

  return query
  select
    new_room_id,
    trim(requested_public_meeting_id),
    new_member_id,
    'host'::text,
    issued_member_token,
    new_session_id,
    coalesce(initial_shared_payload, '{}'::jsonb),
    1::bigint,
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$fix$;

create or replace function public.join_collaboration_room(
  requested_public_meeting_id text,
  requested_access_code text,
  requested_display_name text,
  requested_client_instance_id text default null,
  supplied_member_token text default null
)
returns table (
  room_id uuid,
  public_meeting_id text,
  member_id uuid,
  role text,
  member_token text,
  session_id uuid,
  shared_payload jsonb,
  version bigint,
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  target_room public.meeting_rooms%rowtype;
  target_member public.meeting_room_members%rowtype;
  target_state public.meeting_room_state%rowtype;
  new_session_id uuid;
  issued_member_token text;
  normalized_requested_name text;
  token_member_found boolean := false;
  name_member_found boolean := false;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if trim(coalesce(requested_public_meeting_id, '')) = '' then
    raise exception 'public_meeting_id is required';
  end if;

  if trim(coalesce(requested_access_code, '')) = '' then
    raise exception 'access_code is required';
  end if;

  if trim(coalesce(requested_display_name, '')) = '' then
    raise exception 'display_name is required';
  end if;

  normalized_requested_name := public.normalize_member_name(requested_display_name);

  select *
  into target_room
  from public.meeting_rooms
  where public_meeting_id = trim(requested_public_meeting_id)
    and public.verify_collaboration_access_code(requested_access_code, access_code_hash)
    and status = 'active';

  if not found then
    raise exception 'room not found or access code is invalid';
  end if;

  if target_room.access_code_ciphertext is null
    and nullif(current_setting('app.settings.collaboration_access_code_secret', true), '') is not null then
    update public.meeting_rooms
    set access_code_ciphertext = public.encrypt_collaboration_access_code(requested_access_code)
    where id = target_room.id
      and access_code_ciphertext is null;
  end if;

  perform public.reconcile_room_presence(target_room.id);

  if trim(coalesce(supplied_member_token, '')) <> '' then
    select *
    into target_member
    from public.meeting_room_members
    where room_id = target_room.id
      and rejoin_token_hash = public.sha256_hex(supplied_member_token);

    token_member_found := found;
  end if;

  if token_member_found then
    if exists (
      select 1
      from public.meeting_room_members m
      where m.room_id = target_room.id
        and m.normalized_name = normalized_requested_name
        and m.id <> target_member.id
    ) then
      raise exception 'display name is already in use by another member';
    end if;

    issued_member_token := supplied_member_token;

    update public.meeting_room_members
    set
      display_name = trim(requested_display_name),
      normalized_name = normalized_requested_name,
      status = 'online',
      left_at = null,
      last_active_at = timezone('utc', now())
    where id = target_member.id
    returning * into target_member;
  else
    select *
    into target_member
    from public.meeting_room_members
    where room_id = target_room.id
      and normalized_name = normalized_requested_name;

    name_member_found := found;

    if name_member_found then
      if target_member.status = 'online' then
        raise exception 'display name is already in use by an online member';
      end if;

      raise exception 'display name already exists; use the original member token to rejoin';
    end if;

    issued_member_token := public.issue_collaboration_member_token();

    insert into public.meeting_room_members (
      room_id,
      display_name,
      normalized_name,
      role,
      status,
      rejoin_token_hash
    ) values (
      target_room.id,
      trim(requested_display_name),
      normalized_requested_name,
      'chair',
      'online',
      public.sha256_hex(issued_member_token)
    )
    returning * into target_member;
  end if;

  insert into public.meeting_room_sessions (
    room_id,
    member_id,
    client_instance_id,
    status
  ) values (
    target_room.id,
    target_member.id,
    requested_client_instance_id,
    'online'
  )
  returning id into new_session_id;

  update public.meeting_room_members
  set
    last_session_id = new_session_id,
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = target_member.id;

  update public.meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = target_room.id;

  select *
  into target_state
  from public.meeting_room_state
  where room_id = target_room.id;

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    target_room.id,
    target_room.public_meeting_id,
    target_member.id,
    target_member.role,
    issued_member_token,
    new_session_id,
    target_state.shared_payload,
    target_state.version,
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$fix$;

create or replace function public.get_collaboration_room_state(
  requested_public_meeting_id text,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  room_id uuid,
  public_meeting_id text,
  member_id uuid,
  role text,
  session_id uuid,
  shared_payload jsonb,
  version bigint,
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  validated_session record;
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  select *
  into target_room
  from public.meeting_rooms
  where public_meeting_id = trim(requested_public_meeting_id)
    and status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    (
      select m.id
      from public.meeting_room_members m
      join public.meeting_room_sessions s
        on s.member_id = m.id
       and s.room_id = m.room_id
      where m.room_id = target_room.id
        and s.id = requested_session_id
        and m.rejoin_token_hash = public.sha256_hex(supplied_member_token)
      limit 1
    ),
    requested_session_id,
    supplied_member_token
  );

  select *
  into target_state
  from public.meeting_room_state
  where room_id = target_room.id;

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    target_room.id,
    target_room.public_meeting_id,
    validated_session.member_id,
    validated_session.role,
    requested_session_id,
    target_state.shared_payload,
    target_state.version,
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$fix$;

create or replace function public.heartbeat_collaboration_member(
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  validated_session record;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  update public.meeting_room_sessions
  set
    last_heartbeat_at = timezone('utc', now()),
    disconnected_at = null,
    disconnect_reason = null
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = validated_session.room_id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  update public.meeting_rooms
  set last_active_at = timezone('utc', now())
  where id = validated_session.room_id;

  perform public.reconcile_room_presence(validated_session.room_id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(validated_session.room_id) as room_snapshot;

  select public.get_room_active_motion_snapshot(validated_session.room_id)
  into room_active_motion;

  return query
  select
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$fix$;

create or replace function public.set_collaboration_motion_processing(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  requested_motion_id text default null
)
returns table (
  room_id uuid,
  active_motion jsonb,
  members jsonb,
  online_count integer
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  target_room public.meeting_rooms%rowtype;
  validated_session record;
  normalized_motion_id text;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  select *
  into target_room
  from public.meeting_rooms
  where public_meeting_id = trim(requested_public_meeting_id)
    and status = 'active';

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

  normalized_motion_id := nullif(trim(coalesce(requested_motion_id, '')), '');

  if normalized_motion_id is null then
    update public.meeting_room_state
    set
      active_motion_id = null,
      active_motion_operator_member_id = null,
      active_motion_started_at = null
    where room_id = target_room.id
      and (
        active_motion_operator_member_id is null
        or active_motion_operator_member_id = requested_member_id
      );

    if not found
      and exists (
        select 1
        from public.meeting_room_state
        where room_id = target_room.id
          and active_motion_operator_member_id is not null
      ) then
      raise exception 'another member is currently processing a motion';
    end if;
  else
    if exists (
      select 1
      from public.meeting_room_state
      where room_id = target_room.id
        and active_motion_operator_member_id is not null
        and active_motion_operator_member_id <> requested_member_id
    ) then
      raise exception 'another member is currently processing a motion';
    end if;

    update public.meeting_room_state
    set
      active_motion_id = normalized_motion_id,
      active_motion_operator_member_id = requested_member_id,
      active_motion_started_at = timezone('utc', now())
    where room_id = target_room.id;
  end if;

  update public.meeting_room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  update public.meeting_rooms
  set last_active_at = timezone('utc', now())
  where id = target_room.id;

  perform public.reconcile_room_presence(target_room.id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    target_room.id,
    room_active_motion,
    room_members,
    room_online_count;
end;
$fix$;

create or replace function public.leave_collaboration_member(
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  requested_disconnect_reason text default 'manual_leave'
)
returns table (
  members jsonb,
  online_count integer,
  active_motion jsonb
)
language plpgsql
security definer
set search_path = public
as $fix$
declare
  validated_session record;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if length(coalesce(requested_disconnect_reason, '')) > 128 then
    raise exception 'disconnect_reason too long';
  end if;

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  update public.meeting_room_sessions
  set
    status = 'offline',
    disconnected_at = timezone('utc', now()),
    disconnect_reason = requested_disconnect_reason
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = validated_session.room_id;

  perform public.reconcile_room_presence(validated_session.room_id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(validated_session.room_id) as room_snapshot;

  select public.get_room_active_motion_snapshot(validated_session.room_id)
  into room_active_motion;

  return query
  select room_members, room_online_count, room_active_motion;
end;
$fix$;

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
  from public.meeting_rooms
  where public_meeting_id = trim(requested_public_meeting_id)
    and status = 'active';

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
  from public.meeting_room_state
  where room_id = target_room.id;

  if not found then
    raise exception 'room state not found';
  end if;

  if target_state.active_motion_id is not null
    or target_state.active_motion_operator_member_id is not null then
    raise exception 'shared state updates are blocked while a motion is being processed; use finish_collaboration_motion';
  end if;

  update public.meeting_room_state
  set
    shared_payload = next_shared_payload,
    version = version + 1,
    updated_by_member_id = requested_member_id,
    updated_at = timezone('utc', now())
  where room_id = target_room.id
    and version = base_version;

  if not found then
    raise exception 'state version conflict';
  end if;

  update public.meeting_room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = target_room.id;

  update public.meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

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
  from public.meeting_rooms
  where public_meeting_id = trim(requested_public_meeting_id)
    and status = 'active';

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
  from public.meeting_room_state
  where room_id = target_room.id;

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

  update public.meeting_room_state
  set
    shared_payload = next_shared_payload,
    version = version + 1,
    updated_by_member_id = requested_member_id,
    updated_at = timezone('utc', now()),
    active_motion_id = null,
    active_motion_operator_member_id = null,
    active_motion_started_at = null
  where room_id = target_room.id
    and version = base_version
    and active_motion_id = normalized_motion_id
    and active_motion_operator_member_id = requested_member_id;

  if not found then
    raise exception 'motion finish conflict; refresh room state and retry';
  end if;

  update public.meeting_room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = target_room.id;

  update public.meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

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

notify pgrst, 'reload schema';

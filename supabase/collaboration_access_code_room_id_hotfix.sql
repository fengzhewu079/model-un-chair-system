create or replace function public.get_collaboration_room_access_code(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  room_id uuid,
  public_meeting_id text,
  access_code text
)
language plpgsql
security definer
set search_path = public
as $func$
declare
  target_room public.meeting_rooms%rowtype;
  validated_session record;
begin
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

  if validated_session.role <> 'host' then
    raise exception 'only host can reveal the access code';
  end if;

  if target_room.access_code_ciphertext is null then
    raise exception 'access code reveal is unavailable for this legacy room until someone rejoins with the code once';
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_room_members as room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where room_members.id = requested_member_id;

  update public.meeting_rooms as meeting_rooms
  set last_active_at = timezone('utc', now())
  where meeting_rooms.id = target_room.id;

  return query
  select
    target_room.id,
    target_room.public_meeting_id,
    public.decrypt_collaboration_access_code(target_room.access_code_ciphertext);
end;
$func$;

grant execute on function public.get_collaboration_room_access_code(text, uuid, uuid, text) to anon;

notify pgrst, 'reload schema';

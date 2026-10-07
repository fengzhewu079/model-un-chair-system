-- Additive attendance-only RPC. Existing host-only setup RPCs stay unchanged.
create or replace function public.update_collaboration_attendance(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  attendance_changes jsonb default '{}'::jsonb,
  complete_roll_call boolean default false
)
returns table(version bigint, shared_payload jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  actor record;
  old_roll jsonb;
  new_roll jsonb;
  updated_delegates jsonb;
  new_payload jsonb;
begin
  if attendance_changes is null or jsonb_typeof(attendance_changes) <> 'object' then
    raise exception 'attendance changes must be an object';
  end if;
  select * into target_room from public.meeting_rooms r
    where r.public_meeting_id = trim(requested_public_meeting_id) and r.status = 'active';
  if not found then raise exception 'room not found'; end if;
  perform public.reconcile_room_presence(target_room.id);
  select * into actor from public.assert_active_member_session(requested_member_id, requested_session_id, supplied_member_token);
  if actor.room_id <> target_room.id or actor.role not in ('host', 'chair') then
    raise exception 'member does not belong to requested room';
  end if;
  select * into target_state from public.meeting_room_state s where s.room_id = target_room.id for update;
  if not found then raise exception 'room state not found'; end if;
  if target_state.active_motion_id is not null or target_state.active_motion_operator_member_id is not null then
    raise exception 'finish the active motion before updating attendance';
  end if;
  old_roll := target_state.shared_payload -> 'rollCall';
  if jsonb_typeof(old_roll -> 'delegates') is distinct from 'array' then raise exception 'delegate list is not ready'; end if;
  if exists(select 1 from jsonb_each_text(attendance_changes) c where c.value is null or c.value not in ('present', 'present_and_voting', 'absent')) then
    raise exception 'invalid attendance status';
  end if;
  if exists(select 1 from jsonb_object_keys(attendance_changes) as c(id)
      where not exists(select 1 from jsonb_array_elements(old_roll -> 'delegates') d where d ->> 'id' = c.id)) then
    raise exception 'delegate not found in this room';
  end if;
  select coalesce(jsonb_agg(case when attendance_changes ? (d ->> 'id')
    then d || jsonb_build_object('attendance', attendance_changes ->> (d ->> 'id'), 'timestamp', timezone('utc',now()))
    else d end order by ord), '[]'::jsonb)
    into updated_delegates from jsonb_array_elements(old_roll -> 'delegates') with ordinality a(d,ord);
  if complete_roll_call and jsonb_array_length(updated_delegates) = 0 then raise exception 'add delegates before completing roll call'; end if;
  select old_roll || jsonb_build_object(
    'delegates', updated_delegates,
    'totalDelegates', count(*),
    'presentCount', count(*) filter(where d ->> 'attendance' = 'present'),
    'presentAndVotingCount', count(*) filter(where d ->> 'attendance' = 'present_and_voting'),
    'absentCount', count(*) filter(where d ->> 'attendance' = 'absent')
  ) into new_roll from jsonb_array_elements(updated_delegates) d;
  if complete_roll_call and coalesce(old_roll ->> 'completed','false') <> 'true' then
    new_roll := new_roll || jsonb_build_object('completed',true,'completedAt',timezone('utc',now()));
  end if;
  new_payload := jsonb_set(target_state.shared_payload, '{rollCall}', new_roll);
  if complete_roll_call and coalesce(old_roll ->> 'completed','false') <> 'true' then
    new_payload := new_payload || jsonb_build_object('status','GSL','meetingState','GSL');
  end if;
  return query update public.meeting_room_state s set shared_payload = new_payload, version = s.version + 1,
    updated_by_member_id = requested_member_id, updated_at = timezone('utc',now())
    where s.room_id = target_room.id returning s.version,s.shared_payload;
end;
$$;
revoke all on function public.update_collaboration_attendance(text,uuid,uuid,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.update_collaboration_attendance(text,uuid,uuid,text,jsonb,boolean) to anon;

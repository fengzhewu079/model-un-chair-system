-- Run after defining the RPC, inside a transaction that will be rolled back.
do $$
declare
 h record; c record; other_room record; result record; r text := 'qa-attendance-' || gen_random_uuid();
 initial jsonb := '{"id":"fixture","name":"Attendance test","committeeName":"QA","chairName":"Host","status":"setup","meetingState":"setup","rollCall":{"delegates":[{"id":"a","name":"Alpha","attendance":"unmarked"},{"id":"b","name":"Beta","attendance":"unmarked"}],"totalDelegates":2,"presentCount":0,"presentAndVotingCount":0,"absentCount":0,"completed":false},"motionGroups":[],"motions":[]}';
 rejected boolean;
begin
 select * into h from public.create_collaboration_room(r,'test-only-pin','QA Host',initial,'qa-host');
 select * into c from public.join_collaboration_room(r,'test-only-pin','QA Chair','qa-chair');
 select * into result from public.update_collaboration_attendance(r,c.member_id,c.session_id,c.member_token,'{"a":"present"}',false);
 assert result.shared_payload #>> '{rollCall,presentCount}' = '1', 'chair patch missing';
 assert result.shared_payload #>> '{rollCall,delegates,0,name}' = 'Alpha', 'roster changed';
 assert result.shared_payload ->> 'name' = 'Attendance test', 'meeting info changed';
 select * into result from public.update_collaboration_attendance(r,h.member_id,h.session_id,h.member_token,'{"b":"present_and_voting"}',false);
 assert result.shared_payload #>> '{rollCall,presentCount}' = '1', 'host patch lost chair edit';
 assert result.shared_payload #>> '{rollCall,presentAndVotingCount}' = '1';
 select * into result from public.update_collaboration_attendance(r,c.member_id,c.session_id,c.member_token,'{}',true);
 assert result.shared_payload #>> '{rollCall,completed}' = 'true';
 assert result.shared_payload ->> 'status' = 'GSL';
 rejected := false;
 begin perform public.update_collaboration_attendance(r,c.member_id,c.session_id,c.member_token,'{"intruder":"present"}',false);
 exception when others then rejected := true; end;
 assert rejected, 'unknown delegate accepted';
 rejected := false;
 begin perform public.update_collaboration_attendance(r,c.member_id,c.session_id,c.member_token,'{"a":"host"}',false);
 exception when others then rejected := true; end;
 assert rejected, 'invalid attendance accepted';
 rejected := false;
 begin perform public.update_collaboration_attendance(r,c.member_id,c.session_id,'wrong-token','{"a":"absent"}',false);
 exception when others then rejected := true; end;
 assert rejected, 'invalid token accepted';
 rejected := false;
 begin perform public.update_collaboration_attendance(r,h.member_id,c.session_id,c.member_token,'{"a":"absent"}',false);
 exception when others then rejected := true; end;
 assert rejected, 'mismatched identity accepted';
 select * into other_room from public.create_collaboration_room(r || '-other','test-only-pin','Other Host',initial,'qa-other');
 rejected := false;
 begin perform public.update_collaboration_attendance(r || '-other',c.member_id,c.session_id,c.member_token,'{"a":"absent"}',false);
 exception when others then rejected := true; end;
 assert rejected, 'cross-room update accepted';
 rejected := false;
 begin perform public.get_collaboration_room_access_code(r,c.member_id,c.session_id,c.member_token);
 exception when others then rejected := true; end;
 assert rejected, 'chair obtained host PIN';
 -- The existing shared-write path must still reject a chair's roster/metadata changes.
 rejected := false;
 begin perform public.apply_collaboration_state_update(r,c.member_id,c.session_id,c.member_token,result.version,jsonb_set(result.shared_payload,'{name}','"Changed"'));
 exception when others then rejected := true; end;
 assert rejected, 'chair changed meeting info';
 rejected := false;
 begin perform public.apply_collaboration_state_update(r,c.member_id,c.session_id,c.member_token,result.version,jsonb_set(result.shared_payload,'{rollCall,delegates,0,name}','"Changed"'));
 exception when others then rejected := true; end;
 assert rejected, 'chair changed roster';
 perform public.set_collaboration_motion_processing(r,h.member_id,h.session_id,h.member_token,'qa-motion');
 rejected := false;
 begin perform public.update_collaboration_attendance(r,c.member_id,c.session_id,c.member_token,'{"a":"absent"}',false);
 exception when others then rejected := true; end;
 assert rejected, 'attendance bypassed active motion guard';
end $$;

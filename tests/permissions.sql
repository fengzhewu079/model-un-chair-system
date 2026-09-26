-- Run in a transaction and ROLLBACK. Test rooms and writes must never persist.
do $test$
declare
 h record; c record; p jsonb := '{"id":"qa","name":"QA Regression","committeeName":"QA","chairName":"Host","startTime":"2026-09-26T00:00:00.000Z","rollCall":{"delegates":[]}}';
 v bigint; candidate jsonb; blocked boolean; field text;
begin
 set local role anon;
 select * into h from public.create_collaboration_room('qa-' || gen_random_uuid()::text,'qa-test-only','QA Host',p,'test-host');
 select * into c from public.join_collaboration_room(h.public_meeting_id,'qa-test-only','QA Chair','test-chair');
 v := h.version;
 foreach field in array array['id','name','committeeName','chairName','startTime','rollCall'] loop
   foreach candidate in array array[jsonb_set(p,array[field],'"tampered"'),p - field] loop
     blocked := false;
     begin
       perform public.apply_collaboration_state_update(h.public_meeting_id,c.member_id,c.session_id,c.member_token,v,candidate);
     exception when others then
       if sqlerrm = 'only host can change meeting setup' then blocked := true; else raise; end if;
     end;
     if not blocked then raise exception 'REGRESSION: Chair changed protected field %', field; end if;
   end loop;
 end loop;
 -- Helpers must be callable only internally, never directly through the Data API.
 if has_function_privilege('anon','public.get_room_members_snapshot(uuid)','EXECUTE')
   or has_function_privilege('authenticated','public.get_room_active_motion_snapshot(uuid)','EXECUTE') then
   raise exception 'REGRESSION: internal room helper is public';
 end if;
 -- Run the actual public endpoints with the browser role, not database-owner privileges.
 set local role anon;
 -- Legitimate chair update must still work.
 select version into v from public.apply_collaboration_state_update(h.public_meeting_id,c.member_id,c.session_id,c.member_token,v,p || '{"meetingState":"GSL"}');
 p := p || '{"meetingState":"GSL"}';
 -- Host remains allowed to change setup.
 p := jsonb_set(p,'{name}','"QA Updated by Host"');
 select version into v from public.apply_collaboration_state_update(h.public_meeting_id,h.member_id,h.session_id,h.member_token,v,p);
 -- Finishing a motion is not a bypass around the same authorization.
 perform public.set_collaboration_motion_processing(h.public_meeting_id,c.member_id,c.session_id,c.member_token,'qa-motion');
 foreach field in array array['id','name','committeeName','chairName','startTime','rollCall'] loop
   blocked := false;
   begin
     perform public.finish_collaboration_motion(h.public_meeting_id,c.member_id,c.session_id,c.member_token,'qa-motion',v,p - field);
   exception when others then
     if sqlerrm = 'only host can change meeting setup' then blocked := true; else raise; end if;
   end;
   if not blocked then raise exception 'REGRESSION: Finish bypassed protection for %', field; end if;
 end loop;
 perform public.finish_collaboration_motion(h.public_meeting_id,c.member_id,c.session_id,c.member_token,'qa-motion',v,p || '{"motions":[{"id":"qa-motion"}],"motionGroups":[]}');
 reset role;
end $test$;

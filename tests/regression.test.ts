import test from 'node:test';
import assert from 'node:assert/strict';
import { useMeetingStore as store, mergeSharedMotionGroups } from '../src/store/useMeetingStore';
import { exportMeetingRecord } from '../src/utils/exportMeeting';
const memory = new Map<string,string>();
(globalThis as any).window = {localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}};
const base = store.getState();
const motion = {id:'motion-1',type:'unmoderated_caucus' as const,parameters:{totalTime:6},status:'passed' as const,timestamp:new Date()};
function reset(){memory.clear();store.setState(base,true);}
test('same batch and existing delegate names are unique ignoring case/whitespace',()=>{
 reset();store.getState().bulkAddDelegates(['France','Germany','France',' france ','']);
 store.getState().addDelegate(' FRANCE ');
 assert.equal(store.getState().rollCall.totalDelegates,2);
});
test('export contains each motion once',()=>{
 reset();const text=exportMeetingRecord({...base,motions:[motion],motionGroups:[{id:'g',motions:[motion],status:'passed',timestamp:new Date()}]});
 assert.equal(text.match(/Motion for Unmoderated Caucus/g)?.length,1);
});
test('export converts stored seconds without losing partial minutes',()=>{
 reset();assert.match(exportMeetingRecord({...base,motions:[motion]}),/Time: 6 seconds/);
});
test('refresh restores in-progress records, vote and speaker progress, paused',()=>{
 reset();store.setState({id:'qa',publicMeetingId:'qa',memberId:'m',memberToken:'t',sessionId:'s',role:'host',displayName:'QA',clientInstanceId:'c',rollCall:{...base.rollCall,completed:true},motions:[motion],motionGroups:[{id:'g',motions:[motion],status:'executing',timestamp:new Date()}],currentVote:{for:4,against:2,abstain:0},motionProcessingDraft:{motionId:motion.id,groupId:'g',motionType:'unmoderated_caucus',speakers:[{id:'f',name:'France',status:'speaking',speakingTime:60,remainingTime:23}],speakingPhase:'in_progress',currentSpeakerIndex:0,timePool:5}});
 store.getState().saveToLocalStorage();store.setState(base,true);store.getState().loadFromLocalStorage();
 assert.equal(store.getState().motionGroups.length,1);
 assert.equal(store.getState().motionProcessingDraft?.speakers[0].remainingTime,23);
 assert.equal(store.getState().motionProcessingDraft?.speakers[0].status,'waiting');
 assert.equal(store.getState().currentVote?.for,4);
 assert.ok(store.getState().motions[0].timestamp instanceof Date);
});
test('reset does not resurrect previous room drafts',()=>{
 reset();store.setState({motions:[motion]});store.getState().saveToLocalStorage();
 store.getState().clearCollaborationSession({resetMeeting:true});store.getState().loadFromLocalStorage();
 assert.equal(store.getState().motions.length,0);
});
test('page-exit leave keeps the local draft even when best-effort network leave fails',async()=>{
 reset();store.setState({id:'qa',publicMeetingId:'qa',memberId:'m',memberToken:'t',sessionId:'s',role:'host',displayName:'QA',clientInstanceId:'c',motions:[motion],motionGroups:[{id:'g',motions:[motion],status:'executing',timestamp:new Date()}]});
 await store.getState().leaveCollaborationMember({preserveLocalSession:true,preserveStoredSession:true,preferKeepalive:true,clearLocalImmediately:true});
 store.setState(base,true);store.getState().loadFromLocalStorage();assert.equal(store.getState().motions.length,1);
});
test('demo cannot overwrite saved live draft',()=>{
 reset();store.setState({motions:[motion]});store.getState().saveToLocalStorage();
 const before=memory.get('mun-chair-collaboration-local-state');store.getState().startDemoSession();store.getState().saveToLocalStorage();assert.equal(memory.get('mun-chair-collaboration-local-state'),before);
});
test('draft for another member is never restored',()=>{
 reset();store.setState({publicMeetingId:'a',memberId:'member-a',memberToken:'t',sessionId:'s',role:'host',displayName:'QA',clientInstanceId:'c',motions:[motion]});store.getState().saveToLocalStorage();
 const key='mun-chair-collaboration-local-state';const saved=JSON.parse(memory.get(key)!);saved.recoverableIdentity.memberId='member-b';memory.set(key,JSON.stringify(saved));store.setState(base,true);store.getState().loadFromLocalStorage();assert.equal(store.getState().motions.length,0);
});
test('storage quota failure does not crash the meeting and is visible',()=>{
 reset();const storage=(globalThis as any).window.localStorage;const original=storage.setItem;
 storage.setItem=()=>{throw new Error('QuotaExceededError')};
 try {store.setState({name:'changed'});assert.doesNotThrow(()=>store.getState().saveToLocalStorage());assert.ok(store.getState().localSaveError);} finally {storage.setItem=original;}
});
test('disconnected collaboration draft cannot be silently finished as a local-only meeting',async()=>{
 reset();store.setState({publicMeetingId:'qa',hasCollaborationRoom:false,motions:[motion],motionGroups:[{id:'g',motions:[motion],status:'executing',timestamp:new Date()}],motionProcessingDraft:{motionId:motion.id,groupId:'g',motionType:motion.type,speakers:[],speakingPhase:'adding',timePool:0}});
 assert.equal(await store.getState().finishMotionProcessing(motion.id),false);
 assert.equal(store.getState().motionGroups[0].status,'executing');
 assert.ok(store.getState().motionProcessingDraft);
});

import './motion-entry.test';

test('extensions stay executable after passing and only finish when submitted',async()=>{
 for(const type of ['extend_moderated','extend_unmoderated'] as const){
  reset();store.getState().startDemoSession();
  store.setState({motionGroups:[{id:'original',motions:[motion],status:'passed',timestamp:new Date()}]});
  await store.getState().addMotionGroup([{type,parameters:{topic:'Water',speakingTime:60,totalSpeakers:2,totalTime:120},status:'pending'}]);
  const group=store.getState().motionGroups[1];const id=group.motions[0].id;
  await store.getState().startGroupVote(group.id);
  await store.getState().submitMotionVoteResult(group.id,id,{for:10,against:5,abstain:0,total:15,votingBase:15,result:'pass',rule:'Simple Majority',timestamp:new Date()});
  assert.equal(store.getState().motionGroups[1].status,'executing');
  assert.equal(await store.getState().beginMotionProcessing(id),true);
  assert.equal(store.getState().motionProcessingDraft?.motionType,type);
  if(type==='extend_moderated'){
   store.getState().addSpeakerToMotion(id,'France',60);
   store.getState().startMotionSpeaking(id);
   assert.equal(store.getState().motionProcessingDraft?.speakers.length,1);
  }
  assert.equal(await store.getState().finishMotionProcessing(id),true);
  assert.equal(store.getState().motionGroups[1].status,'passed');
  assert.equal(store.getState().motionGroups[0].motions[0].id,motion.id);
 }
});

test('pending groups can be corrected in place but voting groups are locked',async()=>{
 reset();store.getState().startDemoSession();
 const entry={type:'moderated_caucus' as const,parameters:{topic:'Water',speakingTime:60,totalSpeakers:2},status:'pending' as const};
 await store.getState().addMotionGroup([entry]);
 const group=store.getState().motionGroups[0];
 assert.equal(await store.getState().editPendingMotionGroup(group.id,[{...group.motions[0],parameters:{...entry.parameters,topic:'Updated'}},entry]),true);
 assert.equal(store.getState().motionGroups.length,1);
 assert.equal(store.getState().motionGroups[0].motions.length,2);
 assert.equal(store.getState().motionGroups[0].motions[0].id,group.motions[0].id);
 assert.equal(store.getState().motionGroups[0].motions[0].parameters.topic,'Updated');
 assert.equal(await store.getState().editPendingMotionGroup(group.id,[]),false);
 await store.getState().startGroupVote(group.id);
 assert.equal(await store.getState().editPendingMotionGroup(group.id,[entry]),false);
 assert.equal(store.getState().motionGroups[0].motions.length,2);
});

import { buildMotionEntry } from '../src/utils/motionEntry';
import { extractSharedMeetingState, hydrateSharedMeetingState } from '../src/utils/sharedMeetingState';

test('paper presentation requires a name and positive duration',()=>{
 const form={type:'paper_presentation' as const,proposer:'',minutes:'5',seconds:'60',topic:'Working Paper 1.1'};
 assert.equal(buildMotionEntry({...form,topic:' '}).motion,undefined);
 assert.equal(buildMotionEntry({...form,minutes:'0'}).motion,undefined);
 assert.equal(buildMotionEntry(form).motion?.parameters.totalTime,300);
 assert.equal(buildMotionEntry(form).motion?.parameters.topic,'Working Paper 1.1');
});

test('paper presentation retains progress and Q&A until explicitly finished',async()=>{
 reset();store.getState().startDemoSession();
 await store.getState().addMotionGroup([{type:'paper_presentation',parameters:{topic:'Draft Resolution 1.1',totalTime:3},status:'pending'}]);
 const group=store.getState().motionGroups[0];const id=group.motions[0].id;
 await store.getState().startGroupVote(group.id);
 await store.getState().submitMotionVoteResult(group.id,id,{for:10,against:5,abstain:0,total:15,votingBase:15,result:'pass',rule:'Simple Majority',timestamp:new Date()});
 assert.equal(store.getState().motionGroups[0].status,'executing');
 assert.equal(await store.getState().beginMotionProcessing(id),true);
 assert.equal(store.getState().advancePaperPresentation(id,'tick',5),true);
 assert.equal(store.getState().motionGroups[0].motions[0].presentation?.remainingSeconds,0);
 assert.equal(store.getState().motionGroups[0].status,'executing');
 store.getState().advancePaperPresentation(id,'qa');
 store.getState().advancePaperPresentation(id,'tick',8);
 store.getState().advancePaperPresentation(id,'qa');
 assert.equal(store.getState().motionGroups[0].motions[0].presentation?.qaElapsedSeconds,8);
 await store.getState().releaseMotionProcessing({motionId:id,silent:true});
 assert.equal(store.getState().advancePaperPresentation(id,'tick',1),false);
 await store.getState().beginMotionProcessing(id);
 assert.equal(store.getState().motionGroups[0].motions[0].presentation?.phase,'qa');
 assert.equal(await store.getState().finishMotionProcessing(id),true);
 assert.equal(store.getState().motionGroups[0].status,'passed');
 assert.equal(store.getState().advancePaperPresentation(id,'tick',1),false);
 const payload=extractSharedMeetingState(store.getState());
 assert.equal(payload.motionGroups[0].motions[0].presentation?.qaElapsedSeconds,8);
 const restored=hydrateSharedMeetingState(JSON.parse(JSON.stringify(payload)), 'demo');
 assert.equal(restored.motionGroups[0].motions[0].presentation?.qaElapsedSeconds,8);
 assert.equal(restored.meetingState,'Presentation');
 assert.match(exportMeetingRecord(store.getState()),/Draft Resolution 1.1/);
 assert.match(exportMeetingRecord(store.getState()),/Q&A: 8 seconds/);
});

import { captureLocalMeetingDraft, restoreLocalMeetingDraft } from '../src/utils/localMeetingDraft';
import { advancePresentation } from '../src/utils/paperPresentation';
test('paper introduction can finish without Q&A and its local clock survives restoration',async()=>{
 reset();store.getState().startDemoSession();
 const paper={...motion,type:'paper_presentation' as const,parameters:{topic:'Working Paper 2',totalTime:90}};
 store.setState({motions:[paper],motionGroups:[{id:'paper-group',motions:[paper],status:'executing',timestamp:new Date()}]});
 await store.getState().beginMotionProcessing(paper.id);
 store.getState().advancePaperPresentation(paper.id,'tick',12);
 const snapshot=JSON.parse(JSON.stringify(captureLocalMeetingDraft(store.getState())));
 const restored=restoreLocalMeetingDraft(snapshot,null);
 assert.equal(restored.motionGroups?.[0].motions[0].presentation?.remainingSeconds,78);
 assert.equal(restored.timerState?.isRunning,false);
 store.setState(restored);
 await store.getState().beginMotionProcessing(paper.id);
 assert.equal(await store.getState().finishMotionProcessing(paper.id),true);
 assert.match(exportMeetingRecord(store.getState()),/Q&A: Not opened/);
 assert.equal(advancePresentation(paper,'tick',NaN).remainingSeconds,90);
 assert.equal(advancePresentation(paper,'tick',-4).remainingSeconds,90);
});

import './presentation-document.test';

import { presentationProgress } from '../src/utils/paperPresentation';
test('multiple papers validate count and both durations, with optional names',()=>{
 const form={type:'paper_presentation' as const,proposer:'',minutes:'10',seconds:'60',topic:'',qaMinutes:'5',paperCount:'3',paperNames:['Working Paper 1.1',' ','Draft 2']};
 const entry=buildMotionEntry(form).motion!;
 assert.deepEqual(entry.parameters.papers,['Working Paper 1.1','Paper 2','Draft 2']);
 assert.equal(entry.parameters.qaTime,300);
 for(const patch of [{paperCount:'0'},{paperCount:'2.5'},{paperCount:'51'},{qaMinutes:'-1'},{qaMinutes:''}]) assert.ok(buildMotionEntry({...form,...patch}).error);
});
test('papers own independent countdowns, completion, and restored records',async()=>{
 reset();store.getState().startDemoSession();
 const paper={...motion,type:'paper_presentation' as const,parameters:{totalTime:10,qaTime:5,papers:['Alpha','Beta']}};
 store.setState({motions:[paper],motionGroups:[{id:'multi',motions:[paper],status:'executing',timestamp:new Date()}]});
 await store.getState().beginMotionProcessing(paper.id);
 const advance=(action:any,seconds=0,index=0)=>store.getState().advancePaperPresentation(paper.id,action,seconds,index);
 const current=()=>store.getState().motionGroups[0].motions[0];
 assert.equal(advance('tick',40),true);
 assert.equal(presentationProgress(current(),0).remainingSeconds,0);
 assert.equal(presentationProgress(current(),0).qaElapsedSeconds,0);
 assert.equal(presentationProgress(current(),1).remainingSeconds,10);
 advance('qa');advance('tick',2);
 advance('tick',3,1);
 assert.equal(presentationProgress(current(),0).qaElapsedSeconds,2);
 assert.equal(presentationProgress(current(),1).remainingSeconds,7);
 assert.equal(advance('tick',100,-1),false);
 assert.equal(advance('tick',100,2),false);
 advance('tick',100);assert.equal(presentationProgress(current(),0).qaElapsedSeconds,5);
 advance('complete');advance('tick',10);assert.equal(presentationProgress(current(),0).qaElapsedSeconds,5);
 assert.equal(await store.getState().finishMotionProcessing(paper.id),false);
 const local=restoreLocalMeetingDraft(JSON.parse(JSON.stringify(captureLocalMeetingDraft(store.getState()))),null);
 assert.equal(presentationProgress(local.motionGroups![0].motions[0],1).remainingSeconds,7);
 advance('qa',0,1);advance('tick',1,1);advance('complete',0,1);
 assert.equal(await store.getState().finishMotionProcessing(paper.id),true);
 const restored=hydrateSharedMeetingState(JSON.parse(JSON.stringify(extractSharedMeetingState(store.getState()))),'demo');
 assert.deepEqual(restored.motionGroups[0].motions[0].parameters.papers,['Alpha','Beta']);
 assert.equal(presentationProgress(restored.motionGroups[0].motions[0],1).qaElapsedSeconds,1);
 assert.equal(presentationProgress(restored.motionGroups[0].motions[0],0).completed,true);
 assert.match(exportMeetingRecord(store.getState()),/Alpha/);assert.match(exportMeetingRecord(store.getState()),/Beta/);
});

test('chair attendance updates counts and completion without changing roster or meeting info',async()=>{
 reset();store.getState().startDemoSession();store.setState({role:'chair'});
 const before=store.getState();const first=before.rollCall.delegates[0];
 assert.equal(await store.getState().markAttendance(first.id,'absent'),true);
 assert.equal(store.getState().rollCall.absentCount,1);
 assert.equal(store.getState().name,before.name);
 assert.deepEqual(store.getState().rollCall.delegates.map(d=>[d.id,d.name]),before.rollCall.delegates.map(d=>[d.id,d.name]));
 assert.equal(await store.getState().markAllPresentAndVoting(),true);
 assert.equal(store.getState().rollCall.presentAndVotingCount,15);
 assert.equal(await store.getState().markAttendance('missing','absent'),false);
 assert.equal(await store.getState().completeRollCall(),true);
});
test('disconnected chairs cannot show attendance edits as saved',async()=>{
 reset();store.getState().startDemoSession();const before=store.getState().rollCall;
 store.setState({isDemoMode:false,publicMeetingId:'disconnected-room',hasCollaborationRoom:false,role:'chair'});
 assert.equal(await store.getState().markAttendance(before.delegates[0].id,'absent'),false);
 assert.deepEqual(store.getState().rollCall,before);
 assert.match(store.getState().attendanceError!,/Reconnect/);
});

test('back from a caucus preserves its own paused progress across other motions and reload',async()=>{
 reset();
 const first={...motion,type:'moderated_caucus' as const,parameters:{topic:'Water',speakingTime:60,totalSpeakers:3}};
 const second={...first,id:'motion-2'};
 store.setState({motions:[first,second],motionGroups:[{id:'g1',motions:[first],status:'executing',timestamp:new Date()},{id:'g2',motions:[second],status:'executing',timestamp:new Date()}]});
 await store.getState().beginMotionProcessing(first.id);
 store.getState().addSpeakerToMotion(first.id,'France',60);
 store.getState().addSpeakerToMotion(first.id,'Brazil',60);
 store.getState().startMotionSpeaking(first.id);
 store.setState({motionProcessingDraft:{...store.getState().motionProcessingDraft!,timePool:17,speakers:store.getState().motionProcessingDraft!.speakers.map((s,i)=>i===0?{...s,status:'speaking',remainingTime:23}:s)}});
 await store.getState().releaseMotionProcessing({motionId:first.id,silent:true});
 assert.equal(store.getState().motionProcessingDraft,null);
 assert.equal('localProcessingTimePool' in extractSharedMeetingState(store.getState()).motions[0],false);
 await store.getState().beginMotionProcessing(first.id);
 assert.equal(store.getState().motionProcessingDraft?.speakers[0]?.remainingTime,23);
 assert.equal(store.getState().motionProcessingDraft?.speakers[0]?.status,'waiting');
 await store.getState().releaseMotionProcessing({motionId:first.id,silent:true});
 await store.getState().beginMotionProcessing(second.id);
 store.getState().addSpeakerToMotion(second.id,'Japan',60);
 await store.getState().releaseMotionProcessing({motionId:second.id,silent:true});
 store.getState().saveToLocalStorage();store.setState(base,true);store.getState().loadFromLocalStorage();
 await store.getState().beginMotionProcessing(first.id);
 const draft=store.getState().motionProcessingDraft!;
 assert.deepEqual(draft.speakers.map(s=>s.name),['France','Brazil']);
 assert.equal(draft.currentSpeakerIndex,0);assert.equal(draft.speakingPhase,'in_progress');
 assert.equal(draft.speakers[0].remainingTime,23);assert.equal(draft.timePool,17);
 assert.equal(store.getState().motionGroups[0].status,'executing');
 store.getState().resumeMotionTimer(first.id);
 assert.equal(store.getState().motionProcessingDraft?.speakers[0].status,'speaking');
});

test('editing a voted motion preserves votes, identities and active speaker progress',async()=>{
 reset();const voted={...motion,type:'moderated_caucus' as const,parameters:{topic:'Old',speakingTime:60,totalSpeakers:3},voteResult:{for:10,against:2,abstain:0,total:12,votingBase:12,result:'pass' as const,rule:'Simple Majority' as const,timestamp:new Date()}};
 store.setState({motions:[voted],motionGroups:[{id:'g',motions:[voted],status:'executing',timestamp:new Date()}]});
 await store.getState().beginMotionProcessing(voted.id);store.getState().addSpeakerToMotion(voted.id,'France',60);store.getState().startMotionSpeaking(voted.id);
 const originalDraft=store.getState().motionProcessingDraft;
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:{topic:'New',speakingTime:90,totalSpeakers:4},proposer:'Brazil'}),true);
 const changed=store.getState().motions[0];assert.equal(changed.parameters.topic,'New');assert.equal(changed.status,'passed');assert.deepEqual(changed.voteResult,voted.voteResult);assert.deepEqual(store.getState().motionProcessingDraft,originalDraft);
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:{topic:'Bad',speakingTime:-1,totalSpeakers:4}}),false);
 assert.equal(store.getState().motions[0].parameters.topic,'New');
 await store.getState().releaseMotionProcessing({motionId:voted.id});await store.getState().beginMotionProcessing(voted.id);
 assert.equal(store.getState().motionProcessingDraft?.speakers[0].speakingTime,60);
 store.getState().addSpeakerToMotion(voted.id,'Japan',90);assert.equal(store.getState().motionProcessingDraft?.speakers[1].speakingTime,90);
});

test('voted corrections reject voting, disconnected and destructive speaker limits',async()=>{
 reset();const voted={...motion,parameters:{topic:'Topic',speakingTime:60,totalSpeakers:2},type:'moderated_caucus' as const,speakers:[{id:'a',name:'France',status:'waiting' as const,speakingTime:60,remainingTime:15},{id:'b',name:'Brazil',status:'waiting' as const,speakingTime:60,remainingTime:60}]};
 store.setState({motions:[voted],motionGroups:[{id:'g',motions:[voted],status:'passed',timestamp:new Date()}]});
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:{topic:'Topic',speakingTime:60,totalSpeakers:1}}),false);
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:{topic:'Archive correction',speakingTime:60,totalSpeakers:2}}),true);
 assert.equal(store.getState().motionGroups[0].status,'passed');
 store.setState({publicMeetingId:'offline',hasCollaborationRoom:false});
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:{topic:'Unsaved',speakingTime:60,totalSpeakers:2}}),false);
 assert.equal(store.getState().motions[0].parameters.topic,'Archive correction');
 store.setState({publicMeetingId:null,motions:[{...voted,status:'voting'}]});
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:voted.parameters}),false);
});


test('large motion groups keep every option through editing, reload and voting',async()=>{
 reset();
 const entries=Array.from({length:25},(_,i)=>({type:'moderated_caucus' as const,parameters:{topic:`Option ${i+1}`,speakingTime:60,totalSpeakers:2},status:'pending' as const}));
 await store.getState().addMotionGroup(entries.slice(0,5));
 const group=store.getState().motionGroups[0];
 assert.equal(group.motions.length,5);
 assert.equal(await store.getState().editPendingMotionGroup(group.id,[...group.motions,...entries.slice(5)]),true);
 assert.equal(store.getState().motionGroups[0].motions.length,25);
 store.getState().saveToLocalStorage();store.setState(base,true);store.getState().loadFromLocalStorage();
 const restored=store.getState().motionGroups[0];
 assert.deepEqual(restored.motions.map(m=>m.parameters.topic),entries.map(m=>m.parameters.topic));
 assert.equal(new Set(restored.motions.map(m=>m.id)).size,25);
 await store.getState().startGroupVote(group.id);
 for(const m of restored.motions){
  assert.equal(await store.getState().submitMotionVoteResult(group.id,m.id,{for:0,against:15,abstain:0,total:15,votingBase:15,result:'fail',rule:'Simple Majority',timestamp:new Date()}),true);
 }
 assert.equal(store.getState().motionGroups[0].status,'failed');
 assert.equal(store.getState().motionGroups[0].motions.filter(m=>m.voteResult?.result==='fail').length,25);
});

test('round robin accepts custom seconds and seeds present delegates only once',async()=>{
 reset();store.getState().startDemoSession();
 const entry=buildMotionEntry({type:'round_robin',proposer:'',topic:'Opening positions',minutes:'',seconds:'45',delegateCount:15});
 assert.equal(entry.motion?.parameters.speakingTime,45);
 assert.equal(entry.effectiveSeconds,675);
 assert.equal(buildMotionEntry({type:'round_robin',proposer:'',topic:'Opening',minutes:'',seconds:'0',delegateCount:15}).motion,undefined);
 const absent=store.getState().rollCall.delegates[0];await store.getState().markAttendance(absent.id,'absent');
 await store.getState().addMotionGroup([entry.motion!]);const group=store.getState().motionGroups[0],id=group.motions[0].id;
 await store.getState().startGroupVote(group.id);
 await store.getState().submitMotionVoteResult(group.id,id,{for:14,against:0,abstain:0,total:14,votingBase:14,result:'pass',rule:'Simple Majority',timestamp:new Date()});
 assert.equal(store.getState().motionGroups[0].status,'executing');
 assert.equal(await store.getState().beginMotionProcessing(id),true);
 const speakers=store.getState().motionProcessingDraft!.speakers;
 assert.equal(speakers.length,14);assert.ok(speakers.every(s=>s.name!==absent.name&&s.remainingTime===45));
 store.getState().moveMotionSpeaker(id,speakers[1].id,-1);
 assert.equal(store.getState().motionProcessingDraft!.speakers[0].id,speakers[1].id);
 store.getState().startMotionSpeaking(id);store.getState().updateMotionSpeakerTime(id,19);
 await store.getState().releaseMotionProcessing({motionId:id});await store.getState().beginMotionProcessing(id);
 assert.equal(store.getState().motionProcessingDraft!.speakers[0].remainingTime,19);
 assert.equal(store.getState().motionProcessingDraft!.speakers.length,14);
 store.getState().nextMotionSpeaker(id);assert.equal(store.getState().motionProcessingDraft!.currentSpeakerIndex,1);
 store.getState().resetMotion(id);assert.equal(store.getState().motionProcessingDraft!.speakers.length,14);assert.equal(store.getState().motionProcessingDraft!.speakers[0].remainingTime,45);
 assert.equal(await store.getState().finishMotionProcessing(id),true);
 assert.match(exportMeetingRecord(store.getState()),/Round Robin/);
});

test('round robin topic is optional on creation and post-vote correction',async()=>{
 reset();
 const entry=buildMotionEntry({type:'round_robin',proposer:'',topic:'   ',minutes:'',seconds:'30',delegateCount:2});
 assert.ok(entry.motion);assert.equal(entry.motion.parameters.topic,'');
 const voted={...entry.motion,id:'rr-optional',status:'passed' as const,timestamp:new Date()};
 store.setState({motions:[voted],motionGroups:[{id:'rr-group',motions:[voted],status:'executing',timestamp:new Date()}]});
 assert.equal(await store.getState().editVotedMotion(voted.id,{parameters:{...voted.parameters,topic:''}}),true);
 assert.match(exportMeetingRecord(store.getState()),/Round Robin/);
});

test('delete voted motion preserves siblings, removes empty groups and survives reload',async()=>{
 reset();const other={...motion,id:'keep'};
 store.setState({motions:[motion,other],motionGroups:[{id:'g',motions:[motion,other],selectedMotionId:motion.id,status:'executing',timestamp:new Date()}]});
 assert.equal(await store.getState().deleteVotedMotion(motion.id),true);
 assert.deepEqual(store.getState().motionGroups[0].motions.map(m=>m.id),['keep']);
 assert.equal(store.getState().motionGroups[0].selectedMotionId,undefined);
 store.getState().saveToLocalStorage();store.setState(base,true);store.getState().loadFromLocalStorage();
 assert.deepEqual(store.getState().motions.map(m=>m.id),['keep']);
 assert.equal(await store.getState().deleteVotedMotion('keep'),true);
 assert.equal(store.getState().motionGroups.length,0);
});

test('delete voted motion rejects voting and disconnected rooms',async()=>{
 reset();store.setState({motions:[motion],motionGroups:[{id:'g',motions:[motion],status:'executing',timestamp:new Date()}],motionProcessingDraft:{motionId:motion.id,groupId:'g',motionType:motion.type,speakers:[],speakingPhase:'adding',timePool:0}});
 store.setState({motionProcessingDraft:null,currentVote:{motionGroupId:'g',for:0,against:0,abstain:0}});
 assert.equal(await store.getState().deleteVotedMotion(motion.id),false);
 store.setState({currentVote:null,publicMeetingId:'offline',hasCollaborationRoom:false});
 assert.equal(await store.getState().deleteVotedMotion(motion.id),false);
 assert.equal(store.getState().motionGroups[0].motions.length,1);
});

 test('shared removal does not resurrect completed records from another chair',()=>{
 const archived={id:'removed',motions:[motion],status:'passed' as const,timestamp:new Date()};
 const local={id:'draft',motions:[{...motion,id:'draft-motion'}],status:'executing' as const,timestamp:new Date()};
 assert.deepEqual(mergeSharedMotionGroups([],[archived,local]).map(g=>g.id),['draft']);
 });

import {calculateResolutionVote} from '../src/utils/resolutionVoting';
test('resolution majority handles abstentions, ties, empty and incomplete ballots',()=>{
 const draft={name:'DR 1.1',method:'quick' as const,majority:'simple' as const,includeAbstentions:false,restrictPV:true,yes:10,no:8,abstain:2,roster:Array.from({length:20},(_,i)=>({id:String(i),name:String(i),attendance:'present' as const})),ballots:{}};
 assert.equal(calculateResolutionVote(draft).passed,true);
 assert.equal(calculateResolutionVote({...draft,includeAbstentions:true}).passed,false);
 assert.equal(calculateResolutionVote({...draft,yes:9,no:9}).passed,false);
 assert.equal(calculateResolutionVote({...draft,yes:0,no:0,abstain:20}).passed,null);
 assert.equal(calculateResolutionVote({...draft,method:'rollcall'}).passed,null);
 assert.ok(calculateResolutionVote({...draft,yes:1.5}).error);
 assert.equal(calculateResolutionVote({...draft,yes:12,no:6,abstain:2,majority:'two-thirds'}).passed,true);
});

test('resolution results persist, export ballots, and repeated confirmation is idempotent',async()=>{
 reset();
 const d={id:'resolution-test',name:'DR 1.1',method:'rollcall' as const,majority:'simple' as const,includeAbstentions:false,restrictPV:true,yes:0,no:0,abstain:0,roster:[{id:'fr',name:'France',attendance:'present_and_voting' as const},{id:'br',name:'Brazil',attendance:'present' as const}],ballots:{fr:'yes' as const,br:'abstain' as const}};
 assert.ok(calculateResolutionVote({...d,ballots:{fr:'abstain',br:'yes'}}).error);
 assert.equal(await store.getState().saveResolutionVote(d),true);
 assert.equal(await store.getState().saveResolutionVote(d),true);
 assert.equal(store.getState().motionGroups.length,1);
 const restored=hydrateSharedMeetingState(JSON.parse(JSON.stringify(extractSharedMeetingState(store.getState()))),'demo');
 assert.deepEqual(restored.motions[0].resolutionVote?.ballots,d.ballots);
 assert.match(exportMeetingRecord({...base,...restored}),/France: yes/);
 assert.match(exportMeetingRecord({...base,...restored}),/DR 1.1 — Adopted/);
 store.getState().saveToLocalStorage();store.setState(base,true);store.getState().loadFromLocalStorage();
 assert.equal(store.getState().motionGroups[0].motions[0].resolutionVote?.name,'DR 1.1');
 store.setState({publicMeetingId:'offline',hasCollaborationRoom:false});
 assert.equal(await store.getState().saveResolutionVote({...d,id:'new'}),false);
});

import {deriveMotionTally} from '../src/utils/motionTally';
test('Yes-only suggests without inventing No or abstentions',()=>{
 const r=deriveMotionTally({for:'8',against:'',abstain:''},15,8);
 assert.equal(r.predictedResult,'pass');assert.equal(r.normalizedAgainst,null);assert.equal(r.normalizedAbstain,null);
 assert.equal(deriveMotionTally({for:'7',against:'',abstain:''},15,8).predictedResult,'fail');
});
test('manual counts remain independent, including blanks and actual zero',()=>{
 assert.equal(deriveMotionTally({for:'8',against:'2',abstain:'1'},15,8).normalizedAgainst,2);
 assert.equal(deriveMotionTally({for:'8',against:'0',abstain:''},15,8).normalizedAgainst,0);
 assert.equal(deriveMotionTally({for:'',against:'2',abstain:''},15,8).predictedResult,null);
 for(const inputs of [{for:'8',against:'8',abstain:''},{for:'',against:'16',abstain:''},{for:'2.5',against:'',abstain:''}])assert.equal(deriveMotionTally(inputs,15,8).isInputValid,false);
});
test('unrecorded vote counts stay distinct from zero through shared records and export',()=>{
 const vote={for:8,against:0,abstain:0,total:8,votingBase:15,result:'pass' as const,rule:'Simple Majority',timestamp:new Date(),countsEntered:{for:true,against:false,abstain:false}};
 const m={...motion,voteResult:vote};
 const session={...base,motions:[m],motionGroups:[{id:'partial',motions:[m],status:'passed' as const,timestamp:new Date()}]};
 const restored=hydrateSharedMeetingState(extractSharedMeetingState(session),'test');
 assert.equal(restored.motionGroups[0].motions[0].voteResult?.countsEntered?.against,false);
 const report=exportMeetingRecord(session);
 assert.match(report,/Against: Not recorded/);assert.match(report,/Abstain: Not recorded/);assert.match(report,/Recorded Votes: 8/);
});
import {canEnterResolutionVoting} from '../src/utils/resolutionVoting';
test('only a passed Enter Voting motion opens resolution voting',()=>{
 assert.equal(canEnterResolutionVoting({...motion,type:'close_debate'}),false);
 assert.equal(canEnterResolutionVoting({...motion,type:'enter_voting',status:'pending'}),false);
 assert.equal(canEnterResolutionVoting({...motion,type:'enter_voting',status:'failed'}),false);
 assert.equal(canEnterResolutionVoting({...motion,type:'enter_voting',status:'passed'}),true);
});
test('resolution chair can pass or fail without counts or an attendance snapshot',async()=>{
 reset();
 const d={id:'manual-pass',name:'DR 2',method:'quick' as const,majority:'simple' as const,includeAbstentions:false,restrictPV:true,yes:null,no:null,abstain:null,roster:[],ballots:{}};
 assert.equal(await store.getState().saveResolutionVote(d,'pass'),true);
 assert.equal(await store.getState().saveResolutionVote({...d,id:'manual-fail'},'fail'),true);
 assert.deepEqual(store.getState().motionGroups.map(g=>g.motions[0].status),['passed','failed']);
 assert.equal(store.getState().motions[0].voteResult?.countsEntered?.for,false);
 assert.match(exportMeetingRecord(store.getState()),/Against: Not recorded/);
});
test('resolution manual decision overrides suggestion and accepts partial roll call',async()=>{
 reset();
 const d={id:'override',name:'DR 3',method:'quick' as const,majority:'simple' as const,includeAbstentions:false,restrictPV:true,yes:12,no:12,abstain:null,roster:[],ballots:{}};
 assert.equal(await store.getState().saveResolutionVote(d,'pass'),true);
 assert.equal(store.getState().motions[0].status,'passed');
 const partial={...d,id:'partial-roll',method:'rollcall' as const,roster:[{id:'a',name:'A',attendance:'present' as const},{id:'b',name:'B',attendance:'present' as const}],ballots:{a:'yes' as const}};
 assert.equal(await store.getState().saveResolutionVote(partial,'fail'),true);
 assert.match(exportMeetingRecord(store.getState()),/B: Not recorded/);
});
test('three resolution rules use their stated bases, without guessing missing No votes',()=>{
 const d={name:'DR rules',method:'quick' as const,majority:'simple' as const,includeAbstentions:false,restrictPV:false,yes:6,no:4,abstain:null,roster:Array.from({length:15},(_,i)=>({id:String(i),name:String(i),attendance:'present' as const})),ballots:{}};
 assert.equal(calculateResolutionVote(d).passed,true);
 assert.equal(calculateResolutionVote({...d,majority:'present'}).passed,false);
 assert.equal(calculateResolutionVote({...d,majority:'two-thirds'}).passed,false);
 assert.equal(calculateResolutionVote({...d,yes:8,majority:'two-thirds'}).passed,true);
 assert.equal(calculateResolutionVote({...d,no:null}).passed,null);
 assert.equal(calculateResolutionVote({...d,yes:5,no:5}).passed,false);
 assert.equal(calculateResolutionVote({...d,majority:'present',roster:[]}).passed,null);
 assert.equal(calculateResolutionVote({...d,method:'rollcall',ballots:{'0':'yes'}}).passed,null);
});

test('paused yield credits once and cannot consume the next unstarted speaker',()=>{
 reset();
 const speakers=[{id:'a',name:'A',status:'speaking' as const,speakingTime:60,remainingTime:20},{id:'b',name:'B',status:'waiting' as const,speakingTime:60,remainingTime:60}];
 store.setState({motionProcessingDraft:{motionId:'qa',groupId:'g',motionType:'moderated_caucus',speakingPhase:'in_progress',currentSpeakerIndex:0,timePool:0,speakers}});
 store.getState().pauseMotionTimer('qa');store.getState().yieldMotionTimeToChair('qa');store.getState().yieldMotionTimeToChair('qa');
 assert.equal(store.getState().motionProcessingDraft!.timePool,20);
 assert.equal(store.getState().motionProcessingDraft!.speakers[0].remainingTime,0);
 assert.equal(store.getState().motionProcessingDraft!.currentSpeakerIndex,1);
 store.getState().resumeMotionTimer('qa');store.getState().pauseMotionTimer('qa');store.getState().yieldMotionTimeToChair('qa');
 assert.equal(store.getState().motionProcessingDraft!.timePool,80);
 store.getState().yieldMotionTimeToChair('qa');assert.equal(store.getState().motionProcessingDraft!.timePool,80);
});
test('GSL paused yield cannot collect the next unstarted speaker',()=>{
 reset();store.setState({currentSpeaker:{id:'a',name:'A',status:'speaking',speakingTime:60,remainingTime:20},waitingQueue:[{id:'b',name:'B',status:'waiting',speakingTime:60,remainingTime:60}]});
 store.getState().pauseTimer();store.getState().yieldTimeToChair();store.getState().yieldTimeToChair();assert.equal(store.getState().timePool,20);
 store.getState().resumeTimer();store.getState().pauseTimer();store.getState().yieldTimeToChair();assert.equal(store.getState().timePool,80);
});


test('deleting an executing paper cancels its local draft and cannot restore it after reload',async()=>{
 reset();
 const paper={...motion,type:'paper_presentation' as const,parameters:{papers:['Paper 1','Paper 2'],totalTime:180,qaTime:120}};
 const keep={...motion,id:'keep'};
 store.setState({motions:[paper,keep],motionGroups:[{id:'g',motions:[paper,keep],selectedMotionId:paper.id,status:'executing',timestamp:new Date()}],timePool:42,motionProcessingDraft:{motionId:paper.id,groupId:'g',motionType:paper.type,speakers:[],speakingPhase:'adding',timePool:42}});
 assert.equal(await store.getState().deleteVotedMotion(paper.id),true);
 assert.equal(store.getState().motionProcessingDraft,null);
 assert.equal(store.getState().timePool,0);
 assert.deepEqual(store.getState().motionGroups[0].motions.map(m=>m.id),['keep']);
 store.setState(base,true);store.getState().loadFromLocalStorage();
 assert.equal(store.getState().motionProcessingDraft,null);
 assert.deepEqual(store.getState().motionGroups[0].motions.map(m=>m.id),['keep']);
 assert.equal(await store.getState().beginMotionProcessing(paper.id),false);
});

test('deleting another motion preserves the active draft and its time pool',async()=>{
 reset();const keep={...motion,id:'keep'};
 const draft={motionId:keep.id,groupId:'g',motionType:keep.type,speakers:[],speakingPhase:'adding' as const,timePool:42};
 store.setState({motions:[motion,keep],motionGroups:[{id:'g',motions:[motion,keep],status:'executing',timestamp:new Date()}],timePool:42,motionProcessingDraft:draft});
 assert.equal(await store.getState().deleteVotedMotion(motion.id),true);
 assert.deepEqual(store.getState().motionProcessingDraft,draft);
 assert.equal(store.getState().timePool,42);
});

test('failed collaboration release keeps the motion and draft available to retry',async()=>{
 reset();store.setState({id:'qa',publicMeetingId:'qa',hasCollaborationRoom:true,memberId:'m',memberToken:'t',sessionId:'s',role:'host',displayName:'QA',clientInstanceId:'c',motions:[motion],motionGroups:[{id:'g',motions:[motion],status:'executing',timestamp:new Date()}],motionProcessingDraft:{motionId:motion.id,groupId:'g',motionType:motion.type,speakers:[],speakingPhase:'adding',timePool:42}});
 assert.equal(await store.getState().deleteVotedMotion(motion.id),false);
 assert.equal(store.getState().motionGroups[0].motions[0].id,motion.id);
 assert.equal(store.getState().motionProcessingDraft?.motionId,motion.id);
 assert.equal(store.getState().motionProcessingState,'idle');
 assert.doesNotMatch(store.getState().motionProcessingError??'',/Exit the current mode/);
});

test('deleting the selected execution after Back clears the mode label',async()=>{
 reset();store.setState({status:'Presentation',meetingState:'Presentation',timePool:42,motions:[motion],motionGroups:[{id:'g',motions:[motion],selectedMotionId:motion.id,status:'executing',timestamp:new Date()}]});
 assert.equal(await store.getState().deleteVotedMotion(motion.id),true);
 assert.equal(store.getState().status,'GSL');
 assert.equal(store.getState().meetingState,'GSL');
 assert.equal(store.getState().timePool,0);
});

test('Enter Voting requires a finite paper count in the motion',()=>{
 const form={type:'enter_voting' as const,proposer:'',minutes:'',seconds:'',topic:''};
 assert.equal(buildMotionEntry(form).motion,undefined);
 assert.equal(buildMotionEntry({...form,voteCount:'3'} as any).motion?.parameters.voteCount,3);
 for(const n of ['0','-1','1.5','Infinity'])assert.equal(buildMotionEntry({...form,voteCount:n} as any).motion,undefined);
});

test('resolution voting finishes exactly the declared slots as one group',async()=>{
 reset();const source={...motion,id:'vote-source',type:'enter_voting' as const,parameters:{voteCount:3}};
 store.setState({motions:[source],motionGroups:[{id:'source-g',motions:[source],status:'passed',timestamp:new Date()}]});
 const votes=Array.from({length:3},(_,i)=>({draft:{id:`paper-${i}`,name:`Draft ${i+1}`,method:'quick' as const,majority:'simple' as const,includeAbstentions:false,restrictPV:true,yes:null,no:null,abstain:null,roster:[],ballots:{}},decision:i===1?'fail' as const:'pass' as const}));
 assert.equal(await store.getState().finishResolutionVoteGroup(source.id,votes.slice(0,2)),false);
 assert.equal(await store.getState().finishResolutionVoteGroup(source.id,[...votes,votes[0]]),false);
 assert.equal(await store.getState().finishResolutionVoteGroup(source.id,votes),true);
 assert.equal(store.getState().motionGroups.find(g=>g.id==='resolution-batch-vote-source')?.motions.length,3);
 assert.equal(store.getState().motions.find(m=>m.id===source.id)?.parameters.votingComplete,true);
 assert.equal(await store.getState().finishResolutionVoteGroup(source.id,votes),true);
 assert.equal(store.getState().motionGroups.filter(g=>g.id==='resolution-batch-vote-source').length,1);
 store.getState().saveToLocalStorage();store.setState(base,true);store.getState().loadFromLocalStorage();
 assert.equal(store.getState().motions.find(m=>m.id===source.id)?.parameters.voteCount,3);
 assert.equal(store.getState().motions.find(m=>m.id===source.id)?.parameters.votingComplete,true);
});

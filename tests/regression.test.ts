import test from 'node:test';
import assert from 'node:assert/strict';
import { useMeetingStore as store } from '../src/store/useMeetingStore';
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
 assert.equal(await store.getState().editPendingMotionGroup(group.id,Array(5).fill(entry)),false);
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

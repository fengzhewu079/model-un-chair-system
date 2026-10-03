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

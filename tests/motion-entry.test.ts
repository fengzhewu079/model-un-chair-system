import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMotionEntry } from '../src/utils/motionEntry';
const input = {type:'moderated_caucus' as const,proposer:' France ',minutes:'10',seconds:'60',topic:' Climate finance '};
test('a motion needs no time confirmation and preserves the old speaker contract',()=>{
 const r=buildMotionEntry(input);assert.ok(r.motion);assert.equal(r.motion.parameters.totalSpeakers,10);assert.equal(r.motion.parameters.speakingTime,60);assert.equal(r.motion.parameters.topic,'Climate finance');assert.equal(r.motion.proposer,'France');
});
test('incomplete and invalid timing cannot create broken motions',()=>{
 for(const minutes of ['', '0', '-1','Infinity','1e309'])assert.ok(buildMotionEntry({...input,minutes}).error);
 for(const seconds of ['','0','-1','Infinity','601','0.5'])assert.ok(buildMotionEntry({...input,seconds}).error);
 assert.ok(buildMotionEntry({...input,topic:'  '}).error);
});
test('partial slots are explicit rather than silently promising extra time',()=>{
 const r=buildMotionEntry({...input,minutes:'2',seconds:'50'});assert.equal(r.motion?.parameters.totalSpeakers,2);assert.equal(r.effectiveSeconds,100);assert.equal(r.remainderSeconds,20);
});
test('all existing motion types retain required parameters only',()=>{
 const r=buildMotionEntry({...input,type:'unmoderated_caucus',minutes:'0.5'});assert.equal(r.motion?.parameters.totalTime,30);assert.equal(r.motion?.parameters.speakingTime,undefined);
 for(const type of ['speaker_list','extend_moderated'] as const)assert.equal(buildMotionEntry({...input,type,topic:''}).motion?.parameters.totalSpeakers,10);
 for(const type of ['close_debate','enter_voting','resume_debate','adjourn_meeting'] as const)assert.deepEqual(buildMotionEntry({...input,type,minutes:'',seconds:''}).motion?.parameters,{});
 assert.equal(buildMotionEntry({...input,type:'extend_unmoderated'}).motion?.parameters.totalTime,600);
});

test('fallback speaker list validates timing without a topic or extra confirmation',()=>{
 const fallback={type:'speaker_list' as const,proposer:'',topic:'',minutes:'2',seconds:'50'};
 const result=buildMotionEntry(fallback);
 assert.deepEqual(result.motion?.parameters,{speakingTime:50,totalSpeakers:2});
 assert.equal(result.effectiveSeconds,100);
 assert.equal(result.remainderSeconds,20);
 for(const update of [{minutes:''},{seconds:''},{minutes:'0'},{seconds:'0'},{seconds:'121'},{seconds:'1.5'},{minutes:'Infinity'}]){
  const invalid=buildMotionEntry({...fallback,...update});
  assert.ok(invalid.error);assert.equal(invalid.motion,undefined);
 }
 const short=buildMotionEntry({...fallback,minutes:'0.5',seconds:'30'});
 assert.equal(short.motion?.parameters.totalSpeakers,1);
 assert.equal(short.effectiveSeconds,30);
 assert.equal(short.remainderSeconds,0);
});

test('decimal minutes tolerate floating point error but reject fractional seconds',()=>{
 for(const [minutes,total] of [['4.1',246],['2.05',123]] as const){
  assert.equal(buildMotionEntry({...input,type:'unmoderated_caucus',minutes}).motion?.parameters.totalTime,total);
 }
 assert.ok(buildMotionEntry({...input,minutes:'1.001'}).error);
});

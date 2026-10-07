import type { Motion, MotionType } from '../types';
export type MotionEntry = Omit<Motion,'id'|'timestamp'|'speakers'|'currentSpeakerIndex'|'speakingPhase'>;
export interface MotionForm {type:MotionType; proposer:string; minutes:string; seconds:string; topic:string; qaMinutes?:string; paperCount?:string; paperNames?:string[]; delegateCount?:number}
export const hasSpeakers = (type:MotionType) => ['moderated_caucus','speaker_list','extend_moderated'].includes(type);
export const hasDuration = (type:MotionType) => hasSpeakers(type) || ['unmoderated_caucus','extend_unmoderated','paper_presentation'].includes(type);
export function buildMotionEntry(input:MotionForm):{motion?:MotionEntry;error?:string;effectiveSeconds?:number;remainderSeconds?:number}{
 const parameters:Motion['parameters']={};
 let effectiveSeconds:number|undefined;
 let remainderSeconds:number|undefined;
 if(input.type==='round_robin'){
  const seconds=Number(input.seconds), count=input.delegateCount??0;
  if(!Number.isSafeInteger(seconds)||seconds<=0)return {error:'Enter a speaking time of at least one whole second.'};
  if(!Number.isSafeInteger(count)||count<1)return {error:'Mark at least one delegate present before recording a round robin.'};
  parameters.speakingTime=seconds;parameters.totalSpeakers=count;parameters.topic=input.topic.trim();
  effectiveSeconds=count*seconds;
 }
 if(hasDuration(input.type)){
  const rawTotal=Number(input.minutes)*60;
  const total=Math.round(rawTotal);
  const isWholeSecond=Math.abs(rawTotal-total)<=Number.EPSILON*Math.max(1,Math.abs(rawTotal))*4;
  if(!input.minutes.trim()||!Number.isSafeInteger(total)||!isWholeSecond||total<=0)return {error:'Enter a total time greater than zero, in whole seconds.'};
  effectiveSeconds=total;
  if(hasSpeakers(input.type)){
   const seconds=Number(input.seconds);
   if(!Number.isSafeInteger(seconds)||seconds<=0)return {error:'Enter a speaking time of at least one whole second.'};
   if(seconds>total)return {error:'Speaking time cannot be longer than the total time.'};
   parameters.speakingTime=seconds;
   parameters.totalSpeakers=Math.floor(total/seconds);
   effectiveSeconds=parameters.totalSpeakers*seconds;
   remainderSeconds=total-effectiveSeconds;
  }else parameters.totalTime=total;
 }
 if(input.type==='paper_presentation'){
  if(input.paperCount !== undefined){
   const count=Number(input.paperCount);
   const rawQA=Number(input.qaMinutes)*60, qa=Math.round(rawQA);
   if(!Number.isSafeInteger(count)||count<1||count>50)return {error:'Choose between 1 and 50 papers.'};
   if(!input.qaMinutes?.trim()||!Number.isSafeInteger(qa)||qa<=0||Math.abs(rawQA-qa)>Number.EPSILON*Math.max(1,Math.abs(rawQA))*4)return {error:'Enter a Q&A time greater than zero, in whole seconds.'};
   const names=Array.from({length:count},(_,i)=>input.paperNames?.[i]?.trim()||`Paper ${i+1}`);
   if(names.some(n=>n.length>160))return {error:'Keep each paper name within 160 characters.'};
   parameters.papers=names; parameters.qaTime=qa;
   parameters.topic=names.join(' · ');
  }else{
   if(!input.topic.trim())return {error:'Add the paper name or number.'};
   parameters.topic=input.topic.trim();
  }
 }
 if(input.type==='moderated_caucus'){
  if(!input.topic.trim())return {error:'Add the topic of this moderated caucus.'};
  parameters.topic=input.topic.trim();
 }
 if(input.type==='extend_moderated'){
  parameters.totalTime=effectiveSeconds;
  if(input.topic.trim()) parameters.topic=input.topic.trim();
 }
 return {motion:{type:input.type,proposer:input.proposer.trim()||undefined,parameters,status:'pending'},effectiveSeconds,remainderSeconds};
}

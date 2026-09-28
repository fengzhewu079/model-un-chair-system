import type { Motion, MotionType } from '../types';
export type MotionEntry = Omit<Motion,'id'|'timestamp'|'speakers'|'currentSpeakerIndex'|'speakingPhase'>;
export interface MotionForm {type:MotionType; proposer:string; minutes:string; seconds:string; topic:string}
export const hasSpeakers = (type:MotionType) => ['moderated_caucus','speaker_list','extend_moderated'].includes(type);
export const hasDuration = (type:MotionType) => hasSpeakers(type) || ['unmoderated_caucus','extend_unmoderated'].includes(type);
export function buildMotionEntry(input:MotionForm):{motion?:MotionEntry;error?:string;effectiveSeconds?:number;remainderSeconds?:number}{
 const parameters:Motion['parameters']={};
 let effectiveSeconds:number|undefined;
 let remainderSeconds:number|undefined;
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
 if(input.type==='moderated_caucus'){
  if(!input.topic.trim())return {error:'Add the topic of this moderated caucus.'};
  parameters.topic=input.topic.trim();
 }
 return {motion:{type:input.type,proposer:input.proposer.trim()||undefined,parameters,status:'pending'},effectiveSeconds,remainderSeconds};
}

import type { Motion, MotionProcessingDraft } from '../types';
export type MotionCorrection = Pick<Motion, 'parameters' | 'proposer'>;
export function validateMotionCorrection(motion: Motion, change: MotionCorrection, draft?: MotionProcessingDraft | null): string | null {
 if (motion.status !== 'passed' && motion.status !== 'failed') return 'Finish voting before editing this motion.';
 const p=change.parameters;
 for(const key of ['totalTime','speakingTime','totalSpeakers','qaTime','voteCount'] as const){
  if(p[key]!==undefined&&(!Number.isSafeInteger(p[key])||p[key]!<=0))return 'Times and speaker counts must be positive whole numbers.';
  if(motion.parameters[key]!==undefined&&p[key]===undefined)return 'Keep the required motion parameters.';
 }
 if(p.votingComplete!==motion.parameters.votingComplete)return 'Keep the voting group completion state.';
 if(motion.type==='moderated_caucus'&&!p.topic?.trim())return 'Enter a topic.';
 if(p.qaTime!==motion.parameters.qaTime&&[motion.presentation,...(motion.paperPresentations??[])].some(progress=>progress?.phase==='qa'))return 'Q&A has started. Keep its duration to preserve the current timer.';
 const speakers=draft?.motionId===motion.id?draft.speakers:motion.speakers??[];
 if(p.totalSpeakers!==undefined&&p.totalSpeakers<speakers.length)return `Keep at least ${speakers.length} speakers already recorded.`;
 if(motion.parameters.papers&&p.papers?.length!==motion.parameters.papers.length)return 'Keep the existing papers; their progress is already linked by order.';
 if(p.papers?.some(name=>!name.trim()||name.length>160))return 'Enter a paper name within 160 characters.';
 return null;
}
export function correctMotion(motion:Motion,change:MotionCorrection):Motion {
 const parameters={...change.parameters,topic:change.parameters.topic?.trim(),papers:change.parameters.papers?.map(n=>n.trim())};
 if(motion.type==='extend_moderated'&&parameters.totalSpeakers&&parameters.speakingTime)parameters.totalTime=parameters.totalSpeakers*parameters.speakingTime;
 if(parameters.papers)parameters.topic=parameters.papers.join(' · ');
 return {...motion,parameters,proposer:change.proposer?.trim()||undefined};
}

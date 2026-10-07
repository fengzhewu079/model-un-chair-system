import type {VoteResult} from '../types';
export interface MotionVoteInputs { for:string; against:string; abstain:string }
export const createEmptyVoteInputs=():MotionVoteInputs=>({for:'',against:'',abstain:''});
export function deriveMotionTally(inputs:MotionVoteInputs|undefined,votingBase:number,required:number){
 const values=inputs??createEmptyVoteInputs();
 const parse=(s:string)=>s.trim()===''?null:/^\d+$/.test(s.trim())&&Number.isSafeInteger(Number(s))?Number(s):NaN;
 const yes=parse(values.for),no=parse(values.against),abstain=parse(values.abstain);
 const invalid=[yes,no,abstain].some(n=>n!==null&&Number.isNaN(n));
 const overflow=(yes??0)+(no??0)+(abstain??0)>votingBase;
 return {normalizedFor:yes,normalizedAgainst:no,normalizedAbstain:abstain,isInputStarted:yes!==null,isInputValid:!invalid&&!overflow,
 validationMessage:invalid?'Vote counts must be whole numbers.':overflow?'Entered votes cannot exceed the voting base.':null,
 predictedResult:invalid||overflow||yes===null?null:yes>=required?'pass' as const:'fail' as const};
}
export function recordedVoteCount(vote:VoteResult|undefined,field:'for'|'against'|'abstain'):number|string{
 return !vote||vote.countsEntered?.[field]===false?'Not recorded':vote[field];
}

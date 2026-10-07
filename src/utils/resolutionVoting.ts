import type {Motion} from '../types';
export const canEnterResolutionVoting = (motion:Pick<Motion,'type'|'status'>) => motion.type === 'enter_voting' && motion.status === 'passed';
export type ResolutionChoice = 'yes'|'no'|'abstain';
export interface ResolutionVoteDraft {
 id?:string;
 name:string;
 method:'quick'|'rollcall';
 majority:'simple'|'two-thirds';
 includeAbstentions:boolean;
 restrictPV:boolean;
 yes:number|null;no:number|null;abstain:number|null;
 roster:{id:string;name:string;attendance:'present'|'present_and_voting'}[];
 ballots:Record<string,ResolutionChoice>;
}
export function calculateResolutionVote(d:ResolutionVoteDraft){
 let yes=d.yes??null,no=d.no??null,abstain=d.abstain??null;
 let error=!d.name.trim()?'Enter a draft resolution name or number.':'';
 let recorded=0;
 if(d.method==='rollcall'){
  yes=0;no=0;abstain=0;
  for(const delegate of d.roster){
   const vote=d.ballots[delegate.id];
   if(vote==='yes'){yes++;recorded++;}
   else if(vote==='no'){no++;recorded++;}
   else if(vote==='abstain'){
    abstain++;recorded++;
    if(d.restrictPV&&delegate.attendance==='present_and_voting')error='Present and Voting delegates cannot abstain under this rule.';
   }
  }
  if(!recorded){yes=null;no=null;abstain=null;}
 }else recorded=(yes??0)+(no??0)+(abstain??0);
 if([yes,no,abstain].some(n=>n!==null&&(!Number.isSafeInteger(n)||n<0)))error='Enter non-negative whole vote counts.';
 else if(d.roster.length&&recorded>d.roster.length)error='Entered votes exceed attendance. Check the counts or refresh attendance.';
 else if(d.roster.length&&d.restrictPV&&(abstain??0)>d.roster.filter(r=>r.attendance==='present').length)error='Abstentions exceed the number of delegates allowed to abstain.';
 const complete=d.roster.length>0&&recorded===d.roster.length;
 const countsKnown=yes!==null&&no!==null&&(!d.includeAbstentions||abstain!==null);
 const useCountedBase=countsKnown&&(complete||!d.roster.length);
 const base=useCountedBase?(yes??0)+(no??0)+(d.includeAbstentions?(abstain??0):0):d.roster.length-(d.includeAbstentions?0:(abstain??0));
 const required=d.majority==='two-thirds'?Math.ceil(base*2/3):Math.floor(base/2)+1;
 const passed=error||yes===null||base<=0?null:yes>=required;
 return {yes,no,abstain,recorded,base,required,passed,error,complete,useCountedBase};
}

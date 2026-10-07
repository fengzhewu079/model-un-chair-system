export type ResolutionChoice = 'yes'|'no'|'abstain';
export interface ResolutionVoteDraft {
 id?:string;
 name:string;
 method:'quick'|'rollcall';
 majority:'simple'|'two-thirds';
 includeAbstentions:boolean;
 restrictPV:boolean;
 yes:number;no:number;abstain:number;
 roster:{id:string;name:string;attendance:'present'|'present_and_voting'}[];
 ballots:Record<string,ResolutionChoice>;
}
export function calculateResolutionVote(d:ResolutionVoteDraft){
 let yes=d.yes,no=d.no,abstain=d.abstain,error='';
 if(!d.name.trim())error='Enter a draft resolution name or number.';
 if(!d.roster.length)error='Take attendance before voting.';
 if(d.method==='rollcall'){
  yes=0;no=0;abstain=0;
  for(const delegate of d.roster){
   const vote=d.ballots[delegate.id];
   if(vote==='yes')yes++;else if(vote==='no')no++;else if(vote==='abstain'){
    abstain++;if(d.restrictPV&&delegate.attendance==='present_and_voting')error='Present and Voting delegates cannot abstain under this rule.';
   }else error='Record a vote for every delegate.';
  }
 }
 if([yes,no,abstain].some(n=>!Number.isSafeInteger(n)||n<0))error='Enter non-negative whole vote counts.';
 else if(yes+no+abstain!==d.roster.length)error=`Record all ${d.roster.length} votes; ${yes+no+abstain} entered.`;
 else if(d.restrictPV&&abstain>d.roster.filter(r=>r.attendance==='present').length)error='Abstentions exceed the number of delegates allowed to abstain.';
 const base=yes+no+(d.includeAbstentions?abstain:0);
 if(!error&&base===0)error='No votes count toward the majority. A result cannot be confirmed.';
 const required=d.majority==='two-thirds'?Math.ceil(base*2/3):Math.floor(base/2)+1;
 return {yes,no,abstain,base,required,passed:!error&&yes>=required,error};
}

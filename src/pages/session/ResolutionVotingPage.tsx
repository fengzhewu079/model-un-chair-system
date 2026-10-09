import {eligibleRoster, attendanceChanged, refreshVoteAttendance} from '../../utils/voteAttendance';
import {PassCelebration} from '../../components/PassCelebration';
import {useEffect,useId,useRef,useState} from 'react';
import {useMeetingStore} from '../../store/useMeetingStore';
import {Button} from '../../components/Button';
import {calculateResolutionVote,resolutionRuleLabel,type ResolutionVoteDraft,type ResolutionChoice} from '../../utils/resolutionVoting';

function VotingHelp({label,children}:{label:string;children:string}) {
 const id=useId();
 const [open,setOpen]=useState(false);
 return <span className="relative inline-flex group" onMouseLeave={()=>setOpen(false)}>
  <button type="button" aria-label={`About ${label}`} aria-describedby={id} onClick={()=>setOpen(v=>!v)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.blur();}}} className="h-6 w-6 rounded-full border border-sky-400 text-sky-700 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600">i</button>
  <span id={id} role="tooltip" className={`${open?'block':'hidden group-hover:block group-focus-within:block'} absolute top-full right-0 mt-2 z-20 w-56 border border-sky-200 bg-white p-3 text-sm leading-5 text-slate-700 shadow-md`}>{children}</span>
 </span>;
}

export function ResolutionVotingPage({onBack,sourceMotionId}:{onBack:()=>void;sourceMotionId:string}){
 const state=useMeetingStore();
 useEffect(()=>{window.scrollTo(0,0);},[]);
 const source=state.motionGroups.flatMap(g=>g.motions).find(m=>m.id===sourceMotionId);
 const limit=source?.parameters.voteCount??1;
 const key=`mun-resolution-batch:${state.publicMeetingId||state.id}:${sourceMotionId}`;
 type Recorded={draft:ResolutionVoteDraft;decision:'pass'|'fail'};
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
 const [recorded,setRecorded]=useState<Recorded[]>(()=>{const value=read();return Array.isArray(value?.recorded)?value.recorded:[];});
 const newDraft=():ResolutionVoteDraft=>({id:crypto.randomUUID(),name:'',method:'quick',majority:'simple',includeAbstentions:false,restrictPV:true,yes:null,no:null,abstain:null,ballots:{},roster:eligibleRoster(state.rollCall.delegates)});
 const [draft,setDraft]=useState<ResolutionVoteDraft>(()=>{try{const d=read()?.draft;if(d&&typeof d.name==='string'&&Array.isArray(d.roster)&&d.ballots&&d.id)return d;}catch{}return newDraft();});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(()=>recorded.some(r=>r.draft.id===draft.id));
 const saving=useRef(false);
 const dragStart=useRef<number|null>(null);
 const dragged=useRef(false);
 const [savedDecision,setSavedDecision]=useState<'pass'|'fail'|null>(()=>recorded.find(r=>r.draft.id===draft.id)?.decision??null);
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify({draft,recorded}));}catch{setError('Unable to save this draft on this device. Keep this page open.');}},[draft,key,recorded]);
 const latestRoster=eligibleRoster(state.rollCall.delegates);
 const rosterChanged=attendanceChanged(draft.roster,latestRoster);
 const result=calculateResolutionVote(draft);
 const papers=Array.from(new Set(state.motionGroups.flatMap(g=>g.motions).filter(m=>m.type==='paper_presentation').flatMap(m=>m.parameters.papers??(m.parameters.topic?[m.parameters.topic]:[]))));
 const patch=(change:Partial<ResolutionVoteDraft>)=>{setDraft(d=>({...d,...change}));setError('');};
 const confirm=(decision:'pass'|'fail')=>{
  if(saved||busy||result.error||recorded.length>=limit)return;
  setRecorded(r=>[...r,{draft,decision}]);setSavedDecision(decision);setSaved(true);setError('');
 };
 const finishGroup=async()=>{
  if(saving.current||recorded.length!==limit)return;
  saving.current=true;setBusy(true);setError('');
  const ok=await state.finishResolutionVoteGroup(sourceMotionId,recorded);
  saving.current=false;setBusy(false);
  if(ok){try{localStorage.removeItem(key);}catch{}onBack();}
  else setError(useMeetingStore.getState().motionProcessingError||'Unable to finish. Your results are preserved.');
 };
 return <div className="session-detail min-h-screen bg-white">
  {saved&&savedDecision==='pass'&&<PassCelebration/>}
  <header className="border-b border-slate-200 px-6 py-5 flex items-center gap-5"><Button variant="secondary" disabled={busy} onClick={onBack}>← Back</Button><h1 className="text-2xl font-bold">Resolution voting</h1></header>
  <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
   <div className="border-b border-slate-200 pb-4"><h2 className="text-xl font-semibold">Paper {Math.min(recorded.length+(saved?0:1),limit)} of {limit}</h2><p className="text-sm text-slate-600">{recorded.length} of {limit} results recorded</p>{recorded.length>0&&<ol className="mt-3 space-y-1 text-sm">{recorded.map((r,i)=><li key={r.draft.id}>{i+1}. {r.draft.name} · {r.decision==='pass'?'Passed':'Failed'}</li>)}</ol>}</div>
   {saved?<><h2 className="text-3xl font-bold">{draft.name} — {savedDecision==='pass'?'Adopted':'Not adopted'}</h2><p>Yes {result.yes??'Not recorded'} · No {result.no??'Not recorded'} · Abstain {result.abstain??'Not recorded'}</p><p className="text-slate-600">Recorded in this voting group.{draft.method==='rollcall'&&draft.roster.length>0?` ${result.recorded} of ${draft.roster.length} votes recorded.`:''}</p>{recorded.length<limit?<Button onClick={()=>{setDraft(newDraft());setSaved(false);setSavedDecision(null);}}>Next paper →</Button>:<div><p className="mb-3">All {limit} papers voted. Finish to save the group.</p><Button disabled={busy} onClick={()=>void finishGroup()}>{busy?'Saving…':'Finish group'}</Button></div>}{error&&<p role="alert" className="text-red-700">{error}</p>}</>:<>
    <fieldset disabled={busy} className="space-y-6">
     <div><label htmlFor="resolution-name" className="block font-semibold mb-2">Draft resolution</label><input id="resolution-name" list="known-resolution-papers" className="w-full border border-slate-300 px-3 py-3" placeholder="e.g. Draft Resolution 1.1" maxLength={160} value={draft.name} onChange={e=>patch({name:e.target.value})}/><datalist id="known-resolution-papers">{papers.map(p=><option key={p} value={p}/>)}</datalist></div>
     <div>
      <div className="resolution-method-switch" role="radiogroup" aria-label="Voting method" onPointerDown={e=>{dragStart.current=e.clientX;dragged.current=false;}} onPointerUp={e=>{if(dragStart.current!==null&&Math.abs(e.clientX-dragStart.current)>24){dragged.current=true;patch({method:e.clientX>dragStart.current?'rollcall':'quick'});}dragStart.current=null;}} onPointerCancel={()=>{dragStart.current=null;}} onClickCapture={e=>{if(dragged.current){e.preventDefault();e.stopPropagation();dragged.current=false;}}}>
       <span aria-hidden="true" className={`resolution-method-thumb ${draft.method==='rollcall'?'is-rollcall':''}`}/>
       {(['quick','rollcall'] as const).map(method=><button key={method} type="button" role="radio" aria-checked={draft.method===method} tabIndex={draft.method===method?0:-1} onClick={()=>patch({method})} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'quick':e.key==='End'?'rollcall':draft.method==='quick'?'rollcall':'quick';patch({method:next});const radios=e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');radios?.[next==='quick'?0:1].focus();}}}>{method==='quick'?'Quick tally':'Roll-call vote'}</button>)}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600 mt-3">
       <span>{draft.method==='quick'?'Vote counts · optional':'Individual votes · optional'}</span>
       <VotingHelp label={draft.method==='quick'?'Quick tally':'Roll-call vote'}>{draft.method==='quick'?'Optionally enter Yes, No and Abstain totals. You decide Pass or Fail.':'Optionally record each delegate’s vote. You decide Pass or Fail.'}</VotingHelp>
      </div>
     </div>
     <details className="border-y border-slate-200 py-3"><summary className="cursor-pointer text-sky-700">Rules · {resolutionRuleLabel(draft)}</summary><div className="mt-4 space-y-3"><label className="block">Pass rule<select aria-label="Pass rule" className="block border p-3 mt-2 w-full" value={draft.includeAbstentions?'legacy':draft.majority} onChange={e=>patch({majority:e.target.value as ResolutionVoteDraft['majority'],includeAbstentions:false})}>{draft.includeAbstentions&&<option value="legacy" disabled>{resolutionRuleLabel(draft)}</option>}<option value="simple">Yes &gt; No — Simple majority (default)</option><option value="present">Yes &gt; ½ of delegates present</option><option value="two-thirds">Yes ≥ ⅔ of (Yes + No)</option></select></label><p className="text-sm text-slate-600">{draft.majority==='present'?'Uses the attendance count, including delegates who abstain.':'Abstentions do not count toward the threshold.'}</p><label className="flex gap-2"><input type="checkbox" checked={draft.restrictPV} onChange={e=>patch({restrictPV:e.target.checked})}/>Present and Voting delegates cannot abstain</label></div></details>
     <div className="flex justify-between gap-3 items-center"><p className="text-sm text-slate-600">{draft.roster.length?`${draft.roster.length} delegates · Attendance at vote setup`:'No attendance recorded · Manual result available'}</p><button className="text-sm text-sky-700 underline" onClick={()=>setDraft(d=>refreshVoteAttendance(d,latestRoster))}>Refresh attendance</button></div>
     {rosterChanged&&<div role="status" className="border-l-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Attendance changed</p><p>This vote keeps its original roster. Refresh attendance to update it.</p><p className="mt-1">Removed delegates’ ballots and disallowed abstentions will be cleared. Manual totals stay unchanged.</p></div>}
     {draft.method==='quick'?<div className="grid grid-cols-3 gap-4">{(['yes','no','abstain'] as const).map(k=><label key={k} className="font-semibold capitalize">{k}<input aria-label={k==='yes'?'Yes':k==='no'?'No':'Abstain'} className="block border border-slate-300 w-full p-3 mt-2 text-xl" type="number" min="0" step="1" placeholder="Optional" value={draft[k]===null||Number.isNaN(draft[k])?'':draft[k]} onChange={e=>patch({[k]:e.target.value===''?null:Number(e.target.value)})}/></label>)}</div>:<div className="divide-y border-y">{!draft.roster.length&&<p className="py-4 text-sm text-slate-600">Refresh attendance to list delegates, or choose Pass / Fail below.</p>}{draft.roster.map(d=><div key={d.id} className="flex flex-wrap justify-between items-center gap-3 py-3"><span>{d.name}{d.attendance==='present_and_voting'&&<span className="ml-2 text-xs text-slate-500">PV</span>}</span><select className="border p-2" aria-label={`Vote for ${d.name}`} value={draft.ballots[d.id]||''} onChange={e=>patch({ballots:{...draft.ballots,[d.id]:e.target.value as ResolutionChoice}})}><option value="">Choose vote</option><option value="yes">Yes</option><option value="no">No</option><option value="abstain" disabled={draft.restrictPV&&d.attendance==='present_and_voting'}>Abstain</option></select></div>)}</div>}
    </fieldset>
    <div className="border-t border-slate-200 pt-5 space-y-3">
     {result.error?<p role="alert" className="text-red-700">{result.error}</p>:result.passed!==null?<div className="space-y-1 text-slate-600" aria-live="polite"><p className="font-semibold text-lg">Suggested: {result.passed?'Pass':'Fail'}</p><p>{draft.majority==='simple'&&!draft.includeAbstentions?`${result.yes} Yes ${result.passed?'>':'≤'} ${result.no} No`:`${result.yes} Yes · At least ${result.required} Yes votes needed`}</p><p className="text-sm">{resolutionRuleLabel(draft)}. Guidance only — confirm below.</p></div>:<p className="text-slate-600">{draft.method==='rollcall'?'Record all delegates for a suggestion, or confirm manually.':draft.majority==='present'?'Enter Yes and refresh attendance for a suggestion, or confirm manually.':'Enter Yes and No for a suggestion, or confirm manually.'}</p>}


     {draft.method==='rollcall'&&draft.roster.length>0&&<p className="text-sm text-slate-500">{result.recorded} of {draft.roster.length} votes recorded</p>}
     {error&&<p role="alert" className="text-red-700">{error}</p>}
     <div className="resolution-result-actions"><Button size="lg" disabled={busy||!!result.error} onClick={()=>void confirm('pass')}>{busy?'Saving…':'Pass'}</Button><Button size="lg" variant="danger" disabled={busy||!!result.error} onClick={()=>void confirm('fail')}>{busy?'Saving…':'Fail'}</Button></div>
     <p className="text-xs text-slate-500">Records this paper’s result. Finish group saves all results to the meeting record.</p>
    </div>
   </>}
  </main>
 </div>;
}

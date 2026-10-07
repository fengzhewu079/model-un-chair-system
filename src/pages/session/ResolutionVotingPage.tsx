import {useEffect,useId,useRef,useState} from 'react';
import {useMeetingStore} from '../../store/useMeetingStore';
import {Button} from '../../components/Button';
import {calculateResolutionVote,type ResolutionVoteDraft,type ResolutionChoice} from '../../utils/resolutionVoting';

function VotingHelp({label,children}:{label:string;children:string}) {
 const id=useId();
 const [open,setOpen]=useState(false);
 return <span className="relative inline-flex group" onMouseLeave={()=>setOpen(false)}>
  <button type="button" aria-label={`About ${label}`} aria-describedby={id} onClick={()=>setOpen(v=>!v)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.blur();}}} className="h-6 w-6 rounded-full border border-sky-400 text-sky-700 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600">i</button>
  <span id={id} role="tooltip" className={`${open?'block':'hidden group-hover:block group-focus-within:block'} absolute top-full right-0 mt-2 z-20 w-56 border border-sky-200 bg-white p-3 text-sm leading-5 text-slate-700 shadow-md`}>{children}</span>
 </span>;
}

export function ResolutionVotingPage({onBack}:{onBack:()=>void}){
 const state=useMeetingStore();
 useEffect(()=>{window.scrollTo(0,0);},[]);
 const key=`mun-resolution-draft:${state.publicMeetingId||state.id}`;
 const newDraft=():ResolutionVoteDraft=>({id:crypto.randomUUID(),name:'',method:'quick',majority:'simple',includeAbstentions:false,restrictPV:true,yes:0,no:0,abstain:0,ballots:{},roster:state.rollCall.delegates.filter(d=>d.attendance==='present'||d.attendance==='present_and_voting').map(d=>({id:d.id,name:d.name,attendance:d.attendance as 'present'|'present_and_voting'}))});
 const [draft,setDraft]=useState<ResolutionVoteDraft>(()=>{try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&typeof d.name==='string'&&Array.isArray(d.roster)&&d.ballots&&d.id)return d;}catch{}return newDraft();});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const saving=useRef(false);
 useEffect(()=>{if(!saved)try{localStorage.setItem(key,JSON.stringify(draft));}catch{setError('Unable to save this draft on this device. Keep this page open.');}},[draft,key,saved]);
 const result=calculateResolutionVote(draft);
 const papers=Array.from(new Set(state.motionGroups.flatMap(g=>g.motions).filter(m=>m.type==='paper_presentation').flatMap(m=>m.parameters.papers??(m.parameters.topic?[m.parameters.topic]:[]))));
 const patch=(change:Partial<ResolutionVoteDraft>)=>{setDraft(d=>({...d,...change}));setError('');};
 const confirm=async()=>{if(saving.current||result.error)return;saving.current=true;setBusy(true);setError('');const ok=await state.saveResolutionVote(draft);saving.current=false;setBusy(false);if(ok){setSaved(true);try{localStorage.removeItem(key);}catch{}}else setError(useMeetingStore.getState().motionProcessingError||'Unable to save.');};
 return <div className="session-detail min-h-screen bg-white">
  <header className="border-b border-slate-200 px-6 py-5 flex items-center gap-5"><Button variant="secondary" disabled={busy} onClick={onBack}>← Back</Button><h1 className="text-2xl font-bold">Resolution voting</h1></header>
  <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
   {saved?<><h2 className="text-3xl font-bold">{draft.name} — {result.passed?'Adopted':'Not adopted'}</h2><p>Yes {result.yes} · No {result.no} · Abstain {result.abstain}</p><p className="text-slate-600">Saved to meeting records.</p><Button onClick={()=>{setDraft(newDraft());setSaved(false);}}>Vote on another resolution</Button></>:<>
    <fieldset disabled={busy} className="space-y-6">
     <div><label htmlFor="resolution-name" className="block font-semibold mb-2">Draft resolution</label><input id="resolution-name" list="known-resolution-papers" className="w-full border border-slate-300 px-3 py-3" placeholder="e.g. Draft Resolution 1.1" maxLength={160} value={draft.name} onChange={e=>patch({name:e.target.value})}/><datalist id="known-resolution-papers">{papers.map(p=><option key={p} value={p}/>)}</datalist></div>
     <div className="flex flex-wrap gap-3" role="group" aria-label="Voting method"><div className="flex items-center gap-2"><Button variant={draft.method==='quick'?'primary':'secondary'} aria-pressed={draft.method==='quick'} onClick={()=>patch({method:'quick'})}>Quick tally</Button><VotingHelp label="Quick tally">Enter the total Yes, No and Abstain votes.</VotingHelp></div><div className="flex items-center gap-2"><Button variant={draft.method==='rollcall'?'primary':'secondary'} aria-pressed={draft.method==='rollcall'} onClick={()=>patch({method:'rollcall'})}>Roll-call vote</Button><VotingHelp label="Roll-call vote">Call each delegate and record their vote individually.</VotingHelp></div></div>
     <details className="border-y border-slate-200 py-3"><summary className="cursor-pointer text-sky-700">Rules · {draft.majority==='simple'?'Simple majority':'Two-thirds'} · Abstentions {draft.includeAbstentions?'included':'excluded'}</summary><div className="mt-4 space-y-3"><label className="block">Majority <select aria-label="Majority" className="border p-2 ml-2" value={draft.majority} onChange={e=>patch({majority:e.target.value as ResolutionVoteDraft['majority']})}><option value="simple">Simple majority (&gt; ½)</option><option value="two-thirds">Two-thirds (≥ ⅔)</option></select></label><label className="flex gap-2"><input type="checkbox" checked={draft.includeAbstentions} onChange={e=>patch({includeAbstentions:e.target.checked})}/>Count abstentions in the majority base</label><label className="flex gap-2"><input type="checkbox" checked={draft.restrictPV} onChange={e=>patch({restrictPV:e.target.checked})}/>Present and Voting delegates cannot abstain</label></div></details>
     <div className="flex justify-between gap-3 items-center"><p className="text-sm text-slate-600">{draft.roster.length} eligible delegates · Attendance at vote setup</p><button className="text-sm text-sky-700 underline" onClick={()=>patch({roster:newDraft().roster})}>Refresh attendance</button></div>
     {draft.method==='quick'?<div className="grid grid-cols-3 gap-4">{(['yes','no','abstain'] as const).map(k=><label key={k} className="font-semibold capitalize">{k}<input aria-label={k==='yes'?'Yes':k==='no'?'No':'Abstain'} className="block border border-slate-300 w-full p-3 mt-2 text-xl" type="number" min="0" step="1" value={Number.isNaN(draft[k])?'':draft[k]} onChange={e=>patch({[k]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}</div>:<div className="divide-y border-y">{draft.roster.map(d=><div key={d.id} className="flex flex-wrap justify-between items-center gap-3 py-3"><span>{d.name}{d.attendance==='present_and_voting'&&<span className="ml-2 text-xs text-slate-500">PV</span>}</span><select className="border p-2" aria-label={`Vote for ${d.name}`} value={draft.ballots[d.id]||''} onChange={e=>patch({ballots:{...draft.ballots,[d.id]:e.target.value as ResolutionChoice}})}><option value="">Choose vote</option><option value="yes">Yes</option><option value="no">No</option><option value="abstain" disabled={draft.restrictPV&&d.attendance==='present_and_voting'}>Abstain</option></select></div>)}</div>}
    </fieldset>
    <div className="border-t border-slate-200 pt-5 space-y-3">{result.error?<p className="text-slate-600">{result.error}</p>:<><p className="font-semibold text-xl">{result.passed?'Adopted':'Not adopted'} · provisional</p><p className="text-slate-600">Yes {result.yes} · No {result.no} · Abstain {result.abstain}<br/>{result.required} Yes votes required out of {result.base} counted votes.</p></>}{error&&<p role="alert" className="text-red-700">{error}</p>}<Button disabled={busy||!!result.error} onClick={()=>void confirm()}>{busy?'Saving…':'Confirm result'}</Button><p className="text-xs text-slate-500">Draft stays on this device. Confirmed results are included in the meeting record.</p></div>
   </>}
  </main>
 </div>;
}

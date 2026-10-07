import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {Motion} from '../types';
import {useMeetingStore} from '../store/useMeetingStore';
import {useDialogFocus} from '../hooks/useDialogFocus';
import {Input} from './Input';
import {Button} from './Button';

function EditMotionDialog({motion,onClose}:{motion:Motion;onClose:()=>void}) {
 const [parameters,setParameters]=useState(()=>({...motion.parameters,papers:motion.parameters.papers?[...motion.parameters.papers]:undefined}));
 const [proposer,setProposer]=useState(motion.proposer??'');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const saving=useRef(false);
 const original=useRef(motion);
 const close=()=>{if(!saving.current)onClose();};
 const ref=useDialogFocus(true,close);
 const save=async()=>{
  if(saving.current)return;
  const current=useMeetingStore.getState().motionGroups.flatMap(g=>g.motions).find(m=>m.id===motion.id);
  if(!current||JSON.stringify(current.parameters)!==JSON.stringify(original.current.parameters)||current.proposer!==original.current.proposer){setError('This motion changed elsewhere. Close and reopen to edit the latest version.');return;}
  saving.current=true;setBusy(true);setError('');
  const ok=await useMeetingStore.getState().editVotedMotion(motion.id,{parameters,proposer});
  saving.current=false;setBusy(false);
  if(ok)onClose();else setError(useMeetingStore.getState().motionProcessingError??'Unable to save. Try again.');
 };
 return createPortal(<div className="motion-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <div className="motion-sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby="edit-voted-title" tabIndex={-1} style={{maxWidth:620}}>
   <header className="motion-sheet-heading"><h2 id="edit-voted-title" className="text-2xl font-bold">Edit motion</h2><button className="desk-text-button" disabled={busy} onClick={close}>Close</button></header>
   <form className="flex flex-col min-h-0" onSubmit={e=>{e.preventDefault();void save();}}>
    <fieldset disabled={busy} className="motion-sheet-body motion-fields">
     {parameters.topic!==undefined&&!parameters.papers&&<Input data-initial-focus label={motion.type==='paper_presentation'?'Paper name':motion.type==='round_robin'?'Topic · optional':'Topic'} value={parameters.topic} onChange={e=>setParameters(p=>({...p,topic:e.target.value}))}/>}
     <Input label="Proposed by · optional" value={proposer} onChange={e=>setProposer(e.target.value)}/>
     <div className="motion-time-grid">
      {(['totalTime','speakingTime','totalSpeakers','qaTime'] as const).filter(key=>parameters[key]!==undefined&&(key!=='totalTime'||parameters.totalSpeakers===undefined)).map(key=><Input key={key} label={{totalTime:'Total time · seconds',speakingTime:'Per speaker · seconds',totalSpeakers:'Number of speakers',qaTime:'Q&A · seconds'}[key]} type="number" min="1" step="1" value={Number.isNaN(parameters[key])?'':parameters[key]} onChange={e=>setParameters(p=>({...p,[key]:e.target.value===''?NaN:Number(e.target.value)}))}/>)}
     </div>
     {parameters.papers?.map((name,i)=><Input key={i} label={`Paper ${i+1}`} maxLength={160} value={name} onChange={e=>setParameters(p=>({...p,papers:p.papers!.map((n,j)=>j===i?e.target.value:n)}))}/>)}
     <p className="text-sm text-slate-500">Existing speaker timers stay unchanged.</p>
    </fieldset>
    <footer className="motion-sheet-footer">
     {error&&<p role="alert" className="motion-error">{error}</p>}
     <div className="motion-footer-actions"><span className="text-sm text-slate-600">Voting result stays unchanged.</span><Button type="submit" disabled={busy}>{busy?'Saving…':'Save changes'}</Button></div>
    </footer>
   </form>
  </div>
 </div>,document.body);
}

function DeleteMotionDialog({motion,onClose}:{motion:Motion;onClose:()=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const saving=useRef(false);
 const close=()=>{if(!saving.current)onClose();};
 const ref=useDialogFocus(true,close);
 const remove=async()=>{
  if(saving.current)return;
  saving.current=true;setBusy(true);setError('');
  const ok=await useMeetingStore.getState().deleteVotedMotion(motion.id);
  saving.current=false;setBusy(false);
  if(ok)onClose();else setError(useMeetingStore.getState().motionProcessingError??'Unable to delete. Try again.');
 };
 return createPortal(<div className="motion-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <div className="motion-sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby="delete-motion-title" tabIndex={-1} style={{maxWidth:480}}>
   <header className="motion-sheet-heading"><h2 id="delete-motion-title" className="text-2xl font-bold">Delete motion?</h2></header>
   <div className="motion-sheet-body"><p>This removes the motion and its voting record. This cannot be undone.</p>{motion.parameters.topic&&<p className="mt-3 font-semibold">{motion.parameters.topic}</p>}{error&&<p role="alert" className="motion-error mt-3">{error}</p>}</div>
   <footer className="motion-sheet-footer"><div className="motion-footer-actions"><Button data-initial-focus variant="secondary" disabled={busy} onClick={close}>Cancel</Button><button className="px-4 py-3 bg-red-600 text-white font-semibold disabled:opacity-50" disabled={busy} onClick={()=>void remove()}>{busy?'Deleting…':'Delete motion'}</button></div></footer>
  </div>
 </div>,document.body);
}

export function EditMotionMenu({motion}:{motion:Motion}) {
 const [open,setOpen]=useState(false);
 const [deleting,setDeleting]=useState(false);
 const menu=useRef<HTMLDetailsElement>(null);
 const wasOpen=useRef(false);
 useEffect(()=>{if(open||deleting)wasOpen.current=true;else if(wasOpen.current){wasOpen.current=false;menu.current?.querySelector('summary')?.focus();}},[open,deleting]);
 if(motion.type==='resolution_vote')return null;
 if(motion.status!=='passed'&&motion.status!=='failed')return null;
 return <>
  <details ref={menu} className="relative shrink-0" onKeyDown={e=>{if(e.key==='Escape'&&menu.current){menu.current.open=false;menu.current.querySelector('summary')?.focus();}}}>
   <summary aria-label="Motion options" title="Motion options" className="list-none cursor-pointer px-3 py-2 text-slate-500 hover:text-sky-600 text-xl leading-none">⋯</summary>
   <div className="absolute right-0 top-full z-20 border border-slate-200 bg-white shadow-sm p-1 min-w-36"><button className="w-full text-left px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 whitespace-nowrap" onClick={()=>{if(menu.current)menu.current.open=false;setOpen(true);}}>Edit motion</button><button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap" onClick={()=>{if(menu.current)menu.current.open=false;setDeleting(true);}}>Delete motion</button></div>
  </details>
  {deleting&&<DeleteMotionDialog motion={motion} onClose={()=>setDeleting(false)}/>}
  {open&&<EditMotionDialog motion={motion} onClose={()=>setOpen(false)}/>}
 </>;
}

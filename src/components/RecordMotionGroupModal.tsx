import React, { useRef, useState } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { Button } from './Button';
import { Input } from './Input';
import { SearchInput } from './SearchInput';
import { useMeetingStore } from '../store/useMeetingStore';
import { formatDuration } from '../utils/duration';
import { buildMotionEntry, hasDuration, hasSpeakers, type MotionEntry, type MotionForm } from '../utils/motionEntry';
import type { MotionType } from '../types';

type EditableEntry=MotionEntry & {id?:string};
interface RecordMotionGroupModalProps {
 initialMotions?:EditableEntry[];
 isOpen:boolean; onClose:()=>void; onSubmit:(motions:EditableEntry[])=>Promise<boolean>; presentDelegates:string[];
}
const labels:Record<MotionType,string>={moderated_caucus:'Moderated Caucus',unmoderated_caucus:'Unmoderated Caucus',speaker_list:'Speaker List',extend_moderated:'Extend Moderated Caucus',extend_unmoderated:'Extend Unmoderated Caucus',paper_presentation:'Paper Presentation',close_debate:'Close Debate',resume_debate:'Resume Debate',adjourn_meeting:'Adjourn Meeting'};
const emptyForm=():MotionForm=>({type:'moderated_caucus',proposer:'',minutes:'10',seconds:'60',topic:''});

export const RecordMotionGroupModal:React.FC<RecordMotionGroupModalProps>=({isOpen,onClose,onSubmit,presentDelegates,initialMotions})=>{
 const existingGroups=useMeetingStore(state=>state.motionGroups);
 const changeType=(type:MotionType)=>{
  const originalType=type==='extend_moderated'?'moderated_caucus':type==='extend_unmoderated'?'unmoderated_caucus':null;
  const previous=originalType?[...existingGroups].reverse().flatMap(g=>[...g.motions].reverse()).find(m=>m.status==='passed'&&(m.type===originalType||m.type===type)):undefined;
  setShortcut('');
  change({type,...(originalType?{minutes:'',topic:previous?.parameters.topic??'',seconds:String(previous?.parameters.speakingTime??60)}:{})});
 };
 const [motions,setMotions]=useState<EditableEntry[]>(()=>initialMotions?.map(m=>({...m,parameters:{...m.parameters}}))??[]);
 const [editingIndex,setEditingIndex]=useState<number|null>(null);
 const [listChanged,setListChanged]=useState(false);
 const [form,setForm]=useState(emptyForm);
 const [dirty,setDirty]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [shortcut,setShortcut]=useState('');
 const submitting=useRef(false);
 const result=buildMotionEntry(form);
 // Preview timing independently of the required topic.
 const timing=buildMotionEntry({...form,topic:form.topic||'Preview'});
 const change=(patch:Partial<MotionForm>)=>{setForm(f=>({...f,...patch}));setDirty(true);setError(null);};
 const reset=()=>{setMotions([]);setForm(emptyForm());setDirty(false);setError(null);setShortcut('');};
 const close=()=>{
  if(submitting.current)return;
  if((dirty||listChanged)&&!window.confirm('Discard these unrecorded motions?'))return;
  reset();onClose();
 };
 const collect=():EditableEntry[]|null=>{
  const include=editingIndex!==null||dirty||motions.length===0;
  if(include&&!result.motion){setError(result.error??'Check the motion details.');return null;}
  const next=editingIndex!==null?motions.map((m,i)=>i===editingIndex?{...m,...result.motion!}:m):include?[...motions,result.motion!]:motions;
  if(next.length>4){setError('A group can contain up to four motions.');return null;}
  return next;
 };
 const addAnother=()=>{
  const next=collect();if(!next)return;
  setMotions(next);setForm(emptyForm());setEditingIndex(null);setDirty(false);setListChanged(true);setShortcut('');setError(null);
 };
 const edit=(index:number)=>{
  const next=collect();if(!next)return;
  const m=next[index];setMotions(next);setEditingIndex(index);if(dirty)setListChanged(true);
  setForm({type:m.type,proposer:m.proposer??'',topic:m.parameters.topic??'',minutes:String((m.parameters.totalTime??((m.parameters.totalSpeakers??0)*(m.parameters.speakingTime??0)))/60),seconds:String(m.parameters.speakingTime??60)});
  setDirty(false);setShortcut('');setError(null);
 };
 const remove=(index:number)=>{
  setMotions(motions.filter((_,i)=>i!==index));setListChanged(true);
  if(editingIndex===index){setEditingIndex(null);setForm(emptyForm());setDirty(false);setShortcut('');}
  else if(editingIndex!==null&&editingIndex>index)setEditingIndex(editingIndex-1);
 };
 const save=async()=>{
  if(submitting.current)return;
  const next=collect();if(!next)return;
  submitting.current=true;setBusy(true);setError(null);
  try{
   if(await onSubmit(next)){reset();onClose();}
   else {const s=useMeetingStore.getState();setError(s.motionProcessingError||s.collaborationError||'Could not save. Your entries are still here; please try again.');}
  }catch{setError('Could not save. Your entries are still here; please try again.');}
  finally{submitting.current=false;setBusy(false);}
 };
 const dialogRef=useDialogFocus(isOpen,close);
 if(!isOpen)return null;
 return <div className="motion-overlay">
  <div ref={dialogRef} tabIndex={-1} className="motion-sheet" role="dialog" aria-modal="true" aria-labelledby="record-motion-title">
   <header className="motion-sheet-heading">
    <div><p className="desk-eyebrow">ON THE FLOOR</p><h2 id="record-motion-title" className="desk-title">{initialMotions?'Edit motion group':'Record a motion'}</h2></div>
    <button className="desk-text-button" onClick={close} disabled={busy} aria-label="Close motion form">Close</button>
   </header>
   <div className="motion-sheet-body">
    {motions.length>0&&<div className="motion-recorded" aria-live="polite">
     <p className="desk-eyebrow">THIS GROUP · {motions.length} {motions.length===1?'MOTION':'MOTIONS'}</p>
     {motions.map((m,i)=><div key={i} className="motion-recorded-row"><span className="desk-number">{String(i+1).padStart(2,'0')}</span><div><strong>{labels[m.type]}</strong><p>{m.parameters.topic|| (m.parameters.totalTime?formatDuration(m.parameters.totalTime):m.parameters.totalSpeakers?`${m.parameters.totalSpeakers} speakers · ${m.parameters.speakingTime}s each`:m.proposer||'Procedural motion')}</p></div><button className="desk-text-button" aria-label={`Edit motion ${i+1}`} disabled={busy} onClick={()=>edit(i)}>Edit</button><button className="desk-text-button" aria-label={`Remove motion ${i+1}`} disabled={busy} onClick={()=>remove(i)}>Remove</button></div>)}
    </div>}
    <fieldset disabled={busy} className="motion-fields">
     {motions.length>0&&<p className="text-sm text-gray-600">{editingIndex!==null?`Editing motion ${editingIndex+1}`:'Add another below, or select Finish group to save.'}</p>}
     <div><label htmlFor="motion-type" className="desk-label">Motion</label><select data-initial-focus id="motion-type" value={form.type} onChange={e=>changeType(e.target.value as MotionType)} className="desk-control">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
     {(form.type==='moderated_caucus'||form.type==='extend_moderated'||form.type==='paper_presentation')&&<Input label={form.type==='paper_presentation'?'Paper name / number':'Topic'} id="motion-topic" value={form.topic} onChange={e=>change({topic:e.target.value})} placeholder={form.type==='paper_presentation'?'e.g. Working Paper 1.1':'What will delegates discuss?'} />}
     {hasDuration(form.type)&&<div>
      <div className={hasSpeakers(form.type)?'motion-time-grid':''}>
       <Input label={form.type.startsWith('extend_')?"Additional time · minutes":form.type==='paper_presentation'?"Presentation · minutes":"Total time · minutes"} id="motion-minutes" type="number" min="0.0166666667" step="any" value={form.minutes} onChange={e=>{setShortcut('');change({minutes:e.target.value});}}/>
       {hasSpeakers(form.type)&&<Input label="Per speaker · seconds" id="motion-seconds" type="number" min="1" step="1" value={form.seconds} onChange={e=>{setShortcut('');change({seconds:e.target.value});}}/>}
      </div>
      {hasSpeakers(form.type)&&<>
       <p className="motion-timing-summary" aria-live="polite">{timing.motion?`${timing.motion.parameters.totalSpeakers} speakers · ${formatDuration(timing.effectiveSeconds)} speaking time${timing.remainderSeconds?` (${timing.remainderSeconds}s left outside full turns)`:''}`:timing.error}</p>
       <details className="motion-shortcut"><summary>Use quick entry (10/60)</summary><Input label="Minutes / seconds per speaker" value={shortcut} placeholder="10/60" onChange={e=>{const value=e.target.value;setShortcut(value);const parts=value.split('/');change({minutes:parts.length===2?parts[0].trim():'',seconds:parts.length===2?parts[1].trim():''});}}/></details>
      </>}
     </div>}
     <div><SearchInput label="Proposed by · optional" placeholder="Delegate name" suggestions={presentDelegates} value={form.proposer} onChange={value=>change({proposer:value})} onSelect={value=>change({proposer:value})}/></div>
    </fieldset>
   </div>
   <footer className="motion-sheet-footer">
    {error&&<p role="alert" className="motion-error">{error}</p>}
    <div className="motion-footer-actions">
     <Button onClick={addAnother} disabled={busy||(editingIndex===null&&motions.length>=4)}>{editingIndex!==null?'Update & continue':'Add & continue'}</Button>
     <div className="motion-finish-action">
     <Button variant="secondary" className="motion-finish-button" onClick={()=>void save()} aria-describedby="motion-finish-hint" disabled={busy}>{busy?'Saving…':'Finish group'}</Button>
      <p id="motion-finish-hint">Save all motions. Next: voting.</p>
     </div>
    </div>
    <p className="text-xs text-gray-500 mt-2">Up to 4 motions. You can edit this group until voting starts.</p>
   </footer>
  </div>
 </div>;
};

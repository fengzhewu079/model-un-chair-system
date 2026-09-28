import React, { useEffect, useState } from 'react';
import { useMeetingStore } from '../store/useMeetingStore';
import { CollaborationSettingsSection } from './settings/CollaborationSettingsSection';
import { playBeep } from '../utils/audio';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface SettingsModalProps { isOpen: boolean; onClose: () => void; }

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const fontSize = useMeetingStore((state) => state.fontSize);
  const setFontSize = useMeetingStore((state) => state.setFontSize);
  const volume = useMeetingStore((state) => state.volume);
  const setVolume = useMeetingStore((state) => state.setVolume);
  const isMuted = useMeetingStore((state) => state.isMuted);
  const toggleMute = useMeetingStore((state) => state.toggleMute);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const setSoundAlerts = useMeetingStore((state) => state.setSoundAlerts);
  const resetMeeting = useMeetingStore((state) => state.resetMeeting);
  const isDemoMode = useMeetingStore((state) => state.isDemoMode);

  const [customTime, setCustomTime] = useState('');
  const [section, setSection] = useState<'preferences' | 'room'>('preferences');
  const [customError, setCustomError] = useState('');
  const dialogRef = useDialogFocus(isOpen, onClose);
  useEffect(() => {
    if (isOpen) { setSection('preferences'); setCustomError(''); }
  }, [isOpen]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleTestSound = () => {
    if (!isMuted) {
      playBeep(volume, 1200, 0.2);
    }
  };

  const toggleSoundAlert = (seconds: number) => {
    if (soundAlerts.includes(seconds)) {
      setSoundAlerts(soundAlerts.filter(s => s !== seconds));
    } else {
      setSoundAlerts([...soundAlerts, seconds].sort((a, b) => b - a));
    }
  };

  const addCustomTime = () => {
    const seconds = Number(customTime);
    if (!customTime.trim() || !Number.isSafeInteger(seconds) || seconds < 0) {
      setCustomError('Enter a whole number of seconds, 0 or greater.');
      return;
    }
    if (soundAlerts.includes(seconds)) {
      setCustomError(`${seconds} seconds is already selected.`);
      return;
    }
    setSoundAlerts([...soundAlerts, seconds].sort((a, b) => b - a));
    setCustomTime('');
    setCustomError('');
  };

  const removeCustomAlert = (seconds: number) => {
    setSoundAlerts(soundAlerts.filter(s => s !== seconds));
  };

  const presetOptions = [30, 15, 10, 0];
  const customAlerts = soundAlerts.filter(s => !presetOptions.includes(s));

  const handleResetMeeting = () => {
    const message = isDemoMode
      ? 'Reset this demo session to its original sample data?'
      : 'Leave this meeting and clear meeting data on this device? Export any records you need first.';
    if (window.confirm(message)) {
      resetMeeting();
      onClose();
    }
  };


  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1} className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-md bg-white shadow-xl">
        <header className="flex items-center justify-between px-6 py-4">
          <h2 id="settings-title" className="text-xl font-semibold text-slate-900">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="flex h-10 w-10 items-center justify-center rounded text-2xl text-slate-500 hover:bg-slate-100">×</button>
        </header>
        <nav aria-label="Settings sections" className="flex gap-5 border-b border-slate-200 px-6">
          {(['preferences', 'room'] as const).map(item => (
            <button key={item} onClick={() => setSection(item)} aria-pressed={section === item} className={`border-b-2 pb-3 text-sm font-semibold capitalize ${section === item ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{item}</button>
          ))}
        </nav>
        <div className="overflow-y-auto px-6 py-5">
          {section === 'preferences' && <section aria-label="Preferences" className="space-y-6">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-slate-800">Text size</legend>
              <div className="flex gap-2">{(['small', 'medium', 'large'] as const).map(size => <button key={size} aria-pressed={fontSize === size} onClick={() => setFontSize(size)} className={`flex-1 rounded border py-2 text-sm capitalize ${fontSize === size ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300 text-slate-700'}`}>{size}</button>)}</div>
            </fieldset>
            <div>
              <div className="mb-3 flex justify-between text-sm"><label htmlFor="settings-volume" className="font-semibold text-slate-800">Alert volume</label><span>{Math.round(volume * 100)}%</span></div>
              <input id="settings-volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} className="w-full accent-blue-700" />
              <div className="mt-2 flex items-center justify-between"><button onClick={handleTestSound} disabled={isMuted} className="rounded border border-slate-300 px-3 py-2 text-sm text-blue-800 disabled:opacity-50">Test sound</button><button onClick={toggleMute} aria-pressed={isMuted} className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">{isMuted ? 'Unmute sound' : 'Mute sound'}</button></div>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-semibold text-slate-800">Sound reminders</legend>
              <p className="mb-3 text-sm text-slate-500">Play when this much speaking time remains.</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">{presetOptions.map(seconds => <label key={seconds} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={soundAlerts.includes(seconds)} onChange={() => toggleSoundAlert(seconds)} className="h-4 w-4 accent-blue-700" />{seconds === 0 ? 'Time up' : `${seconds} seconds`}</label>)}</div>
              <details className="mt-4 border-t border-slate-200 pt-3">
                <summary className="cursor-pointer text-sm text-blue-800">Custom reminders{customAlerts.length > 0 ? ` (${customAlerts.length})` : ''}</summary>
                <label htmlFor="custom-alert" className="mt-3 block text-sm text-slate-600">Seconds remaining</label>
                <div className="mt-2 flex gap-2"><input id="custom-alert" type="number" min="0" step="1" value={customTime} onChange={e => setCustomTime(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTime(); } }} aria-describedby={customError ? 'custom-alert-error' : undefined} className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm" /><button onClick={addCustomTime} className="rounded bg-blue-700 px-4 py-2 text-sm text-white">Add</button></div>
                {customError && <p id="custom-alert-error" role="alert" className="mt-2 text-sm text-red-700">{customError}</p>}
                <div className="mt-3 flex flex-wrap gap-2">{customAlerts.map(seconds => <button key={seconds} onClick={() => removeCustomAlert(seconds)} aria-label={`Remove ${seconds} second reminder`} className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-700">{seconds}s <span aria-hidden="true">×</span></button>)}</div>
              </details>
            </fieldset>
            <p className="text-xs text-slate-500">Changes apply immediately on this device.</p>
          </section>}
          {section === 'room' && <section aria-label="Room" className="space-y-6">
            <CollaborationSettingsSection isOpen={isOpen} />
            <div className="border-t border-slate-200 pt-5"><h3 className="font-semibold text-slate-900">{isDemoMode ? 'Start the demo again' : 'Leave this meeting'}</h3><p className="mt-1 text-sm text-slate-600">{isDemoMode ? 'Restore the original sample countries and clear demo activity.' : 'Clear this device’s meeting data and return to setup.'}</p><button onClick={handleResetMeeting} className="mt-4 rounded border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">{isDemoMode ? 'Reset demo session' : 'Exit and reset meeting'}</button></div>
          </section>}
        </div>
      </div>
    </div>
  );
};

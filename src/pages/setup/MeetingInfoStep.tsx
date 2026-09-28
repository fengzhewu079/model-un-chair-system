import React, { useEffect, useMemo, useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import type { EntryMode } from '../../utils/appNavigation';

interface MeetingInfoStepProps {
  initialMode?: EntryMode | null;
}

export const MeetingInfoStep: React.FC<MeetingInfoStepProps> = ({ initialMode }) => {
  const hostMeetingId = useMeetingStore((state) => state.id);
  const publicMeetingId = useMeetingStore((state) => state.publicMeetingId);
  const meetingName = useMeetingStore((state) => state.name);
  const chairName = useMeetingStore((state) => state.chairName);
  const committeeName = useMeetingStore((state) => state.committeeName);
  const rollCallCompleted = useMeetingStore((state) => state.rollCall.completed);
  const role = useMeetingStore((state) => state.role);
  const memberToken = useMeetingStore((state) => state.memberToken);
  const hasCollaborationRoom = useMeetingStore((state) => state.hasCollaborationRoom);
  const collaborationStatus = useMeetingStore((state) => state.collaborationStatus);
  const displayName = useMeetingStore((state) => state.displayName);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const collaborationError = useMeetingStore((state) => state.collaborationError);

  const setMeetingName = useMeetingStore((state) => state.setMeetingName);
  const setChairName = useMeetingStore((state) => state.setChairName);
  const setCommitteeName = useMeetingStore((state) => state.setCommitteeName);
  const setSoundAlerts = useMeetingStore((state) => state.setSoundAlerts);
  const setCurrentStep = useMeetingStore((state) => state.setCurrentStep);
  const createCollaborationRoom = useMeetingStore((state) => state.createCollaborationRoom);
  const joinCollaborationRoom = useMeetingStore((state) => state.joinCollaborationRoom);

  const hasRecoverableIdentity = Boolean(
    !hasCollaborationRoom && publicMeetingId && displayName && memberToken
  );

  const [mode, setMode] = useState<EntryMode>(() =>
    initialMode ?? (hasRecoverableIdentity ? 'chair' : 'host')
  );
  const [hostPin, setHostPin] = useState('');
  const [joinMeetingId, setJoinMeetingId] = useState(() => publicMeetingId ?? '');
  const [joinPin, setJoinPin] = useState('');
  const [joinName, setJoinName] = useState(() => displayName ?? '');
  const [customTime, setCustomTime] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isBusy = useMemo(
    () =>
      collaborationStatus === 'creating' ||
      collaborationStatus === 'joining' ||
      collaborationStatus === 'restoring',
    [collaborationStatus]
  );

  const presetOptions = [30, 15, 10, 0];
  const customAlerts = soundAlerts.filter((seconds) => !presetOptions.includes(seconds));

  const toggleSoundAlert = (seconds: number) => {
    if (soundAlerts.includes(seconds)) {
      setSoundAlerts(soundAlerts.filter((value) => value !== seconds));
      return;
    }

    setSoundAlerts([...soundAlerts, seconds].sort((a, b) => b - a));
  };

  const addCustomTime = () => {
    const seconds = Number.parseInt(customTime, 10);
    if (Number.isNaN(seconds) || seconds < 0) {
      window.alert('Please enter a valid number of seconds (0 or greater).');
      return;
    }

    if (soundAlerts.includes(seconds)) {
      window.alert(`${seconds} seconds is already in the alert list.`);
      return;
    }

    setSoundAlerts([...soundAlerts, seconds].sort((a, b) => b - a));
    setCustomTime('');
  };

  const removeCustomAlert = (seconds: number) => {
    setSoundAlerts(soundAlerts.filter((value) => value !== seconds));
  };

  const handleCopyMeetingId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.alert('Unable to copy the Meeting ID automatically.');
    }
  };

  const connectedMeetingId = publicMeetingId ?? hostMeetingId;

  useEffect(() => {
    if (!hasRecoverableIdentity) {
      return;
    }

    if (!initialMode) setMode('chair');
    setJoinMeetingId((previous) => previous || publicMeetingId || '');
    setJoinName((previous) => previous || displayName || '');
  }, [displayName, hasRecoverableIdentity, publicMeetingId, initialMode]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [hasRecoverableIdentity, initialMode]);

  const handleCreateRoom = async () => {
    const nextErrors: Record<string, string> = {};

    if (!meetingName.trim()) nextErrors.meetingName = 'Meeting Name is required';
    if (!committeeName.trim()) nextErrors.committeeName = 'Committee Name is required';
    if (!chairName.trim()) nextErrors.chairName = 'Chair Name is required';
    if (!hostPin.trim()) nextErrors.hostPin = 'PIN is required';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const created = await createCollaborationRoom({ accessCode: hostPin });
    if (created) {
      setHostPin('');
    }
  };

  const handleJoinRoom = async () => {
    const nextErrors: Record<string, string> = {};

    if (!joinMeetingId.trim()) nextErrors.joinMeetingId = 'Meeting ID is required';
    if (!joinPin.trim()) nextErrors.joinPin = 'PIN is required';
    if (!joinName.trim()) nextErrors.joinName = 'Your name is required';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const joined = await joinCollaborationRoom({
      publicMeetingId: joinMeetingId,
      accessCode: joinPin,
      displayName: joinName,
    });

    if (joined) {
      setJoinPin('');
    }
  };

  const renderSoundAlertSettings = () => (
    <details className="border-t border-slate-200 py-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">Timer sounds · {soundAlerts.length ? `${soundAlerts.length} alerts enabled` : 'Off'}</summary>
      <p className="mt-3 text-sm text-slate-500">Applies to this browser. You can change this during the meeting.</p>
      <div className="my-4 flex flex-wrap gap-5">
        {[{ value: 30, label: '30 seconds' }, { value: 15, label: '15 seconds' }, { value: 10, label: '10 seconds' }, { value: 0, label: 'Time up' }].map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={soundAlerts.includes(option.value)} onChange={() => toggleSoundAlert(option.value)} className="h-4 w-4 accent-blue-800" />{option.label}
          </label>
        ))}
      </div>
      <label htmlFor="custom-alert" className="mb-2 block text-sm text-slate-700">Custom alert, seconds remaining</label>
      <div className="flex gap-2">
        <input id="custom-alert" type="number" min="0" value={customTime} onChange={(event) => setCustomTime(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomTime(); } }} placeholder="e.g. 20" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        <Button variant="secondary" onClick={addCustomTime}>Add</Button>
      </div>
      {customAlerts.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{customAlerts.map((seconds) => <button key={seconds} type="button" onClick={() => removeCustomAlert(seconds)} aria-label={`Remove ${seconds} second alert`} className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-600">{seconds}s ×</button>)}</div>}
    </details>
  );

  const roomIdentity = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3 text-sm">
      <div><span className="text-slate-500">Meeting ID </span><span className="font-mono">{connectedMeetingId}</span><span className="ml-3 text-slate-500">{collaborationStatus}</span></div>
      <button type="button" onClick={() => handleCopyMeetingId(connectedMeetingId)} className="font-medium text-primary hover:underline">Copy ID</button>
    </div>
  );

  const meetingFields = (
    <>
      <Input label="Meeting Name *" value={meetingName} onChange={(event) => setMeetingName(event.target.value)} error={errors.meetingName} placeholder="e.g., Spring Conference" />
      <Input label="Committee Name *" value={committeeName} onChange={(event) => setCommitteeName(event.target.value)} error={errors.committeeName} placeholder="e.g., Security Council" />
      <Input label="Chair Name *" value={chairName} onChange={(event) => setChairName(event.target.value)} error={errors.chairName} placeholder="Your name" />
    </>
  );

  if (hasCollaborationRoom) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="desk-title text-3xl">{role === 'chair' ? committeeName || 'Your committee' : 'Meeting details'}</h1>
          <p className="mt-2 text-sm text-slate-600">{role === 'chair' ? `Joined as ${displayName ?? chairName}. The host manages setup.` : 'Next, add your delegates and take roll call.'}</p>
        </div>
        {roomIdentity}
        {role === 'chair' ? (
          !rollCallCompleted && <p role="status" className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Waiting for the host to finish setup. This page will update automatically.</p>
        ) : meetingFields}
        {collaborationError && <p role="alert" className="text-sm text-red-700">{collaborationError}</p>}
        {role !== 'chair' && <div className="flex justify-end"><Button onClick={() => setCurrentStep('delegates')}>Continue to delegates →</Button></div>}
        {renderSoundAlertSettings()}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="desk-title text-3xl">{mode === 'host' ? 'Create your committee room' : 'Join your committee'}</h1>
        <p className="mt-2 text-sm text-slate-600">{mode === 'host' ? 'Start with the essentials. Add delegates next.' : 'Enter the Meeting ID and PIN from your host.'}</p>
      </div>
      <div className="flex gap-5 border-b border-slate-200" aria-label="Create or join a room">
        {([{ value: 'host', label: 'Create Room' }, { value: 'chair', label: 'Join Room' }] as const).map((entry) => <button key={entry.value} type="button" aria-pressed={mode === entry.value} onClick={() => { setMode(entry.value); setErrors({}); }} className={`border-b-2 pb-3 text-sm font-semibold ${mode === entry.value ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{entry.label}</button>)}
      </div>
      {hasRecoverableIdentity && mode === 'chair' && <p className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Welcome back, {displayName}. Re-enter the PIN to return to <span className="font-mono">{publicMeetingId}</span>.</p>}
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!isBusy) void (mode === 'host' ? handleCreateRoom() : handleJoinRoom()); }}>
        {mode === 'host' ? (
          <>
            {meetingFields}
            <Input label="Room PIN *" type="password" value={hostPin} onChange={(event) => setHostPin(event.target.value)} error={errors.hostPin} placeholder="Choose a PIN to share with your dais" />
          </>
        ) : (
          <>
            <Input label="Meeting ID *" value={joinMeetingId} onChange={(event) => setJoinMeetingId(event.target.value)} error={errors.joinMeetingId} placeholder="Paste the Meeting ID" />
            <Input label="PIN *" type="password" value={joinPin} onChange={(event) => setJoinPin(event.target.value)} error={errors.joinPin} placeholder="Enter the room PIN" />
            <Input label="Your Name *" value={joinName} onChange={(event) => setJoinName(event.target.value)} error={errors.joinName} placeholder="Your name" />
          </>
        )}
        {collaborationError && <p role="alert" className="text-sm text-red-700">{collaborationError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {mode === 'host' ? <span className="text-xs text-slate-500">Meeting ID: <button type="button" onClick={() => handleCopyMeetingId(hostMeetingId)} title="Copy Meeting ID" className="font-mono underline underline-offset-2">{hostMeetingId}</button></span> : <span />}
          <Button type="submit" disabled={isBusy}>{isBusy ? (mode === 'host' ? 'Creating…' : 'Joining…') : (mode === 'host' ? 'Create and Continue →' : 'Join Meeting →')}</Button>
        </div>
      </form>
      {mode === 'chair' && <details className="border-t border-slate-200 pt-4 text-sm text-slate-600"><summary className="cursor-pointer font-medium">Returning to a previous seat?</summary><p className="mt-3 leading-6">Use the original browser with its saved identity to restore your seat. On another device, join with a different chair name. The PIN alone cannot restore a Host seat.</p></details>}
      {renderSoundAlertSettings()}
    </div>
  );
};

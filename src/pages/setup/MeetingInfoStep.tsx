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
    hasRecoverableIdentity ? 'chair' : initialMode ?? 'host'
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

    setMode('chair');
    setJoinMeetingId((previous) => previous || publicMeetingId || '');
    setJoinName((previous) => previous || displayName || '');
  }, [displayName, hasRecoverableIdentity, publicMeetingId]);

  useEffect(() => {
    if (!hasRecoverableIdentity && initialMode) {
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
    <div className="rounded-lg border border-gray-200 p-5">
      <label className="block text-base font-semibold text-gray-700 mb-3">
        Sound Alerts (Local Preference)
      </label>
      <p className="text-sm text-gray-600 mb-4">
        These timer warnings stay on this browser only and are not shared with the room.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { value: 30, label: '30 seconds' },
          { value: 15, label: '15 seconds' },
          { value: 10, label: '10 seconds' },
          { value: 0, label: 'Time up' },
        ].map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-3 cursor-pointer hover:border-primary transition-colors"
          >
            <input
              type="checkbox"
              checked={soundAlerts.includes(option.value)}
              onChange={() => toggleSoundAlert(option.value)}
              className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
            />
            <span className="text-base text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Add Custom Alert Time
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={customTime}
            onChange={(event) => setCustomTime(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addCustomTime();
              }
            }}
            placeholder="Enter seconds (e.g. 20)"
            className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomTime}
            className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {customAlerts.length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Custom Alerts
          </label>
          <div className="flex flex-wrap gap-2">
            {customAlerts.map((seconds) => (
              <div
                key={seconds}
                className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-blue-700"
              >
                <span className="text-sm font-medium">{seconds}s</span>
                <button
                  type="button"
                  onClick={() => removeCustomAlert(seconds)}
                  className="text-blue-700 hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (hasCollaborationRoom) {
    if (role === 'chair') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900">Chair Preferences</h3>
            <p className="text-base text-gray-700">
              Meeting setup is controlled by the host. You can adjust local sound alerts for this
              browser.
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-900">Connected collaboration room</p>
                <p className="text-xs text-blue-700">
                  You are signed in as <span className="font-semibold">{displayName ?? chairName}</span>
                  {' '}(chair).
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {collaborationStatus}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Meeting ID
                </p>
                <p className="mt-1 font-mono text-sm text-gray-900">{connectedMeetingId}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-white px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Committee
                </p>
                <p className="mt-1 text-sm text-gray-900">{committeeName || 'Set by host'}</p>
              </div>
            </div>

            <Button variant="secondary" onClick={() => handleCopyMeetingId(connectedMeetingId)}>
              Copy Meeting ID
            </Button>
          </div>

          {renderSoundAlertSettings()}

          {!rollCallCompleted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Waiting for the host to finish delegates and roll call. This page will update
              automatically when the meeting is ready.
            </div>
          )}

          {collaborationError && (
            <p className="text-sm text-red-600">
              {collaborationError}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900">Meeting Information</h3>
          <p className="text-base text-gray-700">
            These fields are part of the formal shared meeting state and sync through the collaboration room.
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-900">Connected collaboration room</p>
              <p className="text-xs text-blue-700">
                You are signed in as <span className="font-semibold">{displayName ?? chairName}</span>
                {' '}({role ?? 'chair'}).
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {collaborationStatus}
            </span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={connectedMeetingId}
              readOnly
              className="flex-1 h-12 px-3 text-sm font-mono border border-blue-200 rounded-lg bg-white"
            />
            <Button variant="secondary" onClick={() => handleCopyMeetingId(connectedMeetingId)}>
              Copy ID
            </Button>
          </div>
        </div>

        <Input
          label="Meeting Name *"
          value={meetingName}
          onChange={(event) => setMeetingName(event.target.value)}
          placeholder="e.g., Spring Conference 2024"
        />

        <Input
          label="Committee Name *"
          value={committeeName}
          onChange={(event) => setCommitteeName(event.target.value)}
          placeholder="e.g., United Nations Security Council"
        />

        <Input
          label="Chair Name *"
          value={chairName}
          onChange={(event) => setChairName(event.target.value)}
          placeholder="e.g., John Smith"
        />

        {renderSoundAlertSettings()}

        {collaborationError && (
          <p className="text-sm text-red-600">
            {collaborationError}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={() => setCurrentStep('delegates')}>Next →</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-gray-900">Collaboration Room Entry</h3>
        <p className="text-base text-gray-700">
          Host creates the room once with a Meeting ID and PIN. Every joining chair must use
          the Meeting ID, the PIN, and their name.
        </p>
      </div>

      {hasRecoverableIdentity && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          We found your previous collaboration identity for{' '}
          <span className="font-mono font-semibold">{publicMeetingId}</span>. Re-enter the PIN and
          join with <span className="font-semibold">{displayName}</span> to recover that seat.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('host')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            mode === 'host'
              ? 'border-primary bg-blue-50'
              : 'border-gray-200 hover:border-primary/50'
          }`}
        >
          <p className="text-base font-semibold text-gray-900">Host create</p>
          <p className="mt-1 text-sm text-gray-600">
            Create the shared room immediately after entering meeting basics.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode('chair')}
          className={`rounded-lg border p-4 text-left transition-colors ${
            mode === 'chair'
              ? 'border-primary bg-blue-50'
              : 'border-gray-200 hover:border-primary/50'
          }`}
        >
          <p className="text-base font-semibold text-gray-900">Chair join</p>
          <p className="mt-1 text-sm text-gray-600">
            Join an existing room with Meeting ID, PIN, and your own name. This also
            restores a previously saved seat when the name matches.
          </p>
        </button>
      </div>

      {mode === 'host' ? (
        <div className="space-y-5 rounded-lg border border-gray-200 p-5">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-900">Meeting ID</p>
                <p className="text-xs text-blue-700">
                  This stays aligned with the current front-end meeting ID and is what chairs use to join.
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                host
              </span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={hostMeetingId}
                readOnly
                className="flex-1 h-12 px-3 text-sm font-mono border border-blue-200 rounded-lg bg-white"
              />
              <Button variant="secondary" onClick={() => handleCopyMeetingId(hostMeetingId)}>
                Copy ID
              </Button>
            </div>
          </div>

          <Input
            label="Meeting Name *"
            value={meetingName}
            onChange={(event) => setMeetingName(event.target.value)}
            error={errors.meetingName}
            placeholder="e.g., Spring Conference 2024"
          />

          <Input
            label="Committee Name *"
            value={committeeName}
            onChange={(event) => setCommitteeName(event.target.value)}
            error={errors.committeeName}
            placeholder="e.g., United Nations Security Council"
          />

          <Input
            label="Chair Name *"
            value={chairName}
            onChange={(event) => setChairName(event.target.value)}
            error={errors.chairName}
            placeholder="e.g., Alex Chen"
          />

          <Input
            label="PIN *"
            type="password"
            value={hostPin}
            onChange={(event) => setHostPin(event.target.value)}
            error={errors.hostPin}
            placeholder="Enter a PIN for chairs to join"
          />

          <div className="flex justify-end">
            <Button onClick={handleCreateRoom} disabled={isBusy}>
              {isBusy ? 'Creating...' : 'Create and Continue'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 rounded-lg border border-gray-200 p-5">
          <Input
            label="Meeting ID *"
            value={joinMeetingId}
            onChange={(event) => setJoinMeetingId(event.target.value)}
            error={errors.joinMeetingId}
            placeholder="Paste the Meeting ID"
          />

          <Input
            label="PIN *"
            type="password"
            value={joinPin}
            onChange={(event) => setJoinPin(event.target.value)}
            error={errors.joinPin}
            placeholder="Enter the host PIN"
          />

          <Input
            label="Your Name *"
            value={joinName}
            onChange={(event) => setJoinName(event.target.value)}
            error={errors.joinName}
            placeholder="e.g., Jamie Rivera"
          />

          <div className="flex justify-end">
            <Button onClick={handleJoinRoom} disabled={isBusy}>
              {isBusy ? 'Joining...' : 'Join Meeting'}
            </Button>
          </div>
        </div>
      )}

      {renderSoundAlertSettings()}

      {collaborationError && (
        <p className="text-sm text-red-600">{collaborationError}</p>
      )}
    </div>
  );
};

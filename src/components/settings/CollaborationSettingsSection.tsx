import React, { useEffect, useMemo, useState } from 'react';
import {
  getCollaborationRoomAccessCodeRpc,
  toCollaborationRpcError,
} from '../../features/collaboration/api';
import {
  loadStoredHostAccessCode,
  saveStoredHostAccessCode,
} from '../../features/collaboration/storage';
import { useMeetingStore } from '../../store/useMeetingStore';
import {
  formatCollaborationMemberStatus,
  formatCollaborationRole,
  sortCollaborationMembers,
} from '../../utils/collaborationDisplay';

interface CollaborationSettingsSectionProps {
  isOpen: boolean;
}

type PinState =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | { kind: 'revealed'; accessCode: string }
  | { kind: 'error'; message: string };

type CopyState =
  | { kind: 'idle' }
  | { kind: 'copying' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

const getRoleBadgeClassName = (role: 'host' | 'chair') =>
  role === 'host'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';

const getStatusBadgeClassName = (status: 'online' | 'offline') =>
  status === 'online'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : 'bg-gray-100 text-gray-700 border-gray-200';

const getCollaborationStatusMessage = (
  status: string,
  error: string | null
) => {
  if (error) {
    return error;
  }

  if (status === 'creating' || status === 'joining' || status === 'restoring') {
    return 'Collaboration info is still loading for this room.';
  }

  if (status === 'syncing') {
    return 'Shared meeting data is syncing with the room.';
  }

  return null;
};

export const CollaborationSettingsSection: React.FC<CollaborationSettingsSectionProps> = ({
  isOpen,
}) => {
  const hasCollaborationRoom = useMeetingStore((state) => state.hasCollaborationRoom);
  const publicMeetingId = useMeetingStore((state) => state.publicMeetingId);
  const displayName = useMeetingStore((state) => state.displayName);
  const role = useMeetingStore((state) => state.role);
  const onlineCount = useMeetingStore((state) => state.onlineCount);
  const members = useMeetingStore((state) => state.members);
  const memberId = useMeetingStore((state) => state.memberId);
  const sessionId = useMeetingStore((state) => state.sessionId);
  const memberToken = useMeetingStore((state) => state.memberToken);
  const collaborationStatus = useMeetingStore((state) => state.collaborationStatus);
  const collaborationError = useMeetingStore((state) => state.collaborationError);
  const sessionTimeoutSeconds = useMeetingStore((state) => state.sessionTimeoutSeconds);

  const [pinState, setPinState] = useState<PinState>({ kind: 'hidden' });
  const [copyState, setCopyState] = useState<CopyState>({ kind: 'idle' });

  const collaborationInfoAvailable = hasCollaborationRoom && Boolean(publicMeetingId) && Boolean(role);
  const sessionUnavailableMessage =
    'This browser is not connected right now. Reopen the room from this browser to reconnect, or re-enter the PIN if automatic reconnect fails.';
  const reconnectWindowMinutes = Math.max(1, Math.round(sessionTimeoutSeconds / 60));

  const sortedMembers = useMemo(
    () => sortCollaborationMembers(members, memberId),
    [memberId, members]
  );
  const collaborationStatusMessage = getCollaborationStatusMessage(
    collaborationStatus,
    collaborationError
  );
  const collaborationStatusClassName = collaborationError
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-800';
  const locallyStoredHostPin =
    role === 'host' && publicMeetingId ? loadStoredHostAccessCode(publicMeetingId) : null;

  useEffect(() => {
    setPinState({ kind: 'hidden' });
    setCopyState({ kind: 'idle' });
  }, [isOpen, memberId, publicMeetingId, role, sessionId]);

  useEffect(() => {
    if (copyState.kind !== 'success') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState({ kind: 'idle' });
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  const handleRevealPin = async () => {
    if (role !== 'host') {
      return;
    }

    if (publicMeetingId) {
      const locallyStoredPin = loadStoredHostAccessCode(publicMeetingId);
      if (locallyStoredPin) {
        setPinState({ kind: 'revealed', accessCode: locallyStoredPin });
        setCopyState({ kind: 'idle' });
        return;
      }
    }

    if (!publicMeetingId || !memberId || !sessionId || !memberToken) {
      setPinState({ kind: 'error', message: sessionUnavailableMessage });
      setCopyState({ kind: 'idle' });
      return;
    }

    setPinState({ kind: 'loading' });
    setCopyState({ kind: 'idle' });

    try {
      const result = await getCollaborationRoomAccessCodeRpc({
        publicMeetingId,
        memberId,
        sessionId,
        memberToken,
      });

      saveStoredHostAccessCode(publicMeetingId, result.accessCode);
      setPinState({ kind: 'revealed', accessCode: result.accessCode });
    } catch (error) {
      const collaborationRpcError = toCollaborationRpcError(
        error,
        'get_collaboration_room_access_code'
      );
      setPinState({ kind: 'error', message: collaborationRpcError.userMessage });
    }
  };

  const handleHidePin = () => {
    setPinState({ kind: 'hidden' });
    setCopyState({ kind: 'idle' });
  };

  const handleCopyPin = async () => {
    if (pinState.kind !== 'revealed') {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      setCopyState({
        kind: 'error',
        message: 'Unable to copy the PIN automatically on this device.',
      });
      return;
    }

    setCopyState({ kind: 'copying' });

    try {
      await navigator.clipboard.writeText(pinState.accessCode);
      setCopyState({ kind: 'success', message: 'PIN copied.' });
    } catch {
      setCopyState({
        kind: 'error',
        message: 'Unable to copy the PIN automatically.',
      });
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Collaboration</h3>
          <p className="mt-1 text-xs text-gray-500">
            This browser stays connected while open and tries to reconnect automatically when you
            return.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            After about {reconnectWindowMinutes} minutes away, others may see you offline. You only
            need the PIN again if reconnect fails or you use another browser/device.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            collaborationInfoAvailable
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {collaborationInfoAvailable ? `${onlineCount} online` : 'Unavailable'}
        </span>
      </div>

      {!collaborationInfoAvailable ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600">
          <p>This browser is not currently connected to a collaboration room.</p>
          {collaborationStatusMessage && (
            <p
              className={`mt-2 text-xs ${
                collaborationError ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {collaborationStatusMessage}
            </p>
          )}
          {role === 'host' && publicMeetingId && locallyStoredHostPin && (
            <p className="mt-2 text-xs text-emerald-600">
              This device still has the host PIN saved locally, so you can reveal it below.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Meeting ID
              </p>
              <p className="mt-2 inline-flex rounded-md bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800">
                {publicMeetingId}
              </p>
            </div>

            <div className="rounded-lg border border-white bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">You</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {displayName ?? 'Unknown member'}
                </span>
                {role && (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClassName(
                      role
                    )}`}
                  >
                    {formatCollaborationRole(role)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {collaborationStatusMessage && (
            <div
              className={`mt-3 rounded-lg border px-4 py-3 text-sm ${collaborationStatusClassName}`}
            >
              {collaborationStatusMessage}
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-800">Members</h4>
              <span className="text-xs text-gray-500">{members.length} total</span>
            </div>

            {sortedMembers.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600">
                Member information is not available yet.
              </div>
            ) : (
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {sortedMembers.map((member) => {
                  const isCurrentUser = member.memberId === memberId;

                  return (
                    <div
                      key={member.memberId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClassName(
                            member.role
                          )}`}
                        >
                          {formatCollaborationRole(member.role)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(
                            member.status
                          )}`}
                        >
                          {formatCollaborationMemberStatus(member.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {role === 'host' && publicMeetingId && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-800">Meeting PIN</h4>
              <p className="mt-1 text-xs text-gray-500">
                Only the host can reveal or copy the room PIN.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-white bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Access Code
                </p>
                {pinState.kind === 'revealed' ? (
                  <p className="mt-2 font-mono text-lg font-semibold text-gray-900">
                    {pinState.accessCode}
                  </p>
                ) : pinState.kind === 'loading' ? (
                  <p className="mt-2 text-sm text-gray-600">Retrieving PIN...</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      PIN is hidden until you explicitly request it.
                    </p>
                    {locallyStoredHostPin && (
                      <p className="text-xs text-emerald-600">
                        A host PIN is already saved on this device and can be revealed instantly.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {pinState.kind !== 'revealed' && (
                <span className="font-mono text-xl tracking-[0.3em] text-gray-300">••••</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {pinState.kind === 'revealed' ? (
                <>
                  <button
                    type="button"
                    onClick={handleHidePin}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    Hide
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    disabled={copyState.kind === 'copying'}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {copyState.kind === 'copying' ? 'Copying...' : 'Copy PIN'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleRevealPin}
                  disabled={pinState.kind === 'loading'}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {pinState.kind === 'loading' ? 'Loading...' : 'Show PIN'}
                </button>
              )}
            </div>

            {pinState.kind === 'error' && (
              <p className="mt-3 text-sm text-red-600">{pinState.message}</p>
            )}

            {copyState.kind === 'success' && (
              <p className="mt-3 text-sm text-emerald-600">{copyState.message}</p>
            )}
            {copyState.kind === 'error' && (
              <p className="mt-3 text-sm text-red-600">{copyState.message}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

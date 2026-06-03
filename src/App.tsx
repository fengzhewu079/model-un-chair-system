import React, { useEffect, useState } from 'react';
import { useMeetingStore } from './store/useMeetingStore';
import { SetupPage } from './pages/SetupPage';
import { MainSessionPage } from './pages/MainSessionPage';

export const App: React.FC = () => {
  const RESTORE_TIMEOUT_MS = 4000;
  const rollCallCompleted = useMeetingStore((state) => state.rollCall.completed);
  const fontSize = useMeetingStore((state) => state.fontSize);
  const hasCollaborationRoom = useMeetingStore((state) => state.hasCollaborationRoom);
  const heartbeatIntervalSeconds = useMeetingStore((state) => state.heartbeatIntervalSeconds);
  const sessionId = useMeetingStore((state) => state.sessionId);
  const loadFromLocalStorage = useMeetingStore((state) => state.loadFromLocalStorage);
  const saveToLocalStorage = useMeetingStore((state) => state.saveToLocalStorage);
  const restoreCollaborationRoomState = useMeetingStore(
    (state) => state.restoreCollaborationRoomState
  );
  const heartbeatCollaborationMember = useMeetingStore(
    (state) => state.heartbeatCollaborationMember
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      loadFromLocalStorage();
      await Promise.race([
        useMeetingStore.getState().restoreCollaborationRoomState(),
        new Promise<boolean>((resolve) => {
          window.setTimeout(() => {
            const state = useMeetingStore.getState();
            if (state.collaborationStatus === 'restoring') {
              useMeetingStore.setState({
                collaborationStatus: 'error',
                collaborationError:
                  'Collaboration restore timed out. The page opened with local state first; you can reconnect from settings.',
              });
            }
            resolve(false);
          }, RESTORE_TIMEOUT_MS);
        }),
      ]);

      if (!cancelled) {
        setHydrated(true);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadFromLocalStorage, restoreCollaborationRoomState]);

  useEffect(() => {
    if (!hydrated) return;

    saveToLocalStorage();
    const unsubscribe = useMeetingStore.subscribe(() => {
      useMeetingStore.getState().saveToLocalStorage();
    });

    return unsubscribe;
  }, [hydrated, saveToLocalStorage]);

  useEffect(() => {
    if (!hydrated) return;

    let leaveRequested = false;
    const requestPageExitLeave = (disconnectReason: string) => {
      if (leaveRequested) return;

      const state = useMeetingStore.getState();
      if (!state.hasCollaborationRoom || !state.sessionId) {
        return;
      }

      leaveRequested = true;
      void state.leaveCollaborationMember({
        disconnectReason,
        preserveLocalSession: true,
        preferKeepalive: true,
        clearLocalImmediately: true,
      });
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      requestPageExitLeave('page_hide');
    };

    const handleBeforeUnload = () => {
      requestPageExitLeave('page_unload');
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasCollaborationRoom || !sessionId) {
      useMeetingStore.setState({ isHeartbeatRunning: false });
      return;
    }

    useMeetingStore.setState({ isHeartbeatRunning: true });
    void heartbeatCollaborationMember();

    const intervalId = window.setInterval(() => {
      void useMeetingStore.getState().heartbeatCollaborationMember();
    }, Math.max(heartbeatIntervalSeconds, 5) * 1000);

    return () => {
      useMeetingStore.setState({ isHeartbeatRunning: false });
      window.clearInterval(intervalId);
    };
  }, [
    hasCollaborationRoom,
    heartbeatCollaborationMember,
    heartbeatIntervalSeconds,
    hydrated,
    sessionId,
  ]);

  const fontSizeClass =
    fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base';

  if (!hydrated) {
    return (
      <div className={`${fontSizeClass} min-h-screen bg-gray-50 flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Restoring collaboration session...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we reconnect your room.</p>
        </div>
      </div>
    );
  }

  return <div className={fontSizeClass}>{rollCallCompleted ? <MainSessionPage /> : <SetupPage />}</div>;
};

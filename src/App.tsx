import React, { useEffect, useState } from 'react';
import { useMeetingStore } from './store/useMeetingStore';
import { SetupPage } from './pages/SetupPage';
import { MainSessionPage } from './pages/MainSessionPage';
import { HomePage } from './pages/HomePage';
import { DemoCommitteePage } from './pages/DemoCommitteePage';
import {
  getRequestedAppView,
  normalizeWalkthroughUrl,
  resolveAppView,
} from './utils/appNavigation';

export const App: React.FC = () => {
  const RESTORE_TIMEOUT_MS = 4000;
  const rollCallCompleted = useMeetingStore((state) => state.rollCall.completed);
  const fontSize = useMeetingStore((state) => state.fontSize);
  const hasCollaborationRoom = useMeetingStore((state) => state.hasCollaborationRoom);
  const isDemoMode = useMeetingStore((state) => state.isDemoMode);
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
  const startDemoSession = useMeetingStore((state) => state.startDemoSession);
  const stopDemoSession = useMeetingStore((state) => state.stopDemoSession);
  const [hydrated, setHydrated] = useState(false);
  const [requestedViewState, setRequestedViewState] = useState(() =>
    getRequestedAppView(window.location.hash)
  );

  useEffect(() => {
    const syncRequestedView = () => {
      setRequestedViewState(getRequestedAppView(window.location.hash));
    };

    window.addEventListener('hashchange', syncRequestedView);
    window.addEventListener('popstate', syncRequestedView);
    return () => {
      window.removeEventListener('hashchange', syncRequestedView);
      window.removeEventListener('popstate', syncRequestedView);
    };
  }, []);

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
        preserveStoredSession: true,
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

  const navigateTo = (hash: string) => {
    const nextUrl = hash || `${window.location.pathname}${window.location.search}`;
    window.history.pushState(null, '', nextUrl);
    setRequestedViewState(getRequestedAppView(hash));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const appView = resolveAppView({
    requestedView: requestedViewState.view,
    hasCollaborationRoom,
    rollCallCompleted,
    isDemoMode,
  });
  const walkthroughUrl = normalizeWalkthroughUrl(import.meta.env.VITE_WALKTHROUGH_VIDEO_URL);

  let content: React.ReactNode;
  switch (appView) {
    case 'session':
      content = <MainSessionPage />;
      break;
    case 'setup':
      content = (
        <SetupPage
          initialEntryMode={requestedViewState.entryMode}
          onBackToHome={() => navigateTo('')}
        />
      );
      break;
    case 'demo':
      content = (
        <DemoCommitteePage
          onExit={() => {
            stopDemoSession();
            navigateTo('');
          }}
          onCreateRoom={() => {
            stopDemoSession();
            navigateTo('#create');
          }}
        />
      );
      break;
    default:
      content = (
        <HomePage
          onCreateRoom={() => navigateTo('#create')}
          onJoinRoom={() => navigateTo('#join')}
          onStartDemo={() => {
            startDemoSession();
            navigateTo('#demo');
          }}
          walkthroughUrl={walkthroughUrl}
        />
      );
  }

  return <div className={fontSizeClass}>{content}</div>;
};

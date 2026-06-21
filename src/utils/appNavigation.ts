export type EntryMode = 'host' | 'chair';
export type RequestedAppView = 'home' | 'setup' | 'demo';
export type AppView = RequestedAppView | 'session';

export interface RequestedViewState {
  view: RequestedAppView;
  entryMode: EntryMode | null;
}

export const getRequestedAppView = (hash: string): RequestedViewState => {
  switch (hash.toLowerCase()) {
    case '#create':
      return { view: 'setup', entryMode: 'host' };
    case '#join':
      return { view: 'setup', entryMode: 'chair' };
    case '#demo':
      return { view: 'demo', entryMode: null };
    default:
      return { view: 'home', entryMode: null };
  }
};

export const resolveAppView = ({
  requestedView,
  hasCollaborationRoom,
  rollCallCompleted,
  isDemoMode = false,
}: {
  requestedView: RequestedAppView;
  hasCollaborationRoom: boolean;
  rollCallCompleted: boolean;
  isDemoMode?: boolean;
}): AppView => {
  if (hasCollaborationRoom) return rollCallCompleted ? 'session' : 'setup';
  if (isDemoMode) return 'demo';
  if (rollCallCompleted) return 'session';
  return requestedView;
};

export const normalizeWalkthroughUrl = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return null;

  try {
    const url = new URL(trimmedValue);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

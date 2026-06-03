import type { LocalMeetingPreferences } from '../../utils/sharedMeetingState';
import type {
  StoredCollaborationIdentity,
  StoredCollaborationSession,
} from './types';

const LOCAL_STATE_STORAGE_KEY = 'mun-chair-collaboration-local-state';
const LEGACY_SNAPSHOT_STORAGE_KEY = 'mun-chair-session';
const HOST_ACCESS_CODE_STORAGE_KEY = 'mun-chair-host-access-codes';

export interface PersistedCollaborationLocalState {
  clientInstanceId: string;
  preferences: LocalMeetingPreferences;
  collaborationSession: StoredCollaborationSession | null;
  recoverableIdentity: StoredCollaborationIdentity | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasWindow = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const createClientInstanceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
};

const normalizeSession = (value: unknown): StoredCollaborationSession | null => {
  if (!isRecord(value)) return null;

  const publicMeetingId =
    typeof value.publicMeetingId === 'string' ? value.publicMeetingId.trim() : '';
  const memberId = typeof value.memberId === 'string' ? value.memberId : '';
  const sessionId = typeof value.sessionId === 'string' ? value.sessionId : '';
  const memberToken = typeof value.memberToken === 'string' ? value.memberToken : '';
  const role = value.role === 'host' ? 'host' : value.role === 'chair' ? 'chair' : null;
  const displayName = typeof value.displayName === 'string' ? value.displayName : '';
  const clientInstanceId =
    typeof value.clientInstanceId === 'string' ? value.clientInstanceId : '';

  if (
    !publicMeetingId ||
    !memberId ||
    !sessionId ||
    !memberToken ||
    !role ||
    !displayName ||
    !clientInstanceId
  ) {
    return null;
  }

  return {
    roomId: typeof value.roomId === 'string' ? value.roomId : undefined,
    publicMeetingId,
    memberId,
    sessionId,
    memberToken,
    role,
    displayName,
    clientInstanceId,
  };
};

const normalizeIdentity = (value: unknown): StoredCollaborationIdentity | null => {
  if (!isRecord(value)) return null;

  const publicMeetingId =
    typeof value.publicMeetingId === 'string' ? value.publicMeetingId.trim() : '';
  const memberId = typeof value.memberId === 'string' ? value.memberId : '';
  const memberToken = typeof value.memberToken === 'string' ? value.memberToken : '';
  const role = value.role === 'host' ? 'host' : value.role === 'chair' ? 'chair' : null;
  const displayName = typeof value.displayName === 'string' ? value.displayName : '';
  const clientInstanceId =
    typeof value.clientInstanceId === 'string' ? value.clientInstanceId : '';

  if (!publicMeetingId || !memberId || !memberToken || !role || !displayName || !clientInstanceId) {
    return null;
  }

  return {
    publicMeetingId,
    memberId,
    memberToken,
    role,
    displayName,
    clientInstanceId,
  };
};

export const createDefaultLocalPreferences = (): LocalMeetingPreferences => ({
  fontSize: 'medium',
  isMuted: false,
  soundAlerts: [10, 0],
  volume: 0.5,
});

export const loadPersistedCollaborationLocalState = (): PersistedCollaborationLocalState => {
  const fallbackClientInstanceId = createClientInstanceId();

  if (!hasWindow()) {
      return {
        clientInstanceId: fallbackClientInstanceId,
        preferences: createDefaultLocalPreferences(),
        collaborationSession: null,
        recoverableIdentity: null,
      };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_STORAGE_KEY);

    if (!raw) {
      const fallback = {
        clientInstanceId: fallbackClientInstanceId,
        preferences: createDefaultLocalPreferences(),
        collaborationSession: null,
        recoverableIdentity: null,
      };

      savePersistedCollaborationLocalState(fallback);
      return fallback;
    }

    const parsed = JSON.parse(raw) as unknown;
    const source = isRecord(parsed) ? parsed : {};
    const clientInstanceId =
      typeof source.clientInstanceId === 'string' && source.clientInstanceId
        ? source.clientInstanceId
        : fallbackClientInstanceId;

    const preferencesSource = isRecord(source.preferences) ? source.preferences : {};
    const preferences: LocalMeetingPreferences = {
      fontSize:
        preferencesSource.fontSize === 'small' || preferencesSource.fontSize === 'large'
          ? preferencesSource.fontSize
          : 'medium',
      isMuted: Boolean(preferencesSource.isMuted),
      soundAlerts: Array.isArray(preferencesSource.soundAlerts)
        ? preferencesSource.soundAlerts.filter((value): value is number => typeof value === 'number')
        : [10, 0],
      volume:
        typeof preferencesSource.volume === 'number'
          ? Math.max(0, Math.min(1, preferencesSource.volume))
          : 0.5,
    };

    return {
      clientInstanceId,
      preferences,
      collaborationSession: normalizeSession(source.collaborationSession),
      recoverableIdentity:
        normalizeIdentity(source.recoverableIdentity) ??
        normalizeIdentity(source.collaborationSession),
    };
  } catch {
    const fallback = {
      clientInstanceId: fallbackClientInstanceId,
      preferences: createDefaultLocalPreferences(),
      collaborationSession: null,
      recoverableIdentity: null,
    };

    savePersistedCollaborationLocalState(fallback);
    return fallback;
  }
};

export const savePersistedCollaborationLocalState = (
  payload: PersistedCollaborationLocalState
) => {
  if (!hasWindow()) return;

  window.localStorage.setItem(LOCAL_STATE_STORAGE_KEY, JSON.stringify(payload));
};

export const clearLegacyMeetingSnapshotStorage = () => {
  if (!hasWindow()) return;

  window.localStorage.removeItem(LEGACY_SNAPSHOT_STORAGE_KEY);
};

const normalizeHostAccessCodeMap = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>((accumulator, [meetingId, accessCode]) => {
    if (typeof meetingId !== 'string' || typeof accessCode !== 'string') {
      return accumulator;
    }

    const trimmedMeetingId = meetingId.trim();
    const trimmedAccessCode = accessCode.trim();

    if (!trimmedMeetingId || !trimmedAccessCode) {
      return accumulator;
    }

    accumulator[trimmedMeetingId] = trimmedAccessCode;
    return accumulator;
  }, {});
};

const loadHostAccessCodeMap = (): Record<string, string> => {
  if (!hasWindow()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(HOST_ACCESS_CODE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return normalizeHostAccessCodeMap(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
};

const saveHostAccessCodeMap = (payload: Record<string, string>) => {
  if (!hasWindow()) return;

  window.localStorage.setItem(HOST_ACCESS_CODE_STORAGE_KEY, JSON.stringify(payload));
};

export const loadStoredHostAccessCode = (publicMeetingId: string): string | null => {
  const trimmedMeetingId = publicMeetingId.trim();
  if (!trimmedMeetingId) {
    return null;
  }

  const accessCode = loadHostAccessCodeMap()[trimmedMeetingId];
  return accessCode ?? null;
};

export const saveStoredHostAccessCode = (publicMeetingId: string, accessCode: string) => {
  const trimmedMeetingId = publicMeetingId.trim();
  const trimmedAccessCode = accessCode.trim();

  if (!trimmedMeetingId || !trimmedAccessCode) {
    return;
  }

  const nextMap = {
    ...loadHostAccessCodeMap(),
    [trimmedMeetingId]: trimmedAccessCode,
  };

  saveHostAccessCodeMap(nextMap);
};

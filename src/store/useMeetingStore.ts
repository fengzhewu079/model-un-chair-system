import { correctMotion, validateMotionCorrection, type MotionCorrection } from '../utils/editVotedMotion';
import { advancePresentation, paperNames, presentationProgress } from '../utils/paperPresentation';
import { captureLocalMeetingDraft, restoreLocalMeetingDraft } from '../utils/localMeetingDraft';
import { create } from 'zustand';
import { isSupabaseConfigured, supabaseConfigMessage } from '../lib/supabase';
import {
  applyCollaborationStateUpdateRpc,
  updateCollaborationAttendanceRpc,
  CollaborationRpcError,
  createCollaborationRoomRpc,
  finishCollaborationMotionRpc,
  getCollaborationRoomStateRpc,
  heartbeatCollaborationMemberRpc,
  joinCollaborationRoomRpc,
  leaveCollaborationMemberKeepaliveRpc,
  leaveCollaborationMemberRpc,
  setCollaborationMotionProcessingRpc,
  toCollaborationRpcError,
} from '../features/collaboration/api';
import {
  clearLegacyMeetingSnapshotStorage,
  createDefaultLocalPreferences,
  loadPersistedCollaborationLocalState,
  saveStoredHostAccessCode,
  savePersistedCollaborationLocalState,
} from '../features/collaboration/storage';
import type {
  CollaborationActiveMotion,
  CollaborationMember,
  CollaborationRole,
  StoredCollaborationIdentity,
  StoredCollaborationSession,
} from '../features/collaboration/types';
import {
  createEmptyRollCall,
  deriveSetupStepFromMeetingState,
  extractLocalMeetingPreferences,
  extractSharedMeetingState,
  hydrateSharedMeetingState,
  summarizeRollCall,
} from '../utils/sharedMeetingState';
import type { SharedMeetingState } from '../utils/sharedMeetingState';
import {
  MeetingSessionState,
  MeetingStatus,
  Motion,
  MotionGroup,
  MotionGroupStatus,
  MotionProcessingDraft,
  MotionType,
  Speaker,
  VoteResult,
  SetupStep,
  VoteDraft,
} from '../types';
import {
  applyMotionProcessingDraft,
  buildMotionProcessingDraft,
  cloneSpeakers,
  findMotionById,
  findMotionGroupByMotionId,
  isProcessingMotionType,
  upsertMotionRecord,
} from '../utils/motionCollaboration';
import { createDemoSessionSeed } from '../features/demo/demoSession';

type CloudSyncStatus = 'unconfigured' | 'idle' | 'loading' | 'saving' | 'saved' | 'error';
type CollaborationStatus = 'idle' | 'creating' | 'joining' | 'restoring' | 'connected' | 'syncing' | 'error';

interface MeetingStore extends MeetingSessionState {
  localSaveError: string | null;
  isDemoMode: boolean;
  startDemoSession: () => void;
  resetDemoSession: () => void;
  stopDemoSession: () => void;

  // Setup
  currentStep: SetupStep;
  setCurrentStep: (step: SetupStep) => void;
  setMeetingName: (name: string) => void;
  setChairName: (name: string) => void;
  setCommitteeName: (name: string) => void;

  // Delegates
  addDelegate: (name: string) => void;
  removeDelegate: (id: string) => void;
  bulkAddDelegates: (names: string[]) => void;

  attendanceSaving: boolean;
  attendanceError: string | null;
  // Roll Call
  markAttendance: (id: string, status: 'present' | 'present_and_voting' | 'absent') => Promise<boolean>;
  markAllPresent: () => Promise<boolean>;
  markAllPresentAndVoting: () => Promise<boolean>;
  completeRollCall: () => Promise<boolean>;

  // Session
  setStatus: (status: MeetingStatus) => void;
  meetingState: MeetingStatus;
  currentSpeaker: Speaker | null;
  waitingQueue: Speaker[];
  speakerQueue: Speaker[];
  timerState: { isRunning: boolean };
  timePool: number;
  addSpeaker: (name: string) => void;
  removeSpeaker: (id: string) => void;
  startSpeaking: () => void;
  nextSpeaker: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  updateRemainingTime: (time: number) => void;
  yieldTimeToChair: () => void;
  addSpeakerFromTimePool: (name: string, time: number) => void;

  // Motions
  motions: Motion[];
  addMotion: (motion: Omit<Motion, 'id' | 'timestamp'>) => void;
  /** @deprecated Use shared-state motion group actions instead of local-only motion status writes. */
  updateMotionStatus: (id: string, status: Motion['status']) => void;
  /** @deprecated Use shared-state vote result actions instead of local-only vote writes. */
  setMotionVoteResult: (id: string, result: VoteResult) => void;

  advancePaperPresentation: (motionId: string, action: 'tick' | 'qa' | 'complete', seconds?: number, paperIndex?: number) => boolean;

  // Motion Groups
  motionGroups: MotionGroup[];
  addMotionGroup: (motions: Omit<Motion, 'id' | 'timestamp'>[]) => Promise<boolean>;
  editVotedMotion: (id: string, correction: MotionCorrection) => Promise<boolean>;
  editPendingMotionGroup: (id: string, motions: (Omit<Motion, 'id' | 'timestamp'> & {id?: string})[]) => Promise<boolean>;
  updateMotionGroupStatus: (id: string, status: MotionGroup['status']) => Promise<boolean>;
  /** @deprecated Use shared-state group vote actions instead of local-only group vote writes. */
  setMotionGroupVoteResult: (id: string, result: VoteResult) => void;
  selectMotionInGroup: (groupId: string, motionId: string) => void;

  // Motion-specific Speaker Management
  addSpeakerToMotion: (motionId: string, name: string) => void;
  moveMotionSpeaker: (motionId: string, speakerId: string, direction: -1 | 1) => void;
  removeSpeakerFromMotion: (motionId: string, speakerId: string) => void;
  startMotionSpeaking: (motionId: string) => void;
  nextMotionSpeaker: (motionId: string) => void;
  pauseMotionTimer: (motionId: string) => void;
  resumeMotionTimer: (motionId: string) => void;
  updateMotionSpeakerTime: (motionId: string, time: number) => void;
  resetMotion: (motionId: string) => void;
  completeMotionExecution: (motionId: string) => void;
  yieldMotionTimeToChair: (motionId: string) => void;
  continueMotionWithTimePool: (motionId: string) => void;
  addSpeakerFromTimePoolToMotion: (motionId: string, name: string, time: number) => void;

  // Voting
  currentVote: VoteDraft | null;
  /** @deprecated Use `startGroupVote` for collaboration-safe voting. */
  startVote: (motionId: string) => void;
  startGroupVote: (groupId: string) => Promise<boolean>;
  updateVoteCount: (type: 'for' | 'against' | 'abstain', count: number) => void;
  calculateVoteResult: () => VoteResult | null;
  /** @deprecated Use `submitMotionVoteResult` for collaboration-safe voting. */
  confirmVote: (result: VoteResult) => void;
  confirmMotionVote: (result: VoteResult) => Promise<boolean>;
  submitMotionVoteResult: (
    groupId: string,
    motionId: string,
    result: VoteResult
  ) => Promise<boolean>;
  /** @deprecated Use collaboration-aware vote actions instead of local-only cancellation. */
  cancelVote: () => void;

  // Settings / Local preferences
  isMuted: boolean;
  toggleMute: () => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  soundAlerts: number[];
  setSoundAlerts: (alerts: number[]) => void;
  volume: number;
  setVolume: (volume: number) => void;
  resetMeeting: () => void;

  // Legacy cloud compatibility
  cloudStatus: CloudSyncStatus;
  cloudMessage: string | null;
  saveToCloud: () => Promise<boolean>;
  loadFromCloud: (_meetingId: string) => Promise<boolean>;

  // Collaboration context
  roomId: string | null;
  publicMeetingId: string | null;
  memberId: string | null;
  role: CollaborationRole | null;
  memberToken: string | null;
  sessionId: string | null;
  displayName: string | null;
  clientInstanceId: string;
  version: number;
  members: CollaborationMember[];
  onlineCount: number;
  activeMotion: CollaborationActiveMotion | null;
  motionProcessingDraft: MotionProcessingDraft | null;
  motionProcessingState: 'idle' | 'claiming' | 'releasing' | 'finishing';
  motionProcessingError: string | null;
  heartbeatIntervalSeconds: number;
  sessionTimeoutSeconds: number;
  collaborationStatus: CollaborationStatus;
  collaborationError: string | null;
  hasCollaborationRoom: boolean;
  isHeartbeatRunning: boolean;

  createCollaborationRoom: (params: { accessCode: string }) => Promise<boolean>;
  joinCollaborationRoom: (params: {
    publicMeetingId: string;
    accessCode: string;
    displayName: string;
  }) => Promise<boolean>;
  restoreCollaborationRoomState: () => Promise<boolean>;
  heartbeatCollaborationMember: () => Promise<boolean>;
  leaveCollaborationMember: (options?: {
    disconnectReason?: string;
    preserveLocalSession?: boolean;
    preserveStoredSession?: boolean;
    preferKeepalive?: boolean;
    clearLocalImmediately?: boolean;
    resetPreferences?: boolean;
  }) => Promise<boolean>;
  applySharedStateUpdate: (options?: { source?: string }) => Promise<boolean>;
  beginMotionProcessing: (motionId: string) => Promise<boolean>;
  releaseMotionProcessing: (options?: {
    motionId?: string;
    silent?: boolean;
  }) => Promise<boolean>;
  finishMotionProcessing: (motionId: string) => Promise<boolean>;
  refreshRoomStateAfterMotionConflict: (message: string) => Promise<boolean>;
  clearMotionProcessingError: () => void;
  createSpeakerListFallbackMotion: (params: {
    totalSpeakers: number;
    speakingTime: number;
  }) => Promise<boolean>;
  clearCollaborationSession: (options?: {
    keepError?: boolean;
    resetMeeting?: boolean;
    preserveIdentity?: boolean;
    resetPreferences?: boolean;
  }) => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const normalizeMemberName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const legacyCloudDisabledMessage =
  'Legacy Save to Cloud / Load from Cloud is disabled. This build now uses collaboration room RPCs only.';

const getInitialCloudMessage = () =>
  isSupabaseConfigured ? 'Ready to connect to a collaboration room.' : supabaseConfigMessage;

const getInitialMotionSpeakerLimit = (motion: Motion | null) => {
  if (!motion || (motion.type !== 'moderated_caucus' && motion.type !== 'speaker_list')) {
    return null;
  }

  const totalSpeakers = motion.parameters.totalSpeakers;
  return typeof totalSpeakers === 'number' && totalSpeakers > 0 ? totalSpeakers : null;
};

const createBaseMeetingSessionState = (meetingId = generateId()): MeetingSessionState => ({
  id: meetingId,
  name: '',
  chairName: '',
  committeeName: '',
  status: 'setup',
  startTime: new Date(),
  rollCall: createEmptyRollCall(),
  currentStep: 'meeting_info',
  meetingState: 'setup',
  currentSpeaker: null,
  waitingQueue: [],
  speakerQueue: [],
  timerState: { isRunning: false },
  timePool: 0,
  motions: [],
  motionGroups: [],
  currentVote: null,
  isMuted: false,
  fontSize: 'medium',
  soundAlerts: [10, 0],
  volume: 0.5,
});

const createBaseCollaborationState = (clientInstanceId: string) => ({
  roomId: null,
  publicMeetingId: null,
  memberId: null,
  role: null,
  memberToken: null,
  sessionId: null,
  displayName: null,
  clientInstanceId,
  version: 0,
  members: [] as CollaborationMember[],
  onlineCount: 0,
  activeMotion: null as CollaborationActiveMotion | null,
  motionProcessingDraft: null as MotionProcessingDraft | null,
  motionProcessingState: 'idle' as const,
  motionProcessingError: null as string | null,
  attendanceSaving: false,
  attendanceError: null as string | null,
  heartbeatIntervalSeconds: 15,
  sessionTimeoutSeconds: 420,
  collaborationStatus: 'idle' as CollaborationStatus,
  collaborationError: null,
  hasCollaborationRoom: false,
  isHeartbeatRunning: false,
});

const resolveDisplayName = (
  members: CollaborationMember[],
  memberId: string,
  fallback: string | null
) => members.find((member) => member.memberId === memberId)?.name ?? fallback ?? null;

const setMotionGroupStatus = (
  motionGroups: MotionGroup[],
  groupId: string,
  status: MotionGroupStatus
) =>
  motionGroups.map((group) => (group.id === groupId ? { ...group, status } : group));

const isCompletedMotionGroup = (group: Pick<MotionGroup, 'status'>) =>
  group.status === 'passed' || group.status === 'failed';

const buildMotionListFromGroups = (motionGroups: MotionGroup[]) => {
  const motionMap = new Map<string, Motion>();

  motionGroups.forEach((group) => {
    group.motions.forEach((motion) => {
      motionMap.set(motion.id, motion);
    });
  });

  return Array.from(motionMap.values());
};

const mergeSharedMotionGroups = (
  sharedMotionGroups: MotionGroup[],
  localMotionGroups: MotionGroup[]
) => {
  const sharedIds = new Set(sharedMotionGroups.map((group) => group.id));
  const localOnlyGroups = localMotionGroups.filter(
    (group) => !sharedIds.has(group.id)
  );

  return [...sharedMotionGroups, ...localOnlyGroups];
};

const buildCompletedMotionHistoryPayload = (
  state: MeetingStore,
  motionGroups: MotionGroup[]
): SharedMeetingState => {
  const completedMotionGroups = motionGroups.filter(isCompletedMotionGroup);
  const completedMotions = buildMotionListFromGroups(completedMotionGroups);
  const baseSharedState = createBaseMeetingSessionState(state.id);

  return extractSharedMeetingState({
    ...baseSharedState,
    id: state.id,
    name: state.name,
    chairName: state.chairName,
    committeeName: state.committeeName,
    status: state.status,
    meetingState: state.meetingState,
    startTime: state.startTime,
    rollCall: state.rollCall,
    motions: completedMotions,
    motionGroups: completedMotionGroups,
  });
};

const deriveMeetingStatusFromPassedMotion = (
  motionType: MotionType,
  currentStatus: MeetingStatus
) => {
  switch (motionType) {
    case 'paper_presentation':
      return 'Presentation';
    case 'moderated_caucus':
    case 'round_robin':
    case 'speaker_list':
    case 'extend_moderated':
      return 'Moderated';
    case 'unmoderated_caucus':
    case 'extend_unmoderated':
      return 'Unmoderated';
    case 'adjourn_meeting':
      return 'Suspension';
    case 'close_debate':
    case 'resume_debate':
      return 'GSL';
    default:
      return currentStatus;
  }
};

const buildStoredCollaborationSession = (state: MeetingStore): StoredCollaborationSession | null => {
  if (
    !state.publicMeetingId ||
    !state.memberId ||
    !state.sessionId ||
    !state.memberToken ||
    !state.role ||
    !state.displayName ||
    !state.clientInstanceId
  ) {
    return null;
  }

  return {
    roomId: state.roomId ?? undefined,
    publicMeetingId: state.publicMeetingId,
    memberId: state.memberId,
    sessionId: state.sessionId,
    memberToken: state.memberToken,
    role: state.role,
    displayName: state.displayName,
    clientInstanceId: state.clientInstanceId,
  };
};

const buildStoredCollaborationIdentity = (
  state: Pick<
    MeetingStore,
    'publicMeetingId' | 'memberId' | 'memberToken' | 'role' | 'displayName' | 'clientInstanceId'
  >
): StoredCollaborationIdentity | null => {
  if (
    !state.publicMeetingId ||
    !state.memberId ||
    !state.memberToken ||
    !state.role ||
    !state.displayName ||
    !state.clientInstanceId
  ) {
    return null;
  }

  return {
    publicMeetingId: state.publicMeetingId,
    memberId: state.memberId,
    memberToken: state.memberToken,
    role: state.role,
    displayName: state.displayName,
    clientInstanceId: state.clientInstanceId,
  };
};

const createLegacyCloudState = (
  status: CloudSyncStatus,
  message: string | null
): Pick<MeetingStore, 'cloudStatus' | 'cloudMessage'> => ({
  cloudStatus: status,
  cloudMessage: message,
});

let lastPersistedLocalState = '';
let sharedSyncChain: Promise<boolean> = Promise.resolve(true);
let heartbeatRequestInFlight = false;
let scheduledSharedSetupSync: ReturnType<typeof setTimeout> | null = null;
const SHARED_SETUP_SYNC_DELAY_MS = 500;

export const useMeetingStore = create<MeetingStore>((set, get) => {
  const initialPersistedState = loadPersistedCollaborationLocalState();
  clearLegacyMeetingSnapshotStorage();
  lastPersistedLocalState = JSON.stringify(initialPersistedState);

  const persistLocalState = () => {
    const state = get();
    if (state.isDemoMode) return;
    const snapshot = {
      clientInstanceId: state.clientInstanceId,
      preferences: extractLocalMeetingPreferences(state),
      collaborationSession: buildStoredCollaborationSession(state),
      recoverableIdentity: buildStoredCollaborationIdentity(state),
      localDraft: captureLocalMeetingDraft(state),
    };
    const serialized = JSON.stringify(snapshot);

    if (serialized === lastPersistedLocalState) {
      return;
    }

    if (savePersistedCollaborationLocalState(snapshot)) {
      lastPersistedLocalState = serialized;
      if (state.localSaveError) set({localSaveError: null});
    } else if (!state.localSaveError) {
      set({localSaveError: 'Local backup could not be saved. Keep this page open and export a record before leaving.'});
    }
  };

  const getReusableMemberToken = (publicMeetingId: string, displayName: string) => {
    const state = get();
    const storedIdentity = buildStoredCollaborationIdentity(state);

    if (!storedIdentity) {
      return undefined;
    }

    if (storedIdentity.publicMeetingId !== publicMeetingId.trim()) {
      return undefined;
    }

    if (
      normalizeMemberName(storedIdentity.displayName) !== normalizeMemberName(displayName)
    ) {
      return undefined;
    }

    return storedIdentity.memberToken;
  };

  const setCollaborationErrorState = (message: string) => {
    set({
      collaborationStatus: 'error',
      collaborationError: message,
      ...createLegacyCloudState('error', message),
    });
  };

  const setCollaborationConnectedState = (publicMeetingId: string) => {
    set({
      collaborationStatus: 'connected',
      collaborationError: null,
      ...createLegacyCloudState('saved', `Collaboration connected: ${publicMeetingId}`),
    });
  };

  const mergeCollaborationRoomIntoStore = (params: {
    roomId: string;
    publicMeetingId: string;
    memberId: string;
    role: CollaborationRole;
    memberToken: string;
    sessionId: string;
    version: number;
    members: CollaborationMember[];
    onlineCount: number;
    activeMotion: CollaborationActiveMotion | null;
    heartbeatIntervalSeconds: number;
    sessionTimeoutSeconds: number;
    sharedPayload: unknown;
    displayName: string | null;
    preserveLocalMeetingState?: boolean;
  }) => {
    const hydratedSharedState = hydrateSharedMeetingState(
      params.sharedPayload,
      params.publicMeetingId
    );
    const shouldStayInSetup = !hydratedSharedState.rollCall.completed;

    set((state) => {
      if (state.publicMeetingId === params.publicMeetingId && params.version < state.version) return {};
      const acceptAttendance = !scheduledSharedSetupSync && state.collaborationStatus !== 'syncing' && !state.attendanceSaving;
      const sharedAttendance = acceptAttendance ? {
        rollCall: hydratedSharedState.rollCall,
        ...(!state.rollCall.completed && hydratedSharedState.rollCall.completed ? {status: hydratedSharedState.status, meetingState: hydratedSharedState.meetingState} : {}),
      } : {};
      const mergedMotionGroups = mergeSharedMotionGroups(
        hydratedSharedState.motionGroups,
        state.publicMeetingId === params.publicMeetingId && state.memberId === params.memberId ? state.motionGroups : []
      );
      const mergedMotions = buildMotionListFromGroups(mergedMotionGroups);

      if (params.preserveLocalMeetingState) {
        return {
          ...(params.role === 'chair' ? {
            name: hydratedSharedState.name, committeeName: hydratedSharedState.committeeName,
            chairName: hydratedSharedState.chairName, startTime: hydratedSharedState.startTime,
          } : {}),
          ...sharedAttendance,
          motions: mergedMotions,
          motionGroups: mergedMotionGroups,
          roomId: params.roomId,
          publicMeetingId: params.publicMeetingId,
          memberId: params.memberId,
          role: params.role,
          memberToken: params.memberToken,
          sessionId: params.sessionId,
          displayName: resolveDisplayName(params.members, params.memberId, params.displayName),
          version: params.version,
          members: params.members,
          onlineCount: params.onlineCount,
          activeMotion: params.activeMotion,
          heartbeatIntervalSeconds: params.heartbeatIntervalSeconds,
          sessionTimeoutSeconds: params.sessionTimeoutSeconds,
          hasCollaborationRoom: true,
          collaborationStatus: 'connected',
          collaborationError: null,
          ...createLegacyCloudState('saved', `Collaboration connected: ${params.publicMeetingId}`),
        };
      }

      return {
        ...hydratedSharedState,
        ...(!acceptAttendance ? {rollCall: state.rollCall} : {}),
        motions: mergedMotions,
        motionGroups: mergedMotionGroups,
        ...(state.motionProcessingDraft && mergedMotionGroups.some(g => g.id === state.motionProcessingDraft?.groupId && !isCompletedMotionGroup(g)) ? {
          motionProcessingDraft: state.motionProcessingDraft,
          timePool: state.motionProcessingDraft.timePool,
        } : { motionProcessingDraft: null }),
        currentStep: shouldStayInSetup
          ? params.role === 'chair'
            ? state.currentStep === 'roll_call' && state.publicMeetingId === params.publicMeetingId ? 'roll_call' : 'meeting_info'
            : deriveSetupStepFromMeetingState(hydratedSharedState)
          : state.currentStep,
        roomId: params.roomId,
        publicMeetingId: params.publicMeetingId,
        memberId: params.memberId,
        role: params.role,
        memberToken: params.memberToken,
        sessionId: params.sessionId,
        displayName: resolveDisplayName(params.members, params.memberId, params.displayName),
        version: params.version,
        members: params.members,
        onlineCount: params.onlineCount,
        activeMotion: params.activeMotion,
        heartbeatIntervalSeconds: params.heartbeatIntervalSeconds,
        sessionTimeoutSeconds: params.sessionTimeoutSeconds,
        hasCollaborationRoom: true,
        collaborationStatus: 'connected',
        collaborationError: null,
        ...createLegacyCloudState('saved', `Collaboration connected: ${params.publicMeetingId}`),
      };
    });
  };

  const applyPresenceSnapshot = (params: {
    members: CollaborationMember[];
    onlineCount: number;
    activeMotion: CollaborationActiveMotion | null;
    heartbeatIntervalSeconds?: number;
    sessionTimeoutSeconds?: number;
  }) => {
    set((state) => ({
      members: params.members,
      onlineCount: params.onlineCount,
      activeMotion: params.activeMotion,
      heartbeatIntervalSeconds:
        params.heartbeatIntervalSeconds ?? state.heartbeatIntervalSeconds,
      sessionTimeoutSeconds:
        params.sessionTimeoutSeconds ?? state.sessionTimeoutSeconds,
    }));
  };

  const shouldPreserveLocalMeetingStateOnRoomRefresh = (state: MeetingStore) =>
    state.role === 'host' ||
    Boolean(state.motionProcessingDraft) ||
    state.motionProcessingState !== 'idle';

  const clearCollaborationSessionInternal = (options?: {
    keepError?: boolean;
    resetMeeting?: boolean;
    preserveIdentity?: boolean;
    preserveSession?: boolean;
    resetPreferences?: boolean;
  }) => {
    const state = get();
    const preservedSession = options?.preserveSession
      ? buildStoredCollaborationSession(state)
      : null;
    const preservedIdentity = options?.preserveIdentity
      ? buildStoredCollaborationIdentity(state)
      : null;
    const preservedCollaborationIdentity = preservedSession ?? preservedIdentity;
    const nextMeetingState =
      options?.resetMeeting === false ? {} : createBaseMeetingSessionState(generateId());
    const preservedPreferences = options?.resetPreferences
      ? createDefaultLocalPreferences()
      : extractLocalMeetingPreferences(state);
    const clientInstanceId =
      preservedCollaborationIdentity?.clientInstanceId ||
      state.clientInstanceId ||
      initialPersistedState.clientInstanceId;

    set({
      ...nextMeetingState,
      ...preservedPreferences,
      ...createBaseCollaborationState(clientInstanceId),
      roomId: preservedSession?.roomId ?? null,
      publicMeetingId: preservedCollaborationIdentity?.publicMeetingId ?? null,
      memberId: preservedCollaborationIdentity?.memberId ?? null,
      role: preservedCollaborationIdentity?.role ?? null,
      memberToken: preservedCollaborationIdentity?.memberToken ?? null,
      sessionId: preservedSession?.sessionId ?? null,
      displayName: preservedCollaborationIdentity?.displayName ?? null,
      collaborationStatus: options?.keepError && state.collaborationError ? 'error' : 'idle',
      collaborationError: options?.keepError ? state.collaborationError : null,
      ...createLegacyCloudState(
        isSupabaseConfigured ? 'idle' : 'unconfigured',
        options?.keepError && state.collaborationError
          ? state.collaborationError
          : getInitialCloudMessage()
      ),
    });

    persistLocalState();
  };

  const clearCollaborationOnlyState = (options?: {
    keepError?: boolean;
    preserveIdentity?: boolean;
  }) => {
    clearCollaborationSessionInternal({
      keepError: options?.keepError,
      resetMeeting: false,
      preserveIdentity: options?.preserveIdentity,
    });
  };

  const getAuthenticatedCollaborationContext = () => {
    const state = get();

    if (!state.memberId || !state.sessionId || !state.memberToken) {
      return null;
    }

    return {
      memberId: state.memberId,
      sessionId: state.sessionId,
      memberToken: state.memberToken,
    };
  };

  const dispatchLeaveRequest = async (params: {
    memberId: string;
    sessionId: string;
    memberToken: string;
    disconnectReason?: string;
    preferKeepalive?: boolean;
  }) =>
    params.preferKeepalive
      ? leaveCollaborationMemberKeepaliveRpc({
          memberId: params.memberId,
          sessionId: params.sessionId,
          memberToken: params.memberToken,
          disconnectReason: params.disconnectReason,
        }).then(() => null)
      : leaveCollaborationMemberRpc({
          memberId: params.memberId,
          sessionId: params.sessionId,
          memberToken: params.memberToken,
          disconnectReason: params.disconnectReason,
        });

  const restoreLatestSharedStateAfterConflict = async (message: string) => {
    const state = get();

    if (!state.publicMeetingId || !state.sessionId || !state.memberToken) {
      setCollaborationErrorState(message);
      return false;
    }

    try {
      const latestState = await getCollaborationRoomStateRpc({
        publicMeetingId: state.publicMeetingId,
        sessionId: state.sessionId,
        memberToken: state.memberToken,
      });

      mergeCollaborationRoomIntoStore({
        roomId: latestState.roomId,
        publicMeetingId: latestState.publicMeetingId,
        memberId: latestState.memberId,
        role: latestState.role,
        memberToken: state.memberToken,
        sessionId: latestState.sessionId,
        version: latestState.version,
        members: latestState.members,
        onlineCount: latestState.onlineCount,
        activeMotion: latestState.activeMotion,
        heartbeatIntervalSeconds: latestState.heartbeatIntervalSeconds,
        sessionTimeoutSeconds: latestState.sessionTimeoutSeconds,
        sharedPayload: latestState.sharedPayload,
        displayName: state.displayName,
        preserveLocalMeetingState: shouldPreserveLocalMeetingStateOnRoomRefresh(state),
      });

      set({
        collaborationStatus: 'error',
        collaborationError: message,
        ...createLegacyCloudState('error', message),
      });
      persistLocalState();
      return false;
    } catch (error) {
      const collaborationError = toCollaborationRpcError(
        error,
        'get_collaboration_room_state'
      );
      set({ collaborationError: collaborationError.userMessage });
      clearCollaborationOnlyState({
        keepError: true,
        preserveIdentity: collaborationError.code === 'sessionExpired',
      });
      return false;
    }
  };

  const queueSharedStateSync = (source = 'shared_update') => {
    sharedSyncChain = sharedSyncChain
      .catch(() => false)
      .then(async () => {
        const state = get();
        const auth = getAuthenticatedCollaborationContext();

        if (!state.hasCollaborationRoom || !state.publicMeetingId || !auth || state.version <= 0) {
          return false;
        }

        set({
          collaborationStatus: 'syncing',
          collaborationError: null,
          ...createLegacyCloudState('saving', `Syncing shared state: ${source}`),
        });

        try {
          const result = await applyCollaborationStateUpdateRpc({
            publicMeetingId: state.publicMeetingId,
            memberId: auth.memberId,
            sessionId: auth.sessionId,
            memberToken: auth.memberToken,
            baseVersion: state.version,
            nextSharedPayload: buildCompletedMotionHistoryPayload(get(), get().motionGroups),
          });

          applyPresenceSnapshot({
            members: result.members,
            onlineCount: result.onlineCount,
            activeMotion: result.activeMotion,
          });

          set({
            version: result.version,
          });
          setCollaborationConnectedState(state.publicMeetingId);
          persistLocalState();
          return true;
        } catch (error) {
          const collaborationError =
            error instanceof CollaborationRpcError
              ? error
              : toCollaborationRpcError(error, 'apply_collaboration_state_update');

          if (collaborationError.isVersionConflict) {
            return restoreLatestSharedStateAfterConflict(collaborationError.userMessage);
          }

          if (collaborationError.shouldClearSession) {
            set({ collaborationError: collaborationError.userMessage });
            clearCollaborationOnlyState({ keepError: true });
            return false;
          }

          setCollaborationErrorState(collaborationError.userMessage);
          return false;
        }
      });

    return sharedSyncChain;
  };

  const scheduleSharedSetupSync = (source = 'setup_update') => {
    const state = get();

    if (
      state.role !== 'host' ||
      !state.hasCollaborationRoom ||
      !state.publicMeetingId ||
      state.version <= 0
    ) {
      return;
    }

    if (scheduledSharedSetupSync) {
      clearTimeout(scheduledSharedSetupSync);
    }

    scheduledSharedSetupSync = setTimeout(() => {
      scheduledSharedSetupSync = null;
      void queueSharedStateSync(source);
    }, SHARED_SETUP_SYNC_DELAY_MS);
  };

  const flushSharedSetupSync = (source = 'setup_update') => {
    if (scheduledSharedSetupSync) {
      clearTimeout(scheduledSharedSetupSync);
      scheduledSharedSetupSync = null;
    }

    void queueSharedStateSync(source);
  };

  const updateAttendance = async (changes: Record<string, 'present' | 'present_and_voting' | 'absent'>, complete = false): Promise<boolean> => {
    const initial = get();
    if (initial.attendanceSaving) return false;
    if (Object.keys(changes).some(id => !initial.rollCall.delegates.some(d => d.id === id)) ||
        Object.values(changes).some(status => !['present','present_and_voting','absent'].includes(status)) ||
        (complete && !initial.rollCall.delegates.length)) {
      set({attendanceError: 'Check the delegate list before taking attendance.'}); return false;
    }
    if (!initial.isDemoMode && initial.publicMeetingId && !initial.hasCollaborationRoom) {
      set({attendanceError: 'Reconnect to the room before updating attendance.'}); return false;
    }
    if (initial.activeMotion || initial.motionProcessingDraft) {
      set({attendanceError: 'Finish the active motion before updating attendance.'}); return false;
    }
    if (!initial.hasCollaborationRoom) {
      const delegates = initial.rollCall.delegates.map(d => changes[d.id] ? {...d, attendance: changes[d.id], timestamp: new Date()} : d);
      set({rollCall: summarizeRollCall(delegates, {completed: complete || initial.rollCall.completed, completedAt: complete && !initial.rollCall.completed ? new Date() : initial.rollCall.completedAt}),
        attendanceError: null, ...(complete && !initial.rollCall.completed ? {status:'GSL' as const, meetingState:'GSL' as const} : {})});
      persistLocalState(); return true;
    }
    // Flush host roster edits first; attendance patches then share the existing write queue.
    if (scheduledSharedSetupSync) flushSharedSetupSync('before_attendance');
    set({attendanceSaving:true, attendanceError:null});
    const sameSession = () => get().publicMeetingId === initial.publicMeetingId && get().sessionId === initial.sessionId;
    sharedSyncChain = sharedSyncChain.catch(()=>false).then(async()=>{
      const state = get(); const auth = getAuthenticatedCollaborationContext();
      if (!sameSession()) return false;
      if (!auth || !state.publicMeetingId) {set({attendanceSaving:false,attendanceError:'Reconnect to the room before updating attendance.'}); return false;}
      try {
        const result = await updateCollaborationAttendanceRpc({publicMeetingId:state.publicMeetingId, ...auth, changes, complete});
        if (!sameSession()) return false;
        const latest = hydrateSharedMeetingState(result.shared_payload,state.publicMeetingId);
        if (result.version >= get().version) {
          const current = get();
          // Adopt the entire shared history before advancing version, so a later
          // host setup save cannot overwrite records committed by another chair.
          mergeCollaborationRoomIntoStore({
            roomId:state.roomId ?? '', publicMeetingId:state.publicMeetingId, ...auth,
            role:state.role ?? 'chair', version:result.version, sharedPayload:result.shared_payload,
            members:current.members, onlineCount:current.onlineCount, activeMotion:current.activeMotion,
            heartbeatIntervalSeconds:current.heartbeatIntervalSeconds, sessionTimeoutSeconds:current.sessionTimeoutSeconds,
            displayName:current.displayName, preserveLocalMeetingState:true,
          });
          set({rollCall:latest.rollCall,
            ...(!current.rollCall.completed && latest.rollCall.completed ? {status:latest.status,meetingState:latest.meetingState} : {})});
        }
        set({attendanceError:null}); persistLocalState(); return true;
      } catch (error) {
        if (sameSession()) set({attendanceError: error instanceof CollaborationRpcError && error.rawMessage.includes('finish the active motion')
          ? 'Finish the active motion before updating attendance.'
          : error instanceof Error ? error.message : 'Could not save attendance. Please try again.'});
        return false;
      } finally {if (sameSession()) set({attendanceSaving:false});}
    });
    return sharedSyncChain;
  };

  const applyLocalOnlyMutation = (
    buildNextState: (state: MeetingStore) => Partial<MeetingStore> | null
  ) => {
    const patch = buildNextState(get());
    if (!patch) {
      return null;
    }

    set({
      ...patch,
      motionProcessingError: null,
    });

    return patch;
  };

  const syncCompletedMotionHistory = async (source: string) => {
    const state = get();
    const auth = getAuthenticatedCollaborationContext();

    if (!state.hasCollaborationRoom || !state.publicMeetingId || !auth || state.version <= 0) {
      return true;
    }

    set({
      collaborationStatus: 'syncing',
      collaborationError: null,
      ...createLegacyCloudState('saving', `Syncing completed motion history: ${source}`),
    });

    try {
      const result = await applyCollaborationStateUpdateRpc({
        publicMeetingId: state.publicMeetingId,
        memberId: auth.memberId,
        sessionId: auth.sessionId,
        memberToken: auth.memberToken,
        baseVersion: state.version,
        nextSharedPayload: buildCompletedMotionHistoryPayload(state, state.motionGroups),
      });

      applyPresenceSnapshot({
        members: result.members,
        onlineCount: result.onlineCount,
        activeMotion: result.activeMotion,
      });

      set({
        version: result.version,
        motionProcessingError: null,
      });
      setCollaborationConnectedState(state.publicMeetingId);
      persistLocalState();
      return true;
    } catch (error) {
      const collaborationError =
        error instanceof CollaborationRpcError
          ? error
          : toCollaborationRpcError(error, 'apply_collaboration_state_update');

      if (collaborationError.isVersionConflict) {
        return restoreLatestSharedStateAfterConflict(collaborationError.userMessage);
      }

      if (collaborationError.shouldClearSession) {
        set({ collaborationError: collaborationError.userMessage });
        clearCollaborationOnlyState({ keepError: true });
        return false;
      }

      setCollaborationErrorState(collaborationError.userMessage);
      return false;
    }
  };

  const refreshLatestRoomStateSilently = async () => {
    const state = get();

    if (!state.publicMeetingId || !state.sessionId || !state.memberToken) {
      return false;
    }

    try {
      const latestState = await getCollaborationRoomStateRpc({
        publicMeetingId: state.publicMeetingId,
        sessionId: state.sessionId,
        memberToken: state.memberToken,
      });

      mergeCollaborationRoomIntoStore({
        roomId: latestState.roomId,
        publicMeetingId: latestState.publicMeetingId,
        memberId: latestState.memberId,
        role: latestState.role,
        memberToken: state.memberToken,
        sessionId: latestState.sessionId,
        version: latestState.version,
        members: latestState.members,
        onlineCount: latestState.onlineCount,
        activeMotion: latestState.activeMotion,
        heartbeatIntervalSeconds: latestState.heartbeatIntervalSeconds,
        sessionTimeoutSeconds: latestState.sessionTimeoutSeconds,
        sharedPayload: latestState.sharedPayload,
        displayName: state.displayName,
        preserveLocalMeetingState: shouldPreserveLocalMeetingStateOnRoomRefresh(state),
      });
      persistLocalState();
      return true;
    } catch (error) {
      const collaborationError = toCollaborationRpcError(
        error,
        'get_collaboration_room_state'
      );

      if (collaborationError.shouldClearSession) {
        set({ collaborationError: collaborationError.userMessage });
        clearCollaborationOnlyState({
          keepError: true,
          preserveIdentity: collaborationError.code === 'sessionExpired',
        });
      }

      return false;
    }
  };

  const createMotionProcessingDraftFromState = (motionId: string) => {
    const state = get();
    if (state.motionProcessingDraft?.motionId === motionId) {
      return state.motionProcessingDraft;
    }

    const { motion, group } = findMotionById(state.motions, state.motionGroups, motionId);
    if (!motion || !group || !isProcessingMotionType(motion.type)) {
      return null;
    }

    const draft = buildMotionProcessingDraft(motion, group.id, state.timePool);
    if (motion.type === 'round_robin' && motion.speakers === undefined) {
      const seconds = motion.parameters.speakingTime ?? 60;
      draft.speakers = state.rollCall.delegates.filter(d=>d.attendance!=='absent').map(d=>({id:generateId(),name:d.name,status:'waiting' as const,speakingTime:seconds,remainingTime:seconds}));
    }
    return draft;
  };

  const updateMotionProcessingDraftState = (
    motionId: string,
    updater: (draft: MotionProcessingDraft) => MotionProcessingDraft
  ) => {
    set((state) => {
      if (!state.motionProcessingDraft || state.motionProcessingDraft.motionId !== motionId) {
        return {};
      }

      return {
        motionProcessingDraft: updater(state.motionProcessingDraft),
      };
    });
  };

  const refreshRoomStateAfterMotionConflict = async (message: string) => {
    const state = get();

    if (!state.publicMeetingId || !state.sessionId || !state.memberToken) {
      set({ motionProcessingError: message });
      return false;
    }

    try {
      const latestState = await getCollaborationRoomStateRpc({
        publicMeetingId: state.publicMeetingId,
        sessionId: state.sessionId,
        memberToken: state.memberToken,
      });

      mergeCollaborationRoomIntoStore({
        roomId: latestState.roomId,
        publicMeetingId: latestState.publicMeetingId,
        memberId: latestState.memberId,
        role: latestState.role,
        memberToken: state.memberToken,
        sessionId: latestState.sessionId,
        version: latestState.version,
        members: latestState.members,
        onlineCount: latestState.onlineCount,
        activeMotion: latestState.activeMotion,
        heartbeatIntervalSeconds: latestState.heartbeatIntervalSeconds,
        sessionTimeoutSeconds: latestState.sessionTimeoutSeconds,
        sharedPayload: latestState.sharedPayload,
        displayName: state.displayName,
        preserveLocalMeetingState: true,
      });

      set({
        motionProcessingError: message,
      });
      persistLocalState();
      return true;
    } catch (error) {
      const collaborationError = toCollaborationRpcError(
        error,
        'get_collaboration_room_state'
      );
      set({
        motionProcessingError: collaborationError.userMessage,
      });

      if (collaborationError.shouldClearSession) {
        set({ collaborationError: collaborationError.userMessage });
        clearCollaborationOnlyState({
          keepError: true,
          preserveIdentity: collaborationError.code === 'sessionExpired',
        });
      }

      return false;
    }
  };

  return {
    ...createBaseMeetingSessionState(generateId()),
    ...initialPersistedState.preferences,
    ...createBaseCollaborationState(initialPersistedState.clientInstanceId),
    isDemoMode: false,
    localSaveError: null,
    ...createLegacyCloudState(
      isSupabaseConfigured ? 'idle' : 'unconfigured',
      getInitialCloudMessage()
    ),

    startDemoSession: () => {
      const state = get();
      set({
        ...createDemoSessionSeed(),
        isMuted: state.isMuted,
        fontSize: state.fontSize,
        soundAlerts: state.soundAlerts,
        volume: state.volume,
        isDemoMode: true,
        motionProcessingDraft: null,
        motionProcessingState: 'idle',
        motionProcessingError: null,
      });
    },

    resetDemoSession: () => {
      const state = get();
      set({
        ...createDemoSessionSeed(),
        isMuted: state.isMuted,
        fontSize: state.fontSize,
        soundAlerts: state.soundAlerts,
        volume: state.volume,
        isDemoMode: true,
        motionProcessingDraft: null,
        motionProcessingState: 'idle',
        motionProcessingError: null,
      });
    },

    stopDemoSession: () => {
      const state = get();
      set({
        ...createBaseMeetingSessionState(generateId()),
        isMuted: state.isMuted,
        fontSize: state.fontSize,
        soundAlerts: state.soundAlerts,
        volume: state.volume,
        isDemoMode: false,
        motionProcessingDraft: null,
        motionProcessingState: 'idle',
        motionProcessingError: null,
      });
    },

    // Setup
    setCurrentStep: (step) => set({ currentStep: step }),

    setMeetingName: (name) => {
      set({ name });
      scheduleSharedSetupSync('setup_meeting_name');
    },

    setChairName: (name) => {
      set({ chairName: name });
      scheduleSharedSetupSync('setup_chair_name');
    },

    setCommitteeName: (name) => {
      set({ committeeName: name });
      scheduleSharedSetupSync('setup_committee_name');
    },

    // Delegates
    addDelegate: (name) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const state = get();
      const exists = state.rollCall.delegates.some((delegate) => delegate.name.trim().toLowerCase() === trimmedName.toLowerCase());
      if (exists) return;

      const nextDelegates = [
        ...state.rollCall.delegates,
        {
          id: generateId(),
          name: trimmedName,
          attendance: 'unmarked' as const,
          timestamp: new Date(),
        },
      ];

      set({
        rollCall: summarizeRollCall(nextDelegates, {
          completed: state.rollCall.completed,
          completedAt: state.rollCall.completedAt,
        }),
      });
      scheduleSharedSetupSync('setup_add_delegate');
    },

    removeDelegate: (id) => {
      const state = get();
      const nextDelegates = state.rollCall.delegates.filter((delegate) => delegate.id !== id);

      set({
        rollCall: summarizeRollCall(nextDelegates, {
          completed: state.rollCall.completed,
          completedAt: state.rollCall.completedAt,
        }),
      });
      scheduleSharedSetupSync('setup_remove_delegate');
    },

    bulkAddDelegates: (names) => {
      const state = get();
      const existingNames = new Set(state.rollCall.delegates.map((delegate) => delegate.name.trim().toLowerCase()));
      const newDelegates = names
        .map((name) => name.trim())
        .filter((name) => {
          const key = name.toLowerCase();
          if (!key || existingNames.has(key)) return false;
          existingNames.add(key);
          return true;
        })
        .map((name) => ({
          id: generateId(),
          name,
          attendance: 'unmarked' as const,
          timestamp: new Date(),
        }));

      if (newDelegates.length === 0) return;

      set({
        rollCall: summarizeRollCall([...state.rollCall.delegates, ...newDelegates], {
          completed: state.rollCall.completed,
          completedAt: state.rollCall.completedAt,
        }),
      });
      scheduleSharedSetupSync('setup_bulk_add_delegates');
    },

    // Attendance is a scoped shared patch for both host and chair.
    markAttendance: (id, status) => updateAttendance({[id]:status}),
    markAllPresent: () => updateAttendance(Object.fromEntries(get().rollCall.delegates.map(d=>[d.id,'present' as const]))),
    markAllPresentAndVoting: () => updateAttendance(Object.fromEntries(get().rollCall.delegates.map(d=>[d.id,'present_and_voting' as const]))),
    completeRollCall: () => updateAttendance({},true),

    // Session
    setStatus: (status) => set({ status, meetingState: status }),

    addSpeaker: (name) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const state = get();
      const newSpeaker: Speaker = {
        id: generateId(),
        name: trimmedName,
        status: 'waiting',
        speakingTime: 90,
        remainingTime: 90,
      };

      const newQueue = [...state.waitingQueue, newSpeaker];
      set({
        waitingQueue: newQueue,
        speakerQueue: newQueue,
      });
    },

    removeSpeaker: (id) => {
      set((state) => {
        const newQueue = state.waitingQueue.filter((speaker) => speaker.id !== id);
        return {
          waitingQueue: newQueue,
          speakerQueue: newQueue,
        };
      });
    },

    startSpeaking: () => {
      const state = get();
      if (state.waitingQueue.length === 0) return;

      const [firstSpeaker, ...remainingQueue] = state.waitingQueue;
      set({
        currentSpeaker: {
          ...firstSpeaker,
          status: 'waiting',
          remainingTime: firstSpeaker.speakingTime,
        },
        waitingQueue: remainingQueue,
        speakerQueue: remainingQueue,
        timerState: { isRunning: false },
      });
    },

    nextSpeaker: () => {
      const state = get();
      if (state.waitingQueue.length === 0) {
        set({ currentSpeaker: null, timerState: { isRunning: false } });
        return;
      }

      const [nextSpeaker, ...remainingQueue] = state.waitingQueue;
      set({
        currentSpeaker: {
          ...nextSpeaker,
          status: 'waiting',
          remainingTime: nextSpeaker.speakingTime,
        },
        waitingQueue: remainingQueue,
        speakerQueue: remainingQueue,
        timerState: { isRunning: false },
      });
    },

    pauseTimer: () => {
      set((state) => ({
        currentSpeaker: state.currentSpeaker
          ? { ...state.currentSpeaker, status: 'waiting' as const }
          : null,
        timerState: { isRunning: false },
      }));
    },

    resumeTimer: () => {
      set((state) => ({
        currentSpeaker: state.currentSpeaker
          ? { ...state.currentSpeaker, status: 'speaking' as const }
          : null,
        timerState: { isRunning: true },
      }));
    },

    updateRemainingTime: (time) => {
      set((state) => ({
        currentSpeaker: state.currentSpeaker
          ? { ...state.currentSpeaker, remainingTime: time }
          : null,
      }));
    },

    yieldTimeToChair: () => {
      const state = get();
      if (!state.currentSpeaker || state.currentSpeaker.remainingTime <= 0) return;

      const remainingTime = Math.max(0, state.currentSpeaker.remainingTime);

      set((currentState) => ({
        timePool: currentState.timePool + remainingTime,
        currentSpeaker: null,
        timerState: { isRunning: false },
      }));

      if (state.waitingQueue.length > 0) {
        get().nextSpeaker();
      }
    },

    addSpeakerFromTimePool: (name, time) => {
      const trimmedName = name.trim();
      const state = get();
      if (!trimmedName || state.timePool < time) return;

      const newSpeaker: Speaker = {
        id: generateId(),
        name: trimmedName,
        status: 'waiting',
        speakingTime: time,
        remainingTime: time,
      };

      set((currentState) => ({
        timePool: currentState.timePool - time,
        waitingQueue: [...currentState.waitingQueue, newSpeaker],
        speakerQueue: [...currentState.speakerQueue, newSpeaker],
      }));
    },

    // Motions
    addMotion: (motion) => {
      const newMotion: Motion = {
        ...motion,
        id: generateId(),
        timestamp: new Date(),
      };

      set((state) => ({
        motions: [...state.motions, newMotion],
      }));
    },

    updateMotionStatus: (id, status) => {
      set((state) => ({
        motions: state.motions.map((motion) =>
          motion.id === id ? { ...motion, status } : motion
        ),
      }));
    },

    setMotionVoteResult: (id, result) => {
      set((state) => ({
        motions: state.motions.map((motion) =>
          motion.id === id ? { ...motion, voteResult: result } : motion
        ),
      }));
    },

    // Voting
    startVote: (motionId) => {
      const motion = get().motions.find((entry) => entry.id === motionId);
      set({
        currentVote: {
          motionId,
          motionType: motion?.type || 'moderated_caucus',
          for: 0,
          against: 0,
          abstain: 0,
        },
      });
      get().updateMotionStatus(motionId, 'voting');
    },

    updateVoteCount: (type, count) => {
      set((state) => {
        if (!state.currentVote) return state;
        return {
          currentVote: {
            ...state.currentVote,
            [type]: Math.max(0, count),
          },
        };
      });
    },

    calculateVoteResult: () => {
      const state = get();
      if (!state.currentVote) return null;

      const { for: forVotes, against, abstain } = state.currentVote;
      const total = forVotes + against + abstain;
      const votingBase = state.rollCall.presentCount + state.rollCall.presentAndVotingCount;

      return {
        for: forVotes,
        against,
        abstain,
        total,
        votingBase,
        result: forVotes > against ? 'pass' : 'fail',
        rule: 'Simple Majority',
        timestamp: new Date(),
      };
    },

    confirmVote: (result) => {
      const state = get();
      if (!state.currentVote) return;

      const { motionId } = state.currentVote;
      const motion = state.motions.find((entry) => entry.id === motionId);

      if (motion && motionId) {
        get().setMotionVoteResult(motionId, result);
        get().updateMotionStatus(motionId, result.result === 'pass' ? 'passed' : 'failed');

        if (result.result === 'pass') {
          switch (motion.type) {
            case 'moderated_caucus':
            case 'round_robin':
            case 'speaker_list':
              set({ status: 'Moderated', meetingState: 'Moderated' });
              break;
            case 'unmoderated_caucus':
              set({ status: 'Unmoderated', meetingState: 'Unmoderated' });
              break;
            case 'adjourn_meeting':
              set({ status: 'Suspension', meetingState: 'Suspension' });
              break;
            case 'close_debate':
            case 'resume_debate':
              set({ status: 'GSL', meetingState: 'GSL' });
              break;
          }
        }
      }

      set({ currentVote: null });
    },

    cancelVote: () => {
      const state = get();
      if (state.currentVote?.motionId) {
        get().updateMotionStatus(state.currentVote.motionId, 'pending');
      }
      set({ currentVote: null });
    },

    // Motion-specific Speaker Management
    addSpeakerToMotion: (motionId, name) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const state = get();
      const draft = state.motionProcessingDraft;
      const { motion } = findMotionById(state.motions, state.motionGroups, motionId);
      if (!draft || draft.motionId !== motionId || !motion) return;
      const initialSpeakerLimit = getInitialMotionSpeakerLimit(motion);
      if (initialSpeakerLimit !== null && draft.speakers.length >= initialSpeakerLimit) return;

      const speakingTime = motion.parameters.speakingTime || 60;
      const newSpeaker: Speaker = {
        id: generateId(),
        name: trimmedName,
        status: 'waiting',
        speakingTime,
        remainingTime: speakingTime,
      };

      updateMotionProcessingDraftState(motionId, (currentDraft) => ({
        ...currentDraft,
        speakers: [...cloneSpeakers(currentDraft.speakers), newSpeaker],
        speakingPhase: currentDraft.speakingPhase ?? 'adding',
      }));
    },

    moveMotionSpeaker: (motionId, speakerId, direction) => {
      updateMotionProcessingDraftState(motionId, draft => {
        const index=draft.speakers.findIndex(s=>s.id===speakerId),target=index+direction;
        const first=draft.speakingPhase==='adding'?0:(draft.currentSpeakerIndex??-1)+1;
        if(index<first||target<first||target>=draft.speakers.length)return draft;
        const speakers=[...draft.speakers];[speakers[index],speakers[target]]=[speakers[target],speakers[index]];
        return {...draft,speakers};
      });
    },

    removeSpeakerFromMotion: (motionId, speakerId) => {
      updateMotionProcessingDraftState(motionId, (draft) => ({
        ...draft,
        speakers: draft.speakers.filter((speaker) => speaker.id !== speakerId),
      }));
    },

    startMotionSpeaking: (motionId) => {
      const draft = get().motionProcessingDraft;
      if (!draft || draft.motionId !== motionId || draft.speakers.length === 0) return;

      updateMotionProcessingDraftState(motionId, (currentDraft) => ({
        ...currentDraft,
        currentSpeakerIndex: 0,
        speakingPhase: 'in_progress',
        speakers: currentDraft.speakers.map((speaker, index) =>
          index === 0
            ? {
                ...speaker,
                status: 'waiting',
                remainingTime: speaker.speakingTime,
              }
            : speaker
        ),
      }));
    },

    nextMotionSpeaker: (motionId) => {
      const draft = get().motionProcessingDraft;
      if (!draft || draft.motionId !== motionId) return;

      updateMotionProcessingDraftState(motionId, (currentDraft) => {
        const currentIndex = currentDraft.currentSpeakerIndex ?? -1;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= currentDraft.speakers.length) {
          return {
            ...currentDraft,
            speakingPhase: 'completed',
            speakers: currentDraft.speakers.map((speaker) => ({
              ...speaker,
              status: 'waiting',
            })),
          };
        }

        return {
          ...currentDraft,
          currentSpeakerIndex: nextIndex,
          speakers: currentDraft.speakers.map((speaker, index) =>
            index === nextIndex
              ? {
                  ...speaker,
                  status: 'waiting',
                  remainingTime: speaker.speakingTime,
                }
              : {
                  ...speaker,
                  status: 'waiting',
                }
          ),
        };
      });
    },

    pauseMotionTimer: (motionId) => {
      updateMotionProcessingDraftState(motionId, (draft) => {
        if (draft.currentSpeakerIndex === undefined) {
          return draft;
        }

        return {
          ...draft,
          speakers: draft.speakers.map((speaker, index) =>
            index === draft.currentSpeakerIndex
              ? { ...speaker, status: 'waiting' }
              : speaker
          ),
        };
      });
    },

    resumeMotionTimer: (motionId) => {
      updateMotionProcessingDraftState(motionId, (draft) => {
        if (draft.currentSpeakerIndex === undefined) {
          return draft;
        }

        return {
          ...draft,
          speakers: draft.speakers.map((speaker, index) =>
            index === draft.currentSpeakerIndex
              ? { ...speaker, status: 'speaking' }
              : speaker
          ),
        };
      });
    },

    updateMotionSpeakerTime: (motionId, time) => {
      updateMotionProcessingDraftState(motionId, (draft) => {
        if (draft.currentSpeakerIndex === undefined) {
          return draft;
        }

        return {
          ...draft,
          speakers: draft.speakers.map((speaker, index) =>
            index === draft.currentSpeakerIndex
              ? { ...speaker, remainingTime: time }
              : speaker
          ),
        };
      });
    },

    resetMotion: (motionId) => {
      updateMotionProcessingDraftState(motionId, (draft) => ({
        ...draft,
        speakers: draft.motionType==='round_robin'?draft.speakers.map(s=>({...s,status:'waiting' as const,remainingTime:s.speakingTime})):[],
        currentSpeakerIndex: undefined,
        speakingPhase: 'adding',
      }));
    },

    completeMotionExecution: (motionId) => {
      void get().finishMotionProcessing(motionId);
    },

    yieldMotionTimeToChair: (motionId) => {
      const state = get();
      const draft = state.motionProcessingDraft;
      if (!draft || draft.motionId !== motionId || draft.currentSpeakerIndex === undefined) return;

      const currentSpeaker = draft.speakers[draft.currentSpeakerIndex];
      if (!currentSpeaker) return;

      const remainingTime = Math.max(0, currentSpeaker.remainingTime);

      updateMotionProcessingDraftState(motionId, (currentDraft) => ({
        ...currentDraft,
        timePool: currentDraft.timePool + remainingTime,
      }));

      get().nextMotionSpeaker(motionId);
    },

    addSpeakerFromTimePoolToMotion: (motionId, name, time) => {
      const trimmedName = name.trim();
      const state = get();
      const draft = state.motionProcessingDraft;
      if (!draft || draft.motionId !== motionId || !trimmedName || draft.timePool < time) return;

      const newSpeaker: Speaker = {
        id: generateId(),
        name: trimmedName,
        status: 'waiting',
        speakingTime: time,
        remainingTime: time,
      };

      updateMotionProcessingDraftState(motionId, (currentDraft) => ({
        ...currentDraft,
        timePool: currentDraft.timePool - time,
        speakers: [...cloneSpeakers(currentDraft.speakers), newSpeaker],
      }));
    },

    continueMotionWithTimePool: (motionId) => {
      const draft = get().motionProcessingDraft;
      if (!draft || draft.motionId !== motionId) return;

      updateMotionProcessingDraftState(motionId, (currentDraft) => {
        const lastCompletedIndex = currentDraft.currentSpeakerIndex ?? -1;
        const nextIndex = lastCompletedIndex + 1;

        if (nextIndex >= currentDraft.speakers.length) {
          return currentDraft;
        }

        return {
          ...currentDraft,
          currentSpeakerIndex: nextIndex,
          speakingPhase: 'in_progress',
          speakers: currentDraft.speakers.map((speaker, index) =>
            index === nextIndex
              ? {
                  ...speaker,
                  status: 'waiting',
                  remainingTime: speaker.speakingTime,
                }
              : speaker
          ),
        };
      });
    },

    // Settings
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

    setFontSize: (size) => set({ fontSize: size }),

    setSoundAlerts: (alerts) => set({ soundAlerts: alerts }),

    setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

    resetMeeting: () => {
      if (get().isDemoMode) {
        get().resetDemoSession();
        return;
      }
      void get().leaveCollaborationMember({
        disconnectReason: 'reset_meeting',
        preserveLocalSession: true,
        clearLocalImmediately: true,
        resetPreferences: true,
      });
    },

    // Motion Group Actions
    addMotionGroup: async (motions) => {
      const newMotionGroup: MotionGroup = {
        id: generateId(),
        motions: motions.map((motion) => ({
          ...motion,
          id: generateId(),
          timestamp: new Date(),
        })),
        status: 'pending',
        timestamp: new Date(),
      };

      return Boolean(applyLocalOnlyMutation((state) => ({
        motionGroups: [...state.motionGroups, newMotionGroup],
      })));
    },

    advancePaperPresentation: (motionId, action, seconds = 0, paperIndex = 0) => {
      return Boolean(applyLocalOnlyMutation(state => {
        const group = findMotionGroupByMotionId(state.motionGroups, motionId);
        const motion = group?.motions.find(m => m.id === motionId);
        if (!group || group.status !== 'executing' || motion?.type !== 'paper_presentation' ||
            motion.status !== 'passed' || state.motionProcessingDraft?.motionId !== motionId ||
            state.motionProcessingState !== 'idle') return null;
        if (!Number.isSafeInteger(paperIndex) || paperIndex < 0 || paperIndex >= paperNames(motion).length) return null;
        const progress = advancePresentation(motion, action, seconds, paperIndex);
        const updated = motion.parameters.papers?.length
          ? {...motion, paperPresentations: paperNames(motion).map((_,i) => i === paperIndex ? progress : presentationProgress(motion,i))}
          : {...motion, presentation: progress};
        return {motionGroups: state.motionGroups.map(g => g.id === group.id ? {...g, motions:g.motions.map(m => m.id === motionId ? updated : m)} : g),
          motions:state.motions.map(m => m.id === motionId ? updated : m)};
      }));
    },

    editVotedMotion: async (id, correction) => {
      const initial = get();
      const found = findMotionById(initial.motions, initial.motionGroups, id);
      const fail = (message: string) => {set({motionProcessingError: message}); return false;};
      if (!found.motion || !found.group) return fail('Motion not found.');
      const error = validateMotionCorrection(found.motion, correction, initial.motionProcessingDraft);
      if (error) return fail(error);
      if (initial.publicMeetingId && !initial.hasCollaborationRoom) return fail('Reconnect before editing this motion.');
      if (initial.motionProcessingState !== 'idle') return fail('Wait for the current action to finish.');
      const patchLocal = () => {
        set(state => ({motions:state.motions.map(m=>m.id===id?correctMotion(m,correction):m),
          motionGroups:state.motionGroups.map(g=>({...g,motions:g.motions.map(m=>m.id===id?correctMotion(m,correction):m)})),motionProcessingError:null}));
        persistLocalState();
      };
      if (!isCompletedMotionGroup(found.group) || !initial.hasCollaborationRoom) {patchLocal(); return true;}
      // Completed records are shared: save against a fresh version, never display
      // an unsaved correction as successful or replace unrelated room records.
      sharedSyncChain = sharedSyncChain.catch(()=>false).then(async () => {
        const state=get(), auth=getAuthenticatedCollaborationContext();
        if (!auth || state.publicMeetingId!==initial.publicMeetingId) return fail('Reconnect before editing this motion.');
        try {
          const latest=await getCollaborationRoomStateRpc({publicMeetingId:state.publicMeetingId!,sessionId:auth.sessionId,memberToken:auth.memberToken});
          if(latest.activeMotion) return fail('Finish the active motion before correcting completed records.');
          const payload=hydrateSharedMeetingState(latest.sharedPayload,state.publicMeetingId!);
          const current=payload.motionGroups.flatMap(g=>g.motions).find(m=>m.id===id);
          if(!current) return fail('This record is no longer available.');
          if(JSON.stringify(current.parameters)!==JSON.stringify(found.motion!.parameters)||current.proposer!==found.motion!.proposer)return fail('This motion changed elsewhere. Reopen it and try again.');
          const validation=validateMotionCorrection(current,correction);
          if(validation)return fail(validation);
          const updated=correctMotion(current,correction);
          const result=await applyCollaborationStateUpdateRpc({publicMeetingId:state.publicMeetingId!,...auth,baseVersion:latest.version,
            nextSharedPayload:extractSharedMeetingState({...createBaseMeetingSessionState(state.id),...payload,motions:payload.motions.map(m=>m.id===id?updated:m),motionGroups:payload.motionGroups.map(g=>({...g,motions:g.motions.map(m=>m.id===id?updated:m)}))})});
          if(get().publicMeetingId!==state.publicMeetingId||get().sessionId!==auth.sessionId)return false;
          if (!await refreshLatestRoomStateSilently()) return fail('Saved, but unable to refresh the record. Reconnect to see the update.');
          set({motionProcessingError:null});
          return result.version>latest.version;
        } catch(error){return fail(toCollaborationRpcError(error,'apply_collaboration_state_update').userMessage);}
      });
      return sharedSyncChain;
    },

    editPendingMotionGroup: async (id, motions) => {
      if (motions.length < 1 || motions.some(m => m.status !== 'pending')) return false;
      const patch = applyLocalOnlyMutation(state => {
        const group = state.motionGroups.find(g => g.id === id);
        if (!group || group.status !== 'pending' || group.motions.some(m => m.status !== 'pending')) return null;
        const updated = motions.map(m => {
          const original = group.motions.find(old => old.id === m.id);
          return {type:m.type, parameters:{...m.parameters}, proposer:m.proposer, status:'pending' as const,
            id: original?.id ?? generateId(), timestamp: original?.timestamp ?? new Date()};
        });
        return {motionGroups:state.motionGroups.map(g => g.id === id ? {...g,motions:updated} : g)};
      });
      if (!patch) set({motionProcessingError:'This group can only be edited before voting starts.'});
      return Boolean(patch);
    },

    updateMotionGroupStatus: async (id, status) => {
      return Boolean(applyLocalOnlyMutation((state) => ({
        motionGroups: setMotionGroupStatus(state.motionGroups, id, status),
      })));
    },

    setMotionGroupVoteResult: (id, result) => {
      set((state) => ({
        motionGroups: state.motionGroups.map((group) =>
          group.id === id ? { ...group, voteResult: result } : group
        ),
      }));
    },

    selectMotionInGroup: (groupId, motionId) => {
      applyLocalOnlyMutation((state) => ({
        motionGroups: state.motionGroups.map((group) =>
          group.id === groupId ? { ...group, selectedMotionId: motionId } : group
        ),
      }));
    },

    startGroupVote: async (groupId) => {
      const group = get().motionGroups.find((entry) => entry.id === groupId);
      if (!group || group.motions.length === 0) return false;

      const nextMotionIndex = group.motions.findIndex((motion) => motion.status === 'pending');
      const firstPendingMotion = group.motions[nextMotionIndex === -1 ? 0 : nextMotionIndex];
      if (!firstPendingMotion) return false;

      return Boolean(applyLocalOnlyMutation((currentState) => ({
        currentVote: {
          motionGroupId: groupId,
          currentMotionIndex: nextMotionIndex === -1 ? 0 : nextMotionIndex,
          motionType: firstPendingMotion.type,
          for: 0,
          against: 0,
          abstain: 0,
        },
        motionGroups: setMotionGroupStatus(currentState.motionGroups, groupId, 'voting'),
      })));
    },

    confirmMotionVote: async (result) => {
      const state = get();
      if (!state.currentVote?.motionGroupId || state.currentVote.currentMotionIndex === undefined) {
        return false;
      }

      const { motionGroupId, currentMotionIndex } = state.currentVote;
      const group = state.motionGroups.find((entry) => entry.id === motionGroupId);
      if (!group) return false;

      const currentMotion = group.motions[currentMotionIndex];
      if (!currentMotion) return false;

      return get().submitMotionVoteResult(motionGroupId, currentMotion.id, result);
    },

    submitMotionVoteResult: async (groupId, motionId, result) => {
      const state = get();
      const group = state.motionGroups.find((entry) => entry.id === groupId);
      if (!group || group.status !== 'voting') {
        return false;
      }

      const currentMotion = group.motions.find((entry) => entry.id === motionId);
      if (!currentMotion) {
        return false;
      }

      let shouldSyncCompletedHistory = false;

      const patch = applyLocalOnlyMutation((currentState) => {
        const currentGroup = currentState.motionGroups.find((entry) => entry.id === groupId);
        if (!currentGroup || currentGroup.status !== 'voting') {
          return null;
        }

        const updatedGroupMotions = currentGroup.motions.map((motion) =>
          motion.id !== motionId
            ? motion
            : {
                ...motion,
                status: result.result === 'pass' ? ('passed' as const) : ('failed' as const),
                voteResult: result,
              }
        );

        const selectedMotion =
          updatedGroupMotions.find((motion) => motion.id === motionId) ?? currentMotion;
        const allFailed = updatedGroupMotions.every((motion) => motion.status === 'failed');
        const nextGroupStatus: MotionGroupStatus =
          result.result === 'pass'
            ? isProcessingMotionType(currentMotion.type)
              ? 'executing'
              : 'passed'
            : allFailed
              ? 'failed'
              : 'voting';
        shouldSyncCompletedHistory =
          nextGroupStatus === 'passed' || nextGroupStatus === 'failed';

        const updatedMotionGroups = currentState.motionGroups.map((entry) => {
          if (entry.id !== groupId) return entry;
          return {
            ...entry,
            motions: updatedGroupMotions,
            status: nextGroupStatus,
            selectedMotionId: result.result === 'pass' ? motionId : entry.selectedMotionId,
          };
        });

        const nextPendingIndex = updatedGroupMotions.findIndex(
          (motion) => motion.status === 'pending'
        );

        return {
          motions: upsertMotionRecord(currentState.motions, {
            ...selectedMotion,
            speakers: undefined,
            currentSpeakerIndex: undefined,
            speakingPhase: undefined,
          }),
          motionGroups: updatedMotionGroups,
          status:
            result.result === 'pass'
              ? deriveMeetingStatusFromPassedMotion(currentMotion.type, currentState.status)
              : currentState.status,
          meetingState:
            result.result === 'pass'
              ? deriveMeetingStatusFromPassedMotion(
                  currentMotion.type,
                  currentState.meetingState
                )
              : currentState.meetingState,
          currentVote:
            nextGroupStatus === 'voting' && nextPendingIndex >= 0
              ? {
                  motionGroupId: groupId,
                  currentMotionIndex: nextPendingIndex,
                  motionType: updatedGroupMotions[nextPendingIndex].type,
                  for: 0,
                  against: 0,
                  abstain: 0,
                }
              : null,
        };
      });

      if (!patch) {
        return false;
      }

      if (shouldSyncCompletedHistory) {
        void syncCompletedMotionHistory('submitMotionVoteResult');
      }

      return true;
    },

    createSpeakerListFallbackMotion: async ({ totalSpeakers, speakingTime }) => {
      const newMotion: Motion = {
        id: generateId(),
        type: 'speaker_list',
        proposer: undefined,
        parameters: {
          totalSpeakers,
          speakingTime,
        },
        status: 'passed',
        timestamp: new Date(),
      };

      const newGroup: MotionGroup = {
        id: generateId(),
        motions: [newMotion],
        status: 'executing',
        timestamp: new Date(),
        selectedMotionId: newMotion.id,
      };

      return Boolean(applyLocalOnlyMutation((currentState) => ({
        motions: upsertMotionRecord(currentState.motions, newMotion),
        motionGroups: [...currentState.motionGroups, newGroup],
        status: 'Moderated',
        meetingState: 'Moderated',
        currentVote: null,
      })));
    },

    clearMotionProcessingError: () => {
      set({ motionProcessingError: null });
    },

    beginMotionProcessing: async (motionId) => {
      const state = get();
      if (state.publicMeetingId && !state.hasCollaborationRoom) {
        set({motionProcessingError: 'Reconnect to the room before processing or finishing this motion. Your local draft is preserved.'});
        return false;
      }
      const { motion, group } = findMotionById(state.motions, state.motionGroups, motionId);

      if (!motion || !group || !isProcessingMotionType(motion.type)) {
        set({
          motionProcessingError: 'This motion cannot enter the processing flow.',
          motionProcessingState: 'idle',
          motionProcessingDraft: null,
        });
        return false;
      }

      const nextDraft = createMotionProcessingDraftFromState(motionId);
      if (!nextDraft) {
        set({
          motionProcessingError: 'Unable to initialize the local draft for this motion.',
          motionProcessingState: 'idle',
        });
        return false;
      }

      const auth = getAuthenticatedCollaborationContext();

      if (state.hasCollaborationRoom) {
        if (!state.publicMeetingId || !auth) {
          set({
            motionProcessingError:
              'Your collaboration session is incomplete. Please rejoin the room before processing this motion.',
            motionProcessingState: 'idle',
            motionProcessingDraft: null,
          });
          return false;
        }

        set({
          motionProcessingState: 'claiming',
          motionProcessingError: null,
        });

        try {
          const result = await setCollaborationMotionProcessingRpc({
            publicMeetingId: state.publicMeetingId,
            memberId: auth.memberId,
            sessionId: auth.sessionId,
            memberToken: auth.memberToken,
            motionId,
          });

          applyPresenceSnapshot({
            members: result.members,
            onlineCount: result.onlineCount,
            activeMotion: result.activeMotion,
          });

          set({
            motionProcessingDraft: nextDraft,
            motionProcessingState: 'idle',
            motionProcessingError: null,
          });
          setCollaborationConnectedState(state.publicMeetingId);
          persistLocalState();
          return true;
        } catch (error) {
          const collaborationError = toCollaborationRpcError(
            error,
            'set_collaboration_motion_processing'
          );

          if (collaborationError.shouldClearSession) {
            set({ collaborationError: collaborationError.userMessage });
            clearCollaborationOnlyState({
              keepError: true,
              preserveIdentity: collaborationError.code === 'sessionExpired',
            });
            return false;
          }

          set({
            motionProcessingError: collaborationError.userMessage,
            motionProcessingState: 'idle',
            motionProcessingDraft: null,
          });
          return false;
        }
      }

      set({
        motionProcessingDraft: nextDraft,
        motionProcessingState: 'idle',
        motionProcessingError: null,
      });
      return true;
    },

    releaseMotionProcessing: async (options) => {
      // Back releases the collaboration presence, not the local work. Pause and
      // checkpoint before waiting for the network, so departure cannot lose time.
      const activeDraft = get().motionProcessingDraft;
      if (activeDraft && (!options?.motionId || options.motionId === activeDraft.motionId)) {
        const pausedDraft = {
          ...activeDraft,
          speakers: activeDraft.speakers.map(speaker => ({...speaker, status: 'waiting' as const})),
        };
        const checkpoint = (motion: Motion): Motion => motion.id === pausedDraft.motionId
          ? {...applyMotionProcessingDraft(motion, pausedDraft), localProcessingTimePool: pausedDraft.timePool}
          : motion;
        set(current => ({
          motionProcessingDraft: pausedDraft,
          motions: current.motions.map(checkpoint),
          motionGroups: current.motionGroups.map(group => ({...group, motions: group.motions.map(checkpoint)})),
        }));
        persistLocalState();
      }
      const state = get();
      const auth = getAuthenticatedCollaborationContext();

      if (state.hasCollaborationRoom && state.publicMeetingId && auth) {
        set({
          motionProcessingState: 'releasing',
          motionProcessingError: options?.silent ? state.motionProcessingError : null,
        });

        try {
          const result = await setCollaborationMotionProcessingRpc({
            publicMeetingId: state.publicMeetingId,
            memberId: auth.memberId,
            sessionId: auth.sessionId,
            memberToken: auth.memberToken,
            motionId: null,
          });

          applyPresenceSnapshot({
            members: result.members,
            onlineCount: result.onlineCount,
            activeMotion: result.activeMotion,
          });

          setCollaborationConnectedState(state.publicMeetingId);
        } catch (error) {
          const collaborationError = toCollaborationRpcError(
            error,
            'set_collaboration_motion_processing'
          );

          if (collaborationError.shouldClearSession) {
            set({ collaborationError: collaborationError.userMessage });
            clearCollaborationOnlyState({
              keepError: true,
              preserveIdentity: collaborationError.code === 'sessionExpired',
            });
            return false;
          }

          if (!options?.silent) {
            set({
              motionProcessingError: collaborationError.userMessage,
            });
          }
        }
      }

      set({
        motionProcessingDraft: null,
        motionProcessingState: 'idle',
        motionProcessingError: options?.silent ? state.motionProcessingError : null,
      });
      persistLocalState();
      return true;
    },

    finishMotionProcessing: async (motionId) => {
      const state = get();
      if (state.publicMeetingId && !state.hasCollaborationRoom) {
        set({motionProcessingError: 'Reconnect to the room before processing or finishing this motion. Your local draft is preserved.'});
        return false;
      }
      const draft = state.motionProcessingDraft;
      const group = findMotionGroupByMotionId(state.motionGroups, motionId);
      const motion = group?.motions.find((entry) => entry.id === motionId) ?? null;

      if (!draft || draft.motionId !== motionId || !group || !motion) {
        set({
          motionProcessingState: 'idle',
          motionProcessingError:
            'The local processing draft for this motion no longer exists, so it cannot be submitted.',
        });
        return false;
      }

      if (motion.type === 'paper_presentation' && motion.parameters.papers?.length &&
          paperNames(motion).some((_,i) => !presentationProgress(motion,i).completed)) {
        set({motionProcessingError: 'Finish each paper before saving this presentation.'});
        return false;
      }

      const nextMotionGroups = state.motionGroups.map((entry) =>
        entry.id !== group.id
          ? entry
          : {
              ...entry,
              status: 'passed' as const,
              selectedMotionId: motionId,
            }
      );

      const nextMotionRecord = {
        ...motion,
        speakers: undefined,
        currentSpeakerIndex: undefined,
        speakingPhase: undefined,
      };

      const nextMotions = upsertMotionRecord(state.motions, nextMotionRecord);

      if (state.hasCollaborationRoom) {
        const auth = getAuthenticatedCollaborationContext();

        if (!state.publicMeetingId || !auth || state.version <= 0) {
          set({
            motionProcessingState: 'idle',
            motionProcessingError:
              'The collaboration session is not ready for Finish Motion. Please refresh the room and try again.',
          });
          return false;
        }

        set({
          motionProcessingState: 'finishing',
          motionProcessingError: null,
        });

        const payloadState = {
          ...state,
          motions: nextMotions,
          motionGroups: nextMotionGroups,
          timePool: draft.timePool,
          currentVote: null,
        };

        try {
          const result = await finishCollaborationMotionRpc({
            publicMeetingId: state.publicMeetingId,
            memberId: auth.memberId,
            sessionId: auth.sessionId,
            memberToken: auth.memberToken,
            requestedMotionId: motionId,
            baseVersion: state.version,
            nextSharedPayload: buildCompletedMotionHistoryPayload(payloadState, nextMotionGroups),
          });

          mergeCollaborationRoomIntoStore({
            roomId: result.roomId,
            publicMeetingId: state.publicMeetingId,
            memberId: auth.memberId,
            role: state.role ?? 'chair',
            memberToken: auth.memberToken,
            sessionId: auth.sessionId,
            version: result.version,
            members: result.members,
            onlineCount: result.onlineCount,
            activeMotion: result.activeMotion,
            heartbeatIntervalSeconds: state.heartbeatIntervalSeconds,
            sessionTimeoutSeconds: state.sessionTimeoutSeconds,
            sharedPayload: result.sharedPayload,
            displayName: state.displayName,
            preserveLocalMeetingState: true,
          });
          set({
            timePool: draft.timePool,
            currentVote: null,
            motionProcessingDraft: null,
            motionProcessingState: 'idle',
            motionProcessingError: null,
          });
          setCollaborationConnectedState(state.publicMeetingId);
          persistLocalState();
          return true;
        } catch (error) {
          const collaborationError = toCollaborationRpcError(
            error,
            'finish_collaboration_motion'
          );

          if (collaborationError.shouldClearSession) {
            set({ collaborationError: collaborationError.userMessage });
            clearCollaborationOnlyState({
              keepError: true,
              preserveIdentity: collaborationError.code === 'sessionExpired',
            });
            return false;
          }

          if (
            collaborationError.isVersionConflict ||
            collaborationError.code === 'motionFinishConflict' ||
            collaborationError.code === 'activeMotionConflict'
          ) {
            await refreshRoomStateAfterMotionConflict(collaborationError.userMessage);
          } else {
            set({
              motionProcessingError: collaborationError.userMessage,
            });
          }

          set({
            motionProcessingState: 'idle',
          });
          return false;
        }
      }

      set({
        motions: nextMotions,
        motionGroups: nextMotionGroups,
        timePool: draft.timePool,
        currentVote: null,
        motionProcessingDraft: null,
        motionProcessingState: 'idle',
        motionProcessingError: null,
      });
      persistLocalState();
      return true;
    },

    refreshRoomStateAfterMotionConflict: (message) => refreshRoomStateAfterMotionConflict(message),

    // Collaboration actions
    createCollaborationRoom: async ({ accessCode }) => {
      const state = get();
      const publicMeetingId = state.id.trim();
      const meetingName = state.name.trim();
      const committeeName = state.committeeName.trim();
      const chairName = state.chairName.trim();
      const pin = accessCode.trim();

      if (!publicMeetingId) {
        setCollaborationErrorState('Meeting ID is required.');
        return false;
      }

      if (!meetingName) {
        setCollaborationErrorState('Please enter a Meeting Name.');
        return false;
      }

      if (!committeeName) {
        setCollaborationErrorState('Please enter a Committee Name.');
        return false;
      }

      if (!chairName) {
        setCollaborationErrorState('Please enter a Chair Name.');
        return false;
      }

      if (!pin) {
        setCollaborationErrorState('Please enter a PIN.');
        return false;
      }

      set({
        id: publicMeetingId,
        name: meetingName,
        committeeName,
        chairName,
        collaborationStatus: 'creating',
        collaborationError: null,
        isDemoMode: false,
        ...createLegacyCloudState('saving', `Creating collaboration room: ${publicMeetingId}`),
      });

      try {
        const bootstrap = await createCollaborationRoomRpc({
          publicMeetingId,
          accessCode: pin,
          hostName: chairName,
          initialSharedPayload: buildCompletedMotionHistoryPayload(get(), get().motionGroups),
          clientInstanceId: get().clientInstanceId,
        });

        mergeCollaborationRoomIntoStore({
          roomId: bootstrap.roomId,
          publicMeetingId: bootstrap.publicMeetingId,
          memberId: bootstrap.memberId,
          role: bootstrap.role,
          memberToken: bootstrap.memberToken,
          sessionId: bootstrap.sessionId,
          version: bootstrap.version,
          members: bootstrap.members,
          onlineCount: bootstrap.onlineCount,
          activeMotion: bootstrap.activeMotion,
          heartbeatIntervalSeconds: bootstrap.heartbeatIntervalSeconds,
          sessionTimeoutSeconds: bootstrap.sessionTimeoutSeconds,
          sharedPayload: bootstrap.sharedPayload,
          displayName: chairName,
          preserveLocalMeetingState: true,
        });
        saveStoredHostAccessCode(publicMeetingId, pin);
        set({ currentStep: 'delegates' });
        persistLocalState();
        return true;
      } catch (error) {
        const collaborationError = toCollaborationRpcError(error, 'create_collaboration_room');
        setCollaborationErrorState(collaborationError.userMessage);
        return false;
      }
    },

    joinCollaborationRoom: async ({ publicMeetingId, accessCode, displayName }) => {
      const trimmedMeetingId = publicMeetingId.trim();
      const trimmedAccessCode = accessCode.trim();
      const trimmedDisplayName = displayName.trim();
      const reusableMemberToken = getReusableMemberToken(trimmedMeetingId, trimmedDisplayName);

      if (!trimmedMeetingId) {
        setCollaborationErrorState('Please enter a Meeting ID.');
        return false;
      }

      if (!trimmedAccessCode) {
        setCollaborationErrorState('Please enter a PIN.');
        return false;
      }

      if (!trimmedDisplayName) {
        setCollaborationErrorState('Please enter your name.');
        return false;
      }

      set({
        collaborationStatus: 'joining',
        collaborationError: null,
        ...createLegacyCloudState('loading', `Joining meeting: ${trimmedMeetingId}`),
      });

      try {
        const bootstrap = await joinCollaborationRoomRpc({
          publicMeetingId: trimmedMeetingId,
          accessCode: trimmedAccessCode,
          displayName: trimmedDisplayName,
          clientInstanceId: get().clientInstanceId,
          memberToken: reusableMemberToken,
        });

        mergeCollaborationRoomIntoStore({
          roomId: bootstrap.roomId,
          publicMeetingId: bootstrap.publicMeetingId,
          memberId: bootstrap.memberId,
          role: bootstrap.role,
          memberToken: bootstrap.memberToken,
          sessionId: bootstrap.sessionId,
          version: bootstrap.version,
          members: bootstrap.members,
          onlineCount: bootstrap.onlineCount,
          activeMotion: bootstrap.activeMotion,
          heartbeatIntervalSeconds: bootstrap.heartbeatIntervalSeconds,
          sessionTimeoutSeconds: bootstrap.sessionTimeoutSeconds,
          sharedPayload: bootstrap.sharedPayload,
          displayName: trimmedDisplayName,
          preserveLocalMeetingState: false,
        });
        if (bootstrap.role === 'host') {
          saveStoredHostAccessCode(trimmedMeetingId, trimmedAccessCode);
        }
        persistLocalState();
        return true;
      } catch (error) {
        const collaborationError = toCollaborationRpcError(error, 'join_collaboration_room');
        setCollaborationErrorState(collaborationError.userMessage);
        return false;
      }
    },

    restoreCollaborationRoomState: async () => {
      const state = get();

      if (!state.publicMeetingId || !state.sessionId || !state.memberToken) {
        return false;
      }

      set({
        collaborationStatus: 'restoring',
        collaborationError: null,
        ...createLegacyCloudState('loading', `Restoring meeting: ${state.publicMeetingId}`),
      });

      try {
        const restoredState = await getCollaborationRoomStateRpc({
          publicMeetingId: state.publicMeetingId,
          sessionId: state.sessionId,
          memberToken: state.memberToken,
        });

        mergeCollaborationRoomIntoStore({
          roomId: restoredState.roomId,
          publicMeetingId: restoredState.publicMeetingId,
          memberId: restoredState.memberId,
          role: restoredState.role,
          memberToken: state.memberToken,
          sessionId: restoredState.sessionId,
          version: restoredState.version,
          members: restoredState.members,
          onlineCount: restoredState.onlineCount,
          activeMotion: restoredState.activeMotion,
          heartbeatIntervalSeconds: restoredState.heartbeatIntervalSeconds,
          sessionTimeoutSeconds: restoredState.sessionTimeoutSeconds,
          sharedPayload: restoredState.sharedPayload,
          displayName: state.displayName,
          preserveLocalMeetingState: false,
        });
        persistLocalState();
        return true;
      } catch (error) {
        const collaborationError = toCollaborationRpcError(
          error,
          'get_collaboration_room_state'
        );
        if (collaborationError.shouldClearSession) {
          set({ collaborationError: collaborationError.userMessage });
          clearCollaborationOnlyState({
            keepError: true,
            preserveIdentity: collaborationError.code === 'sessionExpired',
          });
          return false;
        }

        set({
          collaborationStatus: 'error',
          collaborationError: collaborationError.userMessage,
          hasCollaborationRoom: false,
          ...createLegacyCloudState('error', collaborationError.userMessage),
        });
        persistLocalState();
        return false;
      }
    },

    heartbeatCollaborationMember: async () => {
      const auth = getAuthenticatedCollaborationContext();
      const state = get();

      if (!auth || !state.hasCollaborationRoom) {
        return false;
      }

      if (heartbeatRequestInFlight) {
        return true;
      }

      heartbeatRequestInFlight = true;

      try {
        const snapshot = await heartbeatCollaborationMemberRpc(auth);
        applyPresenceSnapshot(snapshot);
        await refreshLatestRoomStateSilently();

        const latestState = get();
        if (latestState.hasCollaborationRoom && latestState.publicMeetingId) {
          set({
            collaborationError: null,
          });
          setCollaborationConnectedState(latestState.publicMeetingId);
        }
        persistLocalState();
        return true;
      } catch (error) {
        const collaborationError = toCollaborationRpcError(
          error,
          'heartbeat_collaboration_member'
        );

        if (collaborationError.code === 'sessionExpired') {
          const restored = await get().restoreCollaborationRoomState();
          if (restored) {
            return true;
          }
        }

        if (collaborationError.shouldClearSession) {
          set({ collaborationError: collaborationError.userMessage });
          clearCollaborationOnlyState({
            keepError: true,
            preserveIdentity: collaborationError.code === 'sessionExpired',
          });
          return false;
        }

        set({
          collaborationStatus: state.hasCollaborationRoom ? 'connected' : 'error',
          collaborationError: collaborationError.userMessage,
          ...createLegacyCloudState('error', collaborationError.userMessage),
        });
        persistLocalState();
        return false;
      } finally {
        heartbeatRequestInFlight = false;
      }
    },

    leaveCollaborationMember: async (options) => {
      const auth = getAuthenticatedCollaborationContext();
      const state = get();
      const shouldPreserveIdentity = Boolean(options?.preserveLocalSession);
      const shouldPreserveSession = Boolean(options?.preserveStoredSession);
      const clearOptions = {
        resetMeeting: true,
        preserveIdentity: shouldPreserveIdentity,
        preserveSession: shouldPreserveSession,
        resetPreferences: options?.resetPreferences,
      } as const;

      if (!auth) {
        clearCollaborationSessionInternal(clearOptions);
        return false;
      }

      const leaveRequest = dispatchLeaveRequest({
        ...auth,
        disconnectReason: options?.disconnectReason,
        preferKeepalive: options?.preferKeepalive,
      });

      if (shouldPreserveSession && shouldPreserveIdentity) {
        persistLocalState();
        try { await leaveRequest; } catch { /* Best effort during page exit. */ }
        return true;
      }

      if (options?.clearLocalImmediately) {
        clearCollaborationSessionInternal(clearOptions);

        try {
          await leaveRequest;
        } catch {
          // Best-effort leave during reset/page exit should not disrupt local teardown.
        }

        return true;
      }

      try {
        const snapshot = await leaveRequest;
        if (snapshot) {
          applyPresenceSnapshot(snapshot);
        }
      } catch (error) {
        const collaborationError = toCollaborationRpcError(
          error,
          'leave_collaboration_member'
        );

        if (!shouldPreserveIdentity) {
          set({ collaborationError: collaborationError.userMessage });
        }
      }

      if (shouldPreserveIdentity) {
        clearCollaborationSessionInternal(clearOptions);
        return true;
      }

      if (state.publicMeetingId) {
        clearCollaborationSessionInternal({ resetMeeting: true });
      } else {
        clearCollaborationSessionInternal();
      }
      return true;
    },

    applySharedStateUpdate: async (options) => queueSharedStateSync(options?.source),

    clearCollaborationSession: (options) => {
      clearCollaborationSessionInternal(options);
    },

    // Legacy cloud compatibility
    saveToCloud: async () => {
      set({
        ...createLegacyCloudState('error', legacyCloudDisabledMessage),
      });
      return false;
    },

    loadFromCloud: async () => {
      set({
        ...createLegacyCloudState('error', legacyCloudDisabledMessage),
      });
      return false;
    },

    // Persistence
    saveToLocalStorage: () => {
      persistLocalState();
    },

    loadFromLocalStorage: () => {
      const persistedState = loadPersistedCollaborationLocalState();
      clearLegacyMeetingSnapshotStorage();
      lastPersistedLocalState = JSON.stringify(persistedState);
      const persistedIdentity =
        persistedState.recoverableIdentity ?? persistedState.collaborationSession;

      set({
        ...restoreLocalMeetingDraft(persistedState.localDraft, persistedIdentity),
        ...persistedState.preferences,
        clientInstanceId: persistedState.clientInstanceId,
        roomId: persistedState.collaborationSession?.roomId ?? null,
        publicMeetingId: persistedIdentity?.publicMeetingId ?? null,
        memberId: persistedIdentity?.memberId ?? null,
        role: persistedIdentity?.role ?? null,
        memberToken: persistedIdentity?.memberToken ?? null,
        sessionId: persistedState.collaborationSession?.sessionId ?? null,
        displayName: persistedIdentity?.displayName ?? null,
        hasCollaborationRoom: false,
        collaborationStatus: persistedState.collaborationSession ? 'restoring' : 'idle',
        collaborationError: null,
        ...createLegacyCloudState(
          isSupabaseConfigured ? 'idle' : 'unconfigured',
          getInitialCloudMessage()
        ),
      });
    },
  };
});

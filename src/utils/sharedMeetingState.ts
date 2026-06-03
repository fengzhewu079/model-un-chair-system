import type {
  Delegate,
  MeetingSessionState,
  MeetingStatus,
  Motion,
  MotionGroup,
  RollCallResult,
  SetupStep,
  Speaker,
  VoteResult,
} from '../types';

type SerializableVoteResult = Omit<VoteResult, 'timestamp'> & {
  timestamp: string;
};

type SerializableDelegate = Omit<Delegate, 'timestamp'> & {
  timestamp: string;
};

type SerializableRollCall = Omit<RollCallResult, 'delegates' | 'completedAt'> & {
  delegates: SerializableDelegate[];
  completedAt?: string;
};

type SerializableMotion = Omit<
  Motion,
  'timestamp' | 'voteResult' | 'speakers' | 'currentSpeakerIndex' | 'speakingPhase'
> & {
  timestamp: string;
  voteResult?: SerializableVoteResult;
};

type SerializableMotionGroup = Omit<MotionGroup, 'timestamp' | 'voteResult' | 'motions'> & {
  timestamp: string;
  voteResult?: SerializableVoteResult;
  motions: SerializableMotion[];
};

export interface SharedMeetingState {
  id: string;
  name: string;
  chairName: string;
  committeeName: string;
  status: MeetingStatus;
  meetingState: MeetingStatus;
  startTime: string;
  rollCall: SerializableRollCall;
  currentSpeaker: Speaker | null;
  waitingQueue: Speaker[];
  timePool: number;
  motions: SerializableMotion[];
  motionGroups: SerializableMotionGroup[];
}

export interface LocalMeetingPreferences {
  fontSize: MeetingSessionState['fontSize'];
  isMuted: boolean;
  soundAlerts: number[];
  volume: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isMeetingStatus = (value: unknown): value is MeetingStatus =>
  value === 'setup' ||
  value === 'roll_call' ||
  value === 'GSL' ||
  value === 'Moderated' ||
  value === 'Unmoderated' ||
  value === 'Voting' ||
  value === 'Suspension';

const toDate = (value: unknown, fallback: Date) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
};

const toIsoString = (value: unknown, fallback: Date) => toDate(value, fallback).toISOString();

const toFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const toOptionalFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizeSpeaker = (speaker: unknown): Speaker | null => {
  if (!isRecord(speaker)) return null;

  const id = typeof speaker.id === 'string' ? speaker.id : '';
  const name = typeof speaker.name === 'string' ? speaker.name : '';
  const status = speaker.status === 'speaking' ? 'speaking' : 'waiting';
  const speakingTime = toFiniteNumber(speaker.speakingTime, 0);
  const remainingTime = toFiniteNumber(speaker.remainingTime, speakingTime);

  if (!id || !name) return null;

  return {
    id,
    name,
    status,
    speakingTime,
    remainingTime,
  };
};

const normalizeSpeakers = (speakers: unknown): Speaker[] =>
  Array.isArray(speakers)
    ? speakers
        .map((speaker) => normalizeSpeaker(speaker))
        .filter((speaker): speaker is Speaker => Boolean(speaker))
    : [];

const serializeVoteResult = (voteResult?: VoteResult): SerializableVoteResult | undefined => {
  if (!voteResult) return undefined;

  return {
    ...voteResult,
    timestamp: toIsoString(voteResult.timestamp, new Date()),
  };
};

const reviveVoteResult = (voteResult?: SerializableVoteResult): VoteResult | undefined => {
  if (!voteResult) return undefined;

  return {
    ...voteResult,
    timestamp: toDate(voteResult.timestamp, new Date()),
  };
};

const serializeMotion = (motion: Motion): SerializableMotion => ({
  id: motion.id,
  type: motion.type,
  proposer: motion.proposer,
  parameters: motion.parameters,
  status: motion.status,
  timestamp: toIsoString(motion.timestamp, new Date()),
  voteResult: serializeVoteResult(motion.voteResult),
});

const reviveMotion = (motion: unknown): Motion | null => {
  if (!isRecord(motion)) return null;

  const id = typeof motion.id === 'string' ? motion.id : '';
  const type = motion.type;

  if (!id || typeof type !== 'string') {
    return null;
  }

  return {
    id,
    type: type as Motion['type'],
    proposer: typeof motion.proposer === 'string' ? motion.proposer : undefined,
    parameters: isRecord(motion.parameters)
      ? {
          totalTime: toOptionalFiniteNumber(motion.parameters.totalTime),
          totalSpeakers: toOptionalFiniteNumber(motion.parameters.totalSpeakers),
          speakingTime: toOptionalFiniteNumber(motion.parameters.speakingTime),
          topic: typeof motion.parameters.topic === 'string' ? motion.parameters.topic : undefined,
        }
      : {},
    status: motion.status as Motion['status'],
    voteResult: reviveVoteResult(motion.voteResult as SerializableVoteResult | undefined),
    timestamp: toDate(motion.timestamp, new Date()),
  };
};

const serializeMotionGroup = (group: MotionGroup): SerializableMotionGroup => ({
  ...group,
  timestamp: toIsoString(group.timestamp, new Date()),
  voteResult: serializeVoteResult(group.voteResult),
  motions: group.motions.map(serializeMotion),
});

const reviveMotionGroup = (group: unknown): MotionGroup | null => {
  if (!isRecord(group)) return null;

  const id = typeof group.id === 'string' ? group.id : '';
  if (!id) return null;

  return {
    id,
    motions: Array.isArray(group.motions)
      ? group.motions
          .map((motion) => reviveMotion(motion))
          .filter((motion): motion is Motion => Boolean(motion))
      : [],
    status:
      group.status === 'voting' ||
      group.status === 'executing' ||
      group.status === 'passed' ||
      group.status === 'failed'
        ? group.status
        : 'pending',
    voteResult: reviveVoteResult(group.voteResult as SerializableVoteResult | undefined),
    timestamp: toDate(group.timestamp, new Date()),
    selectedMotionId:
      typeof group.selectedMotionId === 'string' ? group.selectedMotionId : undefined,
  };
};

const serializeDelegate = (delegate: Delegate): SerializableDelegate => ({
  ...delegate,
  timestamp: toIsoString(delegate.timestamp, new Date()),
});

const reviveDelegate = (delegate: unknown): Delegate | null => {
  if (!isRecord(delegate)) return null;

  const id = typeof delegate.id === 'string' ? delegate.id : '';
  const name = typeof delegate.name === 'string' ? delegate.name : '';
  const attendance =
    delegate.attendance === 'present' ||
    delegate.attendance === 'present_and_voting' ||
    delegate.attendance === 'absent'
      ? delegate.attendance
      : 'unmarked';

  if (!id || !name) return null;

  return {
    id,
    name,
    attendance,
    timestamp: toDate(delegate.timestamp, new Date()),
  };
};

export const createEmptyRollCall = (): RollCallResult => ({
  delegates: [],
  totalDelegates: 0,
  presentCount: 0,
  presentAndVotingCount: 0,
  absentCount: 0,
  completed: false,
});

export const summarizeRollCall = (
  delegates: Delegate[],
  options?: { completed?: boolean; completedAt?: Date }
): RollCallResult => {
  const presentCount = delegates.filter((delegate) => delegate.attendance === 'present').length;
  const presentAndVotingCount = delegates.filter(
    (delegate) => delegate.attendance === 'present_and_voting'
  ).length;
  const absentCount = delegates.filter((delegate) => delegate.attendance === 'absent').length;

  return {
    delegates,
    totalDelegates: delegates.length,
    presentCount,
    presentAndVotingCount,
    absentCount,
    completed: options?.completed ?? false,
    completedAt: options?.completedAt,
  };
};

export const createDefaultSharedMeetingState = (publicMeetingId: string): SharedMeetingState => ({
  id: publicMeetingId,
  name: '',
  chairName: '',
  committeeName: '',
  status: 'setup',
  meetingState: 'setup',
  startTime: new Date().toISOString(),
  rollCall: {
    delegates: [],
    totalDelegates: 0,
    presentCount: 0,
    presentAndVotingCount: 0,
    absentCount: 0,
    completed: false,
  },
  currentSpeaker: null,
  waitingQueue: [],
  timePool: 0,
  motions: [],
  motionGroups: [],
});

export const extractSharedMeetingState = (state: MeetingSessionState): SharedMeetingState => ({
  id: state.id,
  name: state.name,
  chairName: state.chairName,
  committeeName: state.committeeName,
  status: state.status,
  meetingState: state.meetingState,
  startTime: toIsoString(state.startTime, new Date()),
  rollCall: {
    ...state.rollCall,
    delegates: state.rollCall.delegates.map(serializeDelegate),
    completedAt: state.rollCall.completedAt
      ? toIsoString(state.rollCall.completedAt, new Date())
      : undefined,
  },
  currentSpeaker: state.currentSpeaker,
  waitingQueue: state.waitingQueue,
  timePool: state.timePool,
  motions: state.motions.map(serializeMotion),
  motionGroups: state.motionGroups.map(serializeMotionGroup),
});

export const hydrateSharedMeetingState = (
  payload: unknown,
  publicMeetingId: string
): Pick<
  MeetingSessionState,
  | 'id'
  | 'name'
  | 'chairName'
  | 'committeeName'
  | 'status'
  | 'startTime'
  | 'rollCall'
  | 'meetingState'
  | 'currentSpeaker'
  | 'waitingQueue'
  | 'speakerQueue'
  | 'timePool'
  | 'motions'
  | 'motionGroups'
> => {
  const base = createDefaultSharedMeetingState(publicMeetingId);
  const source = isRecord(payload) ? payload : {};
  const rollCallSource = isRecord(source.rollCall) ? source.rollCall : null;
  const delegates = Array.isArray(rollCallSource?.delegates)
    ? (rollCallSource.delegates ?? [])
        .map((delegate) => reviveDelegate(delegate))
        .filter((delegate): delegate is Delegate => Boolean(delegate))
    : [];
  const currentSpeaker = normalizeSpeaker(source.currentSpeaker);
  const waitingQueue = normalizeSpeakers(source.waitingQueue);
  const baseCompletedAt =
    rollCallSource?.completedAt
      ? toDate(rollCallSource.completedAt, new Date())
      : undefined;
  const rollCall = summarizeRollCall(delegates, {
    completed:
      typeof rollCallSource?.completed === 'boolean'
        ? rollCallSource.completed
        : base.rollCall.completed,
    completedAt: baseCompletedAt,
  });
  const status = isMeetingStatus(source.status) ? source.status : base.status;
  const meetingState = isMeetingStatus(source.meetingState) ? source.meetingState : status;

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : publicMeetingId,
    name: typeof source.name === 'string' ? source.name : base.name,
    chairName: typeof source.chairName === 'string' ? source.chairName : base.chairName,
    committeeName:
      typeof source.committeeName === 'string' ? source.committeeName : base.committeeName,
    status,
    startTime: toDate(source.startTime, new Date(base.startTime)),
    rollCall,
    meetingState,
    currentSpeaker,
    waitingQueue,
    speakerQueue: waitingQueue,
    timePool: toFiniteNumber(source.timePool, base.timePool),
    motions: Array.isArray(source.motions)
      ? source.motions
          .map((motion) => reviveMotion(motion))
          .filter((motion): motion is Motion => Boolean(motion))
      : [],
    motionGroups: Array.isArray(source.motionGroups)
      ? source.motionGroups
          .map((group) => reviveMotionGroup(group))
          .filter((group): group is MotionGroup => Boolean(group))
      : [],
  };
};

export const deriveSetupStepFromMeetingState = (
  state: Pick<MeetingSessionState, 'rollCall'>
): SetupStep => {
  if (state.rollCall.delegates.length === 0) {
    return 'delegates';
  }

  const hasMarkedAttendance = state.rollCall.delegates.some(
    (delegate) => delegate.attendance !== 'unmarked'
  );

  return hasMarkedAttendance ? 'roll_call' : 'delegates';
};

export const extractLocalMeetingPreferences = (
  state: Pick<MeetingSessionState, 'fontSize' | 'isMuted' | 'soundAlerts' | 'volume'>
): LocalMeetingPreferences => ({
  fontSize: state.fontSize,
  isMuted: state.isMuted,
  soundAlerts: state.soundAlerts,
  volume: state.volume,
});

export const hydrateLocalMeetingPreferences = (
  payload: unknown
): LocalMeetingPreferences => {
  const source = isRecord(payload) ? payload : {};

  return {
    fontSize:
      source.fontSize === 'small' || source.fontSize === 'large' ? source.fontSize : 'medium',
    isMuted: Boolean(source.isMuted),
    soundAlerts: Array.isArray(source.soundAlerts)
      ? source.soundAlerts.filter((value): value is number => typeof value === 'number')
      : [10, 0],
    volume: Math.max(0, Math.min(1, toFiniteNumber(source.volume, 0.5))),
  };
};

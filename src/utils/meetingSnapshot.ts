import type {
  Delegate,
  MeetingSessionState,
  Motion,
  MotionGroup,
  RollCallResult,
  VoteResult,
} from '../types';

// Legacy single-snapshot helper kept only for backward compatibility with the old
// public.meetings storage path. The collaboration main flow should use the
// shared/local state helpers in src/utils/sharedMeetingState.ts instead.

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

type SerializableMotion = Omit<Motion, 'timestamp' | 'voteResult'> & {
  timestamp: string;
  voteResult?: SerializableVoteResult;
};

type SerializableMotionGroup = Omit<MotionGroup, 'timestamp' | 'voteResult' | 'motions'> & {
  timestamp: string;
  voteResult?: SerializableVoteResult;
  motions: SerializableMotion[];
};

export type MeetingSnapshot = Omit<
  MeetingSessionState,
  'startTime' | 'rollCall' | 'motions' | 'motionGroups'
> & {
  startTime: string;
  rollCall: SerializableRollCall;
  motions: SerializableMotion[];
  motionGroups: SerializableMotionGroup[];
};

const serializeVoteResult = (voteResult?: VoteResult): SerializableVoteResult | undefined => {
  if (!voteResult) return undefined;
  return {
    ...voteResult,
    timestamp: voteResult.timestamp instanceof Date
      ? voteResult.timestamp.toISOString()
      : new Date(voteResult.timestamp).toISOString(),
  };
};

const serializeMotion = (motion: Motion): SerializableMotion => ({
  ...motion,
  timestamp:
    motion.timestamp instanceof Date
      ? motion.timestamp.toISOString()
      : new Date(motion.timestamp).toISOString(),
  voteResult: serializeVoteResult(motion.voteResult),
});

const serializeMotionGroup = (group: MotionGroup): SerializableMotionGroup => ({
  ...group,
  timestamp:
    group.timestamp instanceof Date
      ? group.timestamp.toISOString()
      : new Date(group.timestamp).toISOString(),
  voteResult: serializeVoteResult(group.voteResult),
  motions: group.motions.map(serializeMotion),
});

export const createMeetingSnapshot = (state: MeetingSessionState): MeetingSnapshot => ({
  id: state.id,
  name: state.name,
  chairName: state.chairName,
  committeeName: state.committeeName,
  status: state.status,
  startTime:
    state.startTime instanceof Date
      ? state.startTime.toISOString()
      : new Date(state.startTime).toISOString(),
  rollCall: {
    ...state.rollCall,
    delegates: state.rollCall.delegates.map((delegate) => ({
      ...delegate,
      timestamp:
        delegate.timestamp instanceof Date
          ? delegate.timestamp.toISOString()
          : new Date(delegate.timestamp).toISOString(),
    })),
    completedAt: state.rollCall.completedAt
      ? state.rollCall.completedAt instanceof Date
        ? state.rollCall.completedAt.toISOString()
        : new Date(state.rollCall.completedAt).toISOString()
      : undefined,
  },
  currentStep: state.currentStep,
  meetingState: state.meetingState,
  currentSpeaker: state.currentSpeaker,
  waitingQueue: state.waitingQueue,
  speakerQueue: state.speakerQueue,
  timerState: state.timerState,
  timePool: state.timePool,
  motions: state.motions.map(serializeMotion),
  motionGroups: state.motionGroups.map(serializeMotionGroup),
  currentVote: state.currentVote,
  isMuted: state.isMuted,
  fontSize: state.fontSize,
  soundAlerts: state.soundAlerts,
  volume: state.volume,
});

const reviveVoteResult = (voteResult?: SerializableVoteResult): VoteResult | undefined => {
  if (!voteResult) return undefined;
  return {
    ...voteResult,
    timestamp: new Date(voteResult.timestamp),
  };
};

const reviveMotion = (motion: SerializableMotion): Motion => ({
  ...motion,
  timestamp: new Date(motion.timestamp),
  voteResult: reviveVoteResult(motion.voteResult),
});

const reviveMotionGroup = (group: SerializableMotionGroup): MotionGroup => ({
  ...group,
  timestamp: new Date(group.timestamp),
  voteResult: reviveVoteResult(group.voteResult),
  motions: group.motions.map(reviveMotion),
});

export const reviveMeetingSnapshot = (snapshot: MeetingSnapshot): MeetingSessionState => ({
  ...snapshot,
  startTime: new Date(snapshot.startTime),
  rollCall: {
    ...snapshot.rollCall,
    delegates: snapshot.rollCall.delegates.map((delegate) => ({
      ...delegate,
      timestamp: new Date(delegate.timestamp),
    })),
    completedAt: snapshot.rollCall.completedAt
      ? new Date(snapshot.rollCall.completedAt)
      : undefined,
  },
  motions: snapshot.motions.map(reviveMotion),
  motionGroups: snapshot.motionGroups.map(reviveMotionGroup),
});

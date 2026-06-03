// Delegate (for Roll Call)
export interface Delegate {
  id: string;
  name: string;
  attendance: 'present' | 'present_and_voting' | 'absent' | 'unmarked';
  timestamp: Date;
}

// Roll Call Result
export interface RollCallResult {
  delegates: Delegate[];
  totalDelegates: number;
  presentCount: number;
  presentAndVotingCount: number;
  absentCount: number;
  completed: boolean;
  completedAt?: Date;
}

// Meeting State
export type MeetingStatus = 'setup' | 'roll_call' | 'GSL' | 'Moderated' | 'Unmoderated' | 'Voting' | 'Suspension';

export interface MeetingState {
  id: string;
  name: string;
  chairName: string;
  committeeName: string;
  status: MeetingStatus;
  startTime: Date;
  rollCall: RollCallResult;
}

// Speaker
export interface Speaker {
  id: string;
  name: string;
  status: 'speaking' | 'waiting';
  speakingTime: number; // seconds (total allocated time)
  remainingTime: number; // seconds (time left)
}

// Motion
export type MotionType =
  | 'moderated_caucus'
  | 'unmoderated_caucus'
  | 'speaker_list'
  | 'extend_moderated'
  | 'extend_unmoderated'
  | 'close_debate'
  | 'resume_debate'
  | 'adjourn_meeting';

export type MotionStatus = 'pending' | 'voting' | 'passed' | 'failed';
export type MotionGroupStatus = 'pending' | 'voting' | 'executing' | 'passed' | 'failed';
export type MotionProcessingPhase = 'adding' | 'in_progress' | 'completed';

export interface Motion {
  id: string;
  type: MotionType;
  proposer?: string;
  parameters: {
    totalTime?: number; // minutes (for unmoderated caucus)
    totalSpeakers?: number; // number of speakers (for moderated caucus)
    speakingTime?: number; // seconds
    topic?: string;
  };
  status: MotionStatus;
  voteResult?: VoteResult;
  timestamp: Date;
  // Speaker management for moderated caucus
  speakers?: Speaker[];
  currentSpeakerIndex?: number;
  speakingPhase?: MotionProcessingPhase; // Track motion phase
}

// Vote Result
export interface VoteResult {
  for: number;
  against: number;
  abstain: number;
  total: number;
  votingBase: number;
  result: 'pass' | 'fail';
  rule: string;
  timestamp: Date;
}

export interface VoteDraft {
  motionId?: string;
  motionGroupId?: string;
  currentMotionIndex?: number;
  motionType?: MotionType;
  for: number;
  against: number;
  abstain: number;
}

// Motion Group - contains multiple motions that are voted on together
export interface MotionGroup {
  id: string;
  motions: Motion[];
  status: MotionGroupStatus;
  voteResult?: VoteResult;
  timestamp: Date;
  selectedMotionId?: string; // Which motion was selected to execute after passing
}

export interface MotionProcessingDraft {
  motionId: string;
  groupId: string;
  motionType: MotionType;
  speakers: Speaker[];
  currentSpeakerIndex?: number;
  speakingPhase: MotionProcessingPhase;
  timePool: number;
}

export interface MeetingSessionState extends MeetingState {
  currentStep: SetupStep;
  meetingState: MeetingStatus;
  currentSpeaker: Speaker | null;
  waitingQueue: Speaker[];
  speakerQueue: Speaker[];
  timerState: { isRunning: boolean };
  timePool: number;
  motions: Motion[];
  motionGroups: MotionGroup[];
  currentVote: VoteDraft | null;
  isMuted: boolean;
  fontSize: 'small' | 'medium' | 'large';
  soundAlerts: number[];
  volume: number;
}

// Setup Steps
export type SetupStep = 'meeting_info' | 'delegates' | 'roll_call';

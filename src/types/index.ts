import type { ResolutionVoteDraft } from '../utils/resolutionVoting';
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
export type MeetingStatus = 'setup' | 'roll_call' | 'GSL' | 'Moderated' | 'Unmoderated' | 'Voting' | 'Suspension' | 'Presentation';

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

export interface PaperPresentationProgress {
  phase: 'presentation' | 'qa';
  remainingSeconds: number;
  qaElapsedSeconds: number;
  completed?: boolean;
}

// Motion
export type MotionType =
  | 'resolution_vote'
  | 'moderated_caucus'
  | 'unmoderated_caucus'
  | 'paper_presentation'
  | 'speaker_list'
  | 'round_robin'
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
    totalTime?: number; // seconds
    totalSpeakers?: number; // number of speakers (for moderated caucus)
    speakingTime?: number; // seconds
    topic?: string;
    qaTime?: number; // seconds per paper; absent for legacy count-up Q&A
    papers?: string[];
  };
  status: MotionStatus;
  voteResult?: VoteResult;
  timestamp: Date;
  resolutionVote?: ResolutionVoteDraft;
  presentation?: PaperPresentationProgress;
  paperPresentations?: PaperPresentationProgress[];
  // Speaker management for moderated caucus
  speakers?: Speaker[];
  currentSpeakerIndex?: number;
  speakingPhase?: MotionProcessingPhase; // Track motion phase
  localProcessingTimePool?: number; // Device-only paused progress; never shared
}

// Vote Result
export interface VoteResult {
  countsEntered?: {for:boolean;against:boolean;abstain:boolean};
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
  remainingTime?: number; // Local unmoderated countdown progress, seconds
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

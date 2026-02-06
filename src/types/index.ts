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
  | 'extend_moderated'
  | 'extend_unmoderated'
  | 'close_debate'
  | 'resume_debate'
  | 'adjourn_meeting';

export type MotionStatus = 'pending' | 'voting' | 'passed' | 'failed';

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
  speakingPhase?: 'adding' | 'in_progress' | 'completed'; // Track motion phase
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

// Motion Group - contains multiple motions that are voted on together
export interface MotionGroup {
  id: string;
  motions: Motion[];
  status: 'pending' | 'voting' | 'executing' | 'passed' | 'failed';
  voteResult?: VoteResult;
  timestamp: Date;
  selectedMotionId?: string; // Which motion was selected to execute after passing
}

// Setup Steps
export type SetupStep = 'meeting_info' | 'delegates' | 'roll_call';

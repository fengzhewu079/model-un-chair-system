import { create } from 'zustand';
import {
  MeetingState,
  MeetingStatus,
  Delegate,
  Speaker,
  Motion,
  MotionType,
  MotionGroup,
  VoteResult,
  SetupStep,
} from '../types';

interface MeetingStore extends MeetingState {
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

  // Roll Call
  markAttendance: (id: string, status: 'present' | 'present_and_voting' | 'absent') => void;
  markAllPresent: () => void;
  markAllPresentAndVoting: () => void;
  completeRollCall: () => void;

  // Session
  setStatus: (status: MeetingStatus) => void;
  meetingState: MeetingStatus; // Alias for status
  currentSpeaker: Speaker | null;
  waitingQueue: Speaker[];
  speakerQueue: Speaker[]; // Alias for waitingQueue
  timerState: { isRunning: boolean };
  addSpeaker: (name: string) => void;
  removeSpeaker: (id: string) => void;
  startSpeaking: () => void;
  nextSpeaker: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  updateRemainingTime: (time: number) => void;

  // Motions (legacy - kept for compatibility)
  motions: Motion[];
  addMotion: (motion: Omit<Motion, 'id' | 'timestamp'>) => void;
  updateMotionStatus: (id: string, status: Motion['status']) => void;
  setMotionVoteResult: (id: string, result: VoteResult) => void;

  // Motion Groups (new system)
  motionGroups: MotionGroup[];
  addMotionGroup: (motions: Omit<Motion, 'id' | 'timestamp'>[]) => void;
  updateMotionGroupStatus: (id: string, status: MotionGroup['status']) => void;
  setMotionGroupVoteResult: (id: string, result: VoteResult) => void;
  selectMotionInGroup: (groupId: string, motionId: string) => void;

  // Motion-specific Speaker Management
  addSpeakerToMotion: (motionId: string, name: string) => void;
  removeSpeakerFromMotion: (motionId: string, speakerId: string) => void;
  startMotionSpeaking: (motionId: string) => void;
  nextMotionSpeaker: (motionId: string) => void;
  pauseMotionTimer: (motionId: string) => void;
  resumeMotionTimer: (motionId: string) => void;
  resetMotion: (motionId: string) => void;
  completeMotionExecution: (motionId: string) => void;

  // Voting
  currentVote: {
    motionId?: string;  // For legacy single motion voting
    motionGroupId?: string;  // For motion group voting
    currentMotionIndex?: number;  // Current motion being voted on in the group
    motionType?: MotionType;
    for: number;
    against: number;
    abstain: number;
  } | null;
  startVote: (motionId: string) => void;
  startGroupVote: (groupId: string) => void;
  updateVoteCount: (type: 'for' | 'against' | 'abstain', count: number) => void;
  calculateVoteResult: () => VoteResult | null;
  confirmVote: (result: VoteResult) => void;
  confirmMotionVote: (result: VoteResult) => void;
  cancelVote: () => void;

  // Settings
  isMuted: boolean;
  toggleMute: () => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  soundAlerts: number[];  // Array of seconds when to play alerts (e.g., [30, 15, 10, 0])
  setSoundAlerts: (alerts: number[]) => void;
  volume: number;  // Volume level 0.0 to 1.0
  setVolume: (volume: number) => void;
  resetMeeting: () => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  // Initial State
  id: generateId(),
  name: '',
  chairName: '',
  committeeName: '',
  status: 'setup',
  startTime: new Date(),
  rollCall: {
    delegates: [],
    totalDelegates: 0,
    presentCount: 0,
    presentAndVotingCount: 0,
    absentCount: 0,
    completed: false,
  },
  currentStep: 'meeting_info',
  meetingState: 'setup',
  currentSpeaker: null,
  waitingQueue: [],
  speakerQueue: [],
  timerState: { isRunning: false },
  motions: [],
  motionGroups: [],
  currentVote: null,
  isMuted: false,
  fontSize: 'medium',
  soundAlerts: [10, 0],  // Default: alert at 10 seconds and 0 seconds
  volume: 0.5,  // Default volume at 50%

  // Setup Actions
  setCurrentStep: (step) => set({ currentStep: step }),

  setMeetingName: (name) => set({ name }),

  setChairName: (name) => set({ chairName: name }),

  setCommitteeName: (name) => set({ committeeName: name }),

  // Delegate Actions
  addDelegate: (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const state = get();
    const exists = state.rollCall.delegates.some(d => d.name === trimmedName);
    if (exists) return;

    const newDelegate: Delegate = {
      id: generateId(),
      name: trimmedName,
      attendance: 'unmarked',
      timestamp: new Date(),
    };

    set((state) => ({
      rollCall: {
        ...state.rollCall,
        delegates: [...state.rollCall.delegates, newDelegate],
        totalDelegates: state.rollCall.totalDelegates + 1,
      },
    }));
  },

  removeDelegate: (id) => {
    set((state) => ({
      rollCall: {
        ...state.rollCall,
        delegates: state.rollCall.delegates.filter((d) => d.id !== id),
        totalDelegates: state.rollCall.totalDelegates - 1,
      },
    }));
  },

  bulkAddDelegates: (names) => {
    const state = get();
    const existingNames = new Set(state.rollCall.delegates.map(d => d.name));

    const newDelegates = names
      .map(name => name.trim())
      .filter(name => name && !existingNames.has(name))
      .map(name => ({
        id: generateId(),
        name,
        attendance: 'unmarked' as const,
        timestamp: new Date(),
      }));

    if (newDelegates.length === 0) return;

    set((state) => ({
      rollCall: {
        ...state.rollCall,
        delegates: [...state.rollCall.delegates, ...newDelegates],
        totalDelegates: state.rollCall.totalDelegates + newDelegates.length,
      },
    }));
  },

  // Roll Call Actions
  markAttendance: (id, status) => {
    set((state) => {
      const delegates = state.rollCall.delegates.map((d) =>
        d.id === id ? { ...d, attendance: status, timestamp: new Date() } : d
      );

      const presentCount = delegates.filter((d) => d.attendance === 'present').length;
      const presentAndVotingCount = delegates.filter((d) => d.attendance === 'present_and_voting').length;
      const absentCount = delegates.filter((d) => d.attendance === 'absent').length;

      return {
        rollCall: {
          ...state.rollCall,
          delegates,
          presentCount,
          presentAndVotingCount,
          absentCount,
        },
      };
    });
  },

  markAllPresent: () => {
    set((state) => {
      const delegates = state.rollCall.delegates.map((d) => ({
        ...d,
        attendance: 'present' as const,
        timestamp: new Date(),
      }));

      return {
        rollCall: {
          ...state.rollCall,
          delegates,
          presentCount: delegates.length,
          presentAndVotingCount: 0,
          absentCount: 0,
        },
      };
    });
  },

  markAllPresentAndVoting: () => {
    set((state) => {
      const delegates = state.rollCall.delegates.map((d) => ({
        ...d,
        attendance: 'present_and_voting' as const,
        timestamp: new Date(),
      }));

      return {
        rollCall: {
          ...state.rollCall,
          delegates,
          presentCount: 0,
          presentAndVotingCount: delegates.length,
          absentCount: 0,
        },
      };
    });
  },

  completeRollCall: () => {
    set((state) => ({
      rollCall: {
        ...state.rollCall,
        completed: true,
        completedAt: new Date(),
      },
      status: 'GSL',
      meetingState: 'GSL',
    }));
  },

  // Session Actions
  setStatus: (status) => set({ status, meetingState: status }),

  addSpeaker: (name) => {
    const state = get();
    const newSpeaker: Speaker = {
      id: generateId(),
      name: name.trim(),
      status: 'waiting',
      speakingTime: 90, // Default GSL speaking time: 90 seconds
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
      const newQueue = state.waitingQueue.filter((s) => s.id !== id);
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
        status: 'waiting',  // Not speaking yet, waiting for Start button
        remainingTime: firstSpeaker.speakingTime, // Reset to full time
      },
      waitingQueue: remainingQueue,
      speakerQueue: remainingQueue,
      timerState: { isRunning: false }, // Don't auto-start
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
        status: 'waiting', // Not speaking yet, waiting for Start button
        remainingTime: nextSpeaker.speakingTime, // Reset to full time
      },
      waitingQueue: remainingQueue,
      speakerQueue: remainingQueue,
      timerState: { isRunning: false }, // Don't auto-start
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

  // Motion Actions
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
      motions: state.motions.map((m) =>
        m.id === id ? { ...m, status } : m
      ),
    }));
  },

  setMotionVoteResult: (id, result) => {
    set((state) => ({
      motions: state.motions.map((m) =>
        m.id === id ? { ...m, voteResult: result } : m
      ),
    }));
  },

  // Voting Actions
  startVote: (motionId) => {
    const motion = get().motions.find((m) => m.id === motionId);
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

    // Use Simple Majority as default voting rule
    const result: 'pass' | 'fail' = forVotes > against ? 'pass' : 'fail';
    const rule = 'Simple Majority';

    return {
      for: forVotes,
      against,
      abstain,
      total,
      votingBase,
      result,
      rule,
      timestamp: new Date(),
    };
  },

  confirmVote: (result) => {
    const state = get();
    if (!state.currentVote) return;

    const { motionId } = state.currentVote;
    const motion = state.motions.find((m) => m.id === motionId);

    if (motion) {
      get().setMotionVoteResult(motionId, result);
      get().updateMotionStatus(motionId, result.result === 'pass' ? 'passed' : 'failed');

      // Execute motion if passed
      if (result.result === 'pass') {
        switch (motion.type) {
          case 'moderated_caucus':
            set({ status: 'Moderated', meetingState: 'Moderated' });
            break;
          case 'unmoderated_caucus':
            set({ status: 'Unmoderated', meetingState: 'Unmoderated' });
            break;
          case 'adjourn_meeting':
            set({ status: 'Suspension', meetingState: 'Suspension' });
            break;
          case 'close_debate':
            // Return to GSL
            set({ status: 'GSL', meetingState: 'GSL' });
            break;
          case 'resume_debate':
            // Return to GSL
            set({ status: 'GSL', meetingState: 'GSL' });
            break;
        }
      }
    }

    set({ currentVote: null });
  },

  cancelVote: () => {
    const state = get();
    if (state.currentVote) {
      get().updateMotionStatus(state.currentVote.motionId, 'pending');
    }
    set({ currentVote: null });
  },

  // Motion-specific Speaker Management
  addSpeakerToMotion: (motionId, name) => {
    const state = get();
    const motion = state.motions.find(m => m.id === motionId);
    if (!motion) return;

    const speakingTime = motion.parameters.speakingTime || 60; // Default to 60 seconds if not specified
    const newSpeaker: Speaker = {
      id: generateId(),
      name: name.trim(),
      status: 'waiting',
      speakingTime,
      remainingTime: speakingTime,
    };

    set((state) => ({
      motions: state.motions.map((m) =>
        m.id === motionId
          ? {
              ...m,
              speakers: [...(m.speakers || []), newSpeaker],
              speakingPhase: m.speakingPhase || 'adding',
            }
          : m
      ),
    }));
  },

  removeSpeakerFromMotion: (motionId, speakerId) => {
    set((state) => ({
      motions: state.motions.map((m) =>
        m.id === motionId
          ? {
              ...m,
              speakers: (m.speakers || []).filter((s) => s.id !== speakerId),
            }
          : m
      ),
    }));
  },

  startMotionSpeaking: (motionId) => {
    set((state) => ({
      motions: state.motions.map((m) =>
        m.id === motionId && (m.speakers?.length || 0) > 0
          ? {
              ...m,
              currentSpeakerIndex: 0,
              speakingPhase: 'in_progress' as const,
              speakers: m.speakers?.map((s, idx) =>
                idx === 0
                  ? { ...s, status: 'waiting' as const, remainingTime: s.speakingTime }
                  : s
              ),
            }
          : m
      ),
    }));
  },

  nextMotionSpeaker: (motionId) => {
    set((state) => {
      const motion = state.motions.find(m => m.id === motionId);
      if (!motion || !motion.speakers) return state;

      const currentIndex = motion.currentSpeakerIndex ?? -1;
      const nextIndex = currentIndex + 1;

      // Check if we've reached the end
      if (nextIndex >= motion.speakers.length) {
        return {
          motions: state.motions.map((m) =>
            m.id === motionId
              ? {
                  ...m,
                  speakingPhase: 'completed' as const,
                  speakers: m.speakers?.map((s) => ({ ...s, status: 'waiting' as const })),
                }
              : m
          ),
        };
      }

      // Move to next speaker
      return {
        motions: state.motions.map((m) =>
          m.id === motionId
            ? {
                ...m,
                currentSpeakerIndex: nextIndex,
                speakers: m.speakers?.map((s, idx) =>
                  idx === nextIndex
                    ? { ...s, status: 'waiting' as const, remainingTime: s.speakingTime }
                    : s
                ),
              }
            : m
        ),
      };
    });
  },

  pauseMotionTimer: (motionId) => {
    set((state) => ({
      motions: state.motions.map((m) => {
        if (m.id !== motionId || !m.speakers || m.currentSpeakerIndex === undefined) return m;
        return {
          ...m,
          speakers: m.speakers.map((s, idx) =>
            idx === m.currentSpeakerIndex ? { ...s, status: 'waiting' as const } : s
          ),
        };
      }),
    }));
  },

  resumeMotionTimer: (motionId) => {
    set((state) => ({
      motions: state.motions.map((m) => {
        if (m.id !== motionId || !m.speakers || m.currentSpeakerIndex === undefined) return m;
        return {
          ...m,
          speakers: m.speakers.map((s, idx) =>
            idx === m.currentSpeakerIndex ? { ...s, status: 'speaking' as const } : s
          ),
        };
      }),
    }));
  },

  resetMotion: (motionId) => {
    set((state) => ({
      motions: state.motions.map((m) =>
        m.id === motionId
          ? {
              ...m,
              speakers: [],
              currentSpeakerIndex: undefined,
              speakingPhase: 'adding' as const,
            }
          : m
      ),
    }));
  },

  completeMotionExecution: (motionId) => {
    set((state) => {
      // Find the group that contains this motion
      const groupIndex = state.motionGroups.findIndex(g =>
        g.motions.some(m => m.id === motionId)
      );

      if (groupIndex === -1) return state;

      const group = state.motionGroups[groupIndex];

      // If group is in 'executing' state, mark it as 'passed'
      if (group.status === 'executing') {
        return {
          motionGroups: state.motionGroups.map((g, idx) =>
            idx === groupIndex
              ? { ...g, status: 'passed' as const }
              : g
          ),
        };
      }

      return state;
    });
  },

  // Settings
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setFontSize: (size) => set({ fontSize: size }),

  setSoundAlerts: (alerts) => set({ soundAlerts: alerts }),

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  resetMeeting: () => {
    // Clear localStorage
    localStorage.removeItem('mun-chair-session');

    // Reset to initial state
    set({
      id: generateId(),
      name: '',
      chairName: '',
      committeeName: '',
      status: 'setup',
      startTime: new Date(),
      rollCall: {
        delegates: [],
        totalDelegates: 0,
        presentCount: 0,
        presentAndVotingCount: 0,
        absentCount: 0,
        completed: false,
      },
      currentStep: 'meeting_info',
      meetingState: 'setup',
      currentSpeaker: null,
      waitingQueue: [],
      speakerQueue: [],
      timerState: { isRunning: false },
      motions: [],
      motionGroups: [],
      currentVote: null,
      isMuted: false,
      fontSize: 'medium',
      soundAlerts: [10, 0],
      volume: 0.5,
    });
  },

  // Motion Group Actions
  addMotionGroup: (motions) => {
    const newMotionGroup: MotionGroup = {
      id: generateId(),
      motions: motions.map(m => ({
        ...m,
        id: generateId(),
        timestamp: new Date(),
      })),
      status: 'pending',
      timestamp: new Date(),
    };

    set((state) => ({
      motionGroups: [...state.motionGroups, newMotionGroup],
    }));
  },

  updateMotionGroupStatus: (id, status) => {
    set((state) => ({
      motionGroups: state.motionGroups.map((g) =>
        g.id === id ? { ...g, status } : g
      ),
    }));
  },

  setMotionGroupVoteResult: (id, result) => {
    set((state) => ({
      motionGroups: state.motionGroups.map((g) =>
        g.id === id ? { ...g, voteResult: result } : g
      ),
    }));
  },

  selectMotionInGroup: (groupId, motionId) => {
    set((state) => ({
      motionGroups: state.motionGroups.map((g) =>
        g.id === groupId ? { ...g, selectedMotionId: motionId } : g
      ),
    }));
  },

  startGroupVote: (groupId) => {
    const group = get().motionGroups.find(g => g.id === groupId);
    if (!group || group.motions.length === 0) return;

    // Start voting on the first motion in the group
    set({
      currentVote: {
        motionGroupId: groupId,
        currentMotionIndex: 0,
        motionType: group.motions[0].type,
        for: 0,
        against: 0,
        abstain: 0,
      },
    });
    get().updateMotionGroupStatus(groupId, 'voting');
  },

  confirmMotionVote: (result) => {
    const state = get();
    if (!state.currentVote?.motionGroupId || state.currentVote.currentMotionIndex === undefined) return;

    const { motionGroupId, currentMotionIndex } = state.currentVote;
    const group = state.motionGroups.find((g) => g.id === motionGroupId);

    if (!group) return;

    const currentMotion = group.motions[currentMotionIndex];
    if (!currentMotion) return;

    // Update the motion's status and vote result
    set((state) => ({
      motionGroups: state.motionGroups.map((g) => {
        if (g.id !== motionGroupId) return g;
        return {
          ...g,
          motions: g.motions.map((m, idx) => {
            if (idx !== currentMotionIndex) return m;
            return {
              ...m,
              status: result.result === 'pass' ? 'passed' as const : 'failed' as const,
              voteResult: result,
            };
          }),
        };
      }),
    }));

    // If passed, execute the motion
    if (result.result === 'pass') {
      switch (currentMotion.type) {
        case 'moderated_caucus':
          set({ status: 'Moderated', meetingState: 'Moderated' });
          // Add the motion to the motions list so it can be accessed
          set((state) => ({
            motions: [...state.motions, { ...currentMotion, status: 'passed' as const, voteResult: result }],
          }));
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

    // Move to next motion or end voting
    const nextMotionIndex = currentMotionIndex + 1;
    if (nextMotionIndex < group.motions.length) {
      // Move to next motion
      set({
        currentVote: {
          motionGroupId,
          currentMotionIndex: nextMotionIndex,
          motionType: group.motions[nextMotionIndex].type,
          for: 0,
          against: 0,
          abstain: 0,
        },
      });
    } else {
      // All motions voted, end voting
      get().updateMotionGroupStatus(motionGroupId,
        group.motions.some(m => m.status === 'passed') ? 'passed' : 'failed'
      );
      set({ currentVote: null });
    }
  },

  // Persistence
  saveToLocalStorage: () => {
    const state = get();
    try {
      localStorage.setItem('mun-chair-session', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem('mun-chair-session');
      if (saved) {
        const parsed = JSON.parse(saved);
        set(parsed);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  },
}));

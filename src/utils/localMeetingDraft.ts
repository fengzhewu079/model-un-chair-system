import type { MeetingSessionState, MotionProcessingDraft, Motion, Speaker } from '../types';
import { extractSharedMeetingState, hydrateSharedMeetingState } from './sharedMeetingState';

// Device-only recovery. Never include this envelope in a collaboration RPC.
export interface LocalMeetingDraft {
  schemaVersion: 1;
  publicMeetingId: string | null;
  memberId: string | null;
  meeting: ReturnType<typeof extractSharedMeetingState>;
  localMotions: Motion[];
  currentVote: MeetingSessionState['currentVote'];
  processing: MotionProcessingDraft | null;
}

export const captureLocalMeetingDraft = (
  state: MeetingSessionState & { publicMeetingId: string | null; memberId: string | null; motionProcessingDraft: MotionProcessingDraft | null }
): LocalMeetingDraft => ({
  schemaVersion: 1,
  publicMeetingId: state.publicMeetingId,
  memberId: state.memberId,
  meeting: extractSharedMeetingState(state),
  localMotions: [...new Map([...state.motions, ...state.motionGroups.flatMap(g => g.motions)].map(m => [m.id, m])).values()],
  currentVote: state.currentVote,
  processing: state.motionProcessingDraft,
});

const pauseSpeakers = (speakers: Speaker[]) => speakers.map(s => ({...s, status: 'waiting' as const}));
export const restoreLocalMeetingDraft = (
  value: unknown,
  identity: {publicMeetingId: string; memberId: string} | null
): Partial<MeetingSessionState> & {motionProcessingDraft?: MotionProcessingDraft | null} => {
  try {
    const draft = value as LocalMeetingDraft;
    if (!draft || draft.schemaVersion !== 1 || !draft.meeting || !Array.isArray(draft.localMotions)) return {};
    if (draft.publicMeetingId !== (identity?.publicMeetingId ?? null) || draft.memberId !== (identity?.memberId ?? null)) return {};
    const meeting = hydrateSharedMeetingState(draft.meeting, draft.meeting.id);
    const restoreMotion = (motion: Motion): Motion => {
      const local = draft.localMotions.find(m => m.id === motion.id);
      return {...motion, speakers: pauseSpeakers(local?.speakers ?? []), currentSpeakerIndex: local?.currentSpeakerIndex, speakingPhase: local?.speakingPhase};
    };
    return {
      ...meeting,
      motions: meeting.motions.map(restoreMotion),
      motionGroups: meeting.motionGroups.map(g => ({...g, motions:g.motions.map(restoreMotion)})),
      currentSpeaker: meeting.currentSpeaker ? {...meeting.currentSpeaker,status:'waiting'} : null,
      timerState: {isRunning:false},
      currentVote: draft.currentVote,
      motionProcessingDraft: draft.processing ? {...draft.processing, speakers:pauseSpeakers(draft.processing.speakers)} : null,
    };
  } catch {
    return {};
  }
};

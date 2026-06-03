import type {
  Motion,
  MotionGroup,
  MotionProcessingDraft,
  MotionType,
  Speaker,
} from '../types';

const PROCESSING_MOTION_TYPES: MotionType[] = [
  'moderated_caucus',
  'speaker_list',
  'unmoderated_caucus',
];

export const isProcessingMotionType = (type: MotionType) =>
  PROCESSING_MOTION_TYPES.includes(type);

export const findMotionGroupByMotionId = (
  motionGroups: MotionGroup[],
  motionId: string
) => motionGroups.find((group) => group.motions.some((motion) => motion.id === motionId)) ?? null;

export const findMotionById = (
  motions: Motion[],
  motionGroups: MotionGroup[],
  motionId: string
) => {
  const directMotion = motions.find((motion) => motion.id === motionId);
  if (directMotion) {
    return {
      motion: directMotion,
      group: findMotionGroupByMotionId(motionGroups, motionId),
    };
  }

  const group = findMotionGroupByMotionId(motionGroups, motionId);
  const groupMotion = group?.motions.find((motion) => motion.id === motionId) ?? null;

  return {
    motion: groupMotion,
    group,
  };
};

export const buildMotionProcessingDraft = (
  motion: Motion,
  groupId: string,
  timePool: number
): MotionProcessingDraft => ({
  motionId: motion.id,
  groupId,
  motionType: motion.type,
  speakers: motion.speakers ? [...motion.speakers] : [],
  currentSpeakerIndex: motion.currentSpeakerIndex,
  speakingPhase: motion.speakingPhase ?? 'adding',
  timePool,
});

export const applyMotionProcessingDraft = (
  motion: Motion,
  draft: MotionProcessingDraft | null
): Motion => {
  if (!draft || draft.motionId !== motion.id) {
    return motion;
  }

  return {
    ...motion,
    speakers: draft.speakers,
    currentSpeakerIndex: draft.currentSpeakerIndex,
    speakingPhase: draft.speakingPhase,
  };
};

export const cloneSpeakers = (speakers: Speaker[]) => speakers.map((speaker) => ({ ...speaker }));

export const upsertMotionRecord = (motions: Motion[], nextMotion: Motion) => {
  const existingIndex = motions.findIndex((motion) => motion.id === nextMotion.id);

  if (existingIndex === -1) {
    return [...motions, nextMotion];
  }

  return motions.map((motion, index) => (index === existingIndex ? nextMotion : motion));
};

export const getMotionTypeLabel = (type: MotionType) => {
  switch (type) {
    case 'moderated_caucus':
      return 'Moderated Caucus';
    case 'unmoderated_caucus':
      return 'Unmoderated Caucus';
    case 'speaker_list':
      return 'Speaker List';
    case 'extend_moderated':
      return 'Extend Moderated Caucus';
    case 'extend_unmoderated':
      return 'Extend Unmoderated Caucus';
    case 'close_debate':
      return 'Close Debate';
    case 'resume_debate':
      return 'Resume Debate';
    case 'adjourn_meeting':
      return 'Adjourn Meeting';
    default:
      return 'Motion';
  }
};

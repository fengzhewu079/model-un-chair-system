import { formatDuration } from './duration';
import type { Motion, PaperPresentationProgress } from '../types';

export const paperNames = (motion: Motion): string[] => motion.parameters.papers?.length
  ? motion.parameters.papers : [motion.parameters.topic || 'Paper 1'];

export const presentationProgress = (motion: Motion, index = 0): PaperPresentationProgress =>
  motion.paperPresentations?.[index] ?? (index === 0 ? motion.presentation : undefined) ??
  {phase: 'presentation', remainingSeconds: motion.parameters.totalTime ?? 0, qaElapsedSeconds: 0};

export function advancePresentation(motion: Motion, action: 'tick' | 'qa' | 'complete', seconds: number, index = 0): PaperPresentationProgress {
  const current = presentationProgress(motion, index);
  if (current.completed) return current;
  if (action === 'complete') return {...current, completed: true};
  if (action === 'qa') return {...current, phase: 'qa'};
  if (!Number.isSafeInteger(seconds) || seconds < 0) return current;
  return current.phase === 'qa'
    ? {...current, qaElapsedSeconds: Math.min(motion.parameters.qaTime ?? Number.MAX_SAFE_INTEGER, current.qaElapsedSeconds + seconds)}
    : {...current, remainingSeconds: Math.max(0, current.remainingSeconds - seconds)};
}

export const paperTimeRemaining = (motion: Motion, index = 0) => {
  const progress = presentationProgress(motion, index);
  return progress.phase === 'qa' ? Math.max(0, (motion.parameters.qaTime ?? 0) - progress.qaElapsedSeconds) : progress.remainingSeconds;
};

export const paperSummary = (motion: Motion) => motion.parameters.papers?.length
  ? `${paperNames(motion).length} papers · ${formatDuration(motion.parameters.totalTime)} presentation + ${formatDuration(motion.parameters.qaTime)} Q&A each`
  : motion.parameters.topic || 'Paper Presentation';

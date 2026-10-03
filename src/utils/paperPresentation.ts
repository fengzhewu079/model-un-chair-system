import type { Motion, PaperPresentationProgress } from '../types';

export const presentationProgress = (motion: Motion): PaperPresentationProgress =>
  motion.presentation ?? {phase: 'presentation', remainingSeconds: motion.parameters.totalTime ?? 0, qaElapsedSeconds: 0};

export function advancePresentation(motion: Motion, action: 'tick' | 'qa', seconds: number): PaperPresentationProgress {
  const current = presentationProgress(motion);
  if (action === 'qa') return {...current, phase: 'qa'};
  if (!Number.isSafeInteger(seconds) || seconds < 0) return current;
  return current.phase === 'qa'
    ? {...current, qaElapsedSeconds: Math.min(Number.MAX_SAFE_INTEGER, current.qaElapsedSeconds + seconds)}
    : {...current, remainingSeconds: Math.max(0, current.remainingSeconds - seconds)};
}

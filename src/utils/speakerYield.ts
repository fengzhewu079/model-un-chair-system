import type { Speaker } from '../types';
export const canYieldSpeaker = (speaker: Speaker | null | undefined): boolean => Boolean(speaker && Number.isFinite(speaker.remainingTime) && speaker.remainingTime > 0 && (speaker.hasStarted || speaker.status === 'speaking' || speaker.remainingTime < speaker.speakingTime));

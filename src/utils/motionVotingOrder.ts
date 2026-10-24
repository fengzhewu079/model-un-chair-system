import type { Motion } from '../types';

export type CaucusTieRule = 'more-speakers' | 'longer-speeches';
export type VotingOrderMode = 'disruptive' | 'proposed';
export function caucusDuration(motion: Motion): number {
  return motion.parameters.totalTime ?? (motion.parameters.totalSpeakers ?? 0) * (motion.parameters.speakingTime ?? 0);
}
const isCaucus = (motion: Motion) => motion.type === 'moderated_caucus' || motion.type === 'unmoderated_caucus';

// Only ordinary caucuses have a suggested precedence here. Other types retain their slots.
export function suggestMotionOrder(motions: Motion[], tieRule: CaucusTieRule, mode: VotingOrderMode = 'disruptive'): string[] {
  if (mode === 'proposed') return motions.map(motion => motion.id);
  const caucuses = motions.filter(isCaucus).sort((a, b) => {
    const typeDifference = Number(b.type === 'unmoderated_caucus') - Number(a.type === 'unmoderated_caucus');
    if (typeDifference) return typeDifference;
    const durationDifference = caucusDuration(b) - caucusDuration(a);
    if (durationDifference) return durationDifference;
    if (a.type !== 'moderated_caucus') return 0;
    const speechDifference = (a.parameters.speakingTime ?? 0) - (b.parameters.speakingTime ?? 0);
    return tieRule === 'more-speakers' ? speechDifference : -speechDifference;
  });
  let index = 0;
  return motions.map(motion => isCaucus(motion) ? caucuses[index++].id : motion.id);
}

export function applyMotionOrder(motions: Motion[], ids: string[]): Motion[] {
  const byId = new Map(motions.map(motion => [motion.id, motion]));
  const result: Motion[] = [];
  for (const id of ids) {
    const motion = byId.get(id);
    if (motion) { result.push(motion); byId.delete(id); }
  }
  return [...result, ...byId.values()];
}
